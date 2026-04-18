// ============================================================
// src/controllers/flowController.js
// ============================================================

import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase.js";

function getCurrentPage() {
  const file = window.location.pathname.split("/").pop();
  return file?.replace(".html", "") || "index";
}

function getCurrentChannel() {
  return new URLSearchParams(window.location.search).get("channel") || null;
}

function isEditMode() {
  return new URLSearchParams(window.location.search).get("edit") === "true";
}

const PUBLIC_PAGES  = ["login", "registro", "index", ""];
const NEUTRAL_PAGES = ["skeletonTest"];

// ============================================================
// STEP DEFINITIONS
// ============================================================
const STEP_DEFINITIONS = {
  'mi-comercio': { page: 'mi-comercio' },

  'mi-perfil': { page: 'mi-perfil' },

  productos: {
    page: 'productos',
    visibleIf: ctx => ctx.offerType?.productos === true,
  },

  servicios: {
    page: 'servicios',
    visibleIf: ctx => ctx.offerType?.servicios === true,
  },

  entrega: {
    page: 'entrega',
    visibleIf: ctx => ctx.offerType?.productos === true,
  },

  'horarios-presencial': {
    page:      'horarios',
    query:     { channel: 'presencial' },
    visibleIf: ctx => ctx.tieneLocalFisico === true,
  },

  'horarios-delivery': {
    page:      'horarios',
    query:     { channel: 'delivery' },
    visibleIf: ctx => ctx.delivery?.enabled === true,
  },


  'ia-config': { page: 'ia-config' },

  // profesional
  'mi-perfil-profesional': { page: 'mi-perfil-profesional' },
  lugares:   { page: 'lugares' },
  cobertura: { page: 'cobertura' },
  consultas: { page: 'consultas' },
};

// ============================================================
// PIPELINE ORDER POR ENTITY TYPE
// ============================================================
const PIPELINE_ORDER = {
  comercio: [
    'mi-comercio',
    'productos',
    'servicios',
    'entrega',
    'horarios-presencial',
    'horarios-delivery',
    'ia-config',
  ],
  prestador: [
    'mi-perfil',
    'servicios',
    'productos',
    'horarios-presencial',
    'horarios-delivery',
    'ia-config',
  ],
  profesional: [
    'mi-perfil-profesional',
    'lugares',
    'cobertura',
    'consultas',
    'ia-config',
  ],
};

// ============================================================
// CONTEXT + PIPELINE BUILDER
// ============================================================
function buildFlowContext(userData, comercioData) {
  return {
    entityType:       userData.entityType || 'comercio',
    offerType:        userData.offerType  || comercioData?.offerType || {},
    tieneLocalFisico: comercioData?.tieneLocalFisico === true,
    delivery:         comercioData?.delivery || {},
  };
}

function buildPipeline(ctx) {
  const order = PIPELINE_ORDER[ctx.entityType] || PIPELINE_ORDER.comercio;
  return order
    .map(id => ({ id, ...STEP_DEFINITIONS[id] }))
    .filter(step => !step.visibleIf || step.visibleIf(ctx));
}

// ============================================================
// STEP URL + PROGRESS
// ============================================================
function buildStepUrl(step) {
  const url = new URL(`/${step.page}.html`, window.location.origin);
  if (step.query) {
    Object.entries(step.query).forEach(([k, v]) => url.searchParams.set(k, v));
  }
  return `${url.pathname}${url.search}`;
}

function isStepCompleted(stepId, steps = {}) {
  if (steps[stepId] === true) return true;
  // fallback legacy: horarios: true cubre todos los canales de horarios
  if (stepId.startsWith('horarios') && steps.horarios === true) return true;
  return false;
}

function getFirstIncompleteStep(pipeline, steps) {
  return pipeline.find(step => !isStepCompleted(step.id, steps));
}

// ============================================================
// FLOW CONTROLLER
// ============================================================
export async function runFlowController(uid) {
  const currentPage    = getCurrentPage();
  const currentChannel = getCurrentChannel();
  if (!uid) return;

  if (PUBLIC_PAGES.includes(currentPage))  return;
  if (NEUTRAL_PAGES.includes(currentPage)) return;

  const editMode = isEditMode();
  window.isEditMode = editMode;

  try {
    // ── 1. USUARIO ──────────────────────────────────────────
    const userSnap = await getDoc(doc(db, "usuarios", uid));
    if (!userSnap.exists()) { window.location.href = "/login.html"; return; }

    const userData  = userSnap.data();
    const userSteps = userData.onboardingSteps || {};

    console.log("🔍 [FlowController] currentPage:", currentPage, "channel:", currentChannel);
    console.log("🔍 [FlowController] userSteps:",   userSteps);
    console.log("🔍 [FlowController] comercioId:",  userData.comercioId);

    // ── STEP: usuario ───────────────────────────────────────
    if (!userSteps.usuario) {
      if (currentPage !== "usuario") window.location.href = "/usuario.html";
      return;
    }

    // ── STEP: tipo-entidad ──────────────────────────────────
    if (!userSteps['tipo-entidad']) {
      if (currentPage !== 'tipo-entidad') window.location.href = '/tipo-entidad.html';
      return;
    }

    // ── STEP: identidad (primer paso según entityType) ──────
    if (!userData.comercioId) {
      const nextPage = userData.entityType === 'prestador'   ? 'mi-perfil'
                     : userData.entityType === 'profesional' ? 'mi-perfil-profesional'
                     : 'mi-comercio';
      if (currentPage !== nextPage) window.location.href = `/${nextPage}.html`;
      return;
    }

    const identityPage = userData.entityType === 'prestador'   ? 'mi-perfil'
                       : userData.entityType === 'profesional' ? 'mi-perfil-profesional'
                       : 'mi-comercio';

    // ── 2. COMERCIO ─────────────────────────────────────────
    const comercioSnap = await getDoc(doc(db, "entidades", userData.comercioId));

    if (!comercioSnap.exists()) {
      window.location.href = `/${identityPage}.html`;
      return;
    }

    const comercioData  = comercioSnap.data();
    const comercioSteps = comercioData.onboardingSteps || {};
    const ctx           = buildFlowContext(userData, comercioData);
    const pipeline      = buildPipeline(ctx);
    const firstIncomplete = getFirstIncompleteStep(pipeline, comercioSteps);

    console.log("🔍 [FlowController] entityType:",      ctx.entityType);
    console.log("🔍 [FlowController] offerType:",       ctx.offerType);
    console.log("🔍 [FlowController] tieneLocalFisico:", ctx.tieneLocalFisico);
    console.log("🔍 [FlowController] pipeline:",        pipeline.map(s => s.id));
    console.log("🔍 [FlowController] firstIncomplete:", firstIncomplete?.id);

    // ── MODO EDICIÓN ────────────────────────────────────────
    if (editMode) {
      const editablePages = [...new Set(pipeline.map(s => s.page)), identityPage, 'tipo-entidad', 'usuario'];
      if (editablePages.includes(currentPage)) return;
      if (currentPage !== "dashboard") window.location.href = "/dashboard.html";
      return;
    }

    // ── ONBOARDING NORMAL ───────────────────────────────────
    if (firstIncomplete) {
      const targetChannel = firstIncomplete.query?.channel || null;
      // ya estamos en la página correcta con el canal correcto?
      if (currentPage !== firstIncomplete.page || currentChannel !== targetChannel) {
        window.location.href = buildStepUrl(firstIncomplete);
      }
      return;
    }

    // ── TODO COMPLETO → DASHBOARD ───────────────────────────
    if (currentPage !== "dashboard") window.location.href = "/dashboard.html";

  } catch (err) {
    console.error("❌ FlowController error:", err);
    window.location.href = "/login.html";
  }
}

// ============================================================
// HELPER POST SAVE
// backward compatible: acepta string (legacy) o pipeline+stepId (nuevo)
// ============================================================
export function redirectAfterSave(pipelineOrStep, currentStepId) {
  if (window.isEditMode) {
    window.location.href = "/dashboard.html";
    return;
  }

  // legacy: string directo
  if (typeof pipelineOrStep === 'string') {
    window.location.href = pipelineOrStep
      ? `/${pipelineOrStep}.html`
      : '/dashboard.html';
    return;
  }

  // nuevo: pipeline (array de steps) + stepId actual
  const pipeline     = pipelineOrStep;
  const currentIndex = pipeline.findIndex(s => s.id === currentStepId);
  const next         = pipeline[currentIndex + 1];
  window.location.href = next ? buildStepUrl(next) : '/dashboard.html';
}

// ============================================================
// EXPORTS PARA USO EXTERNO (horarios.js, index.builder.js, etc)
// ============================================================
export { buildPipeline, buildFlowContext, buildStepUrl, isStepCompleted };
