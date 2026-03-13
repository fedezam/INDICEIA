// ============================================================
// indiceia/api/resolve-cta/[slug].js
// Expandido para incluir comercioId y seoHtmlUrl
// ============================================================

import admin from 'firebase-admin';
import { buildPrompt } from '../../lib/link-builder/config/prompt-template.js';

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
    const landingSnap = await db.collection('landings').doc(slug).get();
    if (!landingSnap.exists) return res.status(404).json({ ok: false, error: 'landing no encontrada' });

    const { comercioId } = landingSnap.data();

    const comercioSnap = await db.collection('comercios').doc(comercioId).get();
    if (!comercioSnap.exists) return res.status(404).json({ ok: false, error: 'comercio no encontrado' });

    const data = comercioSnap.data();
    if (!data.entityPublicUrl) return res.status(409).json({ ok: false, error: 'entidad no generada' });

    const miniPrompt = buildPrompt(data.entityPublicUrl);

    return res.status(200).json({
      ok:             true,
      slug,
      comercioId,                          // ← nuevo
      nombreComercio: data.nombreComercio,
      descripcion:    data.descripcion    || '',
      entityPublicUrl: data.entityPublicUrl,
      seoHtmlUrl:     data.seoHtmlUrl     || null,  // ← nuevo
      miniPrompt,
    });

  } catch (err) {
    console.error('[RESOLVE-CTA]', err);
    return res.status(500).json({ ok: false, error: 'error interno' });
  }
}
