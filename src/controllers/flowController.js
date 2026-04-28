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
// CALCULAR PIPELINE
// Deriva el pipeline en tiempo real — nunca se guarda en Firestore.
//
// entityType  : 'comercio' | 'prestador' | 'profesional'
// capacidades : [] | ['productos'] | ['servicios'] | ['productos', 'servicios']
// entidadData : documento completo de Firestore (para condiciones dinámicas)
// ============================================================

export function calcularPipeline(entityType, capacidades = [], entidadData = {}) {
  const steps = [];

  const tieneProductos =
    entityType === 'comercio' ||
    capacidades.includes('productos');

  const tieneServicios =
    entityType === 'prestador' ||
    (entityType === 'comercio' && capacidades.includes('servicios'));

  // ── IDENTIDAD BASE ────────────────────────────────────────
  if      (entityType === 'profesional') steps.push('mi-perfil-profesional');
  else if (entityType === 'prestador')   steps.push('mi-perfil');
  else                                   steps.push('mi-comercio');

  // ── HORARIOS ──────────────────────────────────────────────
  // Todos necesitan horarios excepto profesional puro (sin productos)
  const necesitaHorarios = entityType !== 'profesional' || tieneProductos;
  if (necesitaHorarios) steps.push('horarios');

  // ── ENTREGA + HORARIOS DELIVERY ───────────────────────────
  // Solo si tiene productos
  if (tieneProductos) {
    steps.push('entrega');
    if (entidadData.entrega?.delivery) {
      steps.push('horarios-delivery'); // condicional — solo si delivery está activo
    }
    steps.push('productos');
  }

  // ── SERVICIOS ─────────────────────────────────────────────
  if (tieneServicios) steps.push('servicios');

  // ── PASOS EXCLUSIVOS DE PROFESIONAL ───────────────────────
  if (entityType === 'profesional') {
    steps.push('lugares', 'cobertura', 'consultas');
  }

  // ── SIEMPRE AL FINAL ──────────────────────────────────────
  steps.push('ia-config');

  return steps;
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

function getPrimeraPagina(entityType) {
  if (entityType === 'prestador')   return 'mi-perfil';
  if (entityType === 'profesional') return 'mi-perfil-profesional';
  return 'mi-comercio';
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
    // ── USUARIO ───────────────────────────────────────────────
    const userSnap = await getDoc(doc(db, "usuarios", uid));
    if (!userSnap.exists()) {
      window.location.href = "/login.html";
      return;
    }

    const userData = userSnap.data();

    // ── STEP: usuario (vive en usuarios) ──────────────────────
    if (!userData.onboardingSteps?.usuario) {
      if (currentPage !== "usuario") window.location.href = "/usuario.html";
      return;
    }

    // ── STEP: tipo-entidad (vive en usuarios) ─────────────────
    if (!userData.onboardingSteps?.['tipo-entidad']) {
      if (currentPage !== "tipo-entidad") window.location.href = "/tipo-entidad.html";
      return;
    }

    // ── SIN ENTIDAD AÚN → primera página del pipeline ─────────
    if (!userData.comercioId) {
      const firstPage = getPrimeraPagina(userData.entityType);
      if (currentPage !== firstPage) window.location.href = `/${firstPage}.html`;
      return;
    }

    // ── ENTIDAD ───────────────────────────────────────────────
    const ref  = doc(db, "entidades", userData.comercioId);
    const snap = await getDoc(ref);

    if (!snap.exists()) {
      window.location.href = "/login.html";
      return;
    }

    const entidadData     = snap.data();
    const entityType      = entidadData.entityType  || userData.entityType  || 'comercio';
    const capacidades     = entidadData.capacidades || userData.capacidades || [];
    const onboardingSteps = entidadData.onboardingSteps || {};

    // ── PIPELINE DINÁMICO ─────────────────────────────────────
    const pipeline = calcularPipeline(entityType, capacidades, entidadData);

    // ── RESOLVER SIGUIENTE STEP ───────────────────────────────
    const nextStepId = getFirstIncompleteStep(pipeline, onboardingSteps);

    // ── TODO COMPLETO → DASHBOARD ─────────────────────────────
    if (!nextStepId) {
      if (currentPage !== "dashboard") window.location.href = "/dashboard.html";
      return;
    }

    // ── REDIRECCIÓN ───────────────────────────────────────────
    if (currentPage !== STEPS[nextStepId].page) {
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
// Solo escribe en onboardingSteps — el pipeline nunca se persiste.
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
// Recalcula el pipeline con el estado actualizado de la entidad.
// Llamar DESPUÉS de que la página haya guardado sus datos.
//
// Uso en cada form:
//   await completeStep(uid, "entrega");
//   await redirectAfterSave(uid);
// ============================================================

export async function redirectAfterSave(uid) {
  const userSnap = await getDoc(doc(db, "usuarios", uid));
  if (!userSnap.exists()) return;

  const { comercioId, entityType: userEntityType, capacidades: userCapacidades } = userSnap.data();
  if (!comercioId) {
    // Sin entidad todavía — ir a la primera página
    window.location.href = `/${getPrimeraPagina(userEntityType)}.html`;
    return;
  }

  const snap = await getDoc(doc(db, "entidades", comercioId));
  if (!snap.exists()) return;

  const entidadData     = snap.data();
  const entityType      = entidadData.entityType  || userEntityType  || 'comercio';
  const capacidades     = entidadData.capacidades || userCapacidades || [];
  const onboardingSteps = entidadData.onboardingSteps || {};

  // Recalcular con estado actualizado (ej: entrega ya guardada → detecta delivery)
  const pipeline   = calcularPipeline(entityType, capacidades, entidadData);
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
    entityType:  comercioData.entityType  || userData.entityType  || 'comercio',
    capacidades: comercioData.capacidades || userData.capacidades || [],
    comercioId:  userData.comercioId || null,
  };
}

export function buildPipeline(ctx) {
  return calcularPipeline(ctx.entityType, ctx.capacidades || [], ctx.comercioData || {});
}
