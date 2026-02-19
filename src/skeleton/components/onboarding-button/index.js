// src/skeleton/components/onboarding-button/index.js

// ✅ CSS primero - garantizado al importar el componente
import './styles.css';

import { renderButton } from "./render.js";
import { attachBehavior } from "./update.js";

/**
 * Crea un botón de onboarding universal
 * 
 * @param {Object} config
 * @param {string} config.stepName - Nombre del paso (ej: 'usuario', 'servicios')
 * @param {Function} config.validate - Función que valida si el formulario está completo. Retorna boolean.
 * 
 * // MODO A: Simple (guarda en documento principal)
 * @param {Function} [config.getData] - Función que devuelve los datos a guardar. Usa updateDoc interno.
 * 
 * // MODO B: Custom (save complejo - subcolecciones, batches, etc)
 * @param {Function} [config.onSave] - Función async que ejecuta el guardado custom. 
 *   Recibe: { uid, comercioId, data?, stepName }. Si retorna true/void = éxito. Si throw = error.
 * 
 * // HOOKS
 * @param {Function} [config.onSuccess] - Llamado después de guardar exitoso, antes de redirigir.
 * @param {Function} [config.onError] - Llamado si hay error en onSave. Recibe el error.
 * @param {string} [config.redirectTo] - URL de redirección (default: '/dashboard.html')
 * 
 * @returns {HTMLButtonElement}
 * 
 * @example
 * // MODO A: Simple (como antes)
 * createOnboardingButton({
 *   stepName: 'usuario',
 *   validate: () => true,
 *   getData: () => ({ nombre: 'Juan' })
 * });
 * 
 * @example  
 * // MODO B: Custom save (servicios, productos, etc)
 * createOnboardingButton({
 *   stepName: 'servicios',
 *   validate: () => servicios.length > 0,
 *   onSave: async ({ uid, comercioId }) => {
 *     // Batch write, subcolecciones, lo que sea
 *     await saveServiciosComplex(servicios);
 *   }
 * });
 */
export function createOnboardingButton(config) {
  // Validación de config
  if (!config.stepName || !config.validate) {
    throw new Error('[onboarding-button] stepName y validate son obligatorios');
  }

  // MODO A requiere getData
  // MODO B requiere onSave (getData opcional para datos extra)
  const hasSimpleMode = !!config.getData;
  const hasCustomMode = !!config.onSave;

  if (!hasSimpleMode && !hasCustomMode) {
    throw new Error('[onboarding-button] Requiere getData (modo simple) o onSave (modo custom)');
  }

  const button = renderButton();
  attachBehavior(button, config);
  return button;
}
