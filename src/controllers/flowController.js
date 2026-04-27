// ============================================================
// src/controllers/flowController.js
// ============================================================

import { doc, getDoc, updateDoc } from "firebase/firestore";
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
  'mi-comercio':           { page: 'mi-comercio' },
  'mi-perfil':             { page: 'mi-perfil' },
  'mi-perfil-profesional': { page: 'mi-perfil-profesional' },

  'horarios':  { page: 'horarios' },
  'entrega':   { page: 'entrega' },

  'productos': { page: 'productos' },
  'servicios': { page: 'servicios' },

  'lugares':   { page: 'lugares' },
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

function getFirstIncompleteStep(pipeline, onboardingSteps) {
  for (const stepId of pipeline) {
    if (onboardingSteps[stepId] !== true) return stepId;
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

    // ── STEP: usuario (vive en usuarios, no en entidades) ───
    if (!userData.onboardingSteps?.usuario) {
      if (currentPage !== "usuario") {
        window.location.href = "/usuario.html";
      }
      return;
    }

    // ── STEP: tipo-entidad (vive en usuarios) ───────────────
    if (!userData.onboardingSteps?.['tipo-entidad']) {
      if (currentPage !== "tipo-entidad") {
        window.location.href = "/tipo-entidad.html";
      }
      return;
    }

    // ── SIN ENTIDAD AÚN → primera página del pipeline ───────
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
    const ref  = doc(db, "entidades", userData.comercioId);
    const snap = await getDoc(ref);

    if (!snap.exists()) {
      window.location.href = "/login.html";
      return;
    }

    const data = snap.data();

    // ── PIPELINE ─────────────────────────────────────────────
    // Si la entidad no tiene pipeline guardado, lo inicializamos
    // una sola vez según su entityType.
    if (!data.onboarding?.pipeline) {
      const entityType = data.entityType || userData.entityType || "comercio";
      const pipeline   = PIPELINES[entityType];

      await updateDoc(ref, {
        "onboarding.pipeline": pipeline,
      });

      // Releer para continuar con el pipeline recién guardado
      data.onboarding = { pipeline };
    }

    const pipeline        = data.onboarding.pipeline;
    const onboardingSteps = data.onboardingSteps || {};

    // ── RESOLVER SIGUIENTE STEP ─────────────────────────────
    const nextStepId = getFirstIncompleteStep(pipeline, onboardingSteps);

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
// Redirige al siguiente step del pipeline después de guardar.
// Uso en cada form:
//
//   await redirectAfterSave(uid, "mi-perfil");
// ============================================================

export async function redirectAfterSave(uid, currentStepId) {
  const userSnap = await getDoc(doc(db, "usuarios", uid));
  if (!userSnap.exists()) return;

  const { comercioId } = userSnap.data();
  if (!comercioId) return;

  const snap = await getDoc(doc(db, "entidades", comercioId));
  if (!snap.exists()) return;

  const pipeline = snap.data().onboarding?.pipeline || [];
  const index    = pipeline.indexOf(currentStepId);
  const next     = pipeline[index + 1];

  if (!next) {
    window.location.href = "/dashboard.html";
    return;
  }

  window.location.href = buildStepUrl(next);
}

// ============================================================
// MARCAR STEP COMO COMPLETO
// Escribe en entidades/{id}/onboardingSteps.{stepId}
// ============================================================

export async function completeStep(uid, stepId) {
  const userSnap = await getDoc(doc(db, "usuarios", uid));
  if (!userSnap.exists()) return;

  const { comercioId } = userSnap.data();
  if (!comercioId) return;

  await updateDoc(doc(db, "entidades", comercioId), {
    [`onboardingSteps.${stepId}`]: true,
  });
}

// ============================================================
// EXPORTS PARA SUPER ADMIN (panelCore)
// ============================================================

export function buildFlowContext(userData, comercioData) {
  return {
    entityType: comercioData.entityType || userData.entityType || 'comercio',
    comercioId: userData.comercioId || null,
    onboarding: comercioData.onboarding || {}
  };
}

export function buildPipeline(ctx) {
  return PIPELINES[ctx.entityType] || PIPELINES['comercio'];
}
