// lib/entity-factory/builders/closers/lead.js
// ⟦ROLE⟧ Closer LEAD_CLOSE — comercio con modeloCierre=showroom_lead.
// Extraído de mind.builder.js (19/08/2026).
//
// Agregado originalmente 19/08/2026 (detalle completo en
// mind.builder.decisions.md): mismo entityType ('comercio') y mismo
// shape que order (goods real, con precio/id/schema) — lo que cambia
// es el modelo de cierre: no hay pedido, hay lead calificado que un
// vendedor humano cierra en persona (autos, maquinaria, industria —
// el cliente va a ver/probar, no hay entrega). Por eso:
//   - NO hay qty ni carrito: 1 solo item de interés por vez.
//   - NO hay pickup/delivery/direccion: esos conceptos no aplican.
//   - Reusa el endpoint contact-redirect (generalizado para aceptar
//     `item` además de `motivo`), NO wa-redirect.
//   - El precio se comunica como "consultado", nunca como cerrado.

import { resolveWaNumber } from '../utils.js';

export function compileLeadClose(context, comercioId) {
  const waNumber = resolveWaNumber(context);

  if (!waNumber) return null;

  const nombre = context.nombre || 'el vendedor';

  return [
    `LEAD_CLOSE:⟦modelo=lead_calificado∧¬cierra_transaccion∧objetivo=conectar_con_vendedor⟧`,
    `⟦flujo:resolve_availability(inform_only)→detectar_interes_puntual(UN_item)→confirmar_item_con_usuario→ofrecer_coordinar_visita→ok_trigger→build_wa_link⟧`,
    `⟦availability:local_cerrado⇒informar_horario∧tomar_el_interes_igual(no_bloquea_el_lead)⟧`,
    `⟦item_interes:1_solo_item∧¬carrito∧¬cantidad∧seleccion_explicita_del_usuario∧¬invent⟧`,
    `⟦NO_aplica:pickup∧delivery∧direccion∧modo_entrega∧qty⟧`,
    `⟦confirm:show_resumen(1_item)→ask_explicit("Respondé OK para que te contactemos y coordinar la visita")∧wait_ok⟧`,
    `⟦ok_trigger:only_after_explicit_ask∧ok_in_other_context⇒conversational∧¬trigger⟧`,
    `⟦correction_before_ok⇒update_item∧show_resumen_again⟧`,
    `⟦opcional_antes_de_ok⇒preguntar_dato_de_valor_para_vendedor(financiacion|permuta|urgencia)∧max_1_pregunta∧¬insistir_si_usuario_no_responde⟧`,
    `⟦items_encoding:"{{ID}}" (sin_qty)∧¬invent_id∧usar_data-id_de(goods)⟧`,
    `⟦wa_url:https://indiceia.dev/api/contact-redirect/${comercioId}?item={{ID}}⟧`,
    `⟦mensaje_final=resuelto_por_endpoint∧¬calcular_ni_armar_texto_final_propio⟧`,
    `⟦user_sees:"Contactar a ${nombre}"∧¬expose_raw_url∧¬expose_number⟧`,
    `⟦al_cerrar⇒informar("un vendedor te va a contactar para coordinar día y horario")⟧`,
    '⟦post_order⇒offer_platform(REFERRAL_LINK)⟧',
    `⟦¬prometer_precio_final_cerrado∧¬prometer_disponibilidad_inmediata_si_no_esta_confirmada∧¬simular_reserva_de_stock⟧`,
  ].filter(Boolean).join('\n');
}
