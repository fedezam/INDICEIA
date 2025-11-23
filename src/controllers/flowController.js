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
// 🔹 NUEVO: Setea window.flowState para navigation.js
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

  // Disparar evento para que navigation se actualice
  window.dispatchEvent(new CustomEvent('flowStateUpdated'));
  
  console.log('✅ flowState actualizado:', window.flowState);
}

// ---------------------------------------------------------
// 🔹 Ejecuta flujo y redirige al siguiente paso
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
    
    if (currentPage === "usuario" && (!usuarioCompleto || !comercioId)) {
      // Estamos en usuario.html y aún no está completo
      updateFlowState({}, 'usuario');
      return;
    }

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

    // 🆕 ACTUALIZAR window.flowState SIEMPRE
    updateFlowState(steps, currentPage);

    // 5️⃣ Primer paso incompleto
    let firstIncompleteStep = null;
    for (const step of FLOW_STEPS) {
      if (step.id === "usuario") continue; // ya validado
      if (!steps[step.id]) {
        firstIncompleteStep = step.id;
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
    console.error("Error en flowController:", error);
  }
}
