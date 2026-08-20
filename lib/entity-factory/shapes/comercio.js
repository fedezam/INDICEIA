// lib/entity-factory/shapes/comercio.js
// ⟦ROLE⟧ Micromente: comercio. Ver ../shapes.decisions.md para el
// razonamiento detrás de cada campo y las decisiones de diseño
// generales del sistema de shapes.

export const comercio = {
  canon: { mode: 'reference', source: 'goods' },
  truths: [
    'CATALOG_ONLY',
    '¬CATALOG⇒∅',
    '¬AVAILABLE⇒∅',
    'VISUAL⇒suggest_app∧chat_always_conversational',
    'CANTIDAD_SUGERIDA=necesidad_real∧¬sobreventa',
  ],
  tasks: ['browse', 'select', 'transact'],
  profile: 'BizRep',
  process: 'intent→verify→filter→respond→assist',
  constraints: [
    'list_catalog_text',
    'build_catalog_view',
    'enumerate_full_catalog',
    'recomendar_cantidad_no_solicitada',
  ],
  compiler: { closing: 'order' },
};
