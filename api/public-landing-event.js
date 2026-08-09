// INDICEIA/api/public-landing-event.js
import admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId:   process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey:  process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    }),
  });
}

const db = admin.firestore();

// ============================================================
// Canales conocidos — cualquier src fuera de esta lista
// se interpreta como slug de otra entidad (srcType = "entity")
// ============================================================
const RESERVED_CHANNELS = ['qr', 'ig', 'fb', 'web', 'direct', 'wa', 'email', 'ads'];

function resolveSource(src) {
  if (!src)                            return { src: 'direct', srcType: 'channel' };
  if (RESERVED_CHANNELS.includes(src)) return { src,           srcType: 'channel' };
  return                                      { src,           srcType: 'entity'  };
}

// ============================================================
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin',  'https://ia.indiceia.dev');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')    return res.status(405).json({ error: 'Method not allowed' });

  const data = req.body;

  if (!data?.slug || !data?.event) {
    return res.status(400).json({ error: 'slug y event son obligatorios' });
  }

  const { src, srcType } = resolveSource(data.src || null);

  try {
    // ── 1. Subcolección stats por comercio (comportamiento anterior) ──
    const snap = await db
      .collection('entidades')
      .where('slug', '==', data.slug)
      .limit(1)
      .get();

    if (!snap.empty) {
      const comercioId = snap.docs[0].id;

      await db
        .collection('entidades')
        .doc(comercioId)
        .collection('stats')
        .add({
          event:       data.event,
          timestamp:   data.timestamp ? new Date(data.timestamp) : new Date(),
          device:      data.device      || 'unknown',
          browser:     data.browser     || 'unknown',
          referrer:    data.referrer    || 'direct',
          fingerprint: data.fingerprint || null,
          slug:        data.slug,
          src,
          srcType,
          source: 'public-landing',
        });
    }

    // ── 2. Colección global landing_events (grafo de tráfico) ──
    await db.collection('landing_events').add({
      destination: data.slug,
      src,
      srcType,
      event:       data.event,
      timestamp:   data.timestamp ? new Date(data.timestamp) : new Date(),
      device:      data.device      || 'unknown',
      browser:     data.browser     || 'unknown',
    });

    return res.status(200).json({ ok: true });

  } catch (err) {
    console.error('[public-landing-event] error:', err);
    return res.status(500).json({ error: 'Error interno' });
  }
}
