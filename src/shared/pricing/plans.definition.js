// src/shared/pricing/plans.definition.js

export const PLAN_DEFINITIONS = {
  basic: {
    id: "basic",
    name: "Basic",
    productos: 30,
    live: false,
    descriptionShort: "Asistente inteligente",
    descriptionLong:
      "Ideal para comercios chicos que quieren empezar a atender consultas con IA."
  },
  medium: {
    id: "medium",
    name: "Medium",
    productos: 100,
    live: false,
    recommended: true,
    descriptionShort: "Asistente comercial",
    descriptionLong:
      "Para comercios activos que venden por redes y necesitan automatizar respuestas."
  },
  medium_live: {
    id: "medium_live",
    name: "Medium + Live",
    productos: 300,
    live: true,
    descriptionShort: "Atención continua",
    descriptionLong:
      "Atención 24/7 con IA conversacional activa y mayor capacidad de catálogo."
  },
  pro: {
    id: "pro",
    name: "Pro",
    productos: 500,
    live: true,
    descriptionShort: "Asistente comercial avanzado",
    descriptionLong:
      "Presencia digital completa con IA activa, alto volumen y sin límites operativos."
  }
};
