// src/skeleton/components/onboarding-button/update.js

import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../../../firebase.js";
import { resolveTarget } from "../../onboarding/config.js";
import { 
  getCurrentUserId,
  getCurrentComercioId,
  isEditMode,
  requireComercioId
} from "../../runtime.js";

/**
 * Adjunta comportamiento al botón de onboarding
 * 
 * Contexto (del runtime):
 * - uid, comercioId, isEditMode: automáticos vía runtime
 * - data: opcional vía getData()
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

  // Validación de config
  if (!stepName || !validate) {
    throw new Error("[onboarding-button] stepName y validate son obligatorios");
  }

  const hasSimpleMode = !!getData;
  const hasCustomMode = !!onSave;

  if (!hasSimpleMode && !hasCustomMode) {
    throw new Error("[onboarding-button] Requiere getData (modo simple) o onSave (modo custom)");
  }

  // Estado del botón
  const updateState = () => {
    let valid = false;
    try {
      valid = validate();
    } catch (e) {
      console.error("[onboarding-button] Error en validate():", e);
    }
    button.disabled = !valid;
    console.log("[onboarding-button] Estado:", valid ? "✅ habilitado" : "⛔ deshabilitado");
  };

  // Escuchar cambios en el DOM
  document.addEventListener("input", updateState);
  document.addEventListener("change", updateState);
  
  // Evaluar estado inicial (con delay para que el DOM se estabilice)
  setTimeout(updateState, 0);

  // Click handler
  button.addEventListener("click", async () => {
    console.group("🟩 [onboarding-button] click");

    const user = auth.currentUser;
    if (!user) {
      console.error("[onboarding-button] Usuario no autenticado");
      window.location.href = "/login.html";
      console.groupEnd();
      return;
    }

    // UI: loading
    button.disabled = true;
    const originalText = button.innerHTML;
    button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';

    try {
      // ✅ CONTEXTO DEL RUNTIME (ADR-001)
      // No depende de getData, siempre disponible
      const runtimeContext = {
        uid: getCurrentUserId(),
        comercioId: getCurrentComercioId(),
        isEditMode: isEditMode()
      };

      console.log("[onboarding-button] Runtime context:", runtimeContext);

      let saveSuccess = false;

      // ═══════════════════════════════════════════════════════
      // MODO CUSTOM: onSave proporcionado por la página
      // ═══════════════════════════════════════════════════════
      if (onSave) {
        console.log("[onboarding-button] Modo CUSTOM");

        // Datos extra opcionales de la página
        const data = getData ? getData() : null;

        const context = {
          ...runtimeContext,  // ← siempre presente
          data,               // ← opcional
          stepName
        };

        console.log("[onboarding-button] Contexto completo:", context);

        // Ejecutar save custom
        const result = await onSave(context);
        saveSuccess = result !== false;

        // Marcar paso si onSave no lo hizo
        if (saveSuccess && runtimeContext.comercioId) {
          await markStepCompleted(runtimeContext.comercioId, stepName);
        }

      // ═══════════════════════════════════════════════════════
      // MODO SIMPLE: updateDoc directo
      // ═══════════════════════════════════════════════════════
      } else {
        console.log("[onboarding-button] Modo SIMPLE");

        const data = getData();
        const target = resolveTarget(stepName, runtimeContext);

        console.log("[onboarding-button] Target:", target);

        const ref = doc(db, target.collection, target.documentId);

        await updateDoc(ref, {
          ...data,
          [`onboardingSteps.${stepName}`]: true,
          fechaActualizacion: serverTimestamp()
        });

        saveSuccess = true;
        console.log("[onboarding-button] updateDoc exitoso");
      }

      // ─── POST-SAVE ───
      if (saveSuccess) {
        console.log("[onboarding-button] ✅ Guardado completado");

        if (onSuccess) {
          try {
            await onSuccess();
          } catch (e) {
            console.warn("[onboarding-button] onSuccess error (no crítico):", e);
          }
        }

        console.log("[onboarding-button] ➡️ Redirect a:", redirectTo);
        window.location.href = redirectTo;
      }

    } catch (err) {
      console.error("[onboarding-button] ❌ Error:", err);

      if (onError) {
        try {
          onError(err);
        } catch (e) {
          console.error("[onboarding-button] onError también falló:", e);
        }
      } else {
        alert("No se pudo guardar. Revisá los datos.");
      }

      // Restaurar botón
      button.innerHTML = originalText;
      button.disabled = false;
    }

    console.groupEnd();
  });
}

/**
 * Marca paso de onboarding como completado
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

  
