// src/skeleton/components/onboarding-button/index.js

import { renderButton } from "./render.js";
import { attachBehavior } from "./update.js";

/**
 * Crea un botón de onboarding universal.
 *
 * ─── MODO SIMPLE ────────────────────────────────────────────
 * Requiere: getData
 * Flujo: getData() → persistence.updateData() → persistence.markStepCompleted() → redirect
 *
 * ─── MODO CUSTOM ────────────────────────────────────────────
 * Requiere: onSave
 * onSave recibe: { uid, comercioId, isEditMode, data?, stepName }
 * onSave puede retornar:
 *   - true / void              → éxito, el botón marca el paso
 *   - { success, stepMarked }  → éxito, stepMarked=true evita write duplicado
 *   - false                    → fallo sin throw
 *
 * ─── OPCIONALES ─────────────────────────────────────────────
 * dirtyController  → si hasUnsavedChanges() === false, skip persistencia y redirect directo
 * getLabel()       → label dinámico que se actualiza en cada ciclo de validate
 * getChangeType()  → aplica clase CSS .is-update / .is-delete al botón
 *
 * @param {Object}   config
 * @param {string}   config.stepName
 * @param {Function} config.validate                        - Retorna boolean
 * @param {Function} [config.getData]                       - Modo simple
 * @param {Function} [config.onSave]                        - Modo custom
 * @param {Object}   [config.dirtyController]               - { hasUnsavedChanges, markSaved }
 * @param {Function} [config.getLabel]                      - Label dinámico
 * @param {Function} [config.getChangeType]                 - 'update' | 'delete'
 * @param {Function} [config.onSuccess]
 * @param {Function} [config.onError]
 * @param {string}   [config.redirectTo='/dashboard.html']
 *
 * @returns {HTMLButtonElement}
 */
export function createOnboardingButton(config) {
  if (!config?.stepName || !config?.validate) {
    throw new Error('[onboarding-button] stepName y validate son obligatorios');
  }
  if (!config.getData && !config.onSave) {
    throw new Error('[onboarding-button] Requiere getData (modo simple) o onSave (modo custom)');
  }

  const button = renderButton();
  attachBehavior(button, config);
  return button;
}
