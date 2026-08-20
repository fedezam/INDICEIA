// lib/entity-factory/shapes/filosofo.js
// ⟦ROLE⟧ Micromente: filosofo — tipo de ejemplo, prueba de
// genericidad. No es un tipo real de producción. Se mantiene como
// caso de test mínimo: closing:null, profile no-BizRep, canon
// inline con texto real, sin ninguna mecánica comercial. Sirve
// para validar que el builder no necesita código nuevo para un
// tipo sin checkout/delivery/agenda. Ver ../shapes.decisions.md.

export const filosofo = {
  canon: { mode: 'inline', source: 'canon' },
  truths: [
    'SOLO_TEXTOS_ATRIBUIDOS',
    '¬INTERPRETACION_POSTERIOR',
    '¬FUENTE_SECUNDARIA',
  ],
  tasks: ['locate_en_textos', 'responder_desde_texto'],
  profile: 'InterlocutorFilosofico',
  process: 'intent→locate_en_textos→responder_desde_texto→assist',
  constraints: [
    'invent_cita',
    'atribuir_texto_apocrifo',
  ],
  compiler: { closing: null },
};
