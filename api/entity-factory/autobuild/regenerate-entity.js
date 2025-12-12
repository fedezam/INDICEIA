// /api/entity-factory/autobuild/regenerate-entity.js

import { logInfo, logError } from "../utils/logger.js";
import { EntityFactoryError } from "../utils/errors.js";

import { mergeEntity } from "./merge-entity.js";
import { updateEntity } from "../utils/uploader.js";

import { getFirestore } from "firebase-admin/firestore";
import admin from "firebase-admin";

// --- Inicialización Firestore (solo si aún no existe) ---
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault()
  });
}

const db = getFirestore();

/**
 * Regeneración completa:
 * - Carga blockB (comercio)
 * - Fusiona A+B+C
 * - Actualiza JSON en Vercel Blob (misma URL)
 */
export async function regenerateEntity({ comercio_id, template_id = null }) {
  try {
    logInfo(`Regenerar entidad para comercio: ${comercio_id}`);

    if (!comercio_id) {
      throw new EntityFactoryError("comercio_id es obligatorio", 400);
    }

    // ----------------------------------------------------
    // 1. Obtener Block B desde Firestore
    // ----------------------------------------------------
    const docRef = db.collection("comercios").doc(comercio_id);
    const snap = await docRef.get();

    if (!snap.exists) {
      throw new EntityFactoryError(`No existe comercio con ID ${comercio_id}`, 404);
    }

    const blockB = snap.data();

    logInfo("Block B cargado desde Firestore.");

    // ----------------------------------------------------
    // 2. Merge A + B + C → Entidad final
    // ----------------------------------------------------
    const finalEntity = await mergeEntity({
      blockB,
      templateId: template_id
    });

    // ----------------------------------------------------
    // 3. Subida a Vercel Blob (SOBREESCRIBIR)
    // ----------------------------------------------------
    const { url } = await updateEntity({
      comercioId: comercio_id,
      entityJSON: finalEntity
    });

    logInfo("Entidad subida y actualizada correctamente.");

    return {
      status: "ok",
      comercio_id,
      url,
      template_id
    };

  } catch (err) {
    logError("Error en regenerateEntity", err);
    throw new EntityFactoryError(err.message || "Error desconocido regenerando entidad", 500);
  }
}
