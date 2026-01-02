// 🔒 Node runtime
export const config = { runtime: 'nodejs' };

import admin from 'firebase-admin';
import { generateClaudeUrl } from '../../lib/link-builder/claude.js';
import { generateLandingHTML } from '../../lib/link-builder/landing.js';

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
    return res.status(400).send('Slug requerido');
  }

  try {
    // 1️⃣ Resolver slug
    const slugSnap = await db.collection('landings').doc(slug).get();

    if (!slugSnap.exists) {
      return res.status(404).send('Landing no encontrada');
    }

    const { comercioId } = slugSnap.data();

    // 2️⃣ Cargar comercio
    const comercioSnap = await db
      .collection('comercios')
      .doc(comercioId)
      .get();

    if (!comercioSnap.exists) {
      return res.status(404).send('Comercio no encontrado');
    }

    const {
      nombreComercio = 'tu comercio',
      entityPublicUrl,
    } = comercioSnap.data();

    if (!entityPublicUrl) {
      return res.status(500).send('Entidad no generada');
    }

    // 3️⃣ Generar link a Claude (ACÁ está la clave)
    const claudeUrl = generateClaudeUrl(entityPublicUrl);

    // 4️⃣ Generar HTML
    const html = generateLandingHTML(nombreComercio, claudeUrl);

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');

    return res.status(200).send(html);
  } catch (err) {
    console.error('[LANDING]', err);
    return res.status(500).send('Error interno');
  }
}
