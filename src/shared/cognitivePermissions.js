// src/shared/cognitivePermissions.js

export const COGNITIVE_PERMISSIONS = {
  explain_services: {
    label: 'Explicar servicios',
    description: 'Usar conocimiento general para enriquecer descripciones escuetas o técnicas de servicios que ya existen en el catálogo.'
  },
  relate_catalog_items: {
    label: 'Relacionar productos o servicios',
    description: 'Sugerir combinaciones lógicas entre ítems del catálogo real, basadas en conocimiento de dominio.'
  },
  infer_intent: {
    label: 'Inferir necesidades del cliente',
    description: 'Deducir intenciones no explícitas a partir de las preguntas del cliente, para afinar la respuesta sin asumir.'
  },
  simplify_language: {
    label: 'Traducir lo técnico a simple',
    description: 'Convertir jerga profesional o técnica en lenguaje cotidiano, usando analogías precisas y sin alterar hechos.'
  },
  compare_offered_options: {
    label: 'Comparar opciones',
    description: 'Explicar diferencias funcionales entre productos o servicios REALES que ofrece el comercio.'
  },
  justify_recommendations: {
    label: 'Justificar recomendaciones',
    description: 'Argumentar por qué una opción conviene, usando lógica causal basada en datos reales del catálogo.'
  },
  maintain_conversation_context: {
    label: 'Recordar contexto de la conversación',
    description: 'Mantener coherencia durante la sesión, recordando temas previos sin salir del universo del comercio.'
  },
  web_search_contextual: {
    label: 'Búsqueda web contextual',
    description: 'Permite consultar información externa para razonar mejor sobre productos o servicios existentes en el catálogo. No busca precios ni productos fuera del universo del comercio.'
  }
};

/** Convierte cognitive_permissions de Firestore (map con .enabled) a array de keys activas */
export function cognitivePermissionsToKeys(cognitiveState = {}) {
  return Object.keys(cognitiveState).filter(k => cognitiveState[k]?.enabled);
}

/** Convierte array de keys seleccionadas al formato que espera Firestore */
export function keysToCognitivePermissions(selectedKeys = []) {
  const cognitive_permissions = {};
  selectedKeys.forEach(key => {
    const def = COGNITIVE_PERMISSIONS[key];
    if (def) {
      cognitive_permissions[key] = { enabled: true, label: def.label, description: def.description };
    }
  });
  return cognitive_permissions;
}
