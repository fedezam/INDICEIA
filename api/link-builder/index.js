// api/link-builder/index.js
// 🔒 FORZAR NODE (firebase-admin NO funciona en edge)
export const config = {
  runtime: 'nodejs'
};

// ✅ CORREGIDO: Sacamos doc y getDoc
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { generateClaudeUrl } from '../../lib/link-builder/claude.js';
import { generateLandingHTML } from '../../lib/link-builder/landing.js';

console.log('[LINK-BUILDER] FILE LOADED');
console.log('[LINK-BUILDER] NODE_ENV:', process.env.NODE_ENV);
console.log('[LINK-BUILDER] HAS FIREBASE_ADMIN:', !!process.env.FIREBASE_ADMIN);

// 🔥 Inicialización Firebase Admin con logs defensivos
try {
  if (!getApps().length) {
    console.log('[LINK-BUILDER] Initializing Firebase Admin...');
    if (!process.env.FIREBASE_ADMIN) {
      throw new Error('FIREBASE_ADMIN env is missing');
    }
    initializeApp({
      credential: cert(JSON.parse(process.env.FIREBASE_ADMIN))
    });
    console.log('[LINK-BUILDER] Firebase Admin initialized');
  } else {
    console.log('[LINK-BUILDER] Firebase Admin already initialized');
  }
} catch (err) {
  console.error('[LINK-BUILDER] Firebase init FAILED');
  console.error(err);
}

// ⚠️ db se inicializa DESPUÉS del try
let db;
try {
  db = getFirestore();
  console.log('[LINK-BUILDER] Firestore instance OK');
} catch (err) {
  console.error('[LINK-BUILDER] Firestore init FAILED');
  console.error(err);
}

const ENTITY_BLOB_BASE =
  'https://oigwwzzmvibflie8.public.blob.vercel-storage.com/entidades';

export default async function handler(req, res) {
  console.log('[LINK-BUILDER] HANDLER START');
  try {
    const { comercio_id } = req.query;
    console.log('[LINK-BUILDER] comercio_id:', comercio_id);
    
    if (!comercio_id) {
      console.warn('[LINK-BUILDER] Missing comercio_id');
      return res.status(400).send('Missing comercio_id');
    }
    
    if (!db) {
      console.error('[LINK-BUILDER] Firestore not available');
      return res.status(500).send('Firestore not initialized');
    }
    
    console.log('[LINK-BUILDER] Fetching comercio document...');
    
    // ✅ CORREGIDO: Sintaxis de firebase-admin
    const comercioRef = db.collection('comercios').doc(comercio_id);
    const comercioSnap = await comercioRef.get();
    
    // ✅ CORREGIDO: .exists SIN paréntesis
    if (!comercioSnap.exists) {
      console.warn('[LINK-BUILDER] Comercio not found:', comercio_id);
      return res.status(404).send('Comercio no encontrado');
    }
    
    const data = comercioSnap.data();
    console.log('[LINK-BUILDER] Comercio data:', data);
    
    const { nombreComercio = 'tu comercio' } = data;
    const entityUrl = `${ENTITY_BLOB_BASE}/${comercio_id}/entity.json`;
    console.log('[LINK-BUILDER] entityUrl:', entityUrl);
    
    const claudeUrl = generateClaudeUrl(entityUrl);
    console.log('[LINK-BUILDER] claudeUrl:', claudeUrl);
    
    const html = generateLandingHTML(nombreComercio, claudeUrl);
    console.log('[LINK-BUILDER] HTML generated, length:', html.length);
    
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader(
      'Cache-Control',
      'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0'
    );
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    return res.status(200).send(html);
  } catch (error) {
    console.error('[LINK-BUILDER] UNHANDLED ERROR');
    console.error(error);
    return res.status(500).send('Error interno');
  }
}
