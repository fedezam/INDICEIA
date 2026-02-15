// ============================================
// firebaseAdapter.js
// Adapter entre skeleton y firebaseDB
// ============================================

import { resolveFirebaseContext } from '../../services/firebase/context.js';

/**
 * NORMALIZA comercioData
 * 👉 garantiza contratos estables para TODAS las páginas
 */
function normalizeComercioData(raw = {}) {
  const data = { ...raw };

  // 🔑 NORMALIZACIÓN DE PLAN (CRÍTICA)
  if (!data.plan) {
    data.plan = 'trial';
  } else if (typeof data.plan === 'object') {
    data.plan = data.plan.id || 'trial';
  } else {
    data.plan = String(data.plan);
  }

  return data;
}

/**
 * Adapter para el skeleton
 * Resuelve el contexto Firebase y lo devuelve normalizado
 */
export function createFirebaseAdapter(options = {}) {
  return new Promise((resolve, reject) => {
    resolveFirebaseContext(
      async (baseContext) => {
        try {
          const isEditMode =
            new URLSearchParams(window.location.search).get('edit') === 'true';

          const context = {
            ...baseContext,

            // 🔧 NORMALIZACIÓN CENTRAL
            comercioData: normalizeComercioData(baseContext.comercioData),

            isEditMode,
            currentComercioId: baseContext.comercioId,
            ...options
          };

          resolve(context);
        } catch (err) {
          reject(err);
        }
      },
      (error) => reject(error)
    );
  });
}
