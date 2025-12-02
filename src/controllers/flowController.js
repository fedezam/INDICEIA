// src/controllers/flowController.js
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase.js";

// ---------------------------------------------------------
// 🔹 Configuración de pasos del onboarding
// ---------------------------------------------------------
const FLOW_STEPS = [
  { id: "usuario", name: "Usuario" },
  { id: "mi-comercio", name: "Mi Comercio" },
  { id: "horarios", name: "Horarios" },
  { id: "productos", name: "Productos" },
  { id: "ia-config", name: "Configuración IA" },
];

// ---------------------------------------------------------
// 🔹 Helper: obtiene página actual sin extensión
// ---------------------------------------------------------
function getCurrentPage() {
  if (typeof window === "undefined") return null;
  const path = window.location.pathname;
  const fileName = path.split('/').pop();
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
// 🔹 Detectar si estamos en modo edición (dashboard → páginas)
// ---------------------------------------------------------
function isEditMode() {
  const params = new URLSearchParams(window.location.search);
  return params.get("edit") === "true";
}

// ---------------------------------------------------------
// 🔹 Setea window.flowState para navigation.js
// ---------------------------------------------------------
function updateFlowState(steps, currentPage) {
  const pages = FLOW_STEPS.map(step => ({
    id: step.id,
    name: step.name,
    completed: step.id === "usuario" ? true : (steps[step.id] === true)
  }));

  const completedCount = pages.filter(p => p.completed).length;

  window.flowState = {
    pages,
    current: currentPage || 'usuario',
    completed: completedCount
  };

  window.dispatchEvent(new CustomEvent('flowStateUpdated'));
  console.log('✅ flowState actualizado:', window.flowState);
}

// ---------------------------------------------------------
// 🔹 Controlador principal de flujo
// ---------------------------------------------------------
export async function runFlowController(uid) {
  if (typeof window === "undefined" || !uid) return;

  const currentPage = getCurrentPage();
  const editMode = isEditMode(); // 👈 clave

  try {
    // 1️⃣ Obtener datos del usuario
    const userRef = doc(db, "usuarios", uid);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) return;

    const userData = userSnap.data();
    const comercioId = userData?.comercioId;

    const usuarioCompleto = userData?.onboardingSteps?.usuario === true;

    // 2️⃣ Página usuario: la única que siempre puede cargar libremente
    if (currentPage === "usuario" && (!usuarioCompleto || !comercioId)) {
      updateFlowState({}, "usuario");
      return;
    }

    // 3️⃣ Si no hay comercioId no puede acceder a otras páginas
    if (!comercioId && currentPage !== "usuario" && !editMode) {
      window.location.href = "/usuario.html";
      return;
    }

    // 4️⃣ Obtener steps del comercio
    let steps = {};
    if (comercioId) {
      const comercioRef = doc(db, "comercios", comercioId);
      const comercioSnap = await getDoc(comercioRef);
      steps = comercioSnap.exists() ? comercioSnap.data()?.onboardingSteps || {} : {};
    }

    updateFlowState(steps, currentPage);

    // 5️⃣ Primer paso incompleto (solo aplica en onboarding)
    let firstIncompleteStep = null;
    for (const step of FLOW_STEPS) {
      if (step.id === "usuario") continue;
      if (!steps[step.id]) {
        firstIncompleteStep = step.id;
        break;
      }
    }

    // 6️⃣ ONBOARDING: Redirigir al primer paso incompleto
    if (!editMode && firstIncompleteStep) {
      if (currentPage !== firstIncompleteStep) {
        window.location.href = `/${firstIncompleteStep}.html`;
      }
      return;
    }

    // 7️⃣ ONBOARDING completo → ir al dashboard
    if (!editMode && currentPage !== "dashboard") {
      window.location.href = "/dashboard.html";
    }

    // 8️⃣ MODO EDICIÓN:
    // No redirige, no interfiere. Simplemente permite usar la página.
    // ✔ Si editMode = true → no hacemos nada más.
    return;

  } catch (error) {
    console.error("❌ Error en flowController:", error);
  }
}
