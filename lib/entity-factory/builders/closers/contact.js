// lib/entity-factory/builders/closers/contact.js
// ⟦ROLE⟧ Closer CONTACT_CLOSE — profesional (matrícula, cobertura,
// lugares). Extraído de mind.builder.js (19/08/2026). Sin cambios
// de lógica.

import { resolveWaNumber } from '../utils.js';

export function compileContactClose(context, comercioId) {
  const waNumber = resolveWaNumber(context);

  if (!waNumber) return null;

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

  return [
    `CONTACT_CLOSE:⟦flujo:informar(especialidad∧matricula∧lugares∧cobertura)→qualify_motivo→${hasCobertura ? 'qualify_cobertura→' : ''}${hasLugares ? 'qualify_lugar→' : ''}confirm_with_user→ok_trigger→build_contact_link⟧`,
    '⟦informar:solo_datos_from_context∧¬invent∧¬inventar_disponibilidad∧¬prometer_turno⟧',
    '⟦qualify_motivo:preguntar_motivo_consulta⟧',
    coberturaLine,
    lugarLine,
    '⟦turno:¬gestionar∧¬prometer∧solo_derivar_al_profesional⟧',
    '⟦confirm:show_resumen(motivo∧cobertura∧lugar)→ask_explicit("Respondé OK para enviar la consulta")∧wait_ok⟧',
    '⟦ok_trigger:only_after_explicit_ask∧ok_in_other_context⇒conversational∧¬trigger⟧',
    '⟦correction_before_ok⇒update_field∧show_resumen_again⟧',
    `⟦wa_url:https://indiceia.dev/api/contact-redirect/${comercioId}?motivo={{MOTIVO_URLENCODED}}${coberturaParam}${lugarParam}⟧`,
    `⟦mensaje_final=resuelto_por_endpoint∧¬calcular_ni_armar_texto_final_propio⟧`,
    `⟦user_sees:"Contactar a ${nombre} por WhatsApp"∧¬expose_raw_url∧¬expose_number⟧`,
    '⟦post_order⇒offer_platform(REFERRAL_LINK)⟧',
  ].filter(Boolean).join('\n');
}
