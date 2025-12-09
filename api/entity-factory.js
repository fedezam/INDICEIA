import express from 'express';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, doc, getDoc, collection, getDocs } from 'firebase-admin/firestore';
import { Blob } from '@vercel/blob';
import { v4 as uuid } from 'uuid';
import rateLimit from 'express-rate-limit';
import bodyParser from 'body-parser';

// ---------- CONFIG FIREBASE ----------
initializeApp({
  credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT))
});
const db = getFirestore();

// ---------- CONFIG EXPRESS ----------
const app = express();
app.use(bodyParser.json({ limit: '5mb' })); // limite payload

// ---------- RATE LIMIT ----------
const buildLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 min
  max: 5,
  message: { success: false, error: 'Too many requests, slow down!' }
});
app.use('/api/entity-factory', buildLimiter);

// ---------- CACHING ----------
const skeletonCache = { data: null };
const templateCache = { data: null };
const comercioCache = new Map(); // caching temporal Firestore 5min
const catalogoCache = new Map();

// ---------- PREFETCH ON START ----------
async function prefetchResources() {
  // Skeleton
  if (!skeletonCache.data) {
    skeletonCache.data = await fetchSkeleton();
  }
  // Template
  if (!templateCache.data) {
    templateCache.data = await fetchTemplate();
  }
}
prefetchResources();

// ---------- HELPERS ----------
async function fetchSkeleton() {
  // fetch local o remoto
  return require('./skeleton.json');
}
async function fetchTemplate() {
  return require('./entity_template.json');
}

async function fetchComercioDataCached(comercio_id) {
  const now = Date.now();
  const cached = comercioCache.get(comercio_id);
  if (cached && now - cached.fetchedAt < 300000) return cached.data;
  const data = await fetchComercioData(comercio_id);
  comercioCache.set(comercio_id, { data, fetchedAt: now });
  return data;
}

async function fetchCatalogoCached(comercio_id) {
  const now = Date.now();
  const cached = catalogoCache.get(comercio_id);
  if (cached && now - cached.fetchedAt < 300000) return cached.data;
  const data = await fetchCatalogo(comercio_id);
  catalogoCache.set(comercio_id, { data, fetchedAt: now });
  return data;
}

// ---------- FIRESTORE FETCH ----------
async function fetchComercioData(comercio_id) {
  const docSnap = await getDoc(doc(db, 'comercios', comercio_id));
  if (!docSnap.exists()) throw new Error('Comercio no encontrado');
  return docSnap.data();
}

async function fetchCatalogo(comercio_id) {
  const colSnap = await getDocs(collection(db, 'comercios', comercio_id, 'catalogo'));
  return colSnap.docs.map(d => d.data());
}

// ---------- VALIDATION ----------
function validateEntity(entity) {
  if (!entity.meta || !entity.blocks) throw new Error('Estructura entity inválida');
  return true;
}

// ---------- BUILD ENTITY ----------
async function buildEntity(comercio_id) {
  const skeleton = skeletonCache.data;
  const template = templateCache.data;

  const comercio = await fetchComercioDataCached(comercio_id);
  const catalogo = await fetchCatalogoCached(comercio_id);

  // Build dinámico
  const entity = {
    ...skeleton,
    blocks: {
      A: template.blocks.A, // fijo
      B: { comercio, catalogo }, // dinámico
      C: template.blocks.C // visual opcional
    },
    meta: { ...skeleton.meta, buildId: uuid(), timestamp: Date.now() }
  };

  validateEntity(entity);
  return entity;
}

// ---------- UPLOAD TO VERCEL ----------
async function uploadToVercel(entity, retries = 5) {
  const blobName = `${entity.meta.buildId}.json`;
  try {
    return await Blob.upload(JSON.stringify(entity), { name: blobName });
  } catch (err) {
    if (retries > 0) {
      await new Promise(r => setTimeout(r, 500 * (6 - retries))); // backoff exponencial
      return uploadToVercel(entity, retries - 1);
    }
    throw err;
  }
}

// ---------- ROUTE ----------
app.post('/api/entity-factory/build', async (req, res) => {
  const startTs = Date.now();
  const apiKey = req.headers['x-api-key'];
  if (!apiKey || apiKey !== process.env.API_KEY) return res.status(401).json({ success: false, error: 'Unauthorized' });

  const { comercio_id } = req.body;
  if (!comercio_id) return res.status(400).json({ success: false, error: 'Missing comercio_id' });

  try {
    const entity = await buildEntity(comercio_id);
    const uploadResult = await uploadToVercel(entity);

    // Guardar URL en Firestore para que luego la use link-builder
await db.collection("comercios").doc(comercio_id).update({
  entityURL: uploadResult.url,
  entityUpdatedAt: Date.now(),
  entityBuildId: entity.meta.buildId
});


    // Logging
    console.log(`[BUILD SUCCESS] ${comercio_id} | buildId: ${entity.meta.buildId} | time: ${Date.now() - startTs}ms | size: ${Buffer.byteLength(JSON.stringify(entity), 'utf8')} bytes`);

    res.json({ success: true, buildId: entity.meta.buildId, url: uploadResult.url });
  } catch (err) {
    console.error(`[BUILD ERROR] ${comercio_id} | ${err.message}`);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default app;
