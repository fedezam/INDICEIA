// src/controllers/flowController.js
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase.js";

/* =========================================================
   CONFIGURACIÓN DEL FLOW (orden canónico)
   ========================================================= */

const FLOW_ORDER = [
  "usuario",
  "crear-entidad",
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
    (step) =>
      step !== "usuario" &&
      step !== "crear-entidad" &&
      steps[step] !== true
  ) || null;
}

/* =========================================================
   FLOW CONTROLLER
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
    const userSteps = userData.onboardingSteps || {};

    /* ---------- PASO 1: USUARIO ---------- */

    if (!userSteps.usuario) {
      if (currentPage !== "usuario") {
        window.location.href = "/usuario.html";
      }
      return;
    }

    /* ---------- PASO 2: CREAR ENTIDAD ---------- */

    if (!userData.entityType) {
      if (currentPage !== "crear-entidad") {
        window.location.href = "/crear-entidad.html";
      }
      return;
    }

    /* ---------- CARGA STEPS SEGÚN ENTIDAD ---------- */

    let steps = {};

    if (userData.entityType === "comercio" && userData.comercioId) {
      const comercioSnap = await getDoc(
        doc(db, "comercios", userData.comercioId)
      );
      steps = comercioSnap.exists()
        ? comercioSnap.data()?.onboardingSteps || {}
        : {};
    }

    /* ---------- MODO EDICIÓN ---------- */

    if (editMode) {
      if (
        currentPage !== "dashboard" &&
        currentPage !== "usuario" &&
        currentPage !== "crear-entidad" &&
        steps[currentPage] !== true
      ) {
        window.location.href = "/dashboard.html";
        return;
      }

      setupEditModeUI();
      return;
    }

    /* ---------- ONBOARDING NORMAL ---------- */

    const firstIncomplete = getFirstIncompleteStep(steps);

    if (firstIncomplete) {
      if (currentPage !== firstIncomplete) {
        window.location.href = `/${firstIncomplete}.html`;
      }
      return;
    }

    /* ---------- TODO COMPLETO ---------- */

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
