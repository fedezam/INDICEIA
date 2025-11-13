// /api/entity-factory/index.js
/**
 * 🏭 EntityFactory API v1.2
 * 
 * Endpoints:
 * - POST /api/entity-factory/build        → Build manual
 * - POST /api/entity-factory/rebuild      → Rebuild forzado
 * - GET  /api/entity-factory/status/:id   → Estado de build
 */

import { buildEntity } from "./build.js";
import { getManifest } from "./manifest.js";
import { Logger } from "./utils/logger.js";
import { BuildError } from "./utils/errors.js";

/* ------------------------------------------------------------- */
/* 🧱 HANDLER: BUILD ENTITY                                      */
/* ------------------------------------------------------------- */
export async function buildHandler(req, res) {
  const startTime = Date.now();
  const { comercio_id, force_template = null } = req.body || {};

  try {
    if (!comercio_id) throw new BuildError("MISSING_COMERCIO_ID", "comercio_id es requerido");

    const build_id = `build_${Date.now()}`;
    Logger.info(`🚀 Iniciando build para ${comercio_id} (${build_id})`);

    const result = await buildEntity({
      comercio_id,
      force_template,
      build_id,
    });

    if (!result.success) {
      throw new BuildError("BUILD_FAILED", result.error || "Error en buildEntity()");
    }

    Logger.success(`✅ Build completado para ${comercio_id} (${build_id})`);

    return res.status(200).json({
      success: true,
      build_id,
      comercio_id,
      blobUrl: result.blobUrl,
      metrics: result.metrics,
    });
  } catch (error) {
    Logger.error(`❌ Error en buildHandler: ${error.message}`);

    const statusCode =
      {
        MISSING_COMERCIO_ID: 400,
        BUILD_FAILED: 500,
      }[error.code] || 500;

    return res.status(statusCode).json({
      success: false,
      error: {
        code: error.code || "UNKNOWN_ERROR",
        message: error.message,
        details: error.details || null,
      },
    });
  }
}

/* ------------------------------------------------------------- */
/* ♻️ HANDLER: REBUILD                                           */
/* ------------------------------------------------------------- */
export async function rebuildHandler(req, res) {
  return buildHandler(
    { ...req, body: { ...req.body, force_template: req.body?.template_id || null } },
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
        error: "Build no encontrado",
      });
    }

    return res.status(200).json({
      success: true,
      build: manifest,
    });
  } catch (error) {
    Logger.error(`Error obteniendo status: ${error.message}`);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
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
