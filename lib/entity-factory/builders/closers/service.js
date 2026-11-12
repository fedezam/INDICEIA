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
//
// 11/11/2026 (caso real: Zinnia, depilación — la entidad dijo "agendé"
// y la solicitud quedó pendiente):
//   - compileNoAgenda (shared.js): vocabulario literal prohibido y
//     frase de reemplazo. Antes el principio "no cierra" estaba solo
//     como comentario y como regla posterior al envío.
//   - DISP_RULE: con disp=a_coordinar, SCHEDULE es el horario del
//     local, no la disponibilidad del servicio. El primer paso del
//     flujo era resolve_availability(inform_only), que no decía qué
//     informar y dejaba al modelo leer hours_today como turnos.
//   - soloLocal: prestador con local físico y sin zona de cobertura
//     (context.ubicacion). modalidad queda fija: no se pregunta, no
//     entra al gate ni a la URL (service-redirect la trata como
//     opcional). A domicilio queda igual que antes.
//   - combos: si existe un ítem combo que cubre lo pedido, se ofrece
//     ese ítem (es un descuento publicado) en vez de sumar ítems
//     sueltos; si pide parte de un combo, se menciona una sola vez.
//   - avisos: las notas del servicio (preparación previa, cómo o
//     cuándo se realiza) van dentro del resumen y el OK confirma que
//     las conoce; sin pregunta aparte, para no pasar el tope de
//     CALIFICAR (ver shapes/prestador.js).
//   - CUANDO_PUEDO_IR: si pregunta cuándo puede ir y el servicio
//     tiene nota de jornada o fecha puntual, se informa esa nota
//     primero y NO se listan los horarios del local como
//     disponibilidad.
//   - consulta: texto breve con lo que el endpoint no sabe.
//   - sin WhatsApp válido: ya no devuelve null (la entidad quedaba sin
//     closer); entrega el canal de contacto de channels.
//
// 12/11/2026 (zonas):
//   - La zona no es siempre algo que el cliente elige. Hay servicios
//     con zona fija (ej. uno que se aplica siempre en la misma
//     región del cuerpo, o una limpieza facial): preguntarla era
//     inventar un dato. La regla es general: si la descripción o las
//     notas del servicio dicen que la zona es fija o no aplica, no se
//     pregunta y zona va vacía. Cada comercio lo declara en la
//     descripción de su servicio; el closer no conoce ningún rubro.
//   - ZONA_CONSULTA: se quitó un ejemplo con un servicio concreto de
//     Zinnia. Este closer lo reciben todos los prestadores: nada
//     específico de un comercio va escrito acá.
//   - zona y consulta no repiten la lista de servicios (lo único
//     nuevo del mensaje a WhatsApp eran los datos que el endpoint no
//     conoce).
//   - gate: zona_si_aplica.
import { resolveWaNumber } from '../utils.js';
import {
  compileConfirmGate,
  compileCorrectionBeforeOk,
  compileAntiInvent,
  MENSAJE_RESUELTO_POR_ENDPOINT,
  compileUserSees,
  compilePostOrderHandoff,
  POST_ORDER_OFFER_PLATFORM,
  compileNoAgenda,
  compileConsultaRule,
} from './shared.js';
import {
  DEMO_FLOW_STEP,
  compileDemoModeRule,
  compileDemoWaParam,
} from './demo.js';

const SCOPE_SERVICE =
  '⟦scope_service:identificar_servicio_from_services∧si_variantes⇒preguntar_variante∧' +
  'si_existe_item_combo_que_cubra_exactamente_lo_pedido⇒ofrecer_ese_item_en_vez_de_sumar_items_sueltos(el_combo_es_un_descuento_publicado)∧' +
  'si_pide_parte_de_las_zonas_de_un_combo⇒mencionar_una_sola_vez_que_existe_el_combo_con_su_precio(ahorro=suma_de_precios_sueltos−precio_combo)∧¬insistir∧' +
  'si_no_existe_item_combo_y_pide_N_servicios⇒identificar_cada_uno_por_separado∧confirmar_cada_uno_contra_catalogo_real⟧';

const QUOTE =
  '⟦quote:precio_from_services∨¬precio⇒presupuesto_a_coordinar∧¬invent_price∧si_combo⇒sumar_precios_si_todos_tienen_precio∨alguno_sin_precio⇒presupuesto_a_coordinar_total⟧';

const AVISOS =
  '⟦avisos:incluir_en_el_resumen(todas_las_notas_del_servicio_que_describan_como_o_cuando_se_realiza_o_la_preparacion_previa(ej:jornadas_puntuales∨afeitado∨sol∨tatuajes))∧' +
  '¬incluir_etiquetas_de_busqueda∧el_OK_confirma_que_las_conoce∧¬pedir_confirmacion_aparte∧' +
  'si_menciona(embarazo∨alergia∨piel_sensible∨tatuajes)⇒incluir_en_consulta⟧';

const DISP_RULE =
  '⟦servicio.disp=a_coordinar⇒SCHEDULE=horario_de_atencion_del_local∧¬es_disponibilidad_del_servicio∧fecha_y_horario_los_confirma_el_prestador⟧';

const CUANDO_PUEDO_IR =
  '⟦si_pregunta_cuando_puede_ir∧el_servicio_tiene_nota_de_jornada_o_fecha_puntual⇒informar_esa_nota_primero∧¬listar_horarios_del_local_como_si_fueran_disponibilidad∧fecha_y_horario_los_confirma_el_prestador⟧';

const ZONA_CONSULTA =
  '⟦zona:completar_solo_si_el_cliente_la_elige_y_el_servicio_no_la_nombra∧' +
  'vacia_si_el_servicio_ya_la_nombra_o_tiene_zona_fija∧¬inventar_zona_que_no_figure_en_el_servicio∧' +
  '¬repetir_nombres_de_servicios_ni_precios∧' +
  'consulta=vacia_si_no_hay_avisos_condiciones_ni_dudas_que_agregar⟧';

// Sin WhatsApp válido: no se arma link. La entidad igual filtra y
// arma el resumen, y entrega el canal de contacto que el comercio
// cargó en channels (sin inventar ninguno).
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

  // Prestador que atiende solo en su local: sin zona de cobertura y
  // con local físico. Conservador: si tiene zona de cobertura, se
  // comporta como un prestador a domicilio.
  const zonas     = context.ubicacion?.zona_cobertura;
  const soloLocal = context.ubicacion?.local_fisico === true
                    && !(Array.isArray(zonas) && zonas.length);

  const urgencias = context.atiende_urgencias === true
    ? '⟦urgencia:atiende_urgencias∧inform_recargo_nocturno∧disponibilidad_puntual_la_confirma_el_prestador⟧'
    : null;

  const qualify = soloLocal
    ? '⟦qualify:preguntar_zona_solo_si_el_servicio_admite_elegirla∧si_la_descripcion_o_notas_dicen_que_la_zona_es_fija_o_no_aplica⇒¬preguntar_zona∧zona_vacia∧¬preguntar_modalidad⟧'
    : '⟦qualify:preguntar_zona∧preguntar_modalidad_if_multiple⟧';

  const gateFields   = soloLocal ? 'servicio∧zona_si_aplica∧avisos' : 'servicio∧modalidad∧zona∧avisos';
  const modalidadEnc = soloLocal ? '' : '∧modalidad={{MODALIDAD}}';
  const modalidadUrl = soloLocal ? '' : '&modalidad={{MODALIDAD}}';

  return [
    `SERVICE_CLOSE:⟦flujo:scope_service→qualify→quote(precio∨presupuesto_a_coordinar)${isDemo ? `→${DEMO_FLOW_STEP}` : ''}→confirm_con_resumen_y_avisos→ok_trigger→build_service_link⟧`,
    SCOPE_SERVICE,
    qualify,
    QUOTE,
    urgencias,
    compileDemoModeRule(context),
    AVISOS,
    DISP_RULE,
    CUANDO_PUEDO_IR,
    compileConfirmGate(gateFields, 'Respondé OK y le paso la consulta al prestador'),
    compileCorrectionBeforeOk('update_field'),
    `⟦fields_encoding:servicio={{SERVICIO_ID}}∨si_combo⇒servicio={{SERVICIO_ID_1}},{{SERVICIO_ID_2}},...(separados_por_coma_sin_espacios∧sin_urlencodear_la_coma)${modalidadEnc}∧zona={{ZONA_URLENCODED}}(vacia_si_no_aplica)∧consulta={{CONSULTA_URLENCODED}}∧${compileAntiInvent('services')}∧¬poner_ids_de_servicio_en(zona∨consulta)⟧`,
    `⟦wa_url:https://indiceia.dev/api/service-redirect/${entidadId}?servicio={{SERVICIO_ID}}${modalidadUrl}&zona={{ZONA_URLENCODED}}&consulta={{CONSULTA_URLENCODED}}${demoParam}⟧`,
    MENSAJE_RESUELTO_POR_ENDPOINT,
    compileConsultaRule(),
    ZONA_CONSULTA,
    compileUserSees(`Contactar a ${nombre} por WhatsApp`),
    compilePostOrderHandoff('el_prestador'),
    compileNoAgenda(),
    POST_ORDER_OFFER_PLATFORM,
  ].filter(Boolean).join('\n');
}
