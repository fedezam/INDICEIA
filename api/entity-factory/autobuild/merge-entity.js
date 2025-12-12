// /api/entity-factory/autobuild/merge-entity.js

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import { logInfo, logError } from "../utils/logger.js";
import { EntityFactoryError } from "../utils/errors.js";
import { loadTemplateById } from "../utils/template-loader.js";

// Helper para rutas tipo ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BLOCK_A_PATH = path.join(__dirname, "../base/blockA.json");

/**
 * Merge A + B + C
 * blockA = núcleo LER universal
 * blockB = datos del comercio (Firestore)
 * blockC = template visual (opcional)
 */
export async function mergeEntity({ blockB, templateId }) {
  try {
    logInfo("MergeEntity: iniciando fusión…");

    // -----------------------
    // 1. Cargar Block A
    // -----------------------
    if (!fs.existsSync(BLOCK_A_PATH)) {
      throw new EntityFactoryError("blockA.json no encontrado", 500);
    }

    const blockA = JSON.parse(fs.readFileSync(BLOCK_A_PATH, "utf8"));

    // -----------------------
    // 2. Validación mínima
    // -----------------------
    if (!blockB || typeof blockB !== "object") {
      throw new EntityFactoryError("blockB inválido o vacío", 400);
    }

    // -----------------------
    // 3. Cargar Block C (si existe)
    // -----------------------
    let blockC = {};
    if (templateId) {
      blockC = await loadTemplateById(templateId);
      logInfo(`Template visual cargado: ${templateId}`);
    }

    // -----------------------
    // 4. MERGE REAL
    // -----------------------
    const finalEntity = {
      meta: {
        ...blockA.meta,
        generated_at: new Date().toISOString(),
        commerce_id: blockB?.comercio_id ?? null,
        template_used: templateId || "none"
      },

      mental_state: blockA.universal_mental_state,

      commerce: {
        ...blockB
      },

      visual: {
        ...blockC
      }
    };

    logInfo("MergeEntity: fusión completada correctamente.");
    return finalEntity;

  } catch (err) {
    logError("Error en mergeEntity", err);
    throw new EntityFactoryError(err.message || "Error desconocido al fusionar entidad", 500);
  }
}
