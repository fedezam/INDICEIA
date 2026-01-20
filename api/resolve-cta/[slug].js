// api/resolve-cta/[slug].js
import admin from 'firebase-admin';
import { buildPrompt } from '../../lib/link-builder/config/prompt-template.js';

if (!admin.apps.length) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

  // 🔧 Fix Vercel: convertir \\n → saltos reales
  serviceAccount.private_key =
    serviceAccount.private_key.replace(/\\n/g, '\n');

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

export default async function handler(req, res) {
  const { slug } = req.query;

  if (!slug) {
    return res.status(400).json({ ok: false, error: 'slug requerido' });
  }

  try {
    // 1️⃣ Resolver slug → comercioId
    const landingSnap = await db.collection('landings').doc(slug).get();
    if (!landingSnap.exists) {
      return res.status(404).json({ ok: false, error: 'landing no encontrada' });
    }

    const { comercioId } = landingSnap.data();

    // 2️⃣ Cargar comercio
    const comercioSnap = await db.collection('comercios').doc(comercioId).get();
    if (!comercioSnap.exists) {
      return res.status(404).json({ ok: false, error: 'comercio no encontrado' });
    }

    const data = comercioSnap.data();

    if (!data.entityPublicUrl) {
      return res.status(409).json({ ok: false, error: 'entidad no generada' });
    }

    // 3️⃣ Mini-prompt (texto puro)
    const miniPrompt = buildPrompt(data.entityPublicUrl);

    // 4️⃣ Contrato público FINAL
    return res.status(200).json({
      ok: true,
      slug,

      nombreComercio: data.nombreComercio,
      descripcion: data.descripcion || '',

      entityPublicUrl: data.entityPublicUrl,
      miniPrompt,
    });

  } catch (err) {
    console.error('[RESOLVE-CTA]', err);
    return res.status(500).json({ ok: false, error: 'error interno' });
  }
}
