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
 *
 * Conviven dos shapes de plan en el sistema:
 *  - planId: string simple ("trial", "pro", ...) — usado por código
 *    legacy que indexa PLANS[planId] (header/update.js,
 *    dataPageSkeleton.js, plans.js).
 *  - plan: objeto real de Firestore { type, active, trial, expires_at,
 *    started_at, ... } — usado por el sistema nuevo de planes
 *    (resolvePlanStatus.js, dashboard.js, super-admin).
 *
 * Antes esta función pisaba `data.plan` con un string y perdía el
 * objeto completo, rompiendo resolvePlanStatus() en el dashboard
 * (siempre veía plan.active === undefined → siempre "vencido").
 * Ahora no se pierde nada: se agregan ambos campos por separado.
 *
 * IMPORTANTE: esta función asume que raw es un objeto de comercio
 * real. NO se debe llamar con null (páginas de usuario sin comercio
 * asociado) — ver createFirebaseAdapter más abajo, donde se evita
 * llamarla en ese caso. Se deja igual el guard con `?.` como
 * resguardo defensivo por si algún otro caller la invoca con null.
 */
function normalizeComercioData(raw = {}) {
  const data = { ...(raw || {}) };

  // planId: string simple del plan, para consumidores legacy
  if (!raw?.plan) {
    data.planId = 'trial';
  } else if (typeof raw.plan === 'object') {
    data.planId = raw.plan.type || 'trial';
  } else {
    data.planId = String(raw.plan);
  }

  // plan: objeto intacto para resolvePlanStatus()/dashboard.js.
  // Si viniera como string legacy nunca migrado, armamos un objeto
  // mínimo en vez de dejarlo como string suelto.
  data.plan = raw?.plan && typeof raw.plan === 'object'
    ? raw.plan
    : { type: data.planId, active: false, trial: true };

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
            // 🔧 Normalización central — SOLO si hay comercio real.
            // Páginas de usuario (usuario.js, modelo-negocio.js, etc.)
            // no tienen comercioData todavía: baseContext.comercioData
            // llega como null, y forzarle un objeto plan fantasma no
            // tiene sentido semántico y además rompía el flujo
            // (Cannot read properties of null (reading 'plan')).
            comercioData: baseContext.comercioData
              ? normalizeComercioData(baseContext.comercioData)
              : null,
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
