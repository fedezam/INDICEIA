// src/controllers/flowController.js
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase.js"; 

// ---------------------------------------------------------
// 🔥 FIX GLOBAL PARA PRODUCCIÓN (Vercel + Vite)
// Limpia rutas fantasmas "/pages/*" que aparecen en el build
// ---------------------------------------------------------
if (typeof window !== "undefined") {
  const path = window.location.pathname;

  if (path.startsWith("/pages/")) {
    const clean = path.replace("/pages/", "/");
    console.warn("🔧 Corrigiendo ruta fantasma:", path, "→", clean);
    window.location.replace(clean);
  }
}

// ---------------------------------------------------------
// ORDEN ESTRICTO DEL ONBOARDING
// Debe coincidir EXACTAMENTE con:
// 1. nombre del archivo HTML (sin .html)
// 2. la clave en Firestore onboardingSteps.[nombre]
// ---------------------------------------------------------
const FLOW_STEPS = [
  "usuario",
  "mi-comercio",
  "horarios",
  "productos",
  "ia-config",
];

// ---------------------------------------------------------
// Ejecuta el flujo y redirige al siguiente paso o dashboard
// ---------------------------------------------------------
export async function runFlowController(uid) {
  // Evita ejecución en SSR o build
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
        const target = `/${step}.html`;
        console.log("➡️ Redirigiendo a:", target);
        window.location.href = target; // ← más seguro que replace
        return;
      }
    }

    // 4. Todos los pasos completos → dashboard
    window.location.href = "/dashboard.html";

  } catch (error) {
    console.error("Error en runFlowController:", error);
  }
}

