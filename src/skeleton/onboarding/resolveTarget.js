// src/skeleton/onboarding/resolveTarget.js

import { STEP_TARGETS } from "./config.js";

/**
 * Resuelve el destino de persistencia de un paso de onboarding.
 *
 * @param {string} stepName - nombre del paso (ej: 'usuario', 'mi-comercio')
 * @param {object} context
 * @param {string} context.uid
 * @param {string} context.comercioId
 *
 * @returns {{
 *   collection: string,
 *   documentId: string
 * }}
 */
export function resolveTarget(stepName, context = {}) {
  const target = STEP_TARGETS[stepName];

  if (!target) {
    throw new Error(`[onboarding] Paso desconocido: ${stepName}`);
  }

  const { collection, idField } = target;
  const documentId = context[idField];

  if (!documentId) {
    throw new Error(
      `[onboarding] No se pudo resolver documentId para paso '${stepName}' (falta ${idField})`
    );
  }

  return {
    collection,
    documentId
  };
}
