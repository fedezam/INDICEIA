export const COGNITION_GROUPS = [
  {
    id: "autonomy",
    title: "Autonomía del agente",
    icon: "fa-brain",
    description:
      "Define cuánto puede decidir y actuar el agente sin intervención humana.",
    items: [
      {
        id: "self_initiative",
        title: "Iniciativa propia",
        description:
          "El agente puede proponer acciones o respuestas sin ser solicitado."
      },
      {
        id: "context_memory",
        title: "Memoria contextual",
        description:
          "Mantiene coherencia entre mensajes durante la sesión."
      }
    ]
  },
  {
    id: "reasoning",
    title: "Razonamiento",
    icon: "fa-project-diagram",
    description:
      "Capacidades internas para analizar, evaluar y decidir.",
    items: [
      {
        id: "multi_step",
        title: "Razonamiento multi-paso",
        description:
          "Descompone problemas complejos en pasos lógicos."
      },
      {
        id: "rule_following",
        title: "Respeto de reglas",
        description:
          "Prioriza reglas del sistema sobre pedidos ambiguos."
      }
    ]
  }
];
