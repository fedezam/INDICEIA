// src/skeleton/components/onboarding-button/update.js

import { doc, updateDoc, writeBatch, getDocs, collection } from "firebase/firestore";
import { auth, db } from "../../../firebase.js";
import { resolveTarget } from "../../onboarding/config.js";

export function attachBehavior(button, config) {
  console.group("🟦 [onboarding-button] init");

  const { 
    stepName, 
    getData, 
    validate, 
    onSave,           // ← NUEVO
    onSuccess,        // ← NUEVO
    onError,          // ← NUEVO
    redirectTo = '/dashboard.html'  // ← NUEVO (configurable)
  } = config;

  console.log("Config:", { 
    stepName, 
    hasGetData: !!getData, 
    hasValidate: !!validate,
    hasOnSave: !!onSave,
    mode: onSave ? 'CUSTOM' : 'SIMPLE'
  });

  // ─── ESTADO DEL BOTÓN ───
  const updateState = () => {
    let valid = false;
    try {
      valid = validate();
    } catch (e) {
      console.error("❌ Error en validate()", e);
    }
    button.disabled = !valid;
    console.log("Estado:", valid ? "✅ habilitado" : "⛔ deshabilitado");
  };

  document.addEventListener("input", updateState);
  document.addEventListener("change", updateState);
  updateState();

  // ─── CLICK HANDLER ───
  button.addEventListener("click", async () => {
    console.group("🟩 [onboarding-button] click");

    const user = auth.currentUser;
    if (!user) {
      console.error("❌ No autenticado");
      window.location.href = "/login.html";
      console.groupEnd();
      return;
    }

    console.log("UID:", user.uid);

    // UI: loading
    button.disabled = true;
    const originalText = button.innerHTML;
    button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';

    try {
      let saveSuccess = false;

      // ═══════════════════════════════════════════════════════
      // MODO CUSTOM: onSave proporcionado por la página
      // ═══════════════════════════════════════════════════════
      if (onSave) {
        console.log("🔧 Modo CUSTOM: ejecutando onSave()");
        
        // Obtener contexto
        let data = null;
        if (getData) {
          data = getData();
          console.log("Datos extra de getData:", data);
        }

        // Detectar comercioId de los datos o del contexto
        const comercioId = data?.comercioId || data?.comercio?.id || null;

        const context = {
          uid: user.uid,
          comercioId,
          data,
          stepName
        };

        console.log("Contexto onSave:", context);

        // Ejecutar save custom
        const result = await onSave(context);
        saveSuccess = result !== false; // true, void, undefined = éxito
        
        if (saveSuccess) {
          console.log("✅ onSave() exitoso");
          
          // Marcar paso como completado (si onSave no lo hizo)
          // Nota: onSave puede optar por marcarlo manualmente o dejar que lo hagamos aquí
          // Por defecto, lo marcamos nosotros si onSave no lo hizo
          if (comercioId && !data?.skipAutoMarkStep) {
            await markStepCompleted(comercioId, stepName);
          }
        }

      // ═══════════════════════════════════════════════════════
      // MODO SIMPLE: updateDoc directo (comportamiento anterior)
      // ═══════════════════════════════════════════════════════
      } else {
        console.log("📦 Modo SIMPLE: updateDoc directo");
        
        const data = getData();
        console.log("Datos:", data);

        const context = {
          uid: user.uid,
          comercioId: data?.comercioId
        };

        const target = resolveTarget(stepName, context);
        console.log("Target:", target);

        const ref = doc(db, target.collection, target.documentId);

        await updateDoc(ref, {
          ...data,
          [`onboardingSteps.${stepName}`]: true
        });

        saveSuccess = true;
        console.log("✅ updateDoc exitoso");
      }

      // ─── POST-SAVE ───
      if (saveSuccess) {
        console.log("🎉 Guardado completado");
        
        // Hook onSuccess
        if (onSuccess) {
          console.log("🚀 Ejecutando onSuccess()");
          try {
            await onSuccess();
          } catch (e) {
            console.warn("⚠️ onSuccess error (no crítico):", e);
          }
        }

        // Redirect
        console.log("➡️ Redirect a:", redirectTo);
        window.location.href = redirectTo;
      }

    } catch (err) {
      console.error("❌ Error en guardado:", err);
      
      // Hook onError
      if (onError) {
        try {
          onError(err);
        } catch (e) {
          console.error("❌ onError también falló:", e);
        }
      } else {
        // Default: alert simple
        alert("No se pudo guardar. Revisá los datos.");
      }

      // Restaurar botón
      button.innerHTML = originalText;
      button.disabled = false;
    }

    console.groupEnd();
  });

  console.log("✅ Comportamiento configurado");
  console.groupEnd();
}

// ─── HELPER: Marcar paso completado ───
async function markStepCompleted(comercioId, stepName) {
  if (!comercioId || !stepName) return;
  
  try {
    const ref = doc(db, 'comercios', comercioId);
    await updateDoc(ref, {
      [`onboardingSteps.${stepName}`]: true,
      fechaActualizacion: serverTimestamp()
    });
    console.log(`✅ Paso ${stepName} marcado en comercio`);
  } catch (err) {
    console.error(`❌ Error marcando paso ${stepName}:`, err);
    // No crítico, no throw
  }
}


  
