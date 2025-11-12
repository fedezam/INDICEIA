/**
 * ÍndiceIA - Link Builder API
 * Genera links, prompts y QR para activar entidades comerciales LER en Claude.
 * 
 * Formatos soportados:
 *  - redirect → redirige directo a Claude
 *  - json → devuelve info completa (debug / dashboard)
 *  - qr → devuelve imagen QR o data URI (según implementación)
 */

import { initializeApp } from 'firebase/app';
import { 
  getFirestore, collection, query, where, orderBy, limit, getDocs, addDoc 
} from 'firebase/firestore';
import CLAUDE_PROMPT_CONFIG from './config/prompt-template.js';

// -----------------------------------------------------
// 🔧 Inicializar Firebase (ajusta con tus credenciales)
// -----------------------------------------------------
const firebaseConfig = {
  // tus credenciales aquí
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// -----------------------------------------------------
// 🧩 Endpoint Principal
// -----------------------------------------------------
export default async function handler(req, res) {
  const { comercio_id } = req.query;
  const { variant = 'default', format = 'redirect' } = req.query;

  // Validación básica de ID
  if (!comercio_id || !/^[a-zA-Z0-9_-]+$/.test(comercio_id)) {
    return res.status(400).json({
      error: 'Invalid comercio_id',
      message: 'El identificador de comercio contiene caracteres no válidos.'
    });
  }

  try {
    // 1️⃣ Buscar manifest más reciente en Firestore
    const manifestsRef = collection(db, 'autobuilder_manifests');
    const q = query(
      manifestsRef,
      where('entity_id', '==', comercio_id),
      where('status', '==', 'success'),
      orderBy('timestamp', 'desc'),
      limit(1)
    );
    
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return res.status(404).json({
        error: 'Entity not found',
        message: `No existe una entidad válida para ${comercio_id}`,
        comercio_id
      });
    }

    const manifestData = snapshot.docs[0].data();
    const {
      vercel_blob_url,
      entity_id,
      timestamp,
      skeleton_version
    } = manifestData;

    // 2️⃣ Datos básicos del comercio (placeholder o fetch real)
    const comercioData = {
      nombre_comercio: entity_id.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      nombre_bot: `${entity_id}Bot`,
      tipo_negocio: 'comercio'
    };

    // 3️⃣ Generar prompt interpolado
    const prompt = CLAUDE_PROMPT_CONFIG.getPrompt(variant, {
      entity_url: vercel_blob_url,
      ...comercioData
    });

    // 4️⃣ Construir URL de Claude (nuevo chat)
    const claudeUrl = `https://claude.ai/new?prompt=${encodeURIComponent(prompt)}`;

    // 5️⃣ Construir URL de página intermedia
    const intermediateUrl = `https://tudominio.com/bot/${comercio_id}${variant !== 'default' ? `?v=${variant}` : ''}`;

    // 6️⃣ Generar URL de QR
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(intermediateUrl)}`;

    // 7️⃣ Registrar analytics
    await logAnalytics({
      comercio_id,
      variant,
      format,
      timestamp: new Date().toISOString(),
      user_agent: req.headers['user-agent'],
      ip: req.headers['x-forwarded-for'] || req.connection?.remoteAddress || 'unknown'
    });

    // 8️⃣ Responder según formato solicitado
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

  } catch (error) {
    console.error('Error en link-builder:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message,
      comercio_id
    });
  }
}

// -----------------------------------------------------
// 📊 Helper: Registrar analytics
// -----------------------------------------------------
async function logAnalytics(data) {
  try {
    const analyticsRef = collection(db, 'link_analytics');
    await addDoc(analyticsRef, data);  // ✅ SDK modular
  } catch (error) {
    console.warn('Analytics logging failed:', error.message);
  }
}

/**
 * 📘 EJEMPLOS DE RESPUESTA (format=json)
 * 
 * GET /api/link/pizzeria_001?format=json
 * {
 *   "success": true,
 *   "comercio_id": "pizzeria_001",
 *   "entity_url": "https://blob.vercel-storage.com/entities/pizzeria_001.json",
 *   "claude_url": "https://claude.ai/new?prompt=...",
 *   "intermediate_url": "https://tudominio.com/bot/pizzeria_001",
 *   "qr_url": "https://api.qrserver.com/v1/create-qr-code/?data=...",
 *   "variant_used": "default",
 *   "skeleton_version": "3.0.1",
 *   "last_build": "2025-11-12T10:30:00Z",
 *   "prompt_preview": "Eres un asistente comercial inteligente..."
 * }
 */
