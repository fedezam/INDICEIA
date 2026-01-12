// src/controllers/flowController.js
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase.js";

/* =========================================================
   HELPERS
   ========================================================= */

function getCurrentPage() {
  const file = window.location.pathname.split("/").pop();
  return file?.replace(".html", "") || "usuario";
}

function isEditMode() {
  const params = new URLSearchParams(window.location.search);
  return params.get("edit") === "true";
}

const PUBLIC_PAGES = ["login", "registro", "index", ""];

/* =========================================================
   PIPELINE BUILDER (CLAVE DEL SISTEMA)
   ========================================================= */

function buildPipeline(offerType = {}) {
  const steps = [];

  // Siempre existen
  steps.push("usuario");
  steps.push("crear-entidad");
  steps.push("mi-comercio");

  const { productos, servicios } = offerType;

  if (productos && servicios) {
    steps.push("horarios");
    steps.push("servicios");
    steps.push("productos");
  } else if (servicios) {
    steps.push("servicios");
    steps.push("horarios");
  } else if (productos) {
    steps.push("horarios");
    steps.push("productos");
  }

  steps.push("ia-config");

  return steps;
}

function getFirstIncompleteStep(pipeline, completedSteps = {}) {
  return pipeline.find(
    (step) => completedSteps[step] !== true
  );
}

/* =========================================================
   FLOW CONTROLLER
   ========================================================= */

export async function runFlowController(uid) {
  if (!uid) {
    const current = getCurrentPage();
    if (!PUBLIC_PAGES.includes(current)) {
      window.location.href = "/login.html";
    }
    return;
  }

  const currentPage = getCurrentPage();
  const editMode = isEditMode();
  window.isEditMode = editMode;

  try {
    /* ---------- USER ---------- */

    const userRef = doc(db, "usuarios", uid);
    const userSnap = await getDoc(userRef);

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

    if (!userSteps["crear-entidad"] || !userData.offerType) {
      if (currentPage !== "crear-entidad") {
        window.location.href = "/crear-entidad.html";
      }
      return;
    }

    /* ---------- COMERCIO ---------- */

    if (!userData.comercioId) {
      if (currentPage !== "mi-comercio") {
        window.location.href = "/mi-comercio.html";
      }
      return;
    }

    const comercioSnap = await getDoc(
      doc(db, "comercios", userData.comercioId)
    );

    const comercioSteps = comercioSnap.exists()
      ? comercioSnap.data().onboardingSteps || {}
      : {};

    /* ---------- PIPELINE DINÁMICO ---------- */

    const pipeline = buildPipeline(userData.offerType);

    /* ---------- MODO EDICIÓN ---------- */

    if (editMode) {
      if (
        currentPage !== "dashboard" &&
        pipeline.includes(currentPage)
      ) {
        return;
      }

      if (currentPage !== "dashboard") {
        window.location.href = "/dashboard.html";
      }
      return;
    }

    /* ---------- ONBOARDING NORMAL ---------- */

    const firstIncomplete = getFirstIncompleteStep(
      pipeline,
      {
        ...userSteps,
        ...comercioSteps
      }
    );

    if (firstIncomplete && currentPage !== firstIncomplete) {
      window.location.href = `/${firstIncomplete}.html`;
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
   HELPERS PÚBLICOS
   ========================================================= */

export function redirectAfterSave(nextStep) {
  if (window.isEditMode) {
    window.location.href = "/dashboard.html";
  } else if (nextStep) {
    window.location.href = `/${nextStep}.html`;
  }
}
