
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
  const editMode = isEditMode();

  // 🆕 EXPONER MODO EDICIÓN GLOBALMENTE
  window.isEditMode = editMode;

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

    // 🆕 SI ESTÁ EN MODO EDICIÓN → NO REDIRIGIR, SOLO ACTUALIZAR ESTADO
    if (editMode) {
      console.log('✅ Modo edición activado - flowController no redirige');
      setupEditMode(); // 👈 Nueva función
      return;
    }

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
    if (firstIncompleteStep) {
      if (currentPage !== firstIncompleteStep) {
        window.location.href = `/${firstIncompleteStep}.html`;
      }
      return;
    }

    // 7️⃣ ONBOARDING completo → ir al dashboard
    if (currentPage !== "dashboard") {
      window.location.href = "/dashboard.html";
    }

  } catch (error) {
    console.error("❌ Error en flowController:", error);
  }
}

// ---------------------------------------------------------
// 🆕 Configurar interfaz para modo edición
// ---------------------------------------------------------
function setupEditMode() {
  // Agregar botón "Volver al Dashboard" si no existe
  if (!document.getElementById('btnVolverDashboard')) {
    const mainContent = document.querySelector('.main-content');
    if (mainContent) {
      const btnVolver = document.createElement('button');
      btnVolver.id = 'btnVolverDashboard';
      btnVolver.type = 'button';
      btnVolver.className = 'btn btn-secondary';
      btnVolver.innerHTML = '<i class="fas fa-arrow-left"></i> Volver al Dashboard';
      btnVolver.style.marginBottom = '1rem';
      
      btnVolver.addEventListener('click', () => {
        window.location.href = '/dashboard.html';
      });
      
      // Insertar al principio del main-content
      mainContent.insertBefore(btnVolver, mainContent.firstChild);
    }
  }

  // 🆕 Habilitar siempre el botón guardar en modo edición
  // Esperar a que el DOM esté listo
  setTimeout(() => {
    const btnGuardar = document.querySelector('.btn-save, #saveChangesBtn, [type="submit"]');
    if (btnGuardar) {
      btnGuardar.disabled = false;
      console.log('✅ Botón guardar habilitado en modo edición');
    }
  }, 500);
}

// ---------------------------------------------------------
// 🆕 Función para redirigir después de guardar
// ---------------------------------------------------------
export function redirectAfterSave() {
  if (window.isEditMode) {
    console.log('✅ Modo edición: redirigiendo al dashboard');
    window.location.href = '/dashboard.html';
  } else {
    console.log('✅ Modo onboarding: continuando con flowController');
    // Recargar flowController para que decida el siguiente paso
    if (window.auth?.currentUser) {
      runFlowController(window.auth.currentUser.uid);
    }
  }
}

// ---------------------------------------------------------
// 🆕 Exportar función para verificar modo edición
// ---------------------------------------------------------
export function checkEditMode() {
  return window.isEditMode || false;
}
