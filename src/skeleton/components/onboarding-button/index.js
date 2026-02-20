// src/skeleton/components/onboarding-button/index.js

import './styles.css';
import { renderButton } from "./render.js";
import { attachBehavior } from "./update.js";

/**
 * Crea un botón de onboarding universal.
 *
 * MODO A — Simple: guarda en documento principal vía updateDoc
 *   Requiere: getData
 *
 * MODO B — Custom: save complejo (batch, subcolecciones, etc)
 *   Requiere: onSave
 *   onSave recibe: { uid, comercioId, isEditMode, data?, stepName }
 *   onSave puede retornar:
 *     - true / void              → éxito, el botón marca el paso
 *     - { success, stepMarked }  → éxito, stepMarked=true evita write duplicado
 *     - false                    → fallo sin throw
 *
 * @param {Object}   config
 * @param {string}   config.stepName
 * @param {Function} config.validate       - Retorna boolean
 * @param {Function} [config.getData]      - Modo A
 * @param {Function} [config.onSave]       - Modo B
 * @param {Function} [config.onSuccess]
 * @param {Function} [config.onError]
 * @param {string}   [config.redirectTo]   - Default: '/dashboard.html'
 *
 * @returns {HTMLButtonElement}
 */
export function createOnboardingButton(config) {
  // Toda la validación vive acá — update.js no la repite
  if (!config.stepName || !config.validate) {
    throw new Error('[onboarding-button] stepName y validate son obligatorios');
  }

  if (!config.getData && !config.onSave) {
    throw new Error('[onboarding-button] Requiere getData (modo simple) o onSave (modo custom)');
  }

  const button = renderButton();
  attachBehavior(button, config);
  return button;
}
