// src/skeleton/components/onboarding-button/update.js

import { createFirebaseAdapter } from '../../adapters/firebaseAdapter.js';
import { cleanPayload } from '../../utils/cleanPayload.js';

/**
 * Contexto resuelto lazy — una sola vez por instancia de botón.
 * Se cachea en el closure para no resolver en cada click.
 */
function createContextResolver() {
  let cached = null;
  return async function resolveContext() {
    if (!cached) {
      cached = await createFirebaseAdapter();
    }
    return cached;
  };
}

export function attachBehavior(button, config) {
  const {
    stepName,
    getData,
    onSave,
    validate,
    dirtyController,
    getLabel,
    getChangeType,
    onSuccess,
    onError,
    redirectTo = '/dashboard.html'
  } = config;

  const hasCustomMode = !!onSave;
  const resolveContext = createContextResolver();

  // ─── updateState ───────────────────────────────────────────
  // Evalúa validate(), actualiza disabled, label y clase semántica.
  const updateState = () => {
    // Validate
    let valid = false;
    try { valid = validate(); } catch (e) {
      console.error('[onboarding-button] Error en validate():', e);
    }
    button.disabled = !valid;

    // Label dinámico
    if (typeof getLabel === 'function') {
      try {
        const label = getLabel();
        if (label) button.innerHTML = `<i class="fas fa-arrow-right"></i> ${label}`;
      } catch (e) {
        console.error('[onboarding-button] Error en getLabel():', e);
      }
    }

    // Clase semántica de tipo de mutación
    if (typeof getChangeType === 'function') {
      try {
        const type = getChangeType();
        button.classList.toggle('is-update', type === 'update');
        button.classList.toggle('is-delete', type === 'delete');
      } catch (e) {
        console.error('[onboarding-button] Error en getChangeType():', e);
      }
    }
  };

  // Listeners con cleanup automático al salir del DOM
  document.addEventListener('input', updateState);
  document.addEventListener('change', updateState);

  const observer = new MutationObserver(() => {
    if (!document.contains(button)) {
      document.removeEventListener('input', updateState);
      document.removeEventListener('change', updateState);
      observer.disconnect();
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });

  // Estado inicial (diferido para que el DOM esté listo)
  setTimeout(updateState, 0);

  // ─── Click handler ──────────────────────────────────────────
  button.addEventListener('click', async () => {
    console.group('🟩 [onboarding-button] click');

    // ─── Dirty check ANTES del spinner — no necesita contexto ──
    if (dirtyController && !dirtyController.hasUnsavedChanges()) {
      console.log('[onboarding-button] Sin cambios → redirect directo');
      window.location.href = redirectTo;
      console.groupEnd();
      return;
    }

    const originalHTML = button.innerHTML;
    button.disabled = true;
    button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';

    try {
      // Resolver contexto (lazy, cacheado)
      const ctx = await resolveContext();

      if (!ctx?.user) {
        console.error('[onboarding-button] Usuario no autenticado');
        window.location.href = '/login.html';
        console.groupEnd();
        return;
      }

      const { persistence, user, comercioId, isEditMode } = ctx;

      let saveSuccess = false;
      let stepAlreadyMarked = false;

      // ═══ MODO CUSTOM ════════════════════════════════════════
      if (hasCustomMode) {
        console.log('[onboarding-button] Modo CUSTOM');

        const data = typeof getData === 'function' ? getData() : null;
        const context = { uid: user.uid, comercioId, isEditMode, data, stepName, persistence };

        const result = await onSave(context);

        if (result === false) {
          saveSuccess = false;
        } else if (result && typeof result === 'object') {
          saveSuccess       = result.success !== false;
          stepAlreadyMarked = result.stepMarked === true;
        } else {
          saveSuccess = true;
        }

        // Marcar paso si onSave no lo hizo
        if (saveSuccess && !stepAlreadyMarked) {
          await persistence.markStepCompleted(stepName);
        }

      // ═══ MODO SIMPLE ════════════════════════════════════════
      } else {
        console.log('[onboarding-button] Modo SIMPLE');

        const rawData = getData();
        const cleanData = cleanPayload(rawData) || {};

        await persistence.updateData(cleanData);
        await persistence.markStepCompleted(stepName);

        saveSuccess = true;
      }

      // ─── Post-save ──────────────────────────────────────────
      if (saveSuccess) {
        dirtyController?.markSaved();

        if (typeof onSuccess === 'function') {
          try { await onSuccess(); } catch (e) {
            console.warn('[onboarding-button] onSuccess error (no crítico):', e);
          }
        }

        console.log('[onboarding-button] ➡️ Redirect a:', redirectTo);
        window.location.href = redirectTo;
      } else {
        // onSave retornó false sin throw — restaurar botón
        button.innerHTML = originalHTML;
        button.disabled = false;
      }

    } catch (err) {
      console.error('[onboarding-button] ❌ Error:', err);

      if (typeof onError === 'function') {
        try { onError(err); } catch (e) {
          console.error('[onboarding-button] onError también falló:', e);
        }
      } else {
        alert('No se pudo guardar. Revisá los datos.');
      }

      button.innerHTML = originalHTML;
      button.disabled = false;
    }

    console.groupEnd();
  });

  // FIX: retornar updateState para que el caller pueda forzar re-evaluación
  // cuando cambia estado en memoria sin disparar eventos DOM
  return { updateState };
}
