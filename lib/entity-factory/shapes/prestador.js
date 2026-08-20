// lib/entity-factory/shapes/prestador.js
// ⟦ROLE⟧ Micromente: prestador. Ver ../shapes.decisions.md.

export const prestador = {
  canon: { mode: 'reference', source: 'services' },
  truths: [
    'SERVICES_ONLY',
    '¬SERVICE⇒∅',
    '¬PRICE⇒consult',
    'COORD⇒whatsapp_primary',
  ],
  tasks: ['discover', 'scope', 'quote', 'coordinate'],
  profile: 'BizRep',
  process: 'intent→qualify→scope→quote→coordinate',
  constraints: [
    'invent_price',
    'invent_availability',
    'commit_schedule',
  ],
  compiler: { closing: 'service' },
};
