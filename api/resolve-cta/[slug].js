// INDICEIA/api/resolve-cta/[slug].js
export const config = { runtime: 'nodejs' };

import admin from 'firebase-admin';
import { generateClaudeUrl } from '../../lib/link-builder/claude.js';

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(
      JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
    ),
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

    // 3️⃣ Construir CTA FINAL (CLAUDE + PROMPT + BLOB)
    const ctaUrl = generateClaudeUrl(data.entityPublicUrl);

    // 4️⃣ Responder JSON público
    return res.status(200).json({
      ok: true,
      slug,
      nombreComercio: data.nombreComercio,
      descripcion: data.descripcion || '',
      direccion: data.direccion || '',
      ciudad: data.ciudad || '',
      cta: {
        label: 'Hablar con la IA',
        url: ctaUrl,
      },
      branding: {
        logo: data.logoUrl || null,
        color: data.brandColor || '#0070f3',
      },
    });

  } catch (err) {
    console.error('[RESOLVE-CTA]', err);
    return res.status(500).json({ ok: false, error: 'error interno' });
  }
}
