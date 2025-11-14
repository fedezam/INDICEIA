// /api/entity-factory.js
/**
 * 🏭 ENTITY FACTORY - UNIFIED API
 * 
 * Combina TODOS los endpoints de entity-factory en UNA función serverless:
 * - build.js
 * - fetch.js
 * - manifest.js
 * - upload.js
 * - validate.js
 * 
 * ENDPOINTS:
 * POST /api/entity-factory?action=build
 * POST /api/entity-factory?action=rebuild
 * GET  /api/entity-factory?action=status&build_id=XXX
 * GET  /api/entity-factory?action=manifest&build_id=XXX
 * POST /api/entity-factory?action=validate
 */

import fetch from 'node-fetch';
import crypto from 'crypto';
import { put } from '@vercel/blob';
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, doc, getDoc, collection, getDocs, setDoc, updateDoc, Timestamp 
} from 'firebase/firestore';

// ========================================
// CONFIGURACIÓN
// ========================================
const SKELETON_URL = process.env.SKELETON_URL || 'https://raw.githubusercontent.com/your-repo/blockA.json';
const TEMPLATES_REGISTRY_URL = process.env.TEMPLATES_REGISTRY_URL || 'https://raw.githubusercontent.com/your-repo/registry.json';
const VERCEL_BLOB_TOKEN = process.env.BLOB_READ_WRITE_TOKEN;
const CACHE_TTL = { SKELETON_MS: 3600000, TEMPLATES_MS: 3600000 };

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID
};

// Inicializar Firebase
let db;
try {
  const app = initializeApp(firebaseConfig);
  db = getFirestore(app);
} catch (e) {
  db = getFirestore();
}

// Caches
let skeletonCache = null;
let skeletonFetchedAt = 0;
let templatesRegistryCache = null;
let templatesFetchedAt = 0;

// ========================================
// LOGGER
// ========================================
class Logger {
  static info(msg, meta) { console.log(`ℹ️ ${msg}`, meta || ''); }
  static debug(msg, meta) { console.log(`🔍 ${msg}`, meta || ''); }
  static warn(msg, meta) { console.warn(`⚠️ ${msg}`, meta || ''); }
  static error(msg, meta) { console.error(`❌ ${msg}`, meta || ''); }
  static success(msg, meta) { console.log(`✅ ${msg}`, meta || ''); }
}

// ========================================
// ERRORS
// ========================================
class BuildError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.code = code;
    this.details = details;
    this.phase = details.phase || 'unknown';
  }
  toJSON() {
    return { code: this.code, message: this.message, details: this.details };
  }
}

function wrapError(err, phase) {
  if (err instanceof BuildError) return err;
  return new BuildError(err.code || 'UNKNOWN_ERROR', err.message, { phase, original: err });
}

async function retryWithBackoff(fn, maxRetries = 3, baseDelay = 1000) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (err) {
      if (i === maxRetries - 1) throw err;
      await new Promise(r => setTimeout(r, baseDelay * Math.pow(2, i)));
    }
  }
}

// ========================================
// TAGS GENERATOR
// ========================================
function generateSemanticTags(nombre = '', descripcion = '') {
  const text = `${nombre} ${descripcion}`.toLowerCase();
  const keywords = text.match(/\b\w{4,}\b/g) || [];
  return [...new Set(keywords)].slice(0, 10);
}

// ========================================
// MANIFEST FUNCTIONS
// ========================================
async function createManifestEntry(build_id, comercio_id, metadata = {}) {
  try {
    const ref = doc(db, 'entity_builds', build_id);
    const payload = {
      build_id,
      comercio_id,
      status: 'in_progress',
      created_at: Timestamp.now(),
      updated_at: Timestamp.now(),
      logs: [],
      metadata,
    };
    await setDoc(ref, payload);
    Logger.info(`🧱 Build manifest creado → ${build_id}`);
    return payload;
  } catch (error) {
    Logger.error(`❌ Error creando manifest ${build_id}:`, error);
    throw error;
  }
}

async function updateManifest(build_id, data = {}) {
  try {
    const ref = doc(db, 'entity_builds', build_id);
    const payload = { ...data, updated_at: Timestamp.now() };
    await updateDoc(ref, payload);
    Logger.debug(`🪶 Manifest actualizado (${build_id})`);
    return true;
  } catch (error) {
    Logger.error(`❌ Error actualizando manifest ${build_id}:`, error);
    throw error;
  }
}

async function appendLog(build_id, message, level = 'info') {
  try {
    const ref = doc(db, 'entity_builds', build_id);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      Logger.warn(`⚠️ Manifest no encontrado para build ${build_id}`);
      return false;
    }
    const oldLogs = snap.data().logs || [];
    const newLog = { timestamp: new Date().toISOString(), level, message };
    const updatedLogs = [...oldLogs, newLog].slice(-1000);
    await updateDoc(ref, { logs: updatedLogs, updated_at: Timestamp.now() });
    Logger.debug(`📜 Log añadido a manifest ${build_id}: ${message}`);
    return true;
  } catch (error) {
    Logger.error(`❌ Error agregando log al manifest ${build_id}:`, error);
    return false;
  }
}

async function getManifest(build_id) {
  try {
    const ref = doc(db, 'entity_builds', build_id);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      Logger.warn(`⚠️ Manifest no encontrado: ${build_id}`);
      return null;
    }
    Logger.info(`📖 Manifest obtenido: ${build_id}`);
    return snap.data();
  } catch (error) {
    Logger.error(`❌ Error obteniendo manifest ${build_id}:`, error);
    throw error;
  }
}

async function markBuildAsSuccess(build_id, extra = {}) {
  try {
    const payload = { status: 'success', finished_at: Timestamp.now(), ...extra };
    await updateManifest(build_id, payload);
    Logger.info(`✅ Build marcado como SUCCESS: ${build_id}`);
    return true;
  } catch (error) {
    Logger.error(`❌ Error marcando build ${build_id} como success:`, error);
    throw error;
  }
}

async function markBuildAsFailed(build_id, error) {
  try {
    const payload = {
      status: 'failed',
      finished_at: Timestamp.now(),
      error_message: error?.message || 'Unknown error',
      error_stack: error?.stack || null
    };
    await updateManifest(build_id, payload);
    Logger.warn(`❌ Build marcado como FAILED: ${build_id}`);
    return true;
  } catch (err) {
    Logger.error(`Error marcando build ${build_id} como failed:`, err);
    throw err;
  }
}

// ========================================
// FETCH FUNCTIONS
// ========================================
async function fetchComercioData(comercio_id) {
  try {
    const comercioRef = doc(db, 'comercios', comercio_id);
    const comercioSnap = await getDoc(comercioRef);
    if (!comercioSnap.exists()) {
      Logger.warn(`⚠️ Comercio ${comercio_id} no encontrado`);
      throw new Error(`Comercio ${comercio_id} not found`);
    }
    const data = comercioSnap.data();
    Logger.info(`✅ Comercio data fetched: ${data.nombre}`);
    return { ...data, id: comercio_id };
  } catch (error) {
    Logger.error(`❌ Error fetching comercio ${comercio_id}:`, error);
    throw error;
  }
}

async function fetchCatalogo(comercio_id) {
  try {
    const catalogoRef = collection(db, `comercios/${comercio_id}/catalogo`);
    const catalogoSnap = await getDocs(catalogoRef);
    const rawItems = [];
    catalogoSnap.forEach((doc) => {
      rawItems.push({ id: doc.id, ...doc.data() });
    });
    Logger.info(`📦 ${rawItems.length} items obtenidos del catálogo`);

    const processedItems = rawItems.map(item => {
      if (!item.categoria) item.categoria = 'General';
      if (!item.id) item.id = `${item.categoria.toUpperCase()}_${Date.now()}`;
      if (!item.tags || item.tags.length === 0) {
        item.tags = generateSemanticTags(item.nombre, item.descripcion);
      }
      return {
        id: item.id,
        nombre: item.nombre || 'Sin nombre',
        descripcion: item.descripcion || '',
        categoria: item.categoria,
        disponible: item.disponible !== false,
        stock: item.stock ?? null,
        tags: item.tags,
        image_url: item.image_url || item.imagen || null,
        images: item.images || (item.image_url ? [item.image_url] : []),
        precio: item.precio ?? null,
        precio_mediana: item.precio_mediana ?? null,
        precio_grande: item.precio_grande ?? null,
        specs: item.specs || null,
        created_at: item.created_at || new Date().toISOString(),
        updated_at: item.updated_at || new Date().toISOString(),
      };
    });

    const categorias = [...new Set(processedItems.map((i) => i.categoria))];
    Logger.info(`📂 Categorías detectadas: ${categorias.join(', ')}`);

    return {
      categorias,
      items: processedItems,
      metadata: {
        total_items: processedItems.length,
        last_sync: new Date().toISOString(),
      },
    };
  } catch (error) {
    Logger.error(`❌ Error fetching catalogo for ${comercio_id}:`, error);
    throw error;
  }
}

async function fetchIAConfig(comercio_id) {
  try {
    const configRef = doc(db, `comercios/${comercio_id}/config/ia`);
    const configSnap = await getDoc(configRef);
    if (!configSnap.exists()) {
      Logger.debug(`No IA config found for ${comercio_id}, usando defaults`);
      return null;
    }
    return configSnap.data();
  } catch (error) {
    Logger.warn(`⚠️ Error fetching IA config:`, error);
    return null;
  }
}

// ========================================
// UPLOAD FUNCTIONS
// ========================================
async function uploadToVercel({ entity, entity_id, build_id }) {
  const uploadStartTime = performance.now();
  try {
    const jsonString = JSON.stringify(entity, null, 2);
    const jsonBuffer = Buffer.from(jsonString, 'utf8');
    const sizeBytes = jsonBuffer.length;
    Logger.info(`[${build_id}] Preparing upload: ${(sizeBytes / 1024).toFixed(2)} KB`);

    const hash = crypto.createHash('sha256').update(jsonString).digest('hex');
    const hashWithPrefix = `sha256:${hash}`;
    Logger.debug(`[${build_id}] Hash: ${hashWithPrefix}`);

    const filename = `entities/${entity_id}.json`;
    const blob = await put(filename, jsonBuffer, {
      access: 'public',
      token: VERCEL_BLOB_TOKEN,
      contentType: 'application/json',
      addRandomSuffix: false
    });

    const uploadTimeMs = Math.round(performance.now() - uploadStartTime);
    Logger.info(`[${build_id}] ✅ Uploaded ${filename} → ${blob.url} (${uploadTimeMs}ms)`);

    if (!entity.meta) entity.meta = {};
    if (!entity.meta.storage) entity.meta.storage = {};
    entity.meta.storage.vercel_blob_url = blob.url;

    return {
      url: blob.url,
      hash: hashWithPrefix,
      size_bytes: sizeBytes,
      upload_time_ms: uploadTimeMs,
      blob_metadata: {
        pathname: blob.pathname,
        content_type: blob.contentType,
        uploaded_at: blob.uploadedAt
      }
    };
  } catch (error) {
    Logger.error(`[${build_id}] ❌ Upload failed`, error);
    throw new BuildError('UPLOAD_ERROR', 'Failed to upload entity to Vercel Blob', {
      original: error.message,
      entity_id
    });
  }
}

// ========================================
// VALIDATE FUNCTIONS
// ========================================
async function validateEntity(entity) {
  const errors = [];
  const warnings = [];

  try {
    if (!entity.meta) errors.push({ code: 'MISSING_META', message: 'meta block is required' });
    if (!entity.bloque_A_nucleo_LER) errors.push({ code: 'MISSING_BLOQUE_A', message: 'bloque_A_nucleo_LER is required' });
    if (!entity.bloque_B_contexto_comercial) errors.push({ code: 'MISSING_BLOQUE_B', message: 'bloque_B_contexto_comercial is required' });

    if (entity.meta) {
      const { schema_version, version, author } = entity.meta;
      if (!schema_version) {
        errors.push({ code: 'MISSING_SCHEMA_VERSION', message: 'meta.schema_version is required' });
      } else if (schema_version !== '3.0.1') {
        warnings.push({ code: 'SCHEMA_VERSION_MISMATCH', message: `Schema version should be 3.0.1 (found ${schema_version})` });
      }
      if (!version) warnings.push({ code: 'MISSING_VERSION', message: 'meta.version is recommended' });
      if (!author) warnings.push({ code: 'MISSING_AUTHOR', message: 'meta.author is recommended' });
    }

    const bloqueB = entity.bloque_B_contexto_comercial;
    if (bloqueB) {
      const { identity, contacto, catalogo } = bloqueB;

      if (!identity) {
        errors.push({ code: 'MISSING_IDENTITY', message: 'bloque_B must have identity' });
      } else {
        if (!identity.nombre_comercio) errors.push({ code: 'MISSING_NOMBRE_COMERCIO', message: 'identity.nombre_comercio is required' });
        if (!identity.id_comercio) errors.push({ code: 'MISSING_ID_COMERCIO', message: 'identity.id_comercio is required' });
      }

      if (!contacto) {
        errors.push({ code: 'MISSING_CONTACTO', message: 'bloque_B must have contacto' });
      } else {
        const { whatsapp_number, email } = contacto;
        if (!whatsapp_number) {
          warnings.push({ code: 'MISSING_WHATSAPP', message: 'WhatsApp number not configured' });
        } else if (!/^\d{10,15}$/.test(whatsapp_number)) {
          errors.push({
            code: 'INVALID_WHATSAPP',
            message: `WhatsApp number invalid: ${whatsapp_number}`,
            field: 'contacto.whatsapp_number'
          });
        }
        if (!email) warnings.push({ code: 'MISSING_EMAIL', message: 'Email not configured' });
      }

      if (!catalogo) {
        errors.push({ code: 'MISSING_CATALOGO', message: 'bloque_B must have catalogo' });
      } else {
        const { categorias, items } = catalogo;
        if (!categorias?.length) errors.push({ code: 'EMPTY_CATEGORIAS', message: 'catalogo must have at least 1 category' });
        if (!items?.length) {
          errors.push({ code: 'EMPTY_ITEMS', message: 'catalogo must have at least 1 item' });
        }
      }
    }

    const passed = errors.length === 0;
    if (passed) Logger.info(`✅ Validation PASSED with ${warnings.length} warnings`);
    else Logger.error(`❌ Validation FAILED with ${errors.length} errors`);

    return {
      passed,
      errors,
      warnings,
      summary: {
        total_errors: errors.length,
        total_warnings: warnings.length,
        critical_errors: errors.filter(e => e.code.startsWith('MISSING')).length
      }
    };
  } catch (error) {
    Logger.error('Validation exception:', error);
    return {
      passed: false,
      errors: [{ code: 'VALIDATION_EXCEPTION', message: error.message }],
      warnings: []
    };
  }
}

// ========================================
// BUILD FUNCTIONS
// ========================================
async function fetchSkeleton() {
  const now = Date.now();
  if (skeletonCache && now - skeletonFetchedAt < CACHE_TTL.SKELETON_MS) {
    return skeletonCache;
  }
  const res = await fetch(SKELETON_URL);
  if (!res.ok) throw new BuildError('SKELETON_ERROR', `Failed to fetch skeleton (status ${res.status})`, { phase: 'skeleton' });
  const json = await res.json();
  skeletonCache = json;
  skeletonFetchedAt = Date.now();
  return json;
}

async function selectTemplate(comercioData = {}, catalogoData = {}, force_template = null) {
  if (force_template) return force_template;

  const now = Date.now();
  if (!templatesRegistryCache || now - templatesFetchedAt > CACHE_TTL.TEMPLATES_MS) {
    const res = await fetch(TEMPLATES_REGISTRY_URL);
    if (!res.ok) {
      Logger.warn('Could not fetch templates registry, using default C1_Napolitana', { status: res.status });
      templatesRegistryCache = null;
    } else {
      const json = await res.json();
      templatesRegistryCache = Array.isArray(json) ? json : (json.templates || []);
    }
    templatesFetchedAt = Date.now();
  }

  const tipo = (comercioData?.tipo_negocio || comercioData?.tipo || '').toLowerCase();
  if (templatesRegistryCache?.length) {
    for (const tpl of templatesRegistryCache) {
      const useCases = (tpl.use_cases || tpl.useCases || []).map(u => String(u).toLowerCase());
      if (useCases.includes(tipo)) return tpl.id || tpl.template_id || tpl.name;
    }

    const items = catalogoData?.items || [];
    const multiImageCount = items.filter(i => (i.images || []).length > 1).length;
    if (items.length && multiImageCount / items.length > 0.5) return 'C2_CatalogoVisual';
  }

  return 'C1_Napolitana';
}

function extractWhatsAppNumber(urlOrNumber = '') {
  if (!urlOrNumber) return '';
  if (typeof urlOrNumber === 'string') {
    const m = urlOrNumber.match(/wa\.me\/(\d+)/);
    if (m) return m[1];
    const digits = urlOrNumber.replace(/\D/g,'');
    return digits.length ? digits : '';
  }
  return '';
}

function assembleEntity({ skeleton = {}, comercioData = {}, catalogoData = {}, iaConfig = null, templateId = 'C1_Napolitana', visual = false }) {
  const base = JSON.parse(JSON.stringify(skeleton || {}));

  base.meta = base.meta || {};
  base.meta.comercio_id = comercioData.id || comercioData.uid || null;
  base.meta.created_at = new Date().toISOString();
  base.meta.generated_by = 'EntityFactory v1.1';
  base.meta.schema_version = base.meta.schema_version || '3.0.1';

  if (!base.bloque_A_nucleo_LER && skeleton.universal_mental_state) {
    base.bloque_A_nucleo_LER = skeleton.universal_mental_state;
  }

  base.bloque_B_contexto_comercial = {
    identity: {
      id_comercio: comercioData.id || comercioData.uid || null,
      nombre_comercio: comercioData.nombre || comercioData.nombreComercio || comercioData.business_name || '',
      nombre_bot: (iaConfig && iaConfig.aiName) || comercioData.nombre_bot || `Asistente ${comercioData.nombre || ''}`
    },
    contacto: {
      direccion: comercioData.direccion || comercioData.address || '',
      ciudad: comercioData.ciudad || comercioData.city || '',
      provincia: comercioData.provincia || comercioData.province || '',
      pais: comercioData.pais || comercioData.country || 'Argentina',
      telefono: comercioData.telefono || comercioData.phone || '',
      whatsapp: comercioData.whatsapp || '',
      whatsapp_number: extractWhatsAppNumber(comercioData.whatsapp || comercioData.phone || '')
    },
    operacion: {
      horarios: comercioData.horarios || comercioData.schedule || {},
      dias_atencion: comercioData.dias_atencion || []
    },
    comercial: {
      moneda: comercioData.moneda || comercioData.currency || 'ARS',
      idioma: iaConfig?.aiLanguage || comercioData.idioma || 'es-AR',
      metodos_pago: comercioData.paymentMethods || []
    },
    catalogo: {
      categorias: catalogoData?.categorias || [],
      items: catalogoData?.items || [],
      metadata: catalogoData?.metadata || {}
    },
    runtime: {
      estado: '⬛',
      mensaje_activacion: iaConfig?.aiGreeting || `¡Hola! Soy ${ (iaConfig?.aiName) || ('tu asistente') } de ${ comercioData.nombre || '' }`
    }
  };

  base.tags = generateSemanticTags(comercioData?.nombre || comercioData.nombreComercio || '', comercioData?.descripcion || '');

  const wantsVisual = visual || (comercioData?.visual_enabled === true) || false;
  if (wantsVisual) {
    base.bloque_C_visual_module = {
      enabled: true,
      template: { id: templateId },
      design: {},
      instructions: { note: 'Visual module placeholder - full artifact built by link-builder' }
    };
  }

  return base;
}

async function buildEntity({ comercio_id, force_template = null, build_id = null, visual = false }) {
  const startTs = Date.now();
  const metrics = {};
  const logs = [];

  async function log(level, message, meta = {}) {
    const entry = { ts: new Date().toISOString(), level, message, meta };
    logs.push(entry);
    try {
      if (build_id) await appendLog(build_id, message, level);
    } catch (e) {
      Logger.warn('appendLog failed', { error: e.message });
    }
    if (level === 'error') Logger.error(message, meta);
    else if (level === 'warn') Logger.warn(message, meta);
    else if (level === 'debug') Logger.debug(message, meta);
    else Logger.info(message, meta);
  }

  try {
    if (!comercio_id) throw new BuildError('MISSING_COMERCIO_ID', 'comercio_id is required', { phase: 'preflight' });

    if (!build_id) {
      const date = new Date();
      const dateStr = date.toISOString().slice(0,10).replace(/-/g,'');
      const timeStr = date.toISOString().slice(11,16).replace(':','');
      const rand = Math.floor(Math.random()*10000).toString().padStart(4,'0');
      build_id = `builder-${dateStr}-${timeStr}-${rand}`;
      await createManifestEntry(build_id, comercio_id, { trigger: 'build_api_no_id', status: 'pending' });
    }

    await log('info', `Starting build for ${comercio_id}`, { build_id });

    const t0 = Date.now();
    const skeleton = await fetchSkeleton();
    metrics.fetch_skeleton_ms = Date.now() - t0;
    await log('debug', 'Skeleton loaded', { ms: metrics.fetch_skeleton_ms });

    const t1 = Date.now();
    const comercioData = await fetchComercioData(comercio_id);
    metrics.fetch_comercio_ms = Date.now() - t1;
    await log('debug', 'Comercio data fetched', { ms: metrics.fetch_comercio_ms });

    const t2 = Date.now();
    const catalogoData = await fetchCatalogo(comercio_id);
    metrics.fetch_catalogo_ms = Date.now() - t2;
    await log('debug', 'Catalogo fetched', { ms: metrics.fetch_catalogo_ms, items: catalogoData.items?.length || 0 });

    const iaConfig = await fetchIAConfig(comercio_id);
    if (iaConfig) await log('debug', 'IA config loaded');

    const t3 = Date.now();
    const templateId = await selectTemplate(comercioData, catalogoData, force_template);
    metrics.select_template_ms = Date.now() - t3;
    await log('info', `Template selected: ${templateId}`);

    const t4 = Date.now();
    const finalEntity = assembleEntity({
      skeleton,
      comercioData,
      catalogoData,
      iaConfig,
      templateId,
      visual
    });
    metrics.assembly_ms = Date.now() - t4;
    await log('info', 'Entity assembled', { assembly_ms: metrics.assembly_ms });

    const t5 = Date.now();
    const validation = await validateEntity(finalEntity);
    metrics.validation_ms = Date.now() - t5;
    await log('debug', 'Validation complete', { validation, ms: metrics.validation_ms });

    if (!validation.passed) {
      await updateManifest(build_id, {
        status: 'validation_failed',
        validation_results: validation,
        build_metrics: { ...metrics, total_time_ms: Date.now() - startTs }
      });
      throw new BuildError('VALIDATION_FAILED', 'Entity validation failed', { errors: validation.errors, warnings: validation.warnings, phase: 'validation' });
    }

    const t6 = Date.now();
    const uploadResult = await retryWithBackoff(
      async () => await uploadToVercel({ entity: finalEntity, entity_id: comercio_id, build_id }),
      3,
      1000
    );
    metrics.upload_time_ms = Date.now() - t6;
    metrics.json_size_bytes = Buffer.byteLength(JSON.stringify(finalEntity), 'utf8');
    metrics.total_time_ms = Date.now() - startTs;

    await log('info', 'Upload successful', { url: uploadResult.url, size: metrics.json_size_bytes });

    await markBuildAsSuccess(build_id, {
      vercel_blob_url: uploadResult.url,
      artifact_hash: uploadResult.hash,
      skeleton_version: skeleton.meta?.version || null,
      template_id: templateId,
      build_metrics: metrics,
      validation_results: validation
    });

    await log('info', `Build completed successfully`, { build_id, total_ms: metrics.total_time_ms });

    return {
      success: true,
      entity: finalEntity,
      vercel_blob_url: uploadResult.url,
      template_id: templateId,
      skeleton_version: skeleton.meta?.version || null,
      metrics
    };

  } catch (err) {
    const wrapped = wrapError(err, err.phase || 'build');
    await log('error', `Build failed: ${wrapped.message}`, { code: wrapped.code, stack: wrapped.stack });

    try {
      await markBuildAsFailed(build_id, wrapped);
    } catch (e) {
      Logger.error('markBuildAsFailed failed', { error: e.message });
    }

    return { success: false, error: wrapped.toJSON ? wrapped.toJSON() : { message: wrapped.message, code: wrapped.code } };
  }
}

// ========================================
// MAIN HANDLER
// ========================================
export default async function handler(req, res) {
  try {
    const apiKey = req.headers["x-api-key"];
    if (process.env.API_KEY && apiKey !== process.env.API_KEY) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    const { action, build_id } = req.query;
    const { method } = req;

    // BUILD
    if (method === "POST" && action === "build") {
      const startTime = Date.now();
      const { comercio_id, force_template = null, visual = false } = req.body || {};

      if (!comercio_id) {
        return res.status(400).json({ success: false, error: { code: "MISSING_COMERCIO_ID", message: "comercio_id es requerido" } });
      }

      const new_build_id = `build_${Date.now()}`;
      Logger.info(`🚀 Iniciando build para ${comercio_id} (${new_build_id})`);

      const result = await buildEntity({
        comercio_id,
        force_template,
        build_id: new_build_id,
        visual
      });

      if (!result.success) {
        return res.status(500).json({
          success: false,
          error: result.error || { message: "Error en buildEntity()" }
        });
      }

      Logger.success(`✅ Build completado para ${comercio_id} (${new_build_id})`);

      return res.status(200).json({
        success: true,
        build_id: new_build_id,
        comercio_id,
        blobUrl: result.vercel_blob_url,
        metrics: result.metrics,
      });
    }

    // REBUILD
    if (method === "POST" && action === "rebuild") {
      const { comercio_id, template_id = null } = req.body || {};
      if (!comercio_id) {
        return res.status(400).json({ success: false, error: { code: "MISSING_COMERCIO_ID", message: "comercio_id es requerido" } });
      }

      const new_build_id = `rebuild_${Date.now()}`;
      const result = await buildEntity({
        comercio_id,
        force_template: template_id,
        build_id: new_build_id
      });

      if (!result.success) {
        return res.status(500).json({ success: false, error: result.error });
      }

      return res.status(200).json({
        success: true,
        build_id: new_build_id,
        comercio_id,
        blobUrl: result.vercel_blob_url,
        metrics: result.metrics,
      });
    }

    // STATUS / MANIFEST
    if (method === "GET" && (action === "status" || action === "manifest")) {
      if (!build_id) {
        return res.status(400).json({ success: false, error: "build_id required" });
      }

      const manifest = await getManifest(build_id);

      if (!manifest) {
        return res.status(404).json({
          success: false,
          error: "Build no encontrado",
        });
      }

      return res.status(200).json({
        success: true,
        build: manifest,
      });
    }

    // VALIDATE
    if (method === "POST" && action === "validate") {
      const { entity } = req.body || {};
      if (!entity) {
        return res.status(400).json({ success: false, error: "entity required" });
      }

      const validation = await validateEntity(entity);
      return res.status(200).json({
        success: true,
        validation
      });
    }

    return res.status(404).json({ success: false, error: "Not found" });
  } catch (err) {
    Logger.error("Handler root error:", err);
    return res.status(500).json({ success: false, error: "Internal server error", details: err.message });
  }
}
