// src/skeleton/components/onboarding-button/update.js

import { doc, updateDoc } from "firebase/firestore";
import { auth, db } from "../../../firebase.js";
import { resolveTarget } from "../../onboarding/resolveTarget.js";

export function attachBehavior(button, config) {
  const {
    stepName,
    getData,
    validate
  } = config;

  if (!stepName || !getData || !validate) {
    throw new Error("[onboarding-button] Configuración incompleta");
  }

  // Activación reactiva
  const updateState = () => {
    button.disabled = !validate();
  };

  document.addEventListener("input", updateState);
  updateState();

  button.addEventListener("click", async () => {
    const user = auth.currentUser;
    if (!user) {
      window.location.href = "/login.html";
      return;
    }

    try {
      const data = getData();

      const context = {
        uid: user.uid,
        comercioId: data.comercioId
      };

      const { collection, documentId } = resolveTarget(stepName, context);

      const ref = doc(db, collection, documentId);

      await updateDoc(ref, {
        ...data,
        [`onboardingSteps.${stepName}`]: true
      });

      window.location.href = "/dashboard.html";

    } catch (err) {
      console.error("[onboarding-button] Error:", err);
      alert("No se pudo guardar. Revisá los datos.");
    }
  });
}
