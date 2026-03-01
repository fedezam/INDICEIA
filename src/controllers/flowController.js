// src/controllers/flowController.js
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
   PIPELINE BUILDER
   ========================================================= */

function buildPipeline(offerType = {}) {
  const { productos, servicios } = offerType;

  const steps = [
    "usuario",
    "mi-comercio",
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
    const userSnap = await getDoc(doc(db, "usuarios", uid));

    if (!userSnap.exists()) {
      window.location.href = "/login.html";
      return;
    }

    const userData = userSnap.data();
    const userSteps = userData.onboardingSteps || {};

    // 🔍 DEBUG TEMPORAL
    console.log('🔍 [FlowController] currentPage:', currentPage);
    console.log('🔍 [FlowController] userSteps:', userSteps);
    console.log('🔍 [FlowController] userData.comercioId:', userData.comercioId);

    // ---------- PASO 1: usuario ----------
    if (!userSteps.usuario) {
      console.log('🔍 [FlowController] → redirige a usuario (step incompleto)');
      if (currentPage !== "usuario") window.location.href = "/usuario.html";
      return;
    }

    // ---------- PASO 2: mi-comercio ----------
    if (!userData.comercioId) {
      console.log('🔍 [FlowController] → redirige a mi-comercio (sin comercioId)');
      if (currentPage !== "mi-comercio") window.location.href = "/mi-comercio.html";
      return;
    }

    // ---------- PASO 3: modelo-negocio ----------
    if (!userSteps["modelo-negocio"] || !userData.offerType) {
      console.log('🔍 [FlowController] → redirige a modelo-negocio');
      if (currentPage !== "modelo-negocio") window.location.href = "/modelo-negocio.html";
      return;
    }

    // ---------- A partir de acá, el comercio existe ----------
    const comercioSnap = await getDoc(doc(db, "comercios", userData.comercioId));
    const comercioSteps = comercioSnap.exists()
      ? comercioSnap.data().onboardingSteps || {}
      : {};

    console.log('🔍 [FlowController] comercioSteps:', comercioSteps);

    const pipeline = buildPipeline(userData.offerType);
    const allSteps = { ...userSteps, ...comercioSteps };

    // ---------- MODO EDICIÓN ----------
    if (editMode) {
      if (pipeline.includes(currentPage)) return;
      if (currentPage !== "dashboard") window.location.href = "/dashboard.html";
      return;
    }

    // ---------- ONBOARDING NORMAL ----------
    const firstIncomplete = getFirstIncompleteStep(pipeline, allSteps);
    console.log('🔍 [FlowController] firstIncomplete:', firstIncomplete);

    if (firstIncomplete) {
      if (currentPage !== firstIncomplete) {
        window.location.href = `/${firstIncomplete}.html`;
      }
      return;
    }

    // ---------- TODO COMPLETO → dashboard ----------
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
