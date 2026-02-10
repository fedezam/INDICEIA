// src/skeleton/components/onboarding-button/index.js

import { renderButton } from "./render.js";
import { attachBehavior } from "./update.js";

/**
 * Crea un botón de onboarding universal
 * @param {Object} config
 * @param {string} config.stepName - Nombre del paso (ej: 'usuario')
 * @param {Function} config.getData - Función que devuelve los datos a guardar
 * @param {Function} config.validate - Función que valida si el formulario está completo
 * @returns {HTMLButtonElement}
 */
export function createOnboardingButton(config) {
  const button = renderButton();
  attachBehavior(button, config);
  return button;
}
