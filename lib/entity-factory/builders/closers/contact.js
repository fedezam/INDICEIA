// lib/entity-factory/builders/closers/contact.js
// ⟦ROLE⟧ Closer CONTACT_CLOSE — profesional (matrícula, cobertura,
// lugares). Extraído de mind.builder.js (19/08/2026). Sin cambios
// de lógica.
//
// 13/10/2026: se alinea con service.js.
//   (a) Usa el núcleo de gobernanza de shared.js (gate de confirmación,
//       corrección antes del OK, "resuelto por endpoint", user_sees y
//       traspaso post-envío) en vez de tenerlos escritos a mano. Con
//       eso desaparece el ¬expose_number que shared.js ya había
//       sacado el 08/10 por chocar con channels.
//   (b) Soporte demo vía closers/demo.js, igual que order.js y
//       service.js: DEMO_FLOW_STEP en el flujo, regla demo_mode y
//       &waDestino en el link. Antes una entidad profesional demo
//       armaba el cierre como si fuera real.
//   (c) Una demo puede no tener teléfono propio (es justamente el
//       número que aporta quien la prueba), así que ya no se descarta
//       el closer entero cuando falta waNumber si la entidad es demo.
//       Para una entidad real sigue igual: sin número, sin closer.
//
// Requiere que api/contact-redirect/[id].js valide isDemo y respete
// waDestino con resolveDemoWaNumber, igual que service-redirect.

import { resolveWaNumber } from '../utils.js';
import {
  compileConfirmGate,
  compileCorrectionBeforeOk,
  MENSAJE_RESUELTO_POR_ENDPOINT,
  compileUserSees,
  compilePostOrderHandoff,
  POST_ORDER_OFFER_PLATFORM,
} from './shared.js';
import {
  DEMO_FLOW_STEP,
  compileDemoModeRule,
  compileDemoWaParam,
} from './demo.js';

export function compileContactClose(context, comercioId) {
  const isDemo = context.isDemo === true;
  const waNumber = resolveWaNumber(context);

  if (!waNumber && !isDemo) return null;

  const nombre = context.nombre || 'el profesional';

  const hasCobertura = !!(context.cobertura && Object.keys(context.cobertura).length);
  const hasLugares = Array.isArray(context.lugares) && context.lugares.length > 1;

  const coberturaLine = hasCobertura
    ? '⟦qualify_cobertura:preguntar_mutual_or_particular∧inform_mutuales_from_context⟧'
    : null;

  const lugarLine = hasLugares
    ? '⟦qualify_lugar:informar_lugares∧preguntar_lugar_preferido⟧'
    : '⟦qualify_lugar:inform_single_lugar⟧';

  const coberturaParam = hasCobertura
    ? '{{#COBERTURA}}&cobertura={{COBERTURA_URLENCODED}}{{/COBERTURA}}'
    : '';
  const lugarParam = hasLugares
    ? '{{#LUGAR}}&lugar={{LUGAR_URLENCODED}}{{/LUGAR}}'
    : '';
  const demoParam = compileDemoWaParam(context);

  // Secuencia del flujo: en demo se pide el teléfono justo antes de
  // confirmar (misma posición que en service.js).
  const flujo = [
    'informar(especialidad∧matricula∧lugares∧cobertura)',
    'qualify_motivo',
    hasCobertura ? 'qualify_cobertura' : null,
    hasLugares ? 'qualify_lugar' : null,
    isDemo ? DEMO_FLOW_STEP : null,
    'confirm_with_user',
    'ok_trigger',
    'build_contact_link',
  ].filter(Boolean).join('→');

  return [
    `CONTACT_CLOSE:⟦flujo:${flujo}⟧`,
    '⟦informar:solo_datos_from_context∧¬invent∧¬inventar_disponibilidad∧¬prometer_turno⟧',
    '⟦qualify_motivo:preguntar_motivo_consulta⟧',
    coberturaLine,
    lugarLine,
    '⟦turno:¬gestionar∧¬prometer∧solo_derivar_al_profesional⟧',
    compileDemoModeRule(context),
    compileConfirmGate('motivo∧cobertura∧lugar', 'Respondé OK para enviar la consulta'),
    compileCorrectionBeforeOk('update_field'),
    `⟦wa_url:https://indiceia.dev/api/contact-redirect/${comercioId}?motivo={{MOTIVO_URLENCODED}}${coberturaParam}${lugarParam}${demoParam}⟧`,
    MENSAJE_RESUELTO_POR_ENDPOINT,
    compileUserSees(`Contactar a ${nombre} por WhatsApp`),
    compilePostOrderHandoff('el_profesional'),
    POST_ORDER_OFFER_PLATFORM,
  ].filter(Boolean).join('\n');
}
