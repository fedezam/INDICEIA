// /api/entity/[id].js
// ⟦ROLE⟧ Proxy de entidad. Lee Blob estático → inyecta horaActual → devuelve JSON fresco.

import admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)),
  });
}

const db = admin.firestore();

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'id inválido' });
  }

  try {
    // 1. Leer URL del Blob desde Firestore
    const snap = await db.collection('entidades').doc(id).get();

    if (!snap.exists) {
      return res.status(404).json({ error: 'Entidad no encontrada' });
    }

    const { entityPublicUrl } = snap.data();

    if (!entityPublicUrl) {
      return res.status(404).json({ error: 'Entidad no generada aún' });
    }

    // 2. Fetchear el JSON estático desde Blob
    const blobRes = await fetch(entityPublicUrl);

    if (!blobRes.ok) {
      return res.status(502).json({ error: 'No se pudo leer la entidad desde Blob' });
    }

    const entity = await blobRes.json();

    // 3. Obtener hora actual de Argentina
    const horaRes = await fetch('https://indiceia.vercel.app/api/hora');
    const horaActual = horaRes.ok
      ? (await horaRes.json()).datetime
      : new Date().toLocaleString('sv-SE', { timeZone: 'America/Argentina/Buenos_Aires' });

    // 4. Inyectar horaActual en el root — el mind la lee directo
    const enriched = {
      horaActual,
      ...entity,
    };

    // 5. Cache corto — la hora cambia, no tiene sentido cachear mucho
    res.setHeader('Cache-Control', 'public, max-age=60');
    return res.status(200).json(enriched);

  } catch (err) {
    console.error('[api/entity] Error:', err);
    return res.status(500).json({ error: 'Error interno' });
  }
}
