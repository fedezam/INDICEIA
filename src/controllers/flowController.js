// ============================================================
// src/controllers/flowController.js
// ============================================================

import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase.js";

// ============================================================
// HELPERS URL
// ============================================================

function getCurrentPage() {
  const file = window.location.pathname.split("/").pop();
  return file?.replace(".html", "") || "index";
}

const PUBLIC_PAGES  = ["login", "registro", "index", ""];
const NEUTRAL_PAGES = ["skeletonTest"];

// ============================================================
// STEP DEFINITIONS (estático)
// ============================================================

const STEPS = {
  'mi-comercio': { page: 'mi-comercio' },
  'mi-perfil': { page: 'mi-perfil' },
  'mi-perfil-profesional': { page: 'mi-perfil-profesional' },

  'horarios': { page: 'horarios' },
  'entrega': { page: 'entrega' },

  'productos': { page: 'productos' },
  'servicios': { page: 'servicios' },

  'lugares': { page: 'lugares' },
  'cobertura': { page: 'cobertura' },
  'consultas': { page: 'consultas' },

  'ia-config': { page: 'ia-config' }
};

// ============================================================
// PIPELINES FIJOS
// ============================================================

const PIPELINES = {
  comercio: [
    'mi-comercio',
    'horarios',
    'entrega',
    'productos',
    'servicios',
    'ia-config'
  ],

  prestador: [
    'mi-perfil',
    'horarios',
    'entrega',
    'servicios',
    'productos',
    'ia-config'
  ],

  profesional: [
    'mi-perfil-profesional',
    'lugares',
    'cobertura',
    'consultas',
    'ia-config'
  ]
};

// ============================================================
// CORE HELPERS
// ============================================================

function buildStepUrl(stepId) {
  const step = STEPS[stepId];
  return `/${step.page}.html`;
}

function getFirstIncompleteStep(pipeline, steps) {
  for (const stepId of pipeline) {
    if (steps[stepId] !== true) return stepId;
  }
  return null;
}

// ============================================================
// FLOW CONTROLLER
// ============================================================

export async function runFlowController(uid) {
  const currentPage = getCurrentPage();
  if (!uid) return;

  if (PUBLIC_PAGES.includes(currentPage))  return;
  if (NEUTRAL_PAGES.includes(currentPage)) return;

  try {
    // ── USUARIO ─────────────────────────────────────────────
    const userSnap = await getDoc(doc(db, "usuarios", uid));
    if (!userSnap.exists()) {
      window.location.href = "/login.html";
      return;
    }

    const userData = userSnap.data();

    // ── STEP: usuario ───────────────────────────────────────
    if (!userData.onboardingSteps?.usuario) {
      if (currentPage !== "usuario") {
        window.location.href = "/usuario.html";
      }
      return;
    }

    // ── STEP: tipo-entidad ──────────────────────────────────
    if (!userData.onboardingSteps?.['tipo-entidad']) {
      if (currentPage !== "tipo-entidad") {
        window.location.href = "/tipo-entidad.html";
      }
      return;
    }

    // ── IDENTIDAD ───────────────────────────────────────────
    if (!userData.comercioId) {
      const entityType = userData.entityType;

      const firstPage =
        entityType === "prestador"   ? "mi-perfil" :
        entityType === "profesional" ? "mi-perfil-profesional" :
                                      "mi-comercio";

      if (currentPage !== firstPage) {
        window.location.href = `/${firstPage}.html`;
      }
      return;
    }

    // ── ENTIDAD ─────────────────────────────────────────────
    const ref = doc(db, "entidades", userData.comercioId);
    const snap = await getDoc(ref);

    if (!snap.exists()) {
      window.location.href = "/login.html";
      return;
    }

    const data = snap.data();

    // ── INIT ONBOARDING (una sola vez) ──────────────────────
    if (!data.onboarding || !data.onboarding.pipeline) {
      const entityType = data.entityType || userData.entityType || "comercio";
      const pipeline   = PIPELINES[entityType];

      await ref.update({
        onboarding: {
          pipeline,
          steps: {}
        }
      });

      window.location.reload();
      return;
    }

    const pipeline = data.onboarding.pipeline;
    const steps    = data.onboarding.steps || {};

    // ── RESOLVER SIGUIENTE STEP ─────────────────────────────
    const nextStepId = getFirstIncompleteStep(pipeline, steps);

    // ── TODO COMPLETO → DASHBOARD ───────────────────────────
    if (!nextStepId) {
      if (currentPage !== "dashboard") {
        window.location.href = "/dashboard.html";
      }
      return;
    }

    const targetPage = STEPS[nextStepId].page;

    // ── REDIRECCIÓN ─────────────────────────────────────────
    if (currentPage !== targetPage) {
      window.location.href = buildStepUrl(nextStepId);
    }

  } catch (err) {
    console.error("❌ FlowController error:", err);
    window.location.href = "/login.html";
  }
}

// ============================================================
// POST SAVE
// ============================================================

export function redirectAfterSave(pipeline, currentStepId) {
  const index = pipeline.indexOf(currentStepId);
  const next  = pipeline[index + 1];

  if (!next) {
    window.location.href = "/dashboard.html";
    return;
  }

  window.location.href = `/${STEPS[next].page}.html`;
}

// ============================================================
// MARCAR STEP COMO COMPLETO
// ============================================================

export async function completeStep(uid, stepId) {
  const userSnap = await getDoc(doc(db, "usuarios", uid));
  if (!userSnap.exists()) return;

  const { comercioId } = userSnap.data();
  if (!comercioId) return;

  const ref = doc(db, "entidades", comercioId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;

  const data = snap.data();
  const steps = data.onboarding?.steps || {};

  steps[stepId] = true;

  await ref.update({
    "onboarding.steps": steps
  });
}
