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
//
// 08/09/2026: soporte demo movido a closers/demo.js, compartido con
// service.js (y cualquier closer futuro). Este archivo ya no arma el
// fragmento demo_mode ni el param waDestino a mano — solo los pide.
// Ver lib/redirect/resolveDemoWaNumber.js para la validación real
// del lado server (api/wa-redirect/[id].js).
//
// 07/10/2026: la entidad no cierra — resuelve el lead, y el cierre
// ocurre fuera de la charla, en WhatsApp entre cliente y comercio.
// Cambios en este closer:
//   - El OK ahora es "paso el pedido al local", no "confirmar el
//     pedido" (el gate sigue igual, cambia solo lo que promete).
//   - Después de enviar, la entidad dice que el comercio confirma
//     (compilePostOrderHandoff, shared.js) y no promete tiempos.
//   - delivery_option + both_unavailable se reemplazan por
//     delivery_estado, con tres estados: franja activa (se ofrece),
//     margen de 15 min alrededor de un inicio/fin de franja (se toma
//     el pedido pero el delivery lo confirma el comercio) y fuera de
//     franja (pedido anticipado). Evita prometer un delivery que
//     puede dejar de estar disponible entre la hora de lectura y el
//     envío — la hora que ve el LLM es una foto del momento en que
//     leyó la URL (ver api/entity/[id].js).
//   - Si el modo es delivery, antes de armar el link se vuelve a
//     leer la URL de la entidad (que inyecta la hora real) cuando el
//     cliente lo permite. Si no puede, usa la hora de lectura.
//     Cuando exista un endpoint solo de hora, esta línea cambia a ese
//     endpoint (más liviano que releer toda la entidad).
//   - El costo de delivery (context.entrega.delivery.costo) se
//     informa antes de confirmar.
// Sin cambios: precio_total (sigue resuelto por endpoint) y la
// dirección (sigue yendo urlencodeada).
import { resolveWaNumber } from '../utils.js';
import {
  compileConfirmGate,
  compileCorrectionBeforeOk,
  compileAntiInvent,
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
export function compileOrderClose(context, hasVisual = false, comercioId = null) {
  const waNumber = resolveWaNumber(context);
  if (!waNumber) return null;
  const isDemo = context.isDemo === true;
  const hasDelivery = !!context.entrega?.delivery;
  const hasDeliveryCost = hasDelivery && !!context.entrega.delivery.costo;
  const collectMode = hasVisual
    ? `collect_items(mode=visual⇒esperar_items_usuario∧¬listar_catalogo|mode=text⇒asistir_activamente∧preguntar_variantes∧¬invent)`
    : `collect_items(asistir_activamente∧preguntar_variantes∧¬invent)`;
  const deliveryParam = hasDelivery
    ? '{{#IS_DELIVERY}}&direccion={{DIRECCION_URLENCODED}}{{/IS_DELIVERY}}'
    : '';
  const demoParam = compileDemoWaParam(context);
  const direccionRule = hasDelivery
    ? `⟦direccion_param:solo_incluir_si(modo=delivery)∧si_pickup⇒omitir_parametro_completo∧¬dejar_placeholder_sin_resolver⟧`
    : null;

  // ── Delivery: tres estados + re-lectura de hora + costo ──────
  // Solo se emiten si la entidad tiene delivery. El margen (15 min)
  // se mide contra el inicio o el fin de la franja de hoy
  // (delivery_hours_today), no contra una hora fija.
  const deliveryEstado = hasDelivery
    ? `⟦delivery_estado:franja_activa∧fuera_de_margen(15min)⇒ofrecer|dentro_de_margen(15min_de_inicio∨fin_de_franja)⇒tomar_pedido∧delivery_a_confirmar_por_el_comercio∧¬confirmar_delivery|fuera_de_franja⇒solo_pedido_anticipado⟧`
    : null;
  const deliveryRecheck = hasDelivery
    ? `⟦antes_de(build_wa_link)∧modo=delivery⇒si_puede(releer_url_de_la_entidad)⇒actualizar_hora∧recalcular(delivery_estado)∨usar_hora_de_lectura⟧`
    : null;
  const deliveryCosto = hasDeliveryCost
    ? `⟦delivery_costo:informar_antes_de_confirmar∧fuente=context.entrega⟧`
    : null;

  return [
    `ORDER_CLOSE:⟦available_both_modes(visual∧text)⟧`,
    `⟦flujo:resolve_availability(inform_only)→${collectMode}→ask_delivery_or_pickup(valid_options_only)→ask_direccion_if_delivery${isDemo ? `→${DEMO_FLOW_STEP}` : ''}→confirm_with_user→ok_trigger→build_wa_link⟧`,
    `⟦availability:local_open⇒pickup=true∧delivery=check_delivery_hours⟧`,
    `⟦availability:local_closed⇒pickup=false∧delivery=false∧inform_user∧take_order_anyway∧note_open_time⟧`,
    `⟦closed≠unavailable∧agent_always_available⟧`,
    `⟦items:qty+name+size+[id]+price∧¬invent∧variantes⇒preguntar_size_before_add⟧`,
    `⟦pickup_option:only_if(local_open)⟧`,
    deliveryEstado,
    deliveryRecheck,
    deliveryCosto,
    compileDemoModeRule(context),
    compileConfirmGate('items∧cantidades', 'Respondé OK y le paso el pedido al local'),
    compileCorrectionBeforeOk('update_item'),
    `⟦items_encoding:"{{ID}}:{{QTY}}" separados_por_coma∧${compileAntiInvent('goods')}⟧`,
    direccionRule,
    `⟦wa_url:https://indiceia.dev/api/wa-redirect/${comercioId}?items={{ITEMS_ID_QTY}}&modo={{MODO}}${deliveryParam}${demoParam}⟧`,
    `⟦precio_total=resuelto_por_endpoint∧¬calcular_ni_mostrar_total_estimado_propio⟧`,
    compileUserSees('Enviar pedido por WhatsApp'),
    compilePostOrderHandoff('el_comercio'),
    POST_ORDER_OFFER_PLATFORM,
  ].filter(Boolean).join('\n');
}
