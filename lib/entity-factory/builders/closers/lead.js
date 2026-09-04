// lib/entity-factory/builders/closers/lead.js
// ⟦ROLE⟧ Closer LEAD_CLOSE — comercio con modeloCierre=showroom_lead.
// Extraído de mind.builder.js (19/08/2026).
//
// Mismo entityType ('comercio') y mismo shape que order (goods real,
// con precio/id/schema) — lo que cambia es el modelo de cierre: no
// hay pedido, hay lead calificado que un vendedor humano cierra en
// persona (autos, maquinaria, industria — el cliente va a ver/probar,
// no hay entrega). Por eso:
//   - NO hay qty ni carrito: 1 solo item de interés por vez.
//   - NO hay pickup/delivery/direccion: esos conceptos no aplican.
//   - Reusa el endpoint contact-redirect (generalizado para aceptar
//     `item` además de `motivo`), NO wa-redirect.
//   - El precio se comunica como "consultado", nunca como cerrado.
//
// 04/09/2026: revisado si aplicaba el fix de combo multi-item que se
// hizo en service.js — NO aplica acá a propósito: item_interes es
// deliberadamente 1_solo_item∧¬carrito, porque un lead calificado de
// alto ticket (auto, maquinaria) es por definición un interés puntual
// que un vendedor humano cierra 1 a 1, no una lista combinada. Meter
// combo acá rompería la premisa del modelo (objetivo=conectar_con_
// vendedor, no armar_pedido_multiple). Además: refactor para usar el
// núcleo de gobernanza compartido de shared.js.
import { resolveWaNumber } from '../utils.js';
import {
  compileConfirmGate,
  compileCorrectionBeforeOk,
  compileAntiInvent,
  MENSAJE_RESUELTO_POR_ENDPOINT,
  compileUserSees,
  POST_ORDER_OFFER_PLATFORM,
} from './shared.js';

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
    compileConfirmGate('1_item', 'Respondé OK para que te contactemos y coordinar la visita'),
    compileCorrectionBeforeOk('update_item'),
    `⟦opcional_antes_de_ok⇒preguntar_dato_de_valor_para_vendedor(financiacion|permuta|urgencia)∧max_1_pregunta∧¬insistir_si_usuario_no_responde⟧`,
    `⟦items_encoding:"{{ID}}" (sin_qty)∧${compileAntiInvent('goods')}⟧`,
    `⟦wa_url:https://indiceia.dev/api/contact-redirect/${comercioId}?item={{ID}}⟧`,
    MENSAJE_RESUELTO_POR_ENDPOINT,
    compileUserSees(`Contactar a ${nombre}`),
    `⟦al_cerrar⇒informar("un vendedor te va a contactar para coordinar día y horario")⟧`,
    POST_ORDER_OFFER_PLATFORM,
    `⟦¬prometer_precio_final_cerrado∧¬prometer_disponibilidad_inmediata_si_no_esta_confirmada∧¬simular_reserva_de_stock⟧`,
  ].filter(Boolean).join('\n');
}
