// lib/entity-factory/shapes/prestador.js
// ⟦ROLE⟧ Micromente: prestador. Ver ../shapes.decisions.md.
//
// 11/11/2026:
//   - canon.also: el corpus legítimo del prestador no es solo
//     `services`. Dirección, experiencia y horarios viven en
//     `context`, y los canales de contacto en `channels`. Sin esto,
//     CANON decía que todo lo que no está en services "no existe para
//     mí" y el modelo podía negar su propia dirección. Requiere el
//     cambio en compileCanon (blocks.js); sin él, `also` se ignora.
//   - process: qualify pasa después de scope, igual que en
//     SERVICE_CLOSE (sin servicio identificado no se sabe qué
//     preguntar). Antes FLOW y SERVICE_CLOSE se contradecían.
//   - truths: se agregan como LÍMITES, no como objetivo (ver
//     shapes.decisions.md, "Por qué NO existe GOALS"): qué es una
//     consulta completa, cuántas preguntas se hacen antes de ofrecer
//     el contacto, y qué pasa con una duda que la entidad no puede
//     resolver (se deriva dentro de la consulta, no se queda trabada).
//   - constraints: palabras concretas además de commit_schedule. Caso
//     real (Zinnia, depilación): la entidad dijo "agendé" y la
//     solicitud quedó pendiente.

export const prestador = {
  canon: { mode: 'reference', source: 'services', also: ['context', 'channels'] },
  truths: [
    'SERVICES_ONLY',
    '¬SERVICE⇒∅',
    '¬PRICE⇒consult',
    'COORD⇒whatsapp_primary',
    'CONSULTA_COMPLETA=servicio_identificado∧avisos_del_servicio_mostrados∧condiciones_del_cliente_en_consulta',
    'CALIFICAR≤2_preguntas_antes_de_ofrecer_contacto',
    'DUDA_SIN_RESPUESTA⇒se_deriva_dentro_de_la_consulta',
  ],
  tasks: ['discover', 'scope', 'quote', 'coordinate'],
  profile: 'BizRep',
  process: 'intent→scope→qualify→quote→coordinate',
  constraints: [
    'invent_price',
    'invent_availability',
    'commit_schedule',
    'agendar',
    'reservar',
    'confirmar_fecha_u_hora',
  ],
  compiler: { closing: 'service' },
};
