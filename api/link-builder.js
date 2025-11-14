// /api/link-builder.js
/**
 * 🔗 LINK BUILDER - MICRO-SERVICE VERSION
 * 
 * Características:
 * - Rate-limit por IP y comercio
 * - Cache de prompts en memoria
 * - Logging mejorado
 * - Soporte para formatos: redirect | json | qr
 * - Ready para deploy masivo en Vercel
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

// ========================================
// CONFIG FIREBASE
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
// RATE-LIMIT CONFIG
// ========================================
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minuto
const RATE_LIMIT_MAX = 30;           // Máximo 30 requests por IP/comercio por ventana
const rateLimitMap = new Map();

// ========================================
// PROMPT CACHE
// ========================================
const promptCache = new Map();

// ========================================
// PROMPT TEMPLATES
// ========================================
const CLAUDE_PROMPT_CONFIG = {
  templates: {
    default: `Eres un asistente comercial inteligente para {nombre_comercio}.
Tu objetivo es ayudar a los clientes de manera amigable y profesional.
Carga tu configuración desde: {entity_url}
Responde consultas sobre productos, horarios y servicios
Mantén un tono {tone}`,

    friendly: `¡Hola! Soy {nombre_bot}, tu asistente virtual de {nombre_comercio} 😊
Estoy aquí para ayudarte con:
• Ver nuestro menú/catálogo
• Hacer pedidos
• Consultar horarios y ubicación
Mi configuración está en: {entity_url}`,

    professional: `Bienvenido al sistema de asistencia de {nombre_comercio}.
Soy {nombre_bot}, su asistente automatizado.
Capacidades:
- Consulta de catálogo y productos
- Procesamiento de pedidos
- Información comercial
Configuración del sistema: {entity_url}`
  },

  getPrompt(variant = 'default', vars = {}) {
    const cacheKey = `${variant}:${vars.entity_url}`;
    if (promptCache.has(cacheKey)) return promptCache.get(cacheKey);

    const template = this.templates[variant] || this.templates.default;
    let prompt = template;

    Object.keys(vars).forEach(key => {
      const regex = new RegExp(`\\{${key}\\}`, 'g');
      prompt = prompt.replace(regex, vars[key] || '');
    });

    prompt = prompt.replace(/{tone}/g, 'amigable y profesional');
    prompt = prompt.replace(/{nombre_bot}/g, vars.nombre_bot || 'Asistente');
    prompt = prompt.replace(/{nombre_comercio}/g, vars.nombre_comercio || 'nuestro comercio');

    promptCache.set(cacheKey, prompt);
    return prompt;
  }
};

// ========================================
// HELPER FUNCTIONS
// ========================================
function detectDevice(uaString) {
  if (!uaString) return 'unknown';
  const ua = uaString.toLowerCase();
  if (/mobile|android|iphone|ipod|blackberry|iemobile|opera mini/i.test(ua)) return 'mobile';
  if (/ipad|tablet|playbook|silk/i.test(ua)) return 'tablet';
  if (/windows|macintosh|linux|cros/i.test(ua)) return 'desktop';
  return 'unknown';
}

function checkRateLimit(ip, comercio_id) {
  const key = `${ip}:${comercio_id}`;
  const now = Date.now();
  const windowData = rateLimitMap.get(key) || { count: 0, ts: now };
  if (now - windowData.ts > RATE_LIMIT_WINDOW) {
    // Reinicia ventana
    rateLimitMap.set(key, { count: 1, ts: now });
    return true;
  }
  if (windowData.count >= RATE_LIMIT_MAX) return false;
  windowData.count += 1;
  rateLimitMap.set(key, windowData);
  return true;
}

async function logInteraction(data) {
  try {
    const analyticsRef = collection(db, 'link_analytics');
    const deviceSignature = data.user_agent
      ? crypto.createHash('sha256').update(data.user_agent).digest('hex')
      : 'unknown';

    await addDoc(analyticsRef, {
      comercio_id: data.comercio_id,
      variant: data.variant || 'default',
      format: data.format || 'redirect',
      timestamp: Timestamp.now(),
      device_type: detectDevice(data.user_agent),
      device_signature: deviceSignature,
      referrer: data.referrer || 'direct',
      interaction_type: data.interaction_type || 'page_view',
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
    // =======================
    // GENERATE LINK
    // =======================
    if (req.method === 'GET' && action === 'generate') {
      const { comercio_id, variant = 'default', format = 'redirect' } = req.query;

      if (!comercio_id || !/^[a-zA-Z0-9_-]+$/.test(comercio_id)) {
        return res.status(400).json({ error: 'Invalid comercio_id' });
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
      if (snapshot.empty) return res.status(404).json({ error: 'Entity not found' });

      const manifestData = snapshot.docs[0].data();
      const { vercel_blob_url, entity_id, timestamp, skeleton_version } = manifestData;

      const comercioData = {
        nombre_comercio: entity_id.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        nombre_bot: `${entity_id}Bot`,
        tipo_negocio: 'comercio'
      };

      const prompt = CLAUDE_PROMPT_CONFIG.getPrompt(variant, { entity_url: vercel_blob_url, ...comercioData });
      const claudeUrl = `https://claude.ai/new?prompt=${encodeURIComponent(prompt)}`;
      const intermediateUrl = `${process.env.BASE_URL || 'https://tudominio.com'}/bot/${comercio_id}${variant !== 'default' ? `?v=${variant}` : ''}`;
      const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(intermediateUrl)}`;

      await logInteraction({
        comercio_id,
        variant,
        format,
        timestamp: new Date().toISOString(),
        user_agent: req.headers['user-agent'],
        ip,
      });

      switch (format) {
        case 'json':
          return res.status(200).json({
            success: true,
            comercio_id,
            entity_url: vercel_blob_url,
            claude_url: claudeUrl,
            intermediate_url: intermediateUrl,
            qr_url: qrCodeUrl,
            variant_used: variant,
            skeleton_version,
            last_build: timestamp,
            comercio_data: comercioData,
            prompt_preview: prompt.slice(0, 180) + '...'
          });
        case 'qr':
          return res.redirect(qrCodeUrl);
        case 'redirect':
        default:
          return res.redirect(claudeUrl);
      }
    }

    // =======================
    // LOG INTERACTION
    // =======================
    if (req.method === 'POST' && action === 'log_interaction') {
      const data = req.body;
      if (!checkRateLimit(ip, data.comercio_id)) {
        return res.status(429).json({ error: 'Rate limit exceeded' });
      }
      await logInteraction(data);
      return res.status(200).json({ success: true });
    }

    // =======================
    // STATS
    // =======================
    if (req.method === 'GET' && action === 'stats') {
      const { comercio_id, days = '30' } = req.query;
      if (!comercio_id) return res.status(400).json({ error: 'comercio_id required' });

      const stats = await getComercioStats(comercio_id, parseInt(days));
      return res.status(200).json({ success: true, comercio_id, period_days: parseInt(days), stats });
    }

    // =======================
    // TOP COMERCIOS
    // =======================
    if (req.method === 'GET' && action === 'top') {
      const { limit = '10', days = '30' } = req.query;
      const top = await getTopComercios(parseInt(limit), parseInt(days));
      return res.status(200).json({ success: true, period_days: parseInt(days), limit: parseInt(limit), top_comercios: top });
    }

    return res.status(404).json({ success: false, error: 'Action not found' });

  } catch (error) {
    console.error('Link-builder error:', error);
    return res.status(500).json({ error: 'Internal server error', message: error.message });
  }
}

// ========================================
// COMERCIO STATS
// ========================================
async function getComercioStats(comercio_id, days = 30, resultLimit = 1000) {
  try {
    const analyticsRef = collection(db, 'link_analytics');
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const q = query(
      analyticsRef,
      where('comercio_id', '==', comercio_id),
      where('timestamp', '>=', Timestamp.fromDate(cutoffDate)),
      orderBy('timestamp', 'desc'),
      fsLimit(resultLimit)
    );

    const snapshot = await getDocs(q);
    const stats = { total_interactions: snapshot.size, by_device: {}, by_variant: {}, by_interaction_type: {}, by_day: {} };

    snapshot.forEach(doc => {
      const data = doc.data();
      stats.by_device[data.device_type] = (stats.by_device[data.device_type] || 0) + 1;
      stats.by_variant[data.variant] = (stats.by_variant[data.variant] || 0) + 1;
      stats.by_interaction_type[data.interaction_type] = (stats.by_interaction_type[data.interaction_type] || 0) + 1;
      const dateKey = data.timestamp.toDate().toISOString().split('T')[0];
      stats.by_day[dateKey] = (stats.by_day[dateKey] || 0) + 1;
    });

    return stats;
  } catch (error) {
    console.error('Error fetching stats:', error);
    throw error;
  }
}

// ========================================
// TOP COMERCIOS
// ========================================
async function getTopComercios(limit = 10, days = 30) {
  try {
    const analyticsRef = collection(db, 'link_analytics');
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const q = query(analyticsRef, where('timestamp', '>=', Timestamp.fromDate(cutoffDate)));
    const snapshot = await getDocs(q);
    const comercioCounts = {};

    snapshot.forEach(doc => {
      const id = doc.data().comercio_id;
      comercioCounts[id] = (comercioCounts[id] || 0) + 1;
    });

    return Object.entries(comercioCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([comercio_id, interactions]) => ({ comercio_id, interactions }));
  } catch (error) {
    console.error('Error fetching top comercios:', error);
    throw error;
  }
}
