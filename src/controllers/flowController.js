// src/controllers/flowController.js
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase.js"; // Sube un nivel desde controllers/ a src/

// ORDEN ESTRICTO DEL ONBOARDING
// Los nombres deben coincidir EXACTAMENTE con:
// 1. El nombre del archivo HTML (sin .html)
// 2. La clave guardada en Firestore (onboardingSteps.[nombre])
const FLOW_STEPS = [
  "usuario",
  "mi-comercio",   // CORREGIDO: antes decía "comercio"
  "horarios",
  "productos",
  "ia-config",
];

// ---------------------------------------------------------
// Ejecuta el flujo y redirige al siguiente paso o dashboard
// ---------------------------------------------------------
export async function runFlowController(uid) {
  // Evita ejecución en servidor (SSR, build, etc.)
  if (typeof window === 'undefined') return;

  if (!uid) {
    console.warn("runFlowController: uid no proporcionado");
    return;
  }

  try {
    // 1. Obtener comercioId del usuario
    const userRef = doc(db, "usuarios", uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      console.error("Usuario no encontrado en Firestore");
      return;
    }

    const comercioId = userSnap.data()?.comercioId;
    if (!comercioId) {
      console.error("Usuario sin comercioId asociado");
      return;
    }

    // 2. Leer pasos completados del comercio
    const comercioRef = doc(db, "comercios", comercioId);
    const comercioSnap = await getDoc(comercioRef);

    if (!comercioSnap.exists()) {
      console.error("Comercio no encontrado");
      return;
    }

    const steps = comercioSnap.data()?.onboardingSteps || {};

    // 3. Buscar el primer paso incompleto
    for (const step of FLOW_STEPS) {
      if (!steps[step]) {
        // Redirección absoluta para Vercel + Vite
        window.location.replace(`/${step}.html`);
        return;
      }
    }

    // 4. Todos los pasos completos → dashboard
    window.location.replace("/dashboard.html");

  } catch (error) {
    console.error("Error en runFlowController:", error);
    // Opcional: redirigir a error o login
    // window.location.href = "/error.html";
  }
}
