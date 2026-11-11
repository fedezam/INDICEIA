import { resolveWaNumber } from '../utils.js';
import {
  compileConfirmGate, compileCorrectionBeforeOk, compileAntiInvent,
  MENSAJE_RESUELTO_POR_ENDPOINT, compileUserSees, compilePostOrderHandoff,
  POST_ORDER_OFFER_PLATFORM, compileNoAgenda, compileConsultaRule,
} from './shared.js';
import { DEMO_FLOW_STEP, compileDemoModeRule, compileDemoWaParam } from './demo.js';

const AVISOS =
  '⟦avisos:antes_del_resumen_mostrar(notas∨semantic_notes_que_sean_indicaciones_para_el_cliente)∧' +
  'pedir_que_confirme_que_las_conoce∧si_menciona(embarazo∨alergia∨piel_sensible∨tatuajes)⇒incluir_en_consulta⟧';

const DISP_RULE =
  '⟦servicio.disp=a_coordinar⇒SCHEDULE=horario_de_atencion_del_local∧¬es_disponibilidad_del_servicio∧fecha_y_horario_los_confirma_el_prestador⟧';

function compileSinWhatsApp() {
  return [
    'SERVICE_CLOSE:⟦sin_whatsapp⇒flujo:scope_service→quote→resumen_de_la_consulta→entregar_canal_de_contacto(fuente=channels)⟧',
    '⟦¬armar_link∧¬invent_contacto∧usar_solo(channels)⟧',
    compileNoAgenda('el canal de contacto'),
  ].join('\n');
}

export function compileServiceClose(context, entidadId) {
  const waNumber = resolveWaNumber(context);
  if (!waNumber) return compileSinWhatsApp();

  const isDemo    = context.isDemo === true;
  const demoParam = compileDemoWaParam(context);
  const nombre    = context.nombre || 'el prestador';

  const zonas     = context.ubicacion?.zona_cobertura;
  const soloLocal = context.ubicacion?.local_fisico === true
                    && !(Array.isArray(zonas) && zonas.length);

  const urgencias = context.atiende_urgencias === true
    ? '⟦urgencia:atiende_urgencias∧inform_recargo_nocturno∧disponibilidad_puntual_la_confirma_el_prestador⟧'
    : null;

  const qualify = soloLocal
    ? '⟦qualify:zona_del_cuerpo_o_area_solo_si_el_servicio_no_la_nombra∧¬preguntar_modalidad⟧'
    : '⟦qualify:preguntar_zona∧preguntar_modalidad_if_multiple⟧';
  const campos = soloLocal ? 'servicio∧zona∧avisos' : 'servicio∧modalidad∧zona';
  const modalidadEnc = soloLocal ? '' : '∧modalidad={{MODALIDAD}}';
  const modalidadUrl = soloLocal ? '' : '&modalidad={{MODALIDAD}}';

  return [
    `SERVICE_CLOSE:⟦flujo:scope_service→qualify→quote(precio∨presupuesto_a_coordinar)${isDemo ? `→${DEMO_FLOW_STEP}` : ''}→avisos→confirm_with_user→ok_trigger→build_service_link⟧`,
    '⟦scope_service:identificar_servicio_from_services∧si_variantes⇒preguntar_variante∧si_usuario_pide_combo(N_servicios)⇒identificar_cada_uno_por_separado∧confirmar_cada_uno_contra_catalogo_real⟧',
    qualify,
    '⟦quote:precio_from_services∨¬precio⇒presupuesto_a_coordinar∧¬invent_price∧si_combo⇒sumar_precios_si_todos_tienen_precio∨alguno_sin_precio⇒presupuesto_a_coordinar_total⟧',
    urgencias,
    compileDemoModeRule(context),
    AVISOS,
    DISP_RULE,
    compileConfirmGate(campos, 'Respondé OK y le paso la consulta al prestador'),
    compileCorrectionBeforeOk('update_field'),
    `⟦fields_encoding:servicio={{SERVICIO_ID}}∨si_combo⇒servicio={{SERVICIO_ID_1}},{{SERVICIO_ID_2}},...(separados_por_coma_sin_espacios∧sin_urlencodear_la_coma)${modalidadEnc}∧zona={{ZONA_URLENCODED}}(vacia_si_no_aplica)∧consulta={{CONSULTA_URLENCODED}}∧${compileAntiInvent('services')}∧¬poner_ids_de_servicio_en(zona∨consulta)⟧`,
    `⟦wa_url:https://indiceia.dev/api/service-redirect/${entidadId}?servicio={{SERVICIO_ID}}${modalidadUrl}&zona={{ZONA_URLENCODED}}&consulta={{CONSULTA_URLENCODED}}${demoParam}⟧`,
    MENSAJE_RESUELTO_POR_ENDPOINT,
    compileConsultaRule(),
    compileUserSees(`Contactar a ${nombre} por WhatsApp`),
    compilePostOrderHandoff('el_prestador'),
    compileNoAgenda(),
    POST_ORDER_OFFER_PLATFORM,
  ].filter(Boolean).join('\n');
}
