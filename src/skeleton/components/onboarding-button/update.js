// src/skeleton/components/onboarding-button/update.js

import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../../../firebase.js";
import { resolveTarget } from "../../onboarding/config.js";
import {
  getCurrentUserId,
  getCurrentComercioId,
  isEditMode
} from "../../runtime.js";

/**
 * Adjunta comportamiento al botón de onboarding.
 * Validación de config ya fue hecha en index.js — no se repite acá.
 */
export function attachBehavior(button, config) {
  const {
    stepName,
    getData,
    validate,
    onSave,
    onSuccess,
    onError,
    redirectTo = '/dashboard.html'
  } = config;

  const hasCustomMode = !!onSave;

  // ─── Estado del botón ───────────────────────────────────────
  const updateState = () => {
    let valid = false;
    try {
      valid = validate();
    } catch (e) {
      console.error("[onboarding-button] Error en validate():", e);
    }
    button.disabled = !valid;
  };

  // FIX #1: Los listeners se auto-limpian cuando el botón sale del DOM.
  // El original acumulaba 2 listeners nuevos por cada render() de la página.
  document.addEventListener("input", updateState);
  document.addEventListener("change", updateState);

  const observer = new MutationObserver(() => {
    if (!document.contains(button)) {
      document.removeEventListener("input", updateState);
      document.removeEventListener("change", updateState);
      observer.disconnect();
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });

  // Estado inicial
  setTimeout(updateState, 0);

  // ─── Click handler ──────────────────────────────────────────
  button.addEventListener("click", async () => {
    console.group("🟩 [onboarding-button] click");

    const user = auth.currentUser;
    if (!user) {
      console.error("[onboarding-button] Usuario no autenticado");
      window.location.href = "/login.html";
      console.groupEnd();
      return;
    }

    button.disabled = true;
    const originalText = button.innerHTML;
    button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';

    try {
      const runtimeContext = {
        uid: getCurrentUserId(),
        comercioId: getCurrentComercioId(),
        isEditMode: isEditMode()
      };

      let saveSuccess = false;
      // FIX #2: el flag indica si onSave ya marcó el paso,
      // para no hacer un segundo write a Firestore.
      let stepAlreadyMarked = false;

      // ═══ MODO CUSTOM ════════════════════════════════════════
      if (hasCustomMode) {
        console.log("[onboarding-button] Modo CUSTOM");

        const data = getData ? getData() : null;
        const context = { ...runtimeContext, data, stepName };

        const result = await onSave(context);

        // onSave puede retornar:
        //   true / void          → éxito, marcar paso acá
        //   { success, stepMarked } → éxito, stepMarked indica si ya lo marcó
        //   false                → falló sin throw
        if (result === false) {
          saveSuccess = false;
        } else if (result && typeof result === 'object') {
          saveSuccess = result.success !== false;
          stepAlreadyMarked = result.stepMarked === true;
        } else {
          saveSuccess = true;
        }

        if (saveSuccess && runtimeContext.comercioId && !stepAlreadyMarked) {
          await markStepCompleted(runtimeContext.comercioId, stepName);
        }

      // ═══ MODO SIMPLE ════════════════════════════════════════
      } else {
        console.log("[onboarding-button] Modo SIMPLE");

        const data = getData();
        const target = resolveTarget(stepName, runtimeContext);
        const ref = doc(db, target.collection, target.documentId);

        await updateDoc(ref, {
          ...data,
          [`onboardingSteps.${stepName}`]: true,
          fechaActualizacion: serverTimestamp()
        });

        saveSuccess = true;
      }

      // ─── Post-save ─────────────────────────────────────────
      if (saveSuccess) {
        if (onSuccess) {
          try { await onSuccess(); } catch (e) {
            console.warn("[onboarding-button] onSuccess error (no crítico):", e);
          }
        }
        console.log("[onboarding-button] ➡️ Redirect a:", redirectTo);
        window.location.href = redirectTo;
      }

    } catch (err) {
      console.error("[onboarding-button] ❌ Error:", err);

      if (onError) {
        try { onError(err); } catch (e) {
          console.error("[onboarding-button] onError también falló:", e);
        }
      } else {
        alert("No se pudo guardar. Revisá los datos.");
      }

      button.innerHTML = originalText;
      button.disabled = false;
    }

    console.groupEnd();
  });
}

/**
 * Marca paso de onboarding como completado.
 * Solo se llama si onSave no lo hizo (stepAlreadyMarked === false).
 */
async function markStepCompleted(comercioId, stepName) {
  if (!comercioId || !stepName) return;
  try {
    const ref = doc(db, 'comercios', comercioId);
    await updateDoc(ref, {
      [`onboardingSteps.${stepName}`]: true,
      fechaActualizacion: serverTimestamp()
    });
    console.log(`[onboarding-button] Paso ${stepName} marcado`);
  } catch (err) {
    console.error(`[onboarding-button] Error marcando paso:`, err);
    // No crítico, no throw
  }
}
