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
// STEP DEFINITIONS
// ============================================================

const STEPS = {
  'mi-comercio':           { page: 'mi-comercio'           },
  'mi-perfil':             { page: 'mi-perfil'             },
  'mi-perfil-profesional': { page: 'mi-perfil-profesional' },
  'horarios':              { page: 'horarios'              },
  'horarios-delivery':     { page: 'horarios-delivery'     },
  'entrega':               { page: 'entrega'               },
  'productos':             { page: 'productos'             },
  'servicios':             { page: 'servicios'             },
  'lugares':               { page: 'lugares'               },
  'cobertura':             { page: 'cobertura'             },
  'consultas':             { page: 'consultas'             },
  'ia-config':             { page: 'ia-config'             },
};

// ============================================================
// PIPELINES BASE
// ============================================================

const BASE_PIPELINES = {
  comercio: [
    'mi-comercio',
    'horarios',
    'entrega',
    'productos',
    'ia-config',
  ],

  comercio_servicios: [
    'mi-comercio',
    'horarios',
    'entrega',
    'productos',
    'servicios',
    'ia-config',
  ],

  prestador: [
    'mi-perfil',
    'horarios',
    'servicios',
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
// PIPELINE MODIFIERS
// Reciben la entidad y devuelven el pipeline ajustado.
// Cada modifier es puro — no muta BASE_PIPELINES.
// Agregar aquí cualquier step condicional futuro.
// ============================================================

const PIPELINE_MODIFIERS = {
  comercio: (entidadData) => {
    const pipeline = [...BASE_PIPELINES.comercio];
    if (entidadData.entrega?.delivery) {
      const idx = pipeline.indexOf('entrega');
      pipeline.splice(idx + 1, 0, 'horarios-delivery');
    }
    return pipeline;
  },

  comercio_servicios: (entidadData) => {
    const pipeline = [...BASE_PIPELINES.comercio_servicios];
    if (entidadData.entrega?.delivery) {
      const idx = pipeline.indexOf('entrega');
      pipeline.splice(idx + 1, 0, 'horarios-delivery');
    }
    return pipeline;
  },

  prestador: (entidadData) => {
    return [...BASE_PIPELINES.prestador];
  },

  profesional: (entidadData) => {
    return [...BASE_PIPELINES.profesional];
  },
};

// ============================================================
// CALCULAR PIPELINE
// Siempre derivado — nunca leído de Firestore.
// ============================================================

function calcularPipeline(entityType, entidadData) {
  const modifier = PIPELINE_MODIFIERS[entityType];
  if (!modifier) {
    console.warn(`[flowController] entityType desconocido: "${entityType}", usando comercio`);
    return PIPELINE_MODIFIERS.comercio(entidadData);
  }
  return modifier(entidadData);
}

// ============================================================
// HELPERS
// ============================================================

function buildStepUrl(stepId) {
  return `/${STEPS[stepId].page}.html`;
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

    // ── STEP: usuario (vive en usuarios) ────────────────────
    if (!userData.onboardingSteps?.usuario) {
      if (currentPage !== "usuario") window.location.href = "/usuario.html";
      return;
    }

    // ── STEP: tipo-entidad (vive en usuarios) ───────────────
    if (!userData.onboardingSteps?.['tipo-entidad']) {
      if (currentPage !== "tipo-entidad") window.location.href = "/tipo-entidad.html";
      return;
    }

    // ── SIN ENTIDAD AÚN → primera página del pipeline ───────
    if (!userData.comercioId) {
      const entityType = userData.entityType || 'comercio';

      const firstPage =
        entityType === 'prestador'         ? 'mi-perfil' :
        entityType === 'profesional'       ? 'mi-perfil-profesional' :
        entityType === 'comercio_servicios'? 'mi-comercio' :
                                             'mi-comercio';

      if (currentPage !== firstPage) window.location.href = `/${firstPage}.html`;
      return;
    }

    // ── ENTIDAD ─────────────────────────────────────────────
    const ref  = doc(db, "entidades", userData.comercioId);
    const snap = await getDoc(ref);

    if (!snap.exists()) {
      window.location.href = "/login.html";
      return;
    }

    const entidadData    = snap.data();
    const entityType     = entidadData.entityType || userData.entityType || 'comercio';
    const onboardingSteps = entidadData.onboardingSteps || {};

    // ── CALCULAR PIPELINE DINÁMICO ───────────────────────────
    const pipeline = calcularPipeline(entityType, entidadData);

    // ── RESOLVER SIGUIENTE STEP ─────────────────────────────
    const nextStepId = getFirstIncompleteStep(pipeline, onboardingSteps);

    // ── TODO COMPLETO → DASHBOARD ───────────────────────────
    if (!nextStepId) {
      if (currentPage !== "dashboard") window.location.href = "/dashboard.html";
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
// MARCAR STEP COMO COMPLETO
// Cada página llama esto en su onSave.
// Escribe solo en onboardingSteps — el pipeline nunca se guarda.
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
// REDIRIGIR AL SIGUIENTE STEP
// Lee el estado actual de la entidad y calcula el próximo step.
// Uso en cada form después de guardar:
//
//   await completeStep(uid, "entrega");
//   await redirectAfterSave(uid, "entrega");
// ============================================================

export async function redirectAfterSave(uid, currentStepId) {
  const userSnap = await getDoc(doc(db, "usuarios", uid));
  if (!userSnap.exists()) return;

  const { comercioId, entityType: userEntityType } = userSnap.data();
  if (!comercioId) return;

  const snap = await getDoc(doc(db, "entidades", comercioId));
  if (!snap.exists()) return;

  const entidadData     = snap.data();
  const entityType      = entidadData.entityType || userEntityType || 'comercio';
  const onboardingSteps = entidadData.onboardingSteps || {};

  // Recalcular pipeline con el estado actualizado (ej: entrega ya guardada)
  const pipeline = calcularPipeline(entityType, entidadData);

  const nextStepId = getFirstIncompleteStep(pipeline, onboardingSteps);

  if (!nextStepId) {
    window.location.href = "/dashboard.html";
    return;
  }

  window.location.href = buildStepUrl(nextStepId);
}

// ============================================================
// EXPORTS PARA SUPER ADMIN (panelCore)
// ============================================================

export function buildFlowContext(userData, comercioData) {
  return {
    entityType: comercioData.entityType || userData.entityType || 'comercio',
    comercioId: userData.comercioId || null,
  };
}

export function buildPipeline(ctx) {
  return calcularPipeline(ctx.entityType, ctx.comercioData || {});
}
