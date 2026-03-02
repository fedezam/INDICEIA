// =========================================================
// src/controllers/flowController.js
// =========================================================

import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase.js";

/* =========================================================
   HELPERS
   ========================================================= */

function getCurrentPage() {
  const file = window.location.pathname.split("/").pop();
  return file?.replace(".html", "") || "index";
}

function isEditMode() {
  const params = new URLSearchParams(window.location.search);
  return params.get("edit") === "true";
}

const PUBLIC_PAGES = ["login", "registro", "index", ""];
const NEUTRAL_PAGES = ["skeletonTest"];

/* =========================================================
   PIPELINE BUILDER (SOLO COMERCIO)
   ========================================================= */

function buildPipeline(offerType = {}) {
  const { productos, servicios } = offerType || {};

  const steps = [
    "modelo-negocio",
    "horarios",
  ];

  if (servicios) steps.push("servicios");
  if (productos) steps.push("productos");

  steps.push("ia-config");

  return steps;
}

function getFirstIncompleteStep(pipeline, completedSteps = {}) {
  return pipeline.find(step => completedSteps[step] !== true);
}

/* =========================================================
   FLOW CONTROLLER
   ========================================================= */

export async function runFlowController(uid) {
  const currentPage = getCurrentPage();
  if (!uid) return;

  if (PUBLIC_PAGES.includes(currentPage)) return;

  if (NEUTRAL_PAGES.includes(currentPage)) {
    console.log(`🧪 FlowController: página neutral (${currentPage})`);
    return;
  }

  const editMode = isEditMode();
  window.isEditMode = editMode;

  try {
    // =====================================================
    // 1️⃣ VALIDAR USUARIO
    // =====================================================

    const userSnap = await getDoc(doc(db, "usuarios", uid));

    if (!userSnap.exists()) {
      window.location.href = "/login.html";
      return;
    }

    const userData = userSnap.data();
    const userSteps = userData.onboardingSteps || {};

    console.log("🔍 [FlowController] currentPage:", currentPage);
    console.log("🔍 [FlowController] userSteps:", userSteps);
    console.log("🔍 [FlowController] comercioId:", userData.comercioId);

    // ---------- STEP: usuario ----------
    if (!userSteps.usuario) {
      if (currentPage !== "usuario") {
        window.location.href = "/usuario.html";
      }
      return;
    }

    // ---------- STEP: mi-comercio ----------
    if (!userData.comercioId) {
      if (currentPage !== "mi-comercio") {
        window.location.href = "/mi-comercio.html";
      }
      return;
    }

    // =====================================================
    // 2️⃣ DOMINIO COMERCIO
    // =====================================================

    const comercioSnap = await getDoc(
      doc(db, "comercios", userData.comercioId)
    );

    if (!comercioSnap.exists()) {
      // Si por alguna razón no existe el comercio,
      // lo mandamos a recrearlo.
      window.location.href = "/mi-comercio.html";
      return;
    }

    const comercioData = comercioSnap.data();
    const comercioSteps = comercioData.onboardingSteps || {};

    console.log("🔍 [FlowController] comercioSteps:", comercioSteps);
    console.log("🔍 [FlowController] offerType:", comercioData.offerType);

    const pipeline = buildPipeline(comercioData.offerType);
    const firstIncomplete = getFirstIncompleteStep(
      pipeline,
      comercioSteps
    );

    console.log("🔍 [FlowController] pipeline:", pipeline);
    console.log("🔍 [FlowController] firstIncomplete:", firstIncomplete);

    // =====================================================
    // MODO EDICIÓN
    // =====================================================

    if (editMode) {
      if (pipeline.includes(currentPage)) return;

      if (currentPage !== "dashboard") {
        window.location.href = "/dashboard.html";
      }
      return;
    }

    // =====================================================
    // ONBOARDING NORMAL
    // =====================================================

    if (firstIncomplete) {
      if (currentPage !== firstIncomplete) {
        window.location.href = `/${firstIncomplete}.html`;
      }
      return;
    }

    // =====================================================
    // TODO COMPLETO → DASHBOARD
    // =====================================================

    if (currentPage !== "dashboard") {
      window.location.href = "/dashboard.html";
    }

  } catch (err) {
    console.error("❌ FlowController error:", err);
    window.location.href = "/login.html";
  }
}

/* =========================================================
   HELPER POST SAVE
   ========================================================= */

export function redirectAfterSave(nextStep) {
  if (window.isEditMode) {
    window.location.href = "/dashboard.html";
  } else if (nextStep) {
    window.location.href = `/${nextStep}.html`;
  }
}
