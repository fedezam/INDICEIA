// ============================================
// firebaseAdapter.js
// Adapter entre skeleton y firebaseDB
// ============================================

import { resolveFirebaseContext } from './firebaseContext.js';
import { getComercioData } from './firebaseDB.js';

/**
 * Adapter para el skeleton
 * Resuelve el contexto Firebase y lo devuelve en el formato esperado
 */
export function createFirebaseAdapter(options = {}) {
  return new Promise((resolve, reject) => {
    resolveFirebaseContext(
      async (baseContext) => {
        try {
          // baseContext contiene: { user, userData, comercioId, comercioData }
          
          // Agregar flags adicionales si son necesarios
          const isEditMode = new URLSearchParams(window.location.search).get('edit') === 'true';
          
          // Contexto completo para el skeleton
          const context = {
            ...baseContext,
            isEditMode,
            currentComercioId: baseContext.comercioId,
            ...options // Permite pasar opciones adicionales
          };

          resolve(context);
        } catch (err) {
          reject(err);
        }
      },
      (error) => {
        reject(error);
      }
    );
  });
}

/**
 * Ejemplo de uso:
 * 
 * import { runSkeleton } from './skeleton.js';
 * import { createFirebaseAdapter } from './firebaseAdapter.js';
 * 
 * const productosModule = {
 *   async load(context) {
 *     const productos = await getProducts();
 *     // ...
 *   },
 *   render() { ... },
 *   getCurrentData() { ... },
 *   save() { ... },
 *   isFormValid() { ... }
 * };
 * 
 * runSkeleton({
 *   page: productosModule,
 *   adapter: createFirebaseAdapter,
 *   options: { loadingMessage: 'Cargando productos...' }
 * });
 */
