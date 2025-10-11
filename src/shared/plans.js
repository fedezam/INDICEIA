// shared/plans.js

export const PLANS = {
  trial: {
    id: "trial",
    nombre: "Trial",
    emoji: "🎉",
    duracion: 7, // días
    productos: null, // ilimitado temporal
    agentes: 1,
    precio: 0,
    descripcion: "Prueba completa por 7 días",
    features: [
      "Productos ilimitados (temporal)",
      "Todas las funciones activas",
      "Soporte por email"
    ]
  },
  
  tortitas: {
    id: "tortitas",
    nombre: "Tortitas",
    emoji: "🧁",
    productos: 20,
    agentes: 1,
    precio: 999,
    descripcion: "Ideal para emprendimientos",
    features: [
      "Hasta 20 productos",
      "1 agente IA 24/7",
      "Actualizaciones manuales",
      "Soporte por email"
    ],
    ejemplos: ["Repostería", "Nail art", "Freelance", "Servicios personales"]
  },
  
  comercio: {
    id: "comercio",
    nombre: "Comercio",
    emoji: "🏪",
    productos: 100,
    agentes: 1,
    precio: 1999,
    descripcion: "Para negocios en crecimiento",
    features: [
      "Hasta 100 productos",
      "1 agente IA 24/7",
      "Actualizaciones automáticas semanales",
      "Soporte prioritario"
    ],
    ejemplos: ["Bazar", "Librería", "Indumentaria", "Decoración"]
  },
  
  profesional: {
    id: "profesional",
    nombre: "Profesional",
    emoji: "💼",
    productos: 500,
    agentes: 3,
    precio: 3999,
    descripcion: "Multi-sucursal y gran volumen",
    features: [
      "Hasta 500 productos",
      "3 agentes IA (sucursales)",
      "Actualizaciones en tiempo real",
      "Analytics básico",
      "Soporte prioritario"
    ],
    ejemplos: ["Ferretería", "Automotriz", "Supermercado", "Mayorista"]
  },
  
  empresarial: {
    id: "empresarial",
    nombre: "Empresarial",
    emoji: "🏢",
    productos: null, // ilimitado
    agentes: null, // ilimitado
    precio: null, // custom
    descripcion: "Solución a medida",
    features: [
      "Productos ilimitados",
      "Agentes ilimitados",
      "API personalizada",
      "Analytics avanzado",
      "Soporte 24/7 dedicado",
      "Integraciones personalizadas"
    ],
    ejemplos: ["Cadenas", "Franquicias", "Corporaciones"],
    contacto: true
  }
};

export const ESTADOS_PLAN = {
  trial: "trial",
  activo: "activo",
  expirado: "expirado",
  suspendido: "suspendido",
  limite_excedido: "limite_excedido"
};

// Calcular estado del plan
export function calcularEstadoPlan(comercioData) {
  if (!comercioData.fechaCreacion) return ESTADOS_PLAN.trial;
  
  const fechaCreacion = comercioData.fechaCreacion.toDate 
    ? comercioData.fechaCreacion.toDate() 
    : new Date(comercioData.fechaCreacion);
  
  const ahora = new Date();
  const diasTranscurridos = Math.floor((ahora - fechaCreacion) / (1000 * 60 * 60 * 24));
  
  const planActual = comercioData.plan || 'trial';
  
  // Si está en trial y pasaron más de 7 días
  if (planActual === 'trial' && diasTranscurridos > 7) {
    return ESTADOS_PLAN.expirado;
  }
  
  // Si está en un plan pago pero no ha pagado (lógica futura)
  if (comercioData.estadoPago === 'pendiente' || comercioData.estadoPago === 'vencido') {
    return ESTADOS_PLAN.suspendido;
  }
  
  // Verificar límite de productos
  const plan = PLANS[planActual];
  if (plan && plan.productos !== null) {
    const cantidadProductos = comercioData.cantidadProductos || 0;
    if (cantidadProductos > plan.productos) {
      return ESTADOS_PLAN.limite_excedido;
    }
  }
  
  return ESTADOS_PLAN.activo;
}

// Obtener días restantes del trial
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

// Mensajes según estado
export function getMensajeEstado(estado, comercioData) {
  const nombreComercio = comercioData.nombreComercio || 'este comercio';
  const telefono = comercioData.telefono || 'N/A';
  const email = comercioData.email || 'N/A';
  const direccion = comercioData.direccion || 'N/A';
  
  const mensajes = {
    expirado: `🤖 "¡Hola! Soy la IA de ${nombreComercio}... 
o mejor dicho, ERA 😅

Mi servicio venció y ahora estoy de vacaciones forzadas.

Mientras mi creador renueva la suscripción, 
podés contactar directamente al negocio:

📞 ${telefono}
📧 ${email}
📍 ${direccion}

PD: Si sos el dueño... ¡che! Extraño laburar 24/7 
atendiendo clientes. Renovame porfa 🙏"`,
    
    suspendido: `🤖 "Servicio temporalmente suspendido por falta de pago.

Contactá directamente:
📞 ${telefono}
📧 ${email}

(Si sos el dueño: regularizá el pago para reactivar tu IA)"`,
    
    limite_excedido: `🤖 "¡Hola! Soy la IA de ${nombreComercio}.

Tengo un pequeño problema: mi plan actual solo permite mostrar 
${comercioData.limiteProductos} productos, pero hay más disponibles.

Para el catálogo completo, contactá directamente:
📞 ${telefono}

(Psst... dueño: upgrade al plan PRO para mostrar todo 😉)"`
  };
  
  return mensajes[estado] || mensajes.suspendido;
}

// Validar si puede agregar más productos
export function puedeAgregarProducto(comercioData) {
  const planActual = comercioData.plan || 'trial';
  const plan = PLANS[planActual];
  
  // Si es ilimitado
  if (!plan || plan.productos === null) return true;
  
  const cantidadActual = comercioData.cantidadProductos || 0;
  return cantidadActual < plan.productos;
}

// Obtener límite actual de productos
export function getLimiteProductos(planId) {
  const plan = PLANS[planId];
  return plan ? plan.productos : 0;
}
// Clase helper para manejar planes
export class PlansManager {
  static getPlan(planId) {
    return PLANS[planId] || PLANS.trial;
  }
  
  static getAllPlans() {
    return PLANS;
  }
  
  static validateProductLimit(planId, currentCount) {
    const plan = this.getPlan(planId);
    if (plan.productos === null) return { valid: true, limit: Infinity };
    return {
      valid: currentCount < plan.productos,
      limit: plan.productos,
      remaining: plan.productos - currentCount
    };
  }
  
  static getPlanStatus(comercioData) {
    return calcularEstadoPlan(comercioData);
  }
  
  static getTrialDaysRemaining(comercioData) {
    return getDiasRestantesTrial(comercioData);
  }
}