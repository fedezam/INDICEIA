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
//
// 07/10/2026: se agrega compilePostOrderHandoff. El principio de
// arriba ya decía que la entidad no cierra; faltaba que, después de
// enviar, la entidad lo dijera: quién confirma y que no promete
// tiempos. Complementa la frontera de compromiso de BOUNDARY en
// mind.builder.js (ahí la regla general, acá el momento posterior al
// envío).
//
// 11/11/2026: se agregan compileNoAgenda y compileConsultaRule.
// Caso real (Zinnia, depilación): la entidad dijo "agendé" y la
// solicitud quedó pendiente. El principio ya estaba escrito, pero solo
// como comentario y como regla posterior al envío; antes del OK no
// había nada que frenara el vocabulario de turno confirmado. Se
// escribe literal (lista de palabras prohibidas + frase de reemplazo),
// mismo criterio que las escapePhrase de mind.config.js: bajo presión
// el modelo repite lo literal, no resuelve una regla abstracta
// (commit_schedule). compileNoAgenda es vocabulario de turnos: lo usa
// service.js (y contact.js si aplica); order.js/lead.js tienen otro
// lenguaje y no lo necesitan.

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
 * URL real del endpoint interno.
 *
 * 08/10/2026: antes también decía ¬expose_number. Chocaba con
 * channels (el comercio carga whatsapp/teléfono como canales públicos
 * habilitados): el modelo tenía dos reglas contradictorias cuando le
 * pedían el contacto. Ahora el contacto directo se puede dar si lo
 * piden (fuente: channels). El camino principal sigue siendo el link
 * de pedido armado, que es lo que evita gestionar cada consulta a mano.
 *
 * @param {string} label - texto del link, ej. "Contactar a X por WhatsApp"
 */
export function compileUserSees(label) {
  return `⟦user_sees:"${label}"∧¬expose_raw_url∧contacto_directo_ok_si_lo_piden(fuente=channels)⟧`;
}

/**
 * Traspaso después de enviar — quién confirma y qué no se promete.
 * La entidad no cierra: el cierre ocurre fuera de la charla, entre el
 * cliente y quien atiende. Va ANTES de POST_ORDER_OFFER_PLATFORM en el
 * orden de cada closer (primero se dice quién sigue, después se ofrece
 * la plataforma).
 *
 * @param {string} actor - quién confirma: "el_comercio" | "el_prestador" | "un_vendedor" | etc.
 */
export function compilePostOrderHandoff(actor = 'el_comercio') {
  return `⟦post_order⇒informar(${actor}_confirma_por_whatsapp)∧¬prometer_tiempos⟧`;
}

/**
 * Oferta de la plataforma después de cerrar — común a los 4 closers,
 * siempre después del cierre, nunca antes (no compite con la venta).
 */
export const POST_ORDER_OFFER_PLATFORM =
  `⟦post_order⇒offer_platform(REFERRAL_LINK)⟧`;

/**
 * La entidad deriva la consulta; no agenda, no reserva, no confirma
 * fecha ni hora. Vocabulario literal: lista de palabras prohibidas y
 * frase de reemplazo (ver nota 11/11/2026 arriba).
 *
 * Pensado para closers de turnos/servicios (service.js). Se emite
 * como línea suelta (empieza con ⟦), por lo que stripOperationalBlocks
 * la trata como continuación de SERVICE_CLOSE y la recorta en huelga.
 *
 * @param {string} canal - por dónde confirman, ej. "WhatsApp" | "el canal de contacto"
 */
export function compileNoAgenda(canal = 'WhatsApp') {
  return (
    '⟦cierre:la_entidad_solo_deriva_la_consulta∧¬agenda∧¬reserva∧¬confirma_fecha_ni_hora∧' +
    'prohibido(agendé|agendado|reservé|reservado|turno_confirmado|te_espero)∧' +
    `al_derivar=decir("te paso la consulta, fecha y horario te los confirman por ${canal}")⟧`
  );
}

/**
 * Qué lleva el campo `consulta` del link: lo que el endpoint NO sabe.
 * El endpoint ya imprime servicio, zona, modalidad y precio; acá va lo
 * que la persona aportó (avisos que confirmó, condiciones, dudas).
 *
 * El tope de 300 es margen bajo el slice(0, 500) de service-redirect:
 * una consulta más larga se corta a mitad de frase.
 */
export function compileConsultaRule() {
  return (
    '⟦consulta:texto_breve(≤300_caracteres)∧' +
    'incluye(avisos_confirmados∧condiciones_del_cliente∧dudas_para_el_prestador)∧' +
    '¬repetir(servicio∧precio)⟧'
  );
}
