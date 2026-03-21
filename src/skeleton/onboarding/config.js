// src/skeleton/onboarding/config.js

/**
 * Configuración central de pasos de onboarding
 * Define dónde se guarda cada paso (usuarios o comercios)
 */

export const STEP_TARGETS = {
  'usuario': { 
    collection: 'usuarios', 
    idField: 'uid' 
  },
  'crear-entidad': { 
    collection: 'usuarios', 
    idField: 'uid' 
  },
  'mi-comercio': { 
    collection: 'entidades', 
    idField: 'comercioId' 
  },
  'horarios': { 
    collection: 'entidades', 
    idField: 'comercioId' 
  },
  'servicios': { 
    collection: 'entidades', 
    idField: 'comercioId' 
  },
  'productos': { 
    collection: 'entidades', 
    idField: 'comercioId' 
  },
  'ia-config': { 
    collection: 'entidades', 
    idField: 'comercioId' 
  }
};

/**
 * Resuelve dónde guardar un paso específico
 * @param {string} stepName - Nombre del paso (ej: 'usuario')
 * @param {Object} context - Contexto con uid y comercioId
 * @returns {{ collection: string, documentId: string }}
 */
export function resolveTarget(stepName, context) {
  const target = STEP_TARGETS[stepName];
  
  if (!target) {
    throw new Error(`Paso desconocido: ${stepName}`);
  }
  
  const documentId = context[target.idField];
  
  if (!documentId) {
    throw new Error(`No se encontró ${target.idField} en el contexto para el paso ${stepName}`);
  }
  
  return {
    collection: target.collection,
    documentId
  };
}
