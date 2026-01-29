import { showLoading, hideLoading, showToast } from '../shared/utils.js';

/**
 * Lifecycle canónico del Skeleton
 * Maneja:
 *  - loading
 *  - errores
 *  - resolución de contexto vía adapter
 */
export async function runLifecycle({
  adapter,
  options = {},
  onReady
}) {
  try {
    showLoading(options.loadingMessage || 'Cargando...');

    if (typeof adapter !== 'function') {
      throw new Error('Skeleton lifecycle requiere un adapter válido');
    }

    // El adapter RESUELVE el contexto (auth, datos base, flags, etc)
    const context = await adapter(options);

    if (!context) {
      throw new Error('Adapter no devolvió contexto');
    }

    // Hook principal
    if (typeof onReady === 'function') {
      await onReady(context);
    }

    hideLoading();
  } catch (err) {
    console.error('[Skeleton lifecycle]', err);
    hideLoading();
    showToast('Error', err.message || 'Error inesperado', 'error');
  }
}
