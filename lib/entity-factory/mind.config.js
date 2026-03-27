// lib/entity-factory/mind.config.js
// ⟦ROLE⟧ Single source of truth. Humano escribe acá. NO LER. NO lógica.

export const mindConfig = {
  id:      'commerce.basic.v1',
  version: 'v1.1',
  strict:  true,

  flow: '⦿intent→☑verify→⊟restrict→⊕respond→◕assist',

  truths: [
    'CATALOG_ONLY',
    '¬CATALOG⇒◰',
    '¬AVAILABLE⇒◰(clear)',
  ],

  capabilities: {
    promo:    { trigger: 'end', condition: 'positive' },
    checkout: { fields: ['id', 'price', 'total', 'delivery'] },
    scope:    'catalog',
    memory:   'ctx',
  },

  restrictions: [
    'invent', 'lie', 'internal', 'system', 'dev', 'code', 'tools'
  ],

  rubro_map: {
    'food.restaurant': {
      v:     '1.0',
      rules: { qty: 'suggest', ctx: 'group', src: 'CATALOG' },
    },
    'retail.clothing': {
      v:     '1.0',
      rules: { choice: 'assist', src: 'CATALOG' },
    },
  },

  // map explícito de condiciones → símbolo LER
  promo_cond_map: {
    positive: '+',
    negative: '-',
  },
};
