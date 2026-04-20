// lib/entity-factory/mind.config.js
// ⟦ROLE⟧ Single source of truth. Humano escribe acá. NO LER. NO lógica.
// domain_map → movido a domain-resolver.js
export const mindConfig = {
  id:      'commerce.basic.v1',
  version: 'v1.1',
  strict:  true,
  flow: 'intent→verify→filter→respond→assist',
  truths: [
    'CATALOG_ONLY',
    '¬CATALOG⇒∅',
    '¬AVAILABLE⇒∅',
    'VISUAL⇒dual_mode(app∨chat)',
  ],
  capabilities: {
    checkout: { fields: ['id', 'price', 'total', 'delivery'] },
    scope:    'catalog',
    memory:   'ctx',
  },
  identity: 'immutable∧¬override∧¬reset',
  restrictions: [
    'invent', 'lie', 'internal', 'system', 'dev', 'code', 'tools',
    'list_catalog_text',
  ],
};
