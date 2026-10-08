// lib/entity-factory/builders/closers/service.js
// ⟦ROLE⟧ Closer SERVICE_CLOSE — prestador (servicios con zona,
// modalidad, presupuesto a coordinar). Extraído de mind.builder.js
// (19/08/2026).
//
// 04/09/2026: (a) fields_encoding/wa_url extendidos para combos
// multi-servicio (ver decisions.md). (b) refactor para usar el núcleo
// de gobernanza compartido de shared.js — el gate de confirmación,
// anti-invención y "resuelto por endpoint" ya no viven duplicados acá,
// solo lo específico de este closer (qué junta antes de cerrar).
//
// 08/09/2026: soporte demo agregado, vía closers/demo.js (compartido
// con order.js). Se detectó el hueco al migrar la entidad de prueba
// "Oscar Gonzáles" (prestador) a isDemo:true: SERVICE_CLOSE no pedía
// teléfono ni soportaba waDestino, a diferencia de ORDER_CLOSE — el
// mismo comportamiento demo ahora es compartido, no hay que repetirlo
// closer por closer nunca más. Ver lib/redirect/resolveDemoWaNumber.js
// para la validación real del lado server
// (api/service-redirect/[id].js).
//
// 07/10/2026: la entidad no cierra — resuelve el lead, y el cierre
// ocurre fuera de la charla, en WhatsApp entre cliente y prestador.
// Cambios en este closer:
//   - El OK ahora es "paso la consulta al prestador", no "confirmar
//     la consulta" (el gate sigue igual, cambia solo lo que promete).
//   - Después de enviar, la entidad dice que el prestador confirma
//     (compilePostOrderHandoff, shared.js) y no promete tiempos.
//   - urgencia: antes prometía "available_24hs". Ahora informa que
//     atiende urgencias, pero la disponibilidad puntual la confirma
//     el prestador (frontera de compromiso, ver BOUNDARY en
//     mind.builder.js).
//   - wa_url: se quitó la cola "∧si_combo⇒servicio=ID_1,ID_2,..."
//     que estaba escrita DENTRO de la línea de la URL y el LLM podía
//     copiar como parte del link. El formato de combo ya está
//     descrito en fields_encoding.
// Sin cambios: quote (sigue sumando combos), zona/consulta (siguen
// urlencodeados) y todo lo demás.
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

export function compileServiceClose(context, comercioId) {
  const waNumber = resolveWaNumber(context);
  if (!waNumber) return null;

  const isDemo = context.isDemo === true;
  const demoParam = compileDemoWaParam(context);

  const urgencias = context.atiende_urgencias === true
    ? '⟦urgencia:atiende_urgencias∧inform_recargo_nocturno∧disponibilidad_puntual_la_confirma_el_prestador⟧'
    : null;

  const nombre = context.nombre || 'el prestador';

  return [
    `SERVICE_CLOSE:⟦flujo:resolve_availability(inform_only)→scope_service→qualify(zona∧modalidad)→quote(precio∨presupuesto_a_coordinar)${isDemo ? `→${DEMO_FLOW_STEP}` : ''}→confirm_with_user→ok_trigger→build_service_link⟧`,
    '⟦scope_service:identificar_servicio_from_services∧si_variantes⇒preguntar_variante∧si_usuario_pide_combo(N_servicios)⇒identificar_cada_uno_por_separado∧confirmar_cada_uno_contra_catalogo_real⟧',
    '⟦qualify:preguntar_zona∧preguntar_modalidad_if_multiple⟧',
    '⟦quote:precio_from_services∨¬precio⇒presupuesto_a_coordinar∧¬invent_price∧si_combo⇒sumar_precios_si_todos_tienen_precio∨alguno_sin_precio⇒presupuesto_a_coordinar_total⟧',
    urgencias,
    compileDemoModeRule(context),
    compileConfirmGate('servicio∧modalidad∧zona', 'Respondé OK y le paso la consulta al prestador'),
    compileCorrectionBeforeOk('update_field'),
    `⟦fields_encoding:servicio={{SERVICIO_ID}}∨si_combo⇒servicio={{SERVICIO_ID_1}},{{SERVICIO_ID_2}},...(separados_por_coma_sin_espacios∧sin_urlencodear_la_coma)∧modalidad={{MODALIDAD}}∧zona={{ZONA_URLENCODED}}∧consulta={{CONSULTA_URLENCODED}}∧${compileAntiInvent('services')}∧¬poner_ids_de_servicio_en(zona∨consulta)⟧`,
    `⟦wa_url:https://indiceia.dev/api/service-redirect/${comercioId}?servicio={{SERVICIO_ID}}&modalidad={{MODALIDAD}}&zona={{ZONA_URLENCODED}}&consulta={{CONSULTA_URLENCODED}}${demoParam}⟧`,
    MENSAJE_RESUELTO_POR_ENDPOINT,
    compileUserSees(`Contactar a ${nombre} por WhatsApp`),
    compilePostOrderHandoff('el_prestador'),
    POST_ORDER_OFFER_PLATFORM,
  ].filter(Boolean).join('\n');
}
