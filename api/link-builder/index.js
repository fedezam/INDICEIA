// api/link-builder/index.js
export const config = {
  runtime: 'nodejs'
};
import { getFirestore, getDoc, doc } from 'firebase-admin/firestore'; // ✅ Agregado getFirestore
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { generateClaudeUrl } from '../../lib/link-builder/claude.js';
import { generateLandingHTML } from '../../lib/link-builder/landing.js';

if (!getApps().length) {
  initializeApp({
    credential: cert(JSON.parse(process.env.FIREBASE_ADMIN))
  });
}

const db = getFirestore(); // ✅ Ahora funciona
const ENTITY_BLOB_BASE = 'https://oigwwzzmvibflie8.public.blob.vercel-storage.com/entidades';

export default async function handler(req, res) {
  const { comercio_id } = req.query;
  
  if (!comercio_id) {
    return res.status(400).send('Missing comercio_id');
  }

  try {
    const comercioRef = doc(db, 'comercios', comercio_id);
    const comercioSnap = await getDoc(comercioRef);
    
    if (!comercioSnap.exists()) {
      return res.status(404).send('Comercio no encontrado');
    }

    const { nombreComercio = 'tu comercio' } = comercioSnap.data(); // ✅ Campo correcto

    const entityUrl = `${ENTITY_BLOB_BASE}/${comercio_id}/entity.json`;
    const claudeUrl = generateClaudeUrl(entityUrl);
    const html = generateLandingHTML(nombreComercio, claudeUrl);

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).send(html);
    
  } catch (error) {
    console.error('[LINK-BUILDER ERROR]', error);
    return res.status(500).send('Error interno');
  }
}
