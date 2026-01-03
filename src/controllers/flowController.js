// src/controllers/flowController.js
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase.js";

/* =========================================================
   CONFIGURACIÓN DEL FLOW (orden estricto)
   ========================================================= */

const FLOW_ORDER = [
  "usuario",
  "mi-comercio",
  "horarios",
  "productos",
  "ia-config",
];

const PUBLIC_PAGES = ["login", "registro", "index", ""];

/* =========================================================
   HELPERS
   ========================================================= */

function getCurrentPage() {
  if (typeof window === "undefined") return null;
  const file = window.location.pathname.split("/").pop();
  return file?.replace(".html", "") || "usuario";
}

function isEditMode() {
  const params = new URLSearchParams(window.location.search);
  return params.get("edit") === "true";
}

function getFirstIncompleteStep(steps = {}) {
  return FLOW_ORDER.find(
    (step) => step !== "usuario" && steps[step] !== true
  ) || null;
}

function canAccessStep(step, steps = {}) {
  const index = FLOW_ORDER.indexOf(step);
  if (index === -1) return false;

  for (let i = 1; i < index; i++) {
    if (steps[FLOW_ORDER[i]] !== true) return false;
  }
  return true;
}

/* =========================================================
   FLOW CONTROLLER (SOLO DECIDE AL ENTRAR A UNA PÁGINA)
   ========================================================= */

export async function runFlowController(uid) {
  if (typeof window === "undefined") return;

  const currentPage = getCurrentPage();
  const editMode = isEditMode();
  window.isEditMode = editMode;

  /* ---------- AUTH ---------- */

  if (!uid) {
    if (!PUBLIC_PAGES.includes(currentPage)) {
      window.location.href = "/login.html";
    }
    return;
  }

  try {
    /* ---------- USUARIO ---------- */

    const userSnap = await getDoc(doc(db, "usuarios", uid));
    if (!userSnap.exists()) {
      window.location.href = "/login.html";
      return;
    }

    const userData = userSnap.data();
    const comercioId = userData?.comercioId;

    if (!comercioId && currentPage !== "usuario") {
      window.location.href = "/usuario.html";
      return;
    }

    /* ---------- COMERCIO / STEPS ---------- */

    let steps = {};
    if (comercioId) {
      const comercioSnap = await getDoc(doc(db, "comercios", comercioId));
      steps = comercioSnap.exists()
        ? comercioSnap.data()?.onboardingSteps || {}
        : {};
    }

    /* =====================================================
       MODO EDICIÓN (dashboard → páginas)
       ===================================================== */

    if (editMode) {
      // Solo permite entrar a pasos ya completados
      if (
        currentPage !== "dashboard" &&
        currentPage !== "usuario" &&
        steps[currentPage] !== true
      ) {
        window.location.href = "/dashboard.html";
        return;
      }

      setupEditModeUI();
      return;
    }

    /* =====================================================
       ONBOARDING NORMAL
       ===================================================== */

    const firstIncomplete = getFirstIncompleteStep(steps);

    // Aún hay pasos pendientes → forzar orden
    if (firstIncomplete) {
      if (currentPage !== firstIncomplete) {
        window.location.href = `/${firstIncomplete}.html`;
      }
      return;
    }

    // Todo completo → dashboard
    if (currentPage !== "dashboard") {
      window.location.href = "/dashboard.html";
    }
  } catch (err) {
    console.error("❌ FlowController error:", err);
    window.location.href = "/login.html";
  }
}

/* =========================================================
   UI PARA MODO EDICIÓN
   ========================================================= */

function setupEditModeUI() {
  if (document.getElementById("btnVolverDashboard")) return;

  const main = document.querySelector(".main-content");
  if (!main) return;

  const btn = document.createElement("button");
  btn.id = "btnVolverDashboard";
  btn.className = "btn btn-secondary";
  btn.innerHTML = "← Volver al Dashboard";
  btn.style.marginBottom = "1rem";

  btn.onclick = () => {
    if (window.hasUnsavedChanges) {
      if (!confirm("Tenés cambios sin guardar. ¿Salir igual?")) return;
    }
    window.location.href = "/dashboard.html";
  };

  main.prepend(btn);

  // En modo edición, el botón guardar siempre está habilitado
  setTimeout(() => {
    const saveBtn = document.querySelector(
      ".btn-save, #saveChangesBtn, [type='submit']"
    );
    if (saveBtn) saveBtn.disabled = false;
  }, 300);
}

/* =========================================================
   HELPERS PÚBLICOS
   ========================================================= */

// Usar SOLO después de guardar
export function redirectAfterSave(nextPage) {
  if (window.isEditMode) {
    window.location.href = "/dashboard.html";
  } else if (nextPage) {
    window.location.href = `/${nextPage}.html`;
  }
}

export function checkEditMode() {
  return window.isEditMode === true;
}
