// /api/bot/[comercio_id].js
/**
 * BOT PUBLIC DATA ENDPOINT — ÍndiceIA
 * Solo data pública + tracking
 */

import { getFirestore } from 'firebase-admin/firestore';
import { initAdmin } from '../_utils/firebase-admin.js';

initAdmin();
const db = getFirestore();

export default async function handler(req, res) {
  const { comercio_id } = req.query;

  if (!comercio_id) {
    return res.status(400).json({ error: 'missing_comercio_id' });
  }

  try {
    // 🔹 Tracking fire-and-forget
    fetch(`${process.env.BASE_URL}/api/link-builder?action=log_interaction`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        comercio_id,
        interaction_type: 'landing_view',
        user_agent: req.headers['user-agent'],
        referrer: req.headers['referer'] || 'direct',
      }),
    }).catch(() => {});

    // 🔹 Obtener data pública del comercio
    const snap = await db.collection('entidades').doc(comercio_id).get();

    if (!snap.exists) {
      return res.status(404).json({ error: 'comercio_not_found' });
    }

    const data = snap.data();

    return res.status(200).json({
      comercio_id,
      nombre: data.nombreComercio,
      descripcion: data.descripcion || '',
      logo_url: data.logoUrl || null,
      categoria: data.categoria || null,
      entityPublicUrl: data.entityPublicUrl,
      public_link: `https://indiceia.com/c/${comercio_id}`,
      has_ia: Boolean(data.entityPublicUrl),
    });
  } catch (err) {
    console.error('[BOT DATA ERROR]', err);
    return res.status(500).json({ error: 'internal_error' });
  }
}

