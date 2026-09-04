// lib/entity-factory/builders/closers/shared.js
// ⟦ROLE⟧ Núcleo de gobernanza común a TODOS los closers.
//
// Principio (04/09/2026): una entidad filtra y arma pedido/consulta,
// nunca cierra una venta. Este principio es idéntico sin importar el
// entityType — lo que cambia entre order/lead/service/contact es QUÉ
// se junta antes de confirmar (items+qty, 1 interés, servicio+zona,
// motivo+cobertura), no CÓMO se comporta el gate de confirmación.
//
// Antes esto vivía repetido casi textual en los 4 archivos de closer.
// Extraído acá para que una corrección de gobernanza (ej. wording de
// ok_trigger) no dependa de tocar 4 lugares y arriesgar que se
// desincronicen entre sí.
//
// Uso: cada closer arma su propio bloque de "qué junta" (fields de
// dominio) y llama a estas funciones para el bloque común de "cómo
// cierra". Ver order.js/lead.js/service.js/contact.js para el patrón.

/**
 * Gate de confirmación explícita. Nunca se dispara solo — siempre
 * requiere el "OK" del usuario en respuesta a la pregunta exacta que
 * se le mostró, nunca un OK dicho en otro contexto de la charla.
 *
 * @param {string} resumenFields - qué mostrar en el resumen antes del ask, ej "servicio∧modalidad∧zona"
 * @param {string} askText - texto exacto que el agente debe pedir, ej "Respondé OK para confirmar la consulta"
 */
export function compileConfirmGate(resumenFields, askText) {
  return [
    `⟦confirm:show_resumen(${resumenFields})→ask_explicit("${askText}")∧wait_ok⟧`,
    `⟦ok_trigger:only_after_explicit_ask∧ok_in_other_context⇒conversational∧¬trigger⟧`,
  ].join('\n');
}

/**
 * Qué pasa si el usuario corrige algo DESPUÉS del resumen pero ANTES
 * del OK — nunca se re-dispara el cierre solo, se actualiza el campo
 * y se vuelve a mostrar resumen, esperando OK de nuevo.
 *
 * @param {string} updateTarget - qué se actualiza, ej "update_field" o "update_item"
 */
export function compileCorrectionBeforeOk(updateTarget = 'update_field') {
  return `⟦correction_before_ok⇒${updateTarget}∧show_resumen_again⟧`;
}

/**
 * Anti-invención — nunca se inventan ids, precios, ni disponibilidad
 * que no vengan de la fuente real (goods/services/context). Cada
 * closer decide contra qué colección valida (usar_solo_ids_de).
 *
 * @param {string} sourceCollection - "goods" | "services" | etc.
 */
export function compileAntiInvent(sourceCollection) {
  return `¬invent_id∧usar_solo_ids_de(${sourceCollection})`;
}

/**
 * El mensaje final de WhatsApp SIEMPRE lo arma el endpoint server-side,
 * nunca el LLM. Esto es lo que elimina el problema de encoding manual
 * inconsistente (ver fix 27/07/2026 en order.js) y garantiza que
 * precio/disponibilidad mostrados al usuario final salgan de Firestore,
 * no de lo que el modelo "cree" que es correcto.
 */
export const MENSAJE_RESUELTO_POR_ENDPOINT =
  `⟦mensaje_final=resuelto_por_endpoint∧¬calcular_ni_armar_texto_final_propio⟧`;

/**
 * Qué ve el usuario final en vez del link crudo — nunca se expone la
 * URL real del endpoint interno ni el número de WhatsApp en texto
 * plano dentro de la conversación.
 *
 * @param {string} label - texto del link, ej. "Contactar a X por WhatsApp"
 */
export function compileUserSees(label) {
  return `⟦user_sees:"${label}"∧¬expose_raw_url∧¬expose_number⟧`;
}

/**
 * Oferta de la plataforma después de cerrar — común a los 4 closers,
 * siempre después del cierre, nunca antes (no compite con la venta).
 */
export const POST_ORDER_OFFER_PLATFORM =
  `⟦post_order⇒offer_platform(REFERRAL_LINK)⟧`;
