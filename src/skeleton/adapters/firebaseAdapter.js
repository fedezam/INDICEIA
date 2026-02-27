// ============================================
// firebaseAdapter.js
// Adapter entre skeleton y firebaseDB
// ============================================
import { resolveFirebaseContext } from '../../services/firebase/context.js';
import {
  updateComercioData,
  updateUserData,
  markOnboardingStep,
  deleteComercioFields
} from '../../services/firebase/db.js';

/**
 * NORMALIZA comercioData
 * 👉 garantiza contratos estables para TODAS las páginas
 */
function normalizeComercioData(raw = {}) {
  const data = { ...raw };
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
 * Adapter Firebase completo:
 * - Resuelve contexto
 * - Normaliza datos
 * - Expone persistencia
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
            // 🔧 Normalización central
            comercioData: normalizeComercioData(baseContext.comercioData),
            isEditMode,
            currentComercioId: baseContext.comercioId,
            // 🔥 Persistencia integrada
            persistence: {
              // Para páginas de COMERCIO (horarios, servicios, productos, ia-config...)
              async updateData(data) {
                await updateComercioData(data);
              },
              // Para páginas de USUARIO (usuario, modelo-negocio)
              async updateUserData(data) {
                await updateUserData(data);
              },
              // Sabe solo dónde escribir el step según el nombre
              async markStepCompleted(stepName) {
                await markOnboardingStep(stepName, true);
              },
              async deleteFields(fieldNames) {
                await deleteComercioFields(fieldNames);
              }
            },
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
