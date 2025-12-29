// shared/plans.js – v1.0 final (corregido, sin duplicate exports)

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

// Helpers
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

// Tus funciones originales (calcularEstadoPlan y getDiasRestantesTrial)
export function calcularEstadoPlan(comercioData) {
  if (!comercioData.fechaCreacion) return 'trial';

  const fechaCreacion = comercioData.fechaCreacion.toDate ? comercioData.fechaCreacion.toDate() : new Date(comercioData.fechaCreacion);
  const ahora = new Date();
  const diasTranscurridos = Math.floor((ahora - fechaCreacion) / (1000 * 60 * 60 * 24));

  const planActual = comercioData.plan || 'trial';

  if (planActual === 'trial' && diasTranscurridos > 7) {
    return 'expirado';
  }

  return 'activo';
}

export function getDiasRestantesTrial(comercioData) {
  if (!comercioData.fechaCreacion) return 7;

  const fechaCreacion = comercioData.fechaCreacion.toDate ? comercioData.fechaCreacion.toDate() : new Date(comercioData.fechaCreacion);
  const ahora = new Date();
  const diasTranscurridos = Math.floor((ahora - fechaCreacion) / (1000 * 60 * 60 * 24));
  const diasRestantes = 7 - diasTranscurridos;

  return diasRestantes > 0 ? diasRestantes : 0;
}
