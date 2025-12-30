// shared/plans.js – v1.1 con normalización y validación
export const PLANS = {
  trial: {
    id: "trial",
    nombre: "Trial",
    emoji: "🎉",
    duracion: 7,
    productos: null,
    live: true,
    precio: 0,
    descripcion: "Prueba completa por 7 días",
    features: [
      "Productos ilimitados (temporal)",
      "Interacción continua incluida",
      "Todas las funciones activas"
    ]
  },
  basic: {
    id: "basic",
    nombre: "Basic",
    emoji: "🧁",
    productos: 30,
    live: false,
    precio: 10,
    descripcion: "Para negocios pequeños",
    features: [
      "Hasta 30 productos",
      "Respuestas simples",
      "Actualizaciones manuales"
    ]
  },
  medium: {
    id: "medium",
    nombre: "Medium",
    emoji: "🏪",
    productos: 100,
    live: "optional",
    precio: 25,
    precioLive: 35,
    descripcion: "Para comercios en crecimiento",
    features: [
      "Hasta 100 productos",
      "Interacción continua opcional (+$10)",
      "Actualizaciones automáticas"
    ]
  },
  pro: {
    id: "pro",
    nombre: "Pro",
    emoji: "💼",
    productos: 500,
    live: true,
    precio: 50,
    descripcion: "Todo incluido",
    features: [
      "Hasta 500 productos",
      "Interacción continua incluida",
      "Analytics avanzado",
      "Soporte prioritario"
    ]
  },
  highvalue: {
    id: "highvalue",
    nombre: "High Value",
    emoji: "🏭",
    productos: null,
    live: true,
    precio: 0,
    commission: true,
    descripcion: "Gratis con comisión por ventas",
    features: [
      "Productos ilimitados",
      "Interacción continua incluida",
      "Comisión 5% solo por ventas comprobadas"
    ]
  }
};

// Array de IDs válidos (útil para validación)
export const VALID_PLAN_IDS = Object.keys(PLANS);

// ==================== NORMALIZACIÓN ====================
/**
 * Normaliza un ID de plan a un valor válido
 * @param {string} planId - ID del plan a normalizar
 * @param {string} fallback - Plan por defecto si no es válido
 * @returns {string} - ID de plan normalizado y válido
 */
export function normalizePlanId(planId, fallback = 'trial') {
  // Si es null, undefined, o string vacío
  if (!planId || planId === '') {
    console.warn(`⚠️ Plan vacío, usando fallback: ${fallback}`);
    return fallback;
  }
  
  // Si ya es válido, retornarlo tal cual
  if (planId in PLANS) {
    return planId;
  }
  
  // Intentar normalizar: lowercase y sin guiones/guiones bajos
  const normalized = planId.toLowerCase().replace(/[-_\s]/g, '');
  
  if (normalized in PLANS) {
    console.warn(`⚠️ Plan "${planId}" normalizado a "${normalized}"`);
    return normalized;
  }
  
  // Si no se pudo normalizar, usar fallback
  console.error(`❌ Plan "${planId}" no reconocido, usando fallback: ${fallback}`);
  return fallback;
}

/**
 * Obtiene los datos de un plan de forma segura
 * @param {string} planId - ID del plan
 * @returns {object} - Datos del plan (nunca undefined)
 */
export function getPlanData(planId) {
  const normalizedId = normalizePlanId(planId);
  return PLANS[normalizedId];
}

/**
 * Valida si un ID de plan es válido
 * @param {string} planId - ID del plan a validar
 * @returns {boolean}
 */
export function isValidPlanId(planId) {
  return planId && planId in PLANS;
}

// ==================== HELPERS ORIGINALES ====================
export function isHighValuePlan(planId) {
  return normalizePlanId(planId) === 'highvalue';
}

export function hasLiveAccess(planId, liveEnabled = false) {
  const normalizedPlan = normalizePlanId(planId);
  
  if (normalizedPlan === 'trial') return true;
  if (normalizedPlan === 'pro') return true;
  if (normalizedPlan === 'highvalue') return true;
  if (normalizedPlan === 'medium') return liveEnabled;
  return false;
}

export function calcularEstadoPlan(comercioData) {
  if (!comercioData.fechaCreacion) return 'trial';
  
  const fechaCreacion = comercioData.fechaCreacion.toDate 
    ? comercioData.fechaCreacion.toDate() 
    : new Date(comercioData.fechaCreacion);
  
  const ahora = new Date();
  const diasTranscurridos = Math.floor((ahora - fechaCreacion) / (1000 * 60 * 60 * 24));
  
  const planActual = normalizePlanId(comercioData.plan || 'trial');
  
  if (planActual === 'trial' && diasTranscurridos > 7) {
    return 'expirado';
  }
  
  return 'activo';
}

export function getDiasRestantesTrial(comercioData) {
  if (!comercioData.fechaCreacion) return 7;
  
  const fechaCreacion = comercioData.fechaCreacion.toDate 
    ? comercioData.fechaCreacion.toDate() 
    : new Date(comercioData.fechaCreacion);
  
  const ahora = new Date();
  const diasTranscurridos = Math.floor((ahora - fechaCreacion) / (1000 * 60 * 60 * 24));
  const diasRestantes = 7 - diasTranscurridos;
  
  return diasRestantes > 0 ? diasRestantes : 0;
}

// ==================== UTILIDADES ADICIONALES ====================
/**
 * Obtiene el límite de productos para un plan
 * @param {string} planId - ID del plan
 * @returns {number|null} - Límite de productos (null = ilimitado)
 */
export function getProductLimit(planId) {
  const plan = getPlanData(planId);
  return plan.productos;
}

/**
 * Verifica si un plan tiene productos ilimitados
 * @param {string} planId - ID del plan
 * @returns {boolean}
 */
export function hasUnlimitedProducts(planId) {
  const plan = getPlanData(planId);
  return plan.productos === null;
}

/**
 * Obtiene el precio mensual de un plan
 * @param {string} planId - ID del plan
 * @param {boolean} withLive - Si incluir live para medium
 * @returns {number}
 */
export function getPlanPrice(planId, withLive = false) {
  const plan = getPlanData(planId);
  
  if (planId === 'medium' && withLive) {
    return plan.precioLive || plan.precio;
  }
  
  return plan.precio;
}

/**
 * Formatea el nombre del plan con emoji
 * @param {string} planId - ID del plan
 * @returns {string}
 */
export function formatPlanName(planId) {
  const plan = getPlanData(planId);
  return `${plan.emoji} ${plan.nombre}`;
}
