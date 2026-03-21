// ============================================================
// src/controllers/flowController.js
// ============================================================

import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase.js";

function getCurrentPage() {
  const file = window.location.pathname.split("/").pop();
  return file?.replace(".html", "") || "index";
}

function isEditMode() {
  const params = new URLSearchParams(window.location.search);
  return params.get("edit") === "true";
}

const PUBLIC_PAGES  = ["login", "registro", "index", ""];
const NEUTRAL_PAGES = ["skeletonTest"];

// ============================================================
// PIPELINE BUILDER
// ============================================================
function buildPipeline(entityType, offerType = {}) {
  const { productos, servicios } = offerType || {};

  if (entityType === 'prestador') {
    const steps = ['mi-perfil'];
    if (servicios) steps.push('servicios');
    if (productos) steps.push('productos');
    steps.push('horarios', 'ia-config');
    return steps;
  }

  const steps = ['mi-comercio'];
  if (productos) steps.push('productos');
  if (servicios) steps.push('servicios');
  if (productos) steps.push('entrega');
  steps.push('horarios', 'ia-config');
  return steps;
}

function getFirstIncompleteStep(pipeline, completedSteps = {}) {
  return pipeline.find(step => completedSteps[step] !== true);
}

// ============================================================
// FLOW CONTROLLER
// ============================================================
export async function runFlowController(uid) {
  const currentPage = getCurrentPage();
  if (!uid) return;

  if (PUBLIC_PAGES.includes(currentPage))  return;
  if (NEUTRAL_PAGES.includes(currentPage)) return;

  const editMode = isEditMode();
  window.isEditMode = editMode;

  try {
    // ── 1. USUARIO ─────────────────────────────────────────
    const userSnap = await getDoc(doc(db, "usuarios", uid));

    if (!userSnap.exists()) {
      window.location.href = "/login.html";
      return;
    }

    const userData  = userSnap.data();
    const userSteps = userData.onboardingSteps || {};

    console.log("🔍 [FlowController] currentPage:", currentPage);
    console.log("🔍 [FlowController] userSteps:",   userSteps);
    console.log("🔍 [FlowController] comercioId:",  userData.comercioId);

    // ── STEP: usuario ───────────────────────────────────────
    if (!userSteps.usuario) {
      if (currentPage !== "usuario") window.location.href = "/usuario.html";
      return;
    }

    // ── STEP: tipo-entidad ──────────────────────────────────
    // Vive en dominio usuario — todavía no hay comercioId
    if (!userSteps['tipo-entidad']) {
      if (currentPage !== 'tipo-entidad') window.location.href = '/tipo-entidad.html';
      return;
    }

    // ── STEP: mi-comercio / mi-perfil ───────────────────────
    if (!userData.comercioId) {
      const nextPage = userData.entityType === 'prestador' ? 'mi-perfil' : 'mi-comercio';
      if (currentPage !== nextPage) window.location.href = `/${nextPage}.html`;
      return;
    }

    // ── edit mode: identidad siempre accesible ──────────────
    const identityPage = userData.entityType === 'prestador' ? 'mi-perfil' : 'mi-comercio';
    if (currentPage === identityPage && editMode) return;

    // ── 2. COMERCIO ─────────────────────────────────────────
    const comercioSnap = await getDoc(doc(db, "comercios", userData.comercioId));

    if (!comercioSnap.exists()) {
      window.location.href = `/${identityPage}.html`;
      return;
    }

    const comercioData  = comercioSnap.data();
    const comercioSteps = comercioData.onboardingSteps || {};

    const entityType = userData.entityType || 'comercio';
    const offerType  = userData.offerType  || {};

    const pipeline        = buildPipeline(entityType, offerType);
    const firstIncomplete = getFirstIncompleteStep(pipeline, comercioSteps);

    console.log("🔍 [FlowController] entityType:",      entityType);
    console.log("🔍 [FlowController] offerType:",       offerType);
    console.log("🔍 [FlowController] pipeline:",        pipeline);
    console.log("🔍 [FlowController] firstIncomplete:", firstIncomplete);

    // ── MODO EDICIÓN ────────────────────────────────────────
    if (editMode) {
      const editablePages = [...pipeline, identityPage, 'tipo-entidad'];
      if (editablePages.includes(currentPage)) return;
      if (currentPage !== "dashboard") window.location.href = "/dashboard.html";
      return;
    }

    // ── ONBOARDING NORMAL ───────────────────────────────────
    if (firstIncomplete) {
      if (currentPage !== firstIncomplete) {
        window.location.href = `/${firstIncomplete}.html`;
      }
      return;
    }

    // ── TODO COMPLETO → DASHBOARD ───────────────────────────
    if (currentPage !== "dashboard") {
      window.location.href = "/dashboard.html";
    }

  } catch (err) {
    console.error("❌ FlowController error:", err);
    window.location.href = "/login.html";
  }
}

// ============================================================
// HELPER POST SAVE
// ============================================================
export function redirectAfterSave(nextStep) {
  if (window.isEditMode) {
    window.location.href = "/dashboard.html";
  } else if (nextStep) {
    window.location.href = `/${nextStep}.html`;
  }
}
