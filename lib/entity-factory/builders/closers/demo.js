// lib/entity-factory/builders/closers/demo.js
// ⟦ROLE⟧ Fragmentos LER compartidos para el modo demo, consumidos por
// CUALQUIER closer que arme un link de WhatsApp hacia un endpoint
// *-redirect (order, service, contact, y los que vengan).
//
// Por qué existe (08/09/2026): el patrón "pedir teléfono antes de
// cerrar + agregar waDestino al link" se escribió primero en
// closers/order.js. Al sumar el mismo comportamiento a
// closers/service.js quedó claro que esto iba a repetirse en cada
// entityType nuevo — mejor un solo lugar que N copias divergiendo con
// el tiempo. Ver lib/redirect/resolveDemoWaNumber.js para la mitad
// server-side de este mismo contrato (el waDestino que este módulo le
// pide al LLM que arme, ahí es donde se valida en serio).
//
// 13/10/2026: contact.js pasa a consumir este módulo (antes quedaba
// fuera). Además, el saludo de las demos (mind.config.js → demoConfig)
// ya le pide al usuario un número de WhatsApp en el primer turno. Por
// eso la regla demo_mode ahora dice "usar el número que dio el
// usuario al inicio" y pide el teléfono solo si todavía falta, para
// no preguntarlo dos veces. DEMO_FLOW_STEP conserva su nombre para no
// tocar order.js ni service.js.
//
// CONTRATO entre esta mitad (LER) y la otra (server):
//   - Placeholder siempre se llama {{WA_DESTINO}}.
//   - El query param en el wa_url siempre se llama waDestino.
//   - El endpoint SIEMPRE valida isDemo de Firestore antes de
//     respetar waDestino — este módulo solo le da al LLM la
//     instrucción de armarlo, nunca es la validación real.

// ── Token de flujo a insertar en la secuencia del closer, en el
//    punto donde corresponda tener el teléfono (justo antes de
//    confirm_with_user, distinto lugar según closer) ──
export const DEMO_FLOW_STEP = 'ask_telefono_destino';

// ── Regla explícita que le dice al LLM qué hacer con ese teléfono ──
export function compileDemoModeRule(context) {
  if (context.isDemo !== true) return null;
  return '⟦demo_mode:telefono_destino=el_que_dio_el_usuario_al_inicio∧si_falta⇒pedirlo_antes_de(build_link)∧usar_en(WA_DESTINO)∧aclarar_que_es_una_prueba∧¬asumir_numero⟧';
}

// ── Parámetro a concatenar al wa_url del closer, condicional a isDemo ──
export function compileDemoWaParam(context) {
  return context.isDemo === true ? '&waDestino={{WA_DESTINO}}' : '';
}
