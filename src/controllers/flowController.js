// src/controllers/flowController.js
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase.js";

// ---------------------------------------------------------
// 🔹 Configuración de pasos del onboarding
// Deben coincidir con los nombres de los archivos HTML
// y las claves en Firestore onboardingSteps.[nombre]
// ---------------------------------------------------------
const FLOW_STEPS = [
  "usuario",
  "mi-comercio",
  "horarios",
  "productos",
  "ia-config",
];

// ---------------------------------------------------------
// 🔹 Helper: obtiene página actual sin extensión
// ---------------------------------------------------------
function getCurrentPage() {
  if (typeof window === "undefined") return null;
  const path = window.location.pathname;
  const fileName = path.split('/').pop(); // "usuario.html"
  return fileName.replace('.html', '');
}

// ---------------------------------------------------------
// 🔹 FIX rutas fantasma (build Vite + Vercel)
// ---------------------------------------------------------
if (typeof window !== "undefined") {
  const path = window.location.pathname;
  if (path.startsWith("/pages/")) {
    const clean = path.replace("/pages/", "/");
    window.location.replace(clean);
  }
}

// ---------------------------------------------------------
// 🔹 Ejecuta flujo y redirige al siguiente paso
// Solo se basa en Firestore: usuario y comercio
// ---------------------------------------------------------
export async function runFlowController(uid) {
  if (typeof window === 'undefined' || !uid) return;

  const currentPage = getCurrentPage();

  try {
    // 1️⃣ Obtener datos del usuario
    const userRef = doc(db, "usuarios", uid);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) return;

    const userData = userSnap.data();
    const comercioId = userData?.comercioId;

    // 2️⃣ Usuario incompleto o sin IA seleccionada
    const usuarioCompleto = userData?.onboardingSteps?.usuario === true;
    if (currentPage === "usuario" && (!usuarioCompleto || !comercioId)) return;

    // 3️⃣ Si no hay comercioId y no estamos en usuario.html → redirigir
    if (!comercioId && currentPage !== "usuario") {
      window.location.href = "/usuario.html";
      return;
    }

    // 4️⃣ Leer pasos completados del comercio
    let steps = {};
    if (comercioId) {
      const comercioRef = doc(db, "comercios", comercioId);
      const comercioSnap = await getDoc(comercioRef);
      steps = comercioSnap.exists() ? comercioSnap.data()?.onboardingSteps || {} : {};
    }

    // 5️⃣ Primer paso incompleto
    let firstIncompleteStep = null;
    for (const step of FLOW_STEPS) {
      if (step === "usuario") continue; // ya validado
      if (!steps[step]) {
        firstIncompleteStep = step;
        break;
      }
    }

    // 6️⃣ Redirigir al primer paso incompleto
    if (firstIncompleteStep) {
      if (currentPage !== firstIncompleteStep) {
        window.location.href = `/${firstIncompleteStep}.html`;
      }
      return;
    }

    // 7️⃣ Todos completos → dashboard
    if (currentPage !== "dashboard") {
      window.location.href = "/dashboard.html";
    }

  } catch (error) {
    // Solo log mínimo en producción
    console.error("Error en flowController:", error);
  }
}
