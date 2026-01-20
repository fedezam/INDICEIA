// api/resolve-cta/[slug].js
import admin from 'firebase-admin';
import { buildPrompt } from '../../lib/link-builder/config/prompt-template.js';
import { generateLLMUrl } from '../../lib/link-builder/link-generator.js';

// ================================
// 🔧 Firebase Admin init (FIX \\n)
// ================================
if (!admin.apps.length) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

  // FIX CLAVE PRIVADA (Vercel env vars)
  serviceAccount.private_key =
    serviceAccount.private_key.replace(/\\n/g, '\n');

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

// ================================
// Handler
// ================================
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

    // 3️⃣ Construir prompt embebido (neutral)
    const prompt = buildPrompt(data.entityPublicUrl);

    // 4️⃣ Construir CTA universal
    const ctaUrl = generateLLMUrl({ prompt });

    // 5️⃣ Devolver contrato público
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
