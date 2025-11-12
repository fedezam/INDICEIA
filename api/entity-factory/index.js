// /api/entity-factory/index.js
/**
 * 🏭 EntityFactory API v1.1
 * 
 * Ensambla automáticamente entidades A+B+C desde Firebase.
 * Flujo:
 * 1️⃣ Crea manifest (pending)
 * 2️⃣ Fetch datos Firebase (A/B)
 * 3️⃣ Selecciona template C
 * 4️⃣ Ensambla A+B+C
 * 5️⃣ Valida
 * 6️⃣ Sube a Vercel Blob
 * 7️⃣ Actualiza manifest (success/error)
 * 
 * Endpoints:
 * - POST /api/entity-factory/build        → Build manual
 * - POST /api/entity-factory/rebuild      → Rebuild forzado
 * - GET  /api/entity-factory/status/:id   → Estado de build
 */

import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, collection } from "firebase/firestore";
import { buildEntity } from "./build.js";
import { uploadToVercel } from "./upload.js";
import { validateEntity } from "./validate.js";
import { createManifest, updateManifest } from "./manifest.js";
import { Logger } from "./utils/logger.js";
import { BuildError } from "./utils/errors.js";

// 🔧 Firebase config
const firebaseConfig = {
  // TODO: colocar tus credenciales
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

/* ------------------------------------------------------------- */
/* 🧱 HANDLER: BUILD ENTITY                                      */
/* ------------------------------------------------------------- */
export async function buildHandler(req, res) {
  const startTime = Date.now();
  const { comercio_id, force = false, template_id = null } = req.body;

  let buildId = null;

  try {
    // Validar request
    if (!comercio_id) {
      throw new BuildError("MISSING_COMERCIO_ID", "comercio_id is required");
    }

    Logger.info(`🚀 Starting build for ${comercio_id}`);

    // 1️⃣ Crear manifest inicial
    buildId = await createManifest({
      entity_id: comercio_id,
      trigger_type: force ? "manual_rebuild" : "api_request",
      status: "pending",
    });

    Logger.info(`📝 Manifest created: ${buildId}`);

    // 2️⃣ Ensamblar A+B+C
    const buildResult = await buildEntity({
      comercio_id,
      force_template: template_id,
      build_id: buildId,
    });

    Logger.info(`🔧 Entity built successfully`);

    // 3️⃣ Validar
    const validationResult = await validateEntity(buildResult.entity);

    if (!validationResult.passed) {
      throw new BuildError("VALIDATION_FAILED", "Entity validation failed", {
        errors: validationResult.errors,
      });
    }

    if (validationResult.warnings.length > 0) {
      Logger.warn(`⚠️ Validation warnings:`, validationResult.warnings);
    }

    Logger.info(`✅ Validation passed`);

    // 4️⃣ Subir a Vercel Blob
    const uploadResult = await uploadToVercel({
      entity: buildResult.entity,
      entity_id: comercio_id,
      build_id: buildId,
    });

    Logger.info(`☁️ Uploaded to Vercel Blob: ${uploadResult.url}`);

    // 5️⃣ Actualizar manifest final
    await updateManifest(buildId, {
      status: "success",
      vercel_blob_url: uploadResult.url,
      artifact_hash: uploadResult.hash,
      skeleton_version: buildResult.skeleton_version,
      template_id: buildResult.template_id,
      build_metrics: {
        ...buildResult.metrics,
        upload_time_ms: uploadResult.upload_time_ms,
        total_time_ms: Date.now() - startTime,
        json_size_bytes: uploadResult.size_bytes,
      },
      validation_results: validationResult,
    });

    Logger.info(`✨ Build completed successfully in ${Date.now() - startTime}ms`);
    Logger.info(`🧩 Reflexive marker: build ${buildId} closed with coherence`);

    // 6️⃣ Respuesta final
    return res.status(200).json({
      success: true,
      build_id: buildId,
      entity_id: comercio_id,
      vercel_blob_url: uploadResult.url,
      template_used: buildResult.template_id,
      skeleton_version: buildResult.skeleton_version,
      metrics: {
        total_time_ms: Date.now() - startTime,
        catalog_items:
          buildResult.entity?.bloque_B_contexto_comercial?.catalogo?.items?.length || 0,
        categories:
          buildResult.entity?.bloque_B_contexto_comercial?.catalogo?.categorias?.length || 0,
      },
      validation: {
        passed: true,
        warnings: validationResult.warnings,
      },
    });
  } catch (error) {
    Logger.error(`❌ Build failed:`, error);

    // Actualizar manifest con error
    if (buildId) {
      await updateManifest(buildId, {
        status: error.code || "failed",
        error_message: error.message,
        error_details: error.details || null,
        build_metrics: {
          total_time_ms: Date.now() - startTime,
          failed_at: error.phase || "unknown",
        },
      });
    }

    // Mapear errores → HTTP
    const statusCode =
      {
        MISSING_COMERCIO_ID: 400,
        ENTITY_NOT_FOUND: 404,
        VALIDATION_FAILED: 422,
        UPLOAD_ERROR: 503,
        SKELETON_ERROR: 500,
        UNKNOWN_ERROR: 500,
      }[error.code] || 500;

    return res.status(statusCode).json({
      success: false,
      error: {
        code: error.code || "UNKNOWN_ERROR",
        message: error.message,
        details: error.details || null,
        build_id: buildId,
      },
    });
  }
}

/* ------------------------------------------------------------- */
/* ♻️ HANDLER: REBUILD                                           */
/* ------------------------------------------------------------- */
export async function rebuildHandler(req, res) {
  return buildHandler(
    { ...req, body: { ...req.body, force: true } },
    res
  );
}

/* ------------------------------------------------------------- */
/* 📄 HANDLER: STATUS                                            */
/* ------------------------------------------------------------- */
export async function statusHandler(req, res) {
  const { build_id } = req.query || req.params;

  try {
    const manifest = await getManifest(build_id);

    if (!manifest) {
      return res.status(404).json({
        success: false,
        error: "Build not found",
      });
    }

    return res.status(200).json({
      success: true,
      build: manifest,
    });
  } catch (error) {
    Logger.error(`Error fetching status:`, error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}

/* ------------------------------------------------------------- */
/* 🔍 Helper: Get Manifest                                       */
/* ------------------------------------------------------------- */
async function getManifest(build_id) {
  const ref = doc(collection(db, "autobuilder_manifests"), build_id);
  const snap = await getDoc(ref);
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

/* ------------------------------------------------------------- */
/* 🌐 EXPORT DEFAULT HANDLER (para Vercel / Next.js API)         */
/* ------------------------------------------------------------- */
export default async function handler(req, res) {
  try {
    const apiKey = req.headers["x-api-key"];
    if (process.env.API_KEY && apiKey !== process.env.API_KEY) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    const { method, url } = req;

    if (method === "POST" && url.endsWith("/build")) return buildHandler(req, res);
    if (method === "POST" && url.endsWith("/rebuild")) return rebuildHandler(req, res);
    if (method === "GET" && url.includes("/status")) return statusHandler(req, res);

    return res.status(404).json({ success: false, error: "Not found" });
  } catch (err) {
    Logger.error("Handler root error:", err);
    return res.status(500).json({ success: false, error: "Internal server error" });
  }
}
