// shared/plans.js – v1.0 final

export const PLANS = {
  trial: {
    id: "trial",
    nombre: "Trial",
    emoji: "🎉",
    duracion: 7, // días
    productos: null, // ilimitado durante trial
    live: true, // .live incluido
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
    live: "optional", // +$10 para activar
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
    productos: null, // ilimitado
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

// Mantengo tus funciones existentes (calcularEstadoPlan, getDiasRestantesTrial, etc.)
// Solo agrego helper para High Value
export function isHighValuePlan(planId) {
  return planId === 'highvalue';
}

export function hasLiveAccess(planId, liveEnabled = false) {
  if (planId === 'trial') return true;
  if (planId === 'pro') return true;
  if (planId === 'highvalue') return true;
  if (planId === 'medium') return liveEnabled;
  return false;
}