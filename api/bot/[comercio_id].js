// /api/bot/[comercio_id].js
/**
 * BOT PUBLIC DATA ENDPOINT — ÍndiceIA v2
 * Devuelve información pública mínima para la landing.
 */

import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, getApps, cert } from 'firebase-admin/app';

if (!getApps().length) {
  initializeApp({
    credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)),
  });
}

const db = getFirestore();

export default async function handler(req, res) {
  const { comercio_id } = req.query;

  if (!comercio_id) {
    return res.status(400).json({ error: 'Missing comercio_id' });
  }

  try {
    // ========================================
    // 1. Obtener comercio
    // ========================================
    const comercioRef = db.collection('comercios').doc(comercio_id);
    const comercioSnap = await comercioRef.get();

    if (!comercioSnap.exists) {
      return res.status(404).json({ error: 'Comercio not found' });
    }

    const comercio = comercioSnap.data();

    // ========================================
    // 2. Respuesta pública (whitelist)
    // ========================================
    return res.status(200).json({
      comercio_id,
      active: comercio.active ?? true,

      nombre: comercio.nombre || '',
      descripcion: comercio.descripcion || '',
      logo_url: comercio.logo_url || null,

      // flags útiles para la landing
      has_ia: Boolean(comercio.entity_url),
      entity_url: comercio.entity_url || null,

      landing_version: comercio.landing_version || 'v1',

      // metadata no sensible
      updated_at: comercio.updated_at || null,
    });
  } catch (err) {
    console.error('[BOT DATA ERROR]', err);
    return res.status(500).json({ error: 'Internal error' });
  }
}
