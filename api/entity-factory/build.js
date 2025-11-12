// /api/entity-factory/build.js
/**
 * 🏭 Core Builder - Ensambla A + B + C
 * 
 * Este módulo es el corazón del EntityFactory.
 * Fusiona los 3 bloques en una entidad LER comercial completa.
 */

import { fetchComercioData, fetchCatalogo } from './fetch.js';
import { uploadEntity } from './upload.js';
import { validateEntity } from './validate.js';
import { updateManifest, createManifest } from './manifest.js';
import { generateSemanticTags } from './utils/tags-generator.js';
import { Logger } from './utils/logger.js';
import { BuildError } from './utils/errors.js';
import { SKELETON_URL, TEMPLATES_REGISTRY_URL } from './config/constants.js';

// Cache global (solo se fetchea una vez)
let skeletonCache = null;
let templatesRegistry = null;

/**
 * 🧱 Build completo de una entidad
 */
export async function buildEntity({ comercio_id, force_template = null, build_id }) {
  const buildStart = Date.now();
  const metrics = {};
  const logPrefix = `[BUILD:${build_id}]`;

  try {
    Logger.info(`${logPrefix} Inicio de build para comercio ${comercio_id}`);
    await createManifest({ build_id, comercio_id, status: 'pending' });

    // 1️⃣ FETCH SKELETON (Bloque A)
    const t1 = Date.now();
    const skeleton = await fetchSkeleton();
    metrics.fetch_skeleton_ms = Date.now() - t1;
    Logger.info(`${logPrefix} Skeleton cargado (${metrics.fetch_skeleton_ms}ms)`);

    // 2️⃣ FETCH DATOS DE COMERCIO (Bloque B)
    const t2 = Date.now();
    const comercioData = await fetchComercioData(comercio_id);
    metrics.fetch_comercio_ms = Date.now() - t2;
    Logger.info(`${logPrefix} Datos de comercio cargados (${metrics.fetch_comercio_ms}ms)`);

    const t3 = Date.now();
    const catalogoData = await fetchCatalogo(comercio_id);
    metrics.fetch_catalogo_ms = Date.now() - t3;
    Logger.info(`${logPrefix} Catálogo cargado (${metrics.fetch_catalogo_ms}ms)`);

    // 3️⃣ SELECCIÓN DE PLANTILLA (Bloque C)
    const templateId = await selectTemplate(comercioData, force_template);
    Logger.info(`${logPrefix} Plantilla seleccionada: ${templateId}`);

    // 4️⃣ ASSEMBLY A+B+C
    const t4 = Date.now();
    const entityFinal = assembleEntity({
      skeleton,
      comercioData,
      catalogoData,
      templateId,
    });
    metrics.assembly_ms = Date.now() - t4;

    // 5️⃣ VALIDACIÓN
    const validationResult = await validateEntity(entityFinal);
    if (!validationResult.valid) {
      throw new BuildError('Validation failed', validationResult.errors);
    }

    // 6️⃣ UPLOAD A VERCEL BLOB
    const t5 = Date.now();
    const blobUrl = await uploadEntity(entityFinal);
    metrics.upload_time_ms = Date.now() - t5;
    metrics.json_size_bytes = JSON.stringify(entityFinal).length;
    metrics.total_time_ms = Date.now() - buildStart;

    // 7️⃣ ACTUALIZAR MANIFEST
    await updateManifest({
      build_id,
      comercio_id,
      status: 'success',
      blobUrl,
      metrics,
    });

    Logger.success(`${logPrefix} ✅ Build completo en ${metrics.total_time_ms}ms`);
    return { success: true, blobUrl, metrics };
  } catch (err) {
    Logger.error(`${logPrefix} ❌ Error: ${err.message}`);
    await updateManifest({
      build_id,
      comercio_id,
      status: 'error',
      error: err.message,
    });
    return { success: false, error: err.message, metrics };
  }
}

/**
 * 🧩 Fetch Skeleton (Bloque A)
 */
async function fetchSkeleton() {
  if (skeletonCache) return skeletonCache;
  const res = await fetch(SKELETON_URL);
  if (!res.ok) throw new BuildError('Error al obtener Skeleton');
  skeletonCache = await res.json();
  return skeletonCache;
}

/**
 * 🧠 Selector de plantilla (Bloque C)
 */
async function selectTemplate(comercioData, force_template) {
  if (force_template) return force_template;

  if (!templatesRegistry) {
    const res = await fetch(TEMPLATES_REGISTRY_URL);
    if (!res.ok) throw new BuildError('Error al cargar registry de plantillas');
    templatesRegistry = await res.json();
  }

  const categoria = comercioData?.categoria?.toLowerCase() || '';
  const match = templatesRegistry.find((tpl) =>
    tpl.match.includes(categoria)
  );

  return match?.id || 'C1_Napolitana';
}

/**
 * 🧬 Ensamble final A+B+C
 */
function assembleEntity({ skeleton, comercioData, catalogoData, templateId }) {
  const entity = {
    ...skeleton,
    meta: {
      ...skeleton.meta,
      comercio_id: comercioData.id,
      nombre: comercioData.nombre,
      version: `${skeleton.meta.version || '1.0.0'}`,
      plantilla: templateId,
      timestamp: new Date().toISOString(),
    },
    comercio: comercioData,
    catalogo: catalogoData,
    tags: generateSemanticTags(comercioData, catalogoData),
  };

  return entity;
}
