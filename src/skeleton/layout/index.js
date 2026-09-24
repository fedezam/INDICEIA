// src/skeleton/layout/index.js
import { renderLayout } from './renderLayout.js';
import { updateHeader } from './header/update.js';

/**
 * Monta el layout (solo si no existe) y actualiza con datos
 *
 * 09/09/2026 — Fix: uid para el conteo de alertas (contarAlertasNoLeidas
 * en header/update.js) debe ser el DUEÑO de la entidad que se está
 * mostrando, no necesariamente el usuario logueado. Sin esto, un admin
 * viendo la entidad de un tercero (context.js:isAdminViewing) le pasaba
 * su propio uid emparejado con el comercioId ajeno — combinación que no
 * corresponde a ningún usuario real, y que según cómo esté armada
 * contarAlertasNoLeidas podía devolver 0 siempre o datos de otro lado.
 *
 * user.uid sigue siendo la identidad real de auth (correcto, no se
 * toca) — lo que cambia es el uid que se usa específicamente para
 * resolver alertas de ESTA entidad, que es comercioData.duenoId
 * cuando existe.
 */
export function mountLayout(context) {
  // ✅ Solo renderiza si no existe (idempotente)
  if (!document.getElementById('skeleton-root')) {
    renderLayout();
  }

  const { userData, comercioData, user, comercioId, isAdminViewing } = context;

  console.log('📍 mountLayout → userData:', userData);
  console.log('📍 mountLayout → comercioData:', comercioData);

  // uid real dueño de la entidad mostrada — solo difiere de user.uid
  // cuando un admin está viendo una entidad ajena.
  const ownerUid = (isAdminViewing && comercioData?.duenoId)
    ? comercioData.duenoId
    : user?.uid;

  updateHeader({ userData, comercioData, uid: ownerUid, comercioId, isAdminViewing });
}
