// INDICEIA/api/public-landing-event.js
import admin from 'firebase-admin';

// Inicializar Admin SDK si no está ya
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    }),
  });
}

const db = admin.firestore();

export default async function handler(req, res) {
  // 🔥 CORS - permitir requests desde indiceia-public
  res.setHeader('Access-Control-Allow-Origin', 'https://indiceia-public.vercel.app');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const data = req.body;

  if (!data?.comercioId || !data?.event) {
    return res.status(400).json({ error: 'comercioId y event son obligatorios' });
  }

  try {
    // ✅ PATH CORRECTO: dentro del comercio
    const ref = db
      .collection('comercios')
      .doc(data.comercioId)
      .collection('stats')
      .collection('events');

    await ref.add({
      event: data.event,
      timestamp: data.timestamp ? new Date(data.timestamp) : new Date(),
      device: data.device || 'unknown',
      browser: data.browser || 'unknown',
      referrer: data.referrer || 'direct',
      fingerprint: data.fingerprint || null,
    });

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Error escribiendo evento:', err);
    return res.status(500).json({ error: 'Error interno' });
  }
}
