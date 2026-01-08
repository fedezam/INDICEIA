// api/live/[slug].js
export const config = {
  runtime: 'nodejs'
};

import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { generateClaudeUrl } from '../../lib/link-builder/claude.js';
import { generateLandingHTML } from '../../lib/link-builder/landing.js';

// 🔥 Firebase Admin init
try {
  if (!getApps().length) {
    if (!process.env.FIREBASE_ADMIN) {
      throw new Error('FIREBASE_ADMIN env is missing');
    }
    initializeApp({
      credential: cert(JSON.parse(process.env.FIREBASE_ADMIN))
    });
  }
} catch (err) {
  console.error('[LIVE-SLUG] Firebase init FAILED', err);
}

let db;
try {
  db = getFirestore();
} catch (err) {
  console.error('[LIVE-SLUG] Firestore init FAILED', err);
}

const ENTITY_BLOB_BASE =
  'https://oigwwzzmvibflie8.public.blob.vercel-storage.com/entidades';

export default async function handler(req, res) {
  try {
    // 🔒 BLOQUEO: solo permitir acceso vía rewrite (/live/:slug)
    const rewrittenFrom = req.headers['x-vercel-rewrite'];
    if (!rewrittenFrom) {
      return res.status(404).send('Not found');
    }

    const { slug } = req.query;

    if (!slug) {
      return res.status(400).send('Slug no proporcionado');
    }

    if (!db) {
      return res.status(500).send('Firestore not initialized');
    }

    console.log('[LIVE-SLUG] Buscando slug:', slug);

    const comerciosRef = db.collection('comercios');
    const q = comerciosRef.where('landing.slug', '==', slug);
    const querySnap = await q.get();

    if (querySnap.empty) {
      console.warn('[LIVE-SLUG] Comercio no encontrado:', slug);
      return res.status(404).send('Comercio no encontrado');
    }

    const comercioDoc = querySnap.docs[0];
    const comercioId = comercioDoc.id;
    const data = comercioDoc.data();

    console.log('[LIVE-SLUG] Comercio encontrado:', comercioId);

    const { nombreComercio = 'tu comercio' } = data;
    const entityUrl = `${ENTITY_BLOB_BASE}/${comercioId}/entity.json`;
    const claudeUrl = generateClaudeUrl(entityUrl);
    const html = generateLandingHTML(nombreComercio, claudeUrl);

    // 🔗 CANONICAL URL
    const canonicalUrl = `https://indiceia.vercel.app/live/${slug}`;
    res.setHeader(
      'Link',
      `<${canonicalUrl}>; rel="canonical"`
    );

    // Headers estándar
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader(
      'Cache-Control',
      'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0'
    );
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    return res.status(200).send(html);

  } catch (error) {
    console.error('[LIVE-SLUG] ERROR:', error);
    return res.status(500).send('Error interno');
  }
}

