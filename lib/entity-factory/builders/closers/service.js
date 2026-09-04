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
import { resolveWaNumber } from '../utils.js';
import {
  compileConfirmGate,
  compileCorrectionBeforeOk,
  compileAntiInvent,
  MENSAJE_RESUELTO_POR_ENDPOINT,
  compileUserSees,
  POST_ORDER_OFFER_PLATFORM,
} from './shared.js';

export function compileServiceClose(context, comercioId) {
  const waNumber = resolveWaNumber(context);
  if (!waNumber) return null;

  const urgencias = context.atiende_urgencias === true
    ? '⟦urgencia:available_24hs∧inform_recargo_nocturno⟧'
    : null;

  const nombre = context.nombre || 'el prestador';

  return [
    'SERVICE_CLOSE:⟦flujo:resolve_availability(inform_only)→scope_service→qualify(zona∧modalidad)→quote(precio∨presupuesto_a_coordinar)→confirm_with_user→ok_trigger→build_service_link⟧',
    '⟦scope_service:identificar_servicio_from_services∧si_variantes⇒preguntar_variante∧si_usuario_pide_combo(N_servicios)⇒identificar_cada_uno_por_separado∧confirmar_cada_uno_contra_catalogo_real⟧',
    '⟦qualify:preguntar_zona∧preguntar_modalidad_if_multiple⟧',
    '⟦quote:precio_from_services∨¬precio⇒presupuesto_a_coordinar∧¬invent_price∧si_combo⇒sumar_precios_si_todos_tienen_precio∨alguno_sin_precio⇒presupuesto_a_coordinar_total⟧',
    urgencias,
    compileConfirmGate('servicio∧modalidad∧zona', 'Respondé OK para confirmar la consulta'),
    compileCorrectionBeforeOk('update_field'),
    `⟦fields_encoding:servicio={{SERVICIO_ID}}∨si_combo⇒servicio={{SERVICIO_ID_1}},{{SERVICIO_ID_2}},...(separados_por_coma_sin_espacios∧sin_urlencodear_la_coma)∧modalidad={{MODALIDAD}}∧zona={{ZONA_URLENCODED}}∧consulta={{CONSULTA_URLENCODED}}∧${compileAntiInvent('services')}∧¬poner_ids_de_servicio_en(zona∨consulta)⟧`,
    `⟦wa_url:https://indiceia.dev/api/service-redirect/${comercioId}?servicio={{SERVICIO_ID}}&modalidad={{MODALIDAD}}&zona={{ZONA_URLENCODED}}&consulta={{CONSULTA_URLENCODED}}∧si_combo⇒servicio={{SERVICIO_ID_1}},{{SERVICIO_ID_2}},...⟧`,
    MENSAJE_RESUELTO_POR_ENDPOINT,
    compileUserSees(`Contactar a ${nombre} por WhatsApp`),
    POST_ORDER_OFFER_PLATFORM,
  ].filter(Boolean).join('\n');
}
