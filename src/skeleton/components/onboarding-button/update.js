// src/skeleton/components/onboarding-button/update.js

import { doc, updateDoc } from "firebase/firestore";
import { auth, db } from "../../../firebase.js";
import { resolveTarget } from "../../onboarding/onboarding-config.js";

export function attachBehavior(button, config) {
  console.group("🟦 [onboarding-button] init");

  const { stepName, getData, validate } = config;

  console.log("Config recibida:", { 
    stepName, 
    hasGetData: !!getData, 
    hasValidate: !!validate 
  });

  if (!stepName || !getData || !validate) {
    console.error("❌ Configuración incompleta");
    console.groupEnd();
    throw new Error("[onboarding-button] Configuración incompleta");
  }

  // Función para actualizar el estado del botón
  const updateState = () => {
    let valid = false;
    try {
      valid = validate();
    } catch (e) {
      console.error("❌ Error en validate()", e);
    }
    button.disabled = !valid;
    console.log("Estado botón:", valid ? "✅ habilitado" : "⛔ deshabilitado");
  };

  // Escuchar cambios en inputs y selects
  document.addEventListener("input", updateState);
  document.addEventListener("change", updateState);  // ← Para selects
  
  // Evaluar estado inicial
  updateState();

  // Click handler
  button.addEventListener("click", async () => {
    console.group("🟩 [onboarding-button] click");

    const user = auth.currentUser;
    if (!user) {
      console.error("❌ Usuario no autenticado");
      window.location.href = "/login.html";
      console.groupEnd();
      return;
    }

    console.log("UID:", user.uid);

    // Deshabilitar botón mientras procesa
    button.disabled = true;
    const originalText = button.innerHTML;
    button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';

    try {
      console.log("📥 Llamando getData()");
      const data = getData();
      console.log("Datos obtenidos:", data);

      const context = {
        uid: user.uid,
        comercioId: data?.comercioId
      };

      console.log("Contexto resolveTarget:", context);

      const target = resolveTarget(stepName, context);
      console.log("Target resuelto:", target);

      const ref = doc(db, target.collection, target.documentId);

      console.log("📡 updateDoc →", target.collection, target.documentId);

      await updateDoc(ref, {
        ...data,
        [`onboardingSteps.${stepName}`]: true
      });

      console.log("✅ Guardado exitoso");
      console.log("➡️ Redirect a /dashboard.html");

      window.location.href = "/dashboard.html";

    } catch (err) {
      console.error("❌ Error en flujo onboarding-button", err);
      
      // Restaurar botón
      button.innerHTML = originalText;
      button.disabled = false;
      
      alert("No se pudo guardar. Revisá los datos.");
    }

    console.groupEnd();
  });

  console.log("✅ Comportamiento del botón configurado");
  console.groupEnd();
}
