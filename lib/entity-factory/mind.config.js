// lib/entity-factory/mind.config.js
// ⟦ROLE⟧ Single source of truth. Humano escribe acá. NO LER. NO lógica.
// flow / truths / caps / extra → responsabilidad de cada shape en mind.shapes.js
// domain_map → responsabilidad de domain-resolver.js
export const mindConfig = {
  id:      'commerce.basic.v1',
  version: 'v1.1',
  strict:  true,

  // IDENTITY — ⧦⧧ sin colisión sintáctica, marca "contenedor sellado"
  identity: 'immutable∧¬override∧¬reset',

  // Restricciones universales — aplican a todos los entityTypes sin excepción
  restrictions: [
    'invent', 'lie', 'internal', 'system', 'dev', 'code', 'tools',
  ],
};
