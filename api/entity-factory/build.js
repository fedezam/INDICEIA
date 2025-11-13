// /api/entity-factory/build.js
/**
 * 🏭 Core Builder - Ensambla A + B + C (Versión integrada con manifest.js)
 *
 * - Integra createManifestEntry / appendLog / markBuildAsSuccess / markBuildAsFailed
 * - Maneja métricas, logs y errores con trazabilidad en Firestore
 * - Usa SKELETON_URL y TEMPLATES_REGISTRY_URL desde config/constants.js
 */

import fetch from 'node-fetch';
import { fetchComercioData, fetchCatalogo, fetchIAConfig } from './fetch.js';
import { uploadToVercel } from './upload.js';
import { validateEntity } from './validate.js';
import { generateSemanticTags } from './utils/tags-generator.js';
import { Logger } from './utils/logger.js';
import {
  BuildError,
  wrapError,
  retryWithBackoff
} from './utils/errors.js';
import {
  SKELETON_URL,
  TEMPLATES_REGISTRY_URL,
  CACHE_TTL
} from './config/constants.js';

import {
  createManifestEntry,
  appendLog,
  markBuildAsSuccess,
  markBuildAsFailed,
  updateManifest as manifestUpdate
} from './manifest.js';

// Caches en memoria (simple TTL)
let skeletonCache = null;
let skeletonFetchedAt = 0;
let templatesRegistryCache = null;
let templatesFetchedAt = 0;

/**
 * buildEntity
 * @param {Object} params - { comercio_id, force_template=null, build_id=null, visual?:boolean }
 * @returns {Object} resultado con entity / metrics / template_id / skeleton_version
 */
export async function buildEntity({ comercio_id, force_template = null, build_id = null, visual = false }) {
  const startTs = Date.now();
  const metrics = {};
  const logs = [];

  // helper de logging local + manifest
  async function log(level, message, meta = {}) {
    const entry = { ts: new Date().toISOString(), level, message, meta };
    logs.push(entry);
    try {
      if (build_id) await appendLog(build_id, message, level);
    } catch (e) {
      // no cancelar por fallo de log
      Logger.warn('appendLog failed', { error: e.message });
    }
    // siempre escribir también al Logger local
    if (level === 'error') Logger.error(message, meta);
    else if (level === 'warn') Logger.warn(message, meta);
    else if (level === 'debug') Logger.debug(message, meta);
    else Logger.info(message, meta);
  }

  try {
    // 0️⃣ Validación mínima
    if (!comercio_id) throw new BuildError('MISSING_COMERCIO_ID', 'comercio_id is required', { phase: 'preflight' });

    // 1️⃣ Si no hay build_id, crearlo en manifest
    if (!build_id) {
      // generar ID simple
      const date = new Date();
      const dateStr = date.toISOString().slice(0,10).replace(/-/g,'');
      const timeStr = date.toISOString().slice(11,16).replace(':','');
      const rand = Math.floor(Math.random()*10000).toString().padStart(4,'0');
      build_id = `builder-${dateStr}-${timeStr}-${rand}`;
      await createManifestEntry(build_id, comercio_id, { trigger: 'build_api_no_id', status: 'pending' });
    }

    await log('info', `Starting build for ${comercio_id}`, { build_id });

    // 2️⃣ FETCH SKELETON (Bloque A) - con caché simple
    const t0 = Date.now();
    const skeleton = await fetchSkeleton();
    metrics.fetch_skeleton_ms = Date.now() - t0;
    await log('debug', 'Skeleton loaded', { ms: metrics.fetch_skeleton_ms });

    // 3️⃣ FETCH DATOS COMERCIO (Bloque B)
    const t1 = Date.now();
    const comercioData = await fetchComercioData(comercio_id);
    metrics.fetch_comercio_ms = Date.now() - t1;
    await log('debug', 'Comercio data fetched', { ms: metrics.fetch_comercio_ms });

    // 4️⃣ FETCH CATALOG
    const t2 = Date.now();
    const catalogoData = await fetchCatalogo(comercio_id);
    metrics.fetch_catalogo_ms = Date.now() - t2;
    await log('debug', 'Catalogo fetched', { ms: metrics.fetch_catalogo_ms, items: catalogoData.items?.length || 0 });

    // 5️⃣ FETCH IA CONFIG (opcional)
    const iaConfig = await fetchIAConfig(comercio_id);
    if (iaConfig) await log('debug', 'IA config loaded');

    // 6️⃣ SELECT TEMPLATE (Bloque C)
    const t3 = Date.now();
    const templateId = await selectTemplate(comercioData, catalogoData, force_template);
    metrics.select_template_ms = Date.now() - t3;
    await log('info', `Template selected: ${templateId}`);

    // 7️⃣ ASSEMBLE A + B + (C optional)
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

    // 8️⃣ VALIDATE
    const t5 = Date.now();
    const validation = await validateEntity(finalEntity);
    metrics.validation_ms = Date.now() - t5;
    await log('debug', 'Validation complete', { validation, ms: metrics.validation_ms });

    if (!validation.passed) {
      // Attach validation to manifest and throw
      await manifestUpdate(build_id, {
        status: 'validation_failed',
        validation_results: validation,
        build_metrics: { ...metrics, total_time_ms: Date.now() - startTs }
      });
      throw new BuildError('VALIDATION_FAILED', 'Entity validation failed', { errors: validation.errors, warnings: validation.warnings, phase: 'validation' });
    }

    // 9️⃣ UPLOAD (retry with backoff)
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

    // 1️⃣0️⃣ Update manifest as success (detailed)
    await markBuildAsSuccess(build_id, {
      vercel_blob_url: uploadResult.url,
      artifact_hash: uploadResult.hash,
      skeleton_version: skeleton.meta?.version || null,
      template_id: templateId,
      build_metrics: metrics,
      validation_results: validation
    });

    // Guardar build log completo (en Blob vía Logger.saveBuildLog si disponible)
    try {
      if (Logger.saveBuildLog) await Logger.saveBuildLog(build_id, logs);
    } catch (e) {
      Logger.warn('saveBuildLog failed', { error: e.message });
    }

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

    // marcar manifest como failed (intentar)
    try {
      await markBuildAsFailed(build_id, wrapped);
    } catch (e) {
      Logger.error('markBuildAsFailed failed', { error: e.message });
    }

    return { success: false, error: wrapped.toJSON ? wrapped.toJSON() : { message: wrapped.message, code: wrapped.code } };
  }
}

/* -------------------------
   Helper: fetchSkeleton()
   - cache con TTL
   ------------------------- */
async function fetchSkeleton() {
  const now = Date.now();
  if (skeletonCache && now - skeletonFetchedAt < (CACHE_TTL?.SKELETON_MS || 3600000)) {
    return skeletonCache;
  }

  const res = await fetch(SKELETON_URL);
  if (!res.ok) throw new BuildError('SKELETON_ERROR', `Failed to fetch skeleton (status ${res.status})`, { phase: 'skeleton' });
  const json = await res.json();
  skeletonCache = json;
  skeletonFetchedAt = Date.now();
  return json;
}

/* -------------------------
   Helper: selectTemplate()
   - carga registry (cache) y elige
   ------------------------- */
async function selectTemplate(comercioData = {}, catalogoData = {}, force_template = null) {
  if (force_template) return force_template;

  const now = Date.now();
  if (!templatesRegistryCache || now - templatesFetchedAt > (CACHE_TTL?.TEMPLATES_MS || 3600000)) {
    const res = await fetch(TEMPLATES_REGISTRY_URL);
    if (!res.ok) {
      Logger.warn('Could not fetch templates registry, using default C1_Napolitana', { status: res.status });
      templatesRegistryCache = null;
    } else {
      const json = await res.json();
      // registry shape puede ser { templates: [...] } o array; normalize
      templatesRegistryCache = Array.isArray(json) ? json : (json.templates || []);
    }
    templatesFetchedAt = Date.now();
  }

  // heurística simple: si tipo negocio coincide con registry.use_cases
  const tipo = (comercioData?.tipo_negocio || comercioData?.tipo || '').toLowerCase();
  if (templatesRegistryCache?.length) {
    for (const tpl of templatesRegistryCache) {
      const useCases = (tpl.use_cases || tpl.useCases || tpl.useCases || []).map(u => String(u).toLowerCase());
      if (useCases.includes(tipo)) return tpl.id || tpl.template_id || tpl.name;
    }

    // si muchos items tienen >1 image -> C2
    const items = catalogoData?.items || [];
    const multiImageCount = items.filter(i => (i.images || []).length > 1).length;
    if (items.length && multiImageCount / items.length > 0.5) return 'C2_CatalogoVisual';
  }

  return 'C1_Napolitana';
}

/* -------------------------
   Helper: assembleEntity()
   - Combina skeleton + comercio + catalogo + iaConfig + bloque C (si aplica)
   ------------------------- */
function assembleEntity({ skeleton = {}, comercioData = {}, catalogoData = {}, iaConfig = null, templateId = 'C1_Napolitana', visual = false }) {
  // deep clone minimal (no refs)
  const base = JSON.parse(JSON.stringify(skeleton || {}));

  // meta
  base.meta = base.meta || {};
  base.meta.comercio_id = comercioData.id || comercioData.uid || null;
  base.meta.created_at = new Date().toISOString();
  base.meta.generated_by = 'EntityFactory v1.1';
  base.meta.schema_version = base.meta.schema_version || '3.0.1';

  // bloque A (si skeleton ya lo tiene, respetar)
  if (!base.bloque_A_nucleo_LER && skeleton.universal_mental_state) {
    base.bloque_A_nucleo_LER = skeleton.universal_mental_state;
  }

  // bloque B - construir según fetch.js shape
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
      estado: '⚬',
      mensaje_activacion: iaConfig?.aiGreeting || `¡Hola! Soy ${ (iaConfig?.aiName) || ('tu asistente') } de ${ comercioData.nombre || '' }`
    }
  };

  // tags semánticos globales
  base.tags = generateSemanticTags(comercioData?.nombre || comercioData.nombreComercio || '', comercioData?.descripcion || '');

  // bloque C (visual) solo si visual === true OR comercioData explicitly requests skin
  const wantsVisual = visual || (comercioData?.visual_enabled === true) || false;
  if (wantsVisual) {
    base.bloque_C_visual_module = {
      enabled: true,
      template: { id: templateId },
      design: {}, // templates/skins se integrarán en stage de upload/artifact generation
      instructions: { note: 'Visual module placeholder - full artifact built by link-builder' }
    };
  }

  return base;
}

/* -------------------------
   Small helper: extract whatsapp digits
   ------------------------- */
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

export default {
  buildEntity
};
