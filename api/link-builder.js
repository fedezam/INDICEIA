// /api/link-builder.js
/**
 * LINK BUILDER — ÍndiceIA v1.0
 * Genera el link final (Claude + prompt + entidad)
 * Micro-servicio estable para producción.
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
  const windowData = rateLimitMap.get(key) || { count: 0, ts: now };
  
  if (now - windowData.ts > RATE_LIMIT_WINDOW) {
    rateLimitMap.set(key, { count: 1, ts: now });
    return true;
  }

  if (windowData.count >= RATE_LIMIT_MAX) return false;

  windowData.count += 1;
  rateLimitMap.set(key, windowData);
  return true;
}

// ========================================
// DEVICE DETECTION
// ========================================
function detectDevice(uaString) {
  if (!uaString) return 'unknown';
  const ua = uaString.toLowerCase();
  if (/mobile|android|iphone|ipod|blackberry|iemobile|opera mini/.test(ua)) return 'mobile';
  if (/ipad|tablet|playbook|silk/.test(ua)) return 'tablet';
  if (/windows|macintosh|linux|cros/.test(ua)) return 'desktop';
  return 'unknown';
}

// ========================================
// LOGGING
// ========================================
async function logInteraction(data) {
  try {
    const analyticsRef = collection(db, 'link_analytics');

    const deviceSignature = data.user_agent
      ? crypto.createHash('sha256').update(data.user_agent).digest('hex')
      : 'unknown';

    await addDoc(analyticsRef, {
      comercio_id: data.comercio_id,
      timestamp: Timestamp.now(),
      device_type: detectDevice(data.user_agent),
      device_signature: deviceSignature,
      referrer: data.referrer || 'direct',
      interaction_type: data.interaction_type || 'page_view',
      variant: 'default',
      format: data.format || 'redirect',
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
  const ip = req.headers['x-forwarded-for'] || req.connection?.remoteAddress || 'unknown';

  try {
    // ========================================
    // GENERAR LINK
    // ========================================
    if (req.method === 'GET' && action === 'generate') {

      const { comercio_id, format = 'redirect' } = req.query;
      if (!comercio_id) {
        return res.status(400).json({ error: 'comercio_id required' });
      }

      if (!checkRateLimit(ip, comercio_id)) {
        return res.status(429).json({ error: 'Rate limit exceeded' });
      }

      // Buscar último manifest exitoso
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

      // Construir prompt minimalista
      const prompt = buildPrompt(entityUrl);

      // Construir URL final
      const claudeUrl = `https://claude.ai/new?prompt=${encodeURIComponent(prompt)}`;
      const intermediateUrl = `${process.env.BASE_URL}/bot/${comercio_id}`;
      const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(intermediateUrl)}`;

      await logInteraction({
        comercio_id,
        format,
        user_agent: req.headers['user-agent'],
        ip,
      });

      switch (format) {
        case 'json':
          return res.status(200).json({
            success: true,
            comercio_id,
            claude_url: claudeUrl,
            entity_url: entityUrl,
            intermediate_url: intermediateUrl,
            qr_url: qrCodeUrl,
            prompt_preview: prompt.slice(0, 200) + '...',
          });

        case 'qr':
          return res.redirect(qrCodeUrl);

        case 'redirect':
        default:
          return res.redirect(claudeUrl);
      }
    }

    // ========================================
    // LOG INTERACTION
    // ========================================
    if (req.method === 'POST' && action === 'log_interaction') {
      const data = req.body;

      if (!checkRateLimit(ip, data.comercio_id)) {
        return res.status(429).json({ error: 'Rate limit exceeded' });
      }

      await logInteraction(data);
      return res.status(200).json({ success: true });
    }

    // ========================================
    // ACTION NOT FOUND
    // ========================================
    return res.status(404).json({ error: 'Action not found' });

  } catch (error) {
    console.error('Link-builder error:', error);
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
}

