// indiceia/api/mini-app.js
import admin from 'firebase-admin';

if (!admin.apps.length) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}

const db = admin.firestore();

export default async function handler(req, res) {
  const { slug } = req.query;
  if (!slug) return res.status(400).json({ ok: false, error: 'slug requerido' });

  try {
    // 1. slug → comercioId
    const landingSnap = await db.collection('landings').doc(slug).get();
    if (!landingSnap.exists) return res.status(404).json({ ok: false, error: 'landing no encontrada' });
    const { comercioId } = landingSnap.data();

    // 2. comercioId → comercio
    const comercioSnap = await db.collection('comercios').doc(comercioId).get();
    if (!comercioSnap.exists) return res.status(404).json({ ok: false, error: 'comercio no encontrado' });
    const data = comercioSnap.data();

    // 3. goods desde subcolección
    const goodsSnap = await db
      .collection('comercios').doc(comercioId)
      .collection('goods').get();
    const goods = goodsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    // 4. Respuesta
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({
      ok:         true,
      nombre:     data.nombreComercio || '',
      whatsapp:   data.whatsapp || '',
      templateId: data.templateId || 'C1_SimpleCatalog',
      goods,
    });

  } catch (err) {
    console.error('[MINI-APP]', err);
    return res.status(500).json({ ok: false, error: 'error interno' });
  }
}
