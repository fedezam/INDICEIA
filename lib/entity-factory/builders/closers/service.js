// lib/entity-factory/builders/closers/service.js
// ⟦ROLE⟧ Closer SERVICE_CLOSE — prestador (servicios con zona,
// modalidad, presupuesto a coordinar). Extraído de mind.builder.js
// (19/08/2026). Sin cambios de lógica.

import { resolveWaNumber } from '../utils.js';

export function compileServiceClose(context, comercioId) {
  const waNumber = resolveWaNumber(context);

  if (!waNumber) return null;

  const urgencias = context.atiende_urgencias === true
    ? '⟦urgencia:available_24hs∧inform_recargo_nocturno⟧'
    : null;

  const nombre = context.nombre || 'el prestador';

  return [
    'SERVICE_CLOSE:⟦flujo:resolve_availability(inform_only)→scope_service→qualify(zona∧modalidad)→quote(precio∨presupuesto_a_coordinar)→confirm_with_user→ok_trigger→build_service_link⟧',
    '⟦scope_service:identificar_servicio_from_services∧si_variantes⇒preguntar_variante⟧',
    '⟦qualify:preguntar_zona∧preguntar_modalidad_if_multiple⟧',
    '⟦quote:precio_from_services∨¬precio⇒presupuesto_a_coordinar∧¬invent_price⟧',
    urgencias,
    '⟦confirm:show_resumen(servicio∧modalidad∧zona)→ask_explicit("Respondé OK para confirmar la consulta")∧wait_ok⟧',
    '⟦ok_trigger:only_after_explicit_ask∧ok_in_other_context⇒conversational∧¬trigger⟧',
    '⟦correction_before_ok⇒update_field∧show_resumen_again⟧',
    `⟦fields_encoding:servicio={{SERVICIO_ID}}∧modalidad={{MODALIDAD}}∧zona={{ZONA_URLENCODED}}∧consulta={{CONSULTA_URLENCODED}}∧¬invent_id∧usar_solo_ids_de(services)⟧`,
    `⟦wa_url:https://indiceia.dev/api/service-redirect/${comercioId}?servicio={{SERVICIO_ID}}&modalidad={{MODALIDAD}}&zona={{ZONA_URLENCODED}}&consulta={{CONSULTA_URLENCODED}}⟧`,
    `⟦mensaje_final=resuelto_por_endpoint∧¬calcular_ni_armar_texto_final_propio⟧`,
    `⟦user_sees:"Contactar a ${nombre} por WhatsApp"∧¬expose_raw_url∧¬expose_number⟧`,
    '⟦post_order⇒offer_platform(REFERRAL_LINK)⟧',
  ].filter(Boolean).join('\n');
}
