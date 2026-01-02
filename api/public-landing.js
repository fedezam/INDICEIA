// api/public-landing.js

export const config = {
  runtime: 'nodejs'
};

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, doc, getDoc, query, collection, where, getDocs } from 'firebase-admin/firestore';

import { generateClaudeUrl } from '../lib/link-builder/claude.js';
import { generateLandingHTML } from '../lib/link-builder/landing.js';

// ─────────────────────────────────────────────
// 🔥 Firebase Admin Init
// ─────────────────────────────────────────────
if (!getApps().length) {
  console.log('[PUBLIC-LANDING] Initializing Firebase Admin');
  initializeApp({
    credential: cert(JSON.parse(process.env.FIREBASE_ADMIN))
  });
}

const db = getFirestore();

// ─────────────────────────────────────────────
// 🌐 Config
// ─────────────────────────────────────────────
const ENTITY_BLOB_BASE =
  'https://oigwwzzmvibflie8.public.blob.vercel-storage.com/entidades';

// ─────────────────────────────────────────────
// 🧠 Resolver: slug → comercio
// ─────────────────────────────────────────────
async function resolveComercioBySlug(slug) {
  console.log('[PUBLIC-LANDING] Resolving slug:', slug);

  const q = query(
    collection(db, 'comercios'),
    where('slug', '==', slug)
  );

  const snap = await getDocs(q);

  if (snap.empty) {
    console.warn('[PUBLIC-LANDING] Slug not found:', slug);
    return null;
  }

  const docSnap = snap.docs[0];
  return {
    id: docSnap.id,
    ...docSnap.data()
  };
}

// ─────────────────────────────────────────────
// 🚀 Handler
// ─────────────────────────────────────────────
export default async function handler(req, res) {
  const { slug } = req.query;

  console.log('[PUBLIC-LANDING] Request received', {
    method: req.method,
    slug
  });

  if (!slug) {
    return res.status(400).send('Missing slug');
  }

  try {
    // 1️⃣ Resolver comercio
    const comercio = await resolveComercioBySlug(slug);

    if (!comercio) {
      return res.status(404).send('Comercio no encontrado');
    }

    const {
      nombreComercio = 'este comercio'
    } = comercio;

    // 2️⃣ Entity JSON
    const entityUrl = `${ENTITY_BLOB_BASE}/${comercio.id}/entity.json`;
    console.log('[PUBLIC-LANDING] Entity URL:', entityUrl);

    // 3️⃣ Claude URL
    const claudeUrl = generateClaudeUrl(entityUrl);
    console.log('[PUBLIC-LANDING] Claude URL generated');

    // 4️⃣ HTML dinámico
    const html = generateLandingHTML(nombreComercio, claudeUrl);

    // 5️⃣ Response
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');

    console.log('[PUBLIC-LANDING] HTML sent successfully');
    return res.status(200).send(html);

  } catch (error) {
    console.error('[PUBLIC-LANDING ERROR]', error);
    return res.status(500).send('Error interno');
  }
}
