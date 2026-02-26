import { showLoading, hideLoading, showToast } from '../shared/utils.js';
import { runFlowController } from '../../controllers/flowController.js';
import { auth } from '../../services/firebase/firebase.js';
import { onAuthStateChanged } from 'firebase/auth';

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

    // Sin sesión o usuario sin doc → flowController decide a dónde ir
    // Respeta el contrato: context.js NO navega, lifecycle SÍ reacciona
    if (AUTH_FLOW_ERRORS.includes(err.message)) {
      onAuthStateChanged(auth, (user) => {
        runFlowController(user?.uid || null);
      });
      return;
    }

    showToast('Error', err.message || 'Error inesperado', 'error');
  }
}
