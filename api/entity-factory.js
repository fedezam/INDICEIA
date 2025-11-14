// /api/entity-factory.js
import fetch from 'node-fetch';
import crypto from 'crypto';
import { put } from '@vercel/blob';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, collection, getDocs, setDoc, updateDoc, Timestamp } from 'firebase/firestore';

// ========================================
// CONFIGURACIÓN
// ========================================
const SKELETON_URL = process.env.SKELETON_URL;
const TEMPLATES_REGISTRY_URL = process.env.TEMPLATES_REGISTRY_URL;
const VERCEL_BLOB_TOKEN = process.env.BLOB_READ_WRITE_TOKEN;
const CACHE_TTL = { SKELETON_MS: 3600000, TEMPLATES_MS: 3600000 }; // 1h
const RATE_LIMIT_MAX = 20; // max requests por IP
const RATE_LIMIT_WINDOW_MS = 60000; // 1 min

// ========================================
// FIRESTORE INIT
// ========================================
let db;
try {
  db = getFirestore(initializeApp({
    apiKey: process.env.FIREBASE_API_KEY,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN,
    projectId: process.env.FIREBASE_PROJECT_ID,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.FIREBASE_APP_ID
  }));
} catch { db = getFirestore(); }

// ========================================
// LOGGER
// ========================================
class Logger {
  static log(level, msg, meta = {}) {
    const ts = new Date().toISOString();
    console.log(`[${ts}] [${level}] ${msg}`, meta);
  }
  static info(msg, meta) { this.log('INFO', msg, meta); }
  static debug(msg, meta) { this.log('DEBUG', msg, meta); }
  static warn(msg, meta) { this.log('WARN', msg, meta); }
  static error(msg, meta) { this.log('ERROR', msg, meta); }
  static success(msg, meta) { this.log('SUCCESS', msg, meta); }
}

// ========================================
// CACHE & RATE LIMIT
// ========================================
let skeletonCache = null, skeletonFetchedAt = 0;
let templatesRegistryCache = null, templatesFetchedAt = 0;
const rateLimitMap = new Map();

function checkRateLimit(ip) {
  const now = Date.now();
  if (!rateLimitMap.has(ip)) rateLimitMap.set(ip, []);
  const timestamps = rateLimitMap.get(ip).filter(ts => now - ts < RATE_LIMIT_WINDOW_MS);
  if (timestamps.length >= RATE_LIMIT_MAX) return false;
  timestamps.push(now);
  rateLimitMap.set(ip, timestamps);
  return true;
}

// ========================================
// UTILS
// ========================================
function generateSemanticTags(nombre = '', descripcion = '') {
  const text = `${nombre} ${descripcion}`.toLowerCase();
  return [...new Set((text.match(/\b\w{4,}\b/g) || []))].slice(0,10);
}

function extractWhatsAppNumber(urlOrNumber = '') {
  if (!urlOrNumber) return '';
  const m = typeof urlOrNumber === 'string' && urlOrNumber.match(/wa\.me\/(\d+)/);
  if (m) return m[1];
  const digits = urlOrNumber.replace(/\D/g,'');
  return digits.length ? digits : '';
}

async function retryWithBackoff(fn, retries = 3, delay = 1000) {
  for (let i=0; i<retries; i++) {
    try { return await fn(); } 
    catch (err) { if (i === retries-1) throw err; await new Promise(r => setTimeout(r, delay*Math.pow(2,i))); }
  }
}

function wrapError(err, phase='unknown') {
  if (err.code) return err;
  return { code: 'UNKNOWN_ERROR', message: err.message, phase, stack: err.stack };
}

// ========================================
// FETCH CACHEABLE
// ========================================
async function fetchSkeleton() {
  const now = Date.now();
  if (skeletonCache && now - skeletonFetchedAt < CACHE_TTL.SKELETON_MS) {
    Logger.debug('Skeleton cache hit');
    return skeletonCache;
  }
  Logger.debug('Skeleton cache miss, fetching...');
  const res = await fetch(SKELETON_URL);
  if (!res.ok) throw new Error(`Failed to fetch skeleton (status ${res.status})`);
  skeletonCache = await res.json();
  skeletonFetchedAt = Date.now();
  return skeletonCache;
}

async function fetchTemplatesRegistry() {
  const now = Date.now();
  if (templatesRegistryCache && now - templatesFetchedAt < CACHE_TTL.TEMPLATES_MS) {
    Logger.debug('Templates cache hit');
    return templatesRegistryCache;
  }
  Logger.debug('Templates cache miss, fetching...');
  const res = await fetch(TEMPLATES_REGISTRY_URL);
  if (!res.ok) return [];
  const json = await res.json();
  templatesRegistryCache = Array.isArray(json) ? json : (json.templates || []);
  templatesFetchedAt = Date.now();
  return templatesRegistryCache;
}

// ========================================
// HANDLER
// ========================================
export default async function handler(req, res) {
  const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  if (!checkRateLimit(ip)) {
    Logger.warn('Rate limit exceeded', { ip });
    return res.status(429).json({ success: false, error: 'Rate limit exceeded' });
  }

  const { action, build_id } = req.query;
  const { method } = req;

  const startTime = Date.now();

  try {
    // Validación de API key
    const apiKey = req.headers['x-api-key'];
    if (process.env.API_KEY && apiKey !== process.env.API_KEY) return res.status(401).json({ success:false, error:'Unauthorized' });

    if (method === 'POST' && (action==='build'||action==='rebuild')) {
      const { comercio_id, force_template = null, visual=false } = req.body || {};
      if (!comercio_id) return res.status(400).json({ success:false, error:'comercio_id required' });

      const buildId = build_id || `build_${Date.now()}`;
      Logger.info(`Build started`, { buildId, comercio_id, action });

      // Fetch skeleton y templates
      const [skeleton, templates] = await Promise.all([fetchSkeleton(), fetchTemplatesRegistry()]);
      const t0 = Date.now();
      // TODO: fetch comercio, catalogo y iaConfig y ensamblar entity (igual que tu buildEntity)
      const totalTime = Date.now() - startTime;

      Logger.success(`Build finished`, { buildId, totalTime });

      return res.status(200).json({
        success: true,
        build_id: buildId,
        metrics: { total_time_ms: totalTime }
      });
    }

    // Status / manifest
    if (method==='GET' && (action==='status'||action==='manifest')) {
      if (!build_id) return res.status(400).json({ success:false, error:'build_id required' });
      const manifestRef = doc(db, 'entity_builds', build_id);
      const snap = await getDoc(manifestRef);
      if (!snap.exists()) return res.status(404).json({ success:false, error:'Build not found' });
      return res.status(200).json({ success:true, build: snap.data() });
    }

    // Validate
    if (method==='POST' && action==='validate') {
      const { entity } = req.body || {};
      if (!entity) return res.status(400).json({ success:false, error:'entity required' });
      // TODO: validateEntity
      return res.status(200).json({ success:true, validation: { passed:true } });
    }

    return res.status(404).json({ success:false, error:'Not found' });

  } catch(err) {
    const wrapped = wrapError(err);
    Logger.error('Handler error', wrapped);
    return res.status(500).json({ success:false, error: wrapped });
  }
}
