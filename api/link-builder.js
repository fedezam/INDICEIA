// /api/link-builder.js
/**
 * LINK BUILDER — ÍndiceIA v1.0
 * Genera el link final (Claude + prompt + entidad)
 * Servicio estable y desacoplado.
 */

import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  addDoc,
  query,
  where,
  getDocs,
  orderBy,
  limit as fsLimit,
  Timestamp,
} from 'firebase/firestore';

import crypto from 'crypto';
import { buildPrompt } from './config/prompt-template.js';

// ========================================
// FIREBASE CONFIG
// ========================================
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID
};

let db;
try {
  const app = initializeApp(firebaseConfig);
  db = getFirestore(app);
} catch (e) {
  db = getFirestore();
}

// ========================================
// RATE LIMITING
// ========================================
const RATE_LIMIT_WINDOW = 60 * 1000;
const RATE_LIMIT_MAX = 30;
const rateLimitMap = new Map();

function checkRateLimit(ip, comercioId) {
  const key = `${ip}:${comercioId}`;
  const now = Date.now();
  const data = rateLimitMap.get(key) || { count: 0, ts: now };

  if (now - data.ts > RATE_LIMIT_WINDOW) {
    rateLimitMap.set(key, { count: 1, ts: now });
    return true;
  }

  if (data.count >= RATE_LIMIT_MAX) return false;

  data.count++;
  rateLimitMap.set(key, data);
  return true;
}

// ========================================
// DEVICE DETECTION
// ========================================
function detectDevice(uaString) {
  if (!uaString) return 'unknown';
  const ua = uaString.toLowerCase();
  if (/mobile|android|iphone/.test(ua)) return 'mobile';
  if (/ipad|tablet/.test(ua)) return 'tablet';
  if (/windows|macintosh|linux/.test(ua)) return 'desktop';
  return 'unknown';
}

// ========================================
// LOGGING
// ========================================
async function logInteraction(data) {
  try {
    const ref = collection(db, 'link_analytics');

    const deviceSignature = data.user_agent
      ? crypto.createHash('sha256').update(data.user_agent).digest('hex')
      : 'unknown';

    await addDoc(ref, {
      comercio_id: data.comercio_id,
      timestamp: Timestamp.now(),
      interaction_type: data.interaction_type || 'page_view',
      device_type: detectDevice(data.user_agent),
      device_signature: deviceSignature,
      format: data.format || 'redirect',
      referrer: data.referrer || 'direct',
      session_id: data.session_id || null,
    });
  } catch (err) {
    console.warn('Analytics logging failed:', err.message);
  }
}

// ========================================
// MAIN HANDLER
// ========================================
export default async function handler(req, res) {
  const { action } = req.query;
  const ip = req.headers['x-forwarded-for'] || 'unknown';

  try {
    // ========================================
    // GENERATE LINK
    // ========================================
    if (req.method === 'GET' && action === 'generate') {
      const { comercio_id, format = 'redirect' } = req.query;

      if (!comercio_id) {
        return res.status(400).json({ error: 'comercio_id required' });
      }

      if (!checkRateLimit(ip, comercio_id)) {
        return res.status(429).json({ error: 'Rate limit exceeded' });
      }

      const manifestsRef = collection(db, 'autobuilder_manifests');
      const q = query(
        manifestsRef,
        where('entity_id', '==', comercio_id),
        where('status', '==', 'success'),
        orderBy('timestamp', 'desc'),
        fsLimit(1)
      );

      const snapshot = await getDocs(q);
      if (snapshot.empty) {
        return res.status(404).json({ error: 'Entity not found' });
      }

      const manifest = snapshot.docs[0].data();
      const entityUrl = manifest.vercel_blob_url;

      const prompt = buildPrompt(entityUrl);
      const claudeUrl = `https://claude.ai/new?prompt=${encodeURIComponent(prompt)}`;
      const intermediateUrl = `${process.env.BASE_URL}/bot/${comercio_id}`;
      const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(intermediateUrl)}`;

      await logInteraction({
        comercio_id,
        format,
        interaction_type: 'link_generate',
        user_agent: req.headers['user-agent'],
        ip,
      });

      if (format === 'json') {
        return res.json({
          success: true,
          comercio_id,
          claude_url: claudeUrl,
          entity_url: entityUrl,
          intermediate_url: intermediateUrl,
          qr_url: qrCodeUrl,
        });
      }

      if (format === 'qr') {
        return res.redirect(qrCodeUrl);
      }

      return res.redirect(claudeUrl);
    }

    return res.status(404).json({ error: 'Action not found' });

  } catch (err) {
    console.error('Link-builder error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

