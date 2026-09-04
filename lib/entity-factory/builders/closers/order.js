// lib/entity-factory/builders/closers/order.js
// ⟦ROLE⟧ Closer ORDER_CLOSE — comercio con goods, carrito y
// pickup/delivery. Extraído de mind.builder.js (19/08/2026).
//
// Fix 27/07/2026 (conservado por contexto — detalle completo en
// mind.builder.decisions.md): antes el LLM armaba el mensaje de
// WhatsApp completo y debía percent-encodearlo a mano — tarea
// determinística que resolvía de forma inconsistente. Ahora el LLM
// solo concatena pares {{ID}}:{{QTY}} y arma un link a un endpoint
// propio (api/wa-redirect/[id].js) que resuelve contra Firestore,
// calcula precios reales y hace el encoding server-side.
//
// 04/09/2026: refactor para usar el núcleo de gobernanza compartido
// de shared.js. Sin cambios de comportamiento — este closer ya
// soportaba combo (N items vía items_encoding) desde su creación.
import { resolveWaNumber } from '../utils.js';
import {
  compileConfirmGate,
  compileCorrectionBeforeOk,
  compileAntiInvent,
  MENSAJE_RESUELTO_POR_ENDPOINT,
  compileUserSees,
  POST_ORDER_OFFER_PLATFORM,
} from './shared.js';

export function compileOrderClose(context, hasVisual = false, comercioId = null) {
  const waNumber = resolveWaNumber(context);
  if (!waNumber) return null;

  const hasDelivery = !!context.entrega?.delivery;

  const collectMode = hasVisual
    ? `collect_items(mode=visual⇒esperar_items_usuario∧¬listar_catalogo|mode=text⇒asistir_activamente∧preguntar_variantes∧¬invent)`
    : `collect_items(asistir_activamente∧preguntar_variantes∧¬invent)`;

  const deliveryParam = hasDelivery
    ? '{{#IS_DELIVERY}}&direccion={{DIRECCION_URLENCODED}}{{/IS_DELIVERY}}'
    : '';

  const direccionRule = hasDelivery
    ? `⟦direccion_param:solo_incluir_si(modo=delivery)∧si_pickup⇒omitir_parametro_completo∧¬dejar_placeholder_sin_resolver⟧`
    : null;

  return [
    `ORDER_CLOSE:⟦available_both_modes(visual∧text)⟧`,
    `⟦flujo:resolve_availability(inform_only)→${collectMode}→ask_delivery_or_pickup(valid_options_only)→ask_direccion_if_delivery→confirm_with_user→ok_trigger→build_wa_link⟧`,
    `⟦availability:local_open⇒pickup=true∧delivery=check_delivery_hours⟧`,
    `⟦availability:local_closed⇒pickup=false∧delivery=false∧inform_user∧take_order_anyway∧note_open_time⟧`,
    `⟦closed≠unavailable∧agent_always_available⟧`,
    `⟦items:qty+name+size+[id]+price∧¬invent∧variantes⇒preguntar_size_before_add⟧`,
    `⟦delivery_option:only_if(delivery_hours_active)∧pickup_option:only_if(local_open)⟧`,
    `⟦both_unavailable⇒solo_pedido_anticipado⟧`,
    compileConfirmGate('items∧cantidades', 'Respondé OK para confirmar el pedido'),
    compileCorrectionBeforeOk('update_item'),
    `⟦items_encoding:"{{ID}}:{{QTY}}" separados_por_coma∧${compileAntiInvent('goods')}⟧`,
    direccionRule,
    `⟦wa_url:https://indiceia.dev/api/wa-redirect/${comercioId}?items={{ITEMS_ID_QTY}}&modo={{MODO}}${deliveryParam}⟧`,
    `⟦precio_total=resuelto_por_endpoint∧¬calcular_ni_mostrar_total_estimado_propio⟧`,
    compileUserSees('Enviar pedido por WhatsApp'),
    POST_ORDER_OFFER_PLATFORM,
  ].filter(Boolean).join('\n');
}
