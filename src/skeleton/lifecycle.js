import { showLoading, hideLoading, showToast } from '../shared/utils.js';

// Errores que indican problema de sesión/flujo, no errores técnicos
const AUTH_FLOW_ERRORS = [
  'No authenticated user',
  'Usuario no encontrado'
];

/**
 * Lifecycle canónico del Skeleton
 * Maneja:
 *  - loading
 *  - errores
 *  - resolución de contexto vía adapter
 *
 * @param {Object}   config
 * @param {Function} config.adapter
 * @param {Object}   config.options
 * @param {Function} config.onReady
 * @param {Function} [config.onAuthError]  - Handler inyectable para errores de sesión/flujo.
 *                                           Si no se pasa, redirige a '/' como fallback.
 */
export async function runLifecycle({
  adapter,
  options = {},
  onReady,
  onAuthError
}) {
  try {
    showLoading(options.loadingMessage || 'Cargando...');

    if (typeof adapter !== 'function') {
      throw new Error('Skeleton lifecycle requiere un adapter válido');
    }

    const context = await adapter(options);

    if (!context) {
      throw new Error('Adapter no devolvió contexto');
    }

    if (typeof onReady === 'function') {
      await onReady(context);
    }

    hideLoading();

  } catch (err) {
    console.error('[Skeleton lifecycle]', err);
    hideLoading();

    if (AUTH_FLOW_ERRORS.includes(err.message)) {
      if (typeof onAuthError === 'function') {
        onAuthError(err);
      } else {
        // Fallback: sin handler inyectado, va al inicio
        window.location.href = '/';
      }
      return;
    }

    showToast('Error', err.message || 'Error inesperado', 'error');
  }
}
