// INDICEIA/api/public-landing-event.js
import admin from 'firebase-admin';

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
  res.setHeader(
    'Access-Control-Allow-Origin',
    'https://indiceia-public.vercel.app'
  );
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const data = req.body;

  // ⛔️ YA NO ACEPTAMOS comercioId
  if (!data?.slug || !data?.event) {
    return res
      .status(400)
      .json({ error: 'slug y event son obligatorios' });
  }

  try {
    // ==================== RESOLVER SLUG → COMERCIO ====================
    const snap = await db
      .collection('comercios')
      .where('slug', '==', data.slug)
      .limit(1)
      .get();

    if (snap.empty) {
      return res.status(404).json({ error: 'Comercio no encontrado' });
    }

    const comercioDoc = snap.docs[0];
    const comercioId = comercioDoc.id;

    // ==================== WRITE STAT ====================
    await db
      .collection('comercios')
      .doc(comercioId)
      .collection('stats')
      .add({
        event: data.event,
        timestamp: data.timestamp ? new Date(data.timestamp) : new Date(),

        device: data.device || 'unknown',
        browser: data.browser || 'unknown',
        referrer: data.referrer || 'direct',
        fingerprint: data.fingerprint || null,

        // contexto útil
        slug: data.slug,
        source: 'public-landing',
      });

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Error escribiendo evento:', err);
    return res.status(500).json({ error: 'Error interno' });
  }
}
