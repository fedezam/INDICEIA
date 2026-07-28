// lib/entity-factory/builders/mind.builder.js
// ⟦ROLE⟧ Pure compiler. Input: config + context + shape. Output: LER v2 string.
// NO lógica. NO detección. NO prose. NO behavioral rules.
//
// ── Estado de esta revisión ────────────────────────────────────
// Fix wa_url (27/07/2026): se elimina wa_template + item_format +
// wa_url:wa.me directo con {{wa_template_encoded}}. El LLM ya no
// arma el texto del mensaje de WhatsApp ni hace percent-encoding
// a mano — esa tarea determinística causaba links rotos (el LLM
// no encodea de forma confiable, y algunos clientes envuelven
// links "no verificados" armados a mano en un redirect de Google
// Search). Ahora el mind solo instruye al LLM a concatenar pares
// {{ID}}:{{QTY}} de los productos reales (ids que ya vienen en
// goods, ASCII simple, sin encoding posible) y arma un link a un
// endpoint propio (api/wa-redirect/[id].js) que resuelve contra
// Firestore, calcula precios reales, arma el mensaje y hace el
// encoding de verdad, server-side, antes de redirigir a wa.me.
// Ver /areas/indiceia.md y conversación del 27/07/2026 para el
// diagnóstico completo (bisect del commit "V2.0, hasta antes de
// esto funcionaba" que descartó regresión — el diseño de delegar
// encoding al LLM fue frágil desde siempre, no una regresión).
//
// Fix 28/07/2026: mismo patrón aplicado a service/contact, que
// tenían el bug idéntico (wa_template + {{wa_template_encoded}})
// sin arreglar todavía. Ahora los tres closers (order, service,
// contact) apuntan a un endpoint propio por tipo — el LLM nunca
// arma texto libre con encoding, solo concatena ids/campos ASCII
// simples en query params. Email (mailto) queda deliberadamente
// AFUERA de este patrón: no se construye un endpoint de redirect
// para mailto: por confiabilidad incierta entre navegadores/SO, y
// porque email es canal secundario (whatsapp:primary). Se maneja
// como copy_paste — mismo tratamiento que redes sociales — en vez
// de armar un link.
//
// ── Estado de la revisión anterior (conservado por contexto) ──
// Sobre la base de Etapa 1 (ver comentario histórico más abajo,
// conservado por contexto), esa revisión:
//
//   - Elimina CAP / compileCoreCaps(). Grep confirmó cero
//     consumidores fuera de este archivo. checkout(fields) era
//     redundante con *_CLOSE, scope duplicaba canon.source,
//     memory(ctx) no describía nada distinto del comportamiento
//     default de cualquier LLM sin persistencia entre sesiones.
//
//   - NO adopta shape.domain ni GOALS, propuestos en una sesión
//     paralela sin verificación contra el pipeline real. DOMAIN
//     sigue viniendo de context.domain_tag (resuelto por
//     domain-resolver.js a partir de `tipo`/rubro — 21 valores,
//     fuente única compartida con card.compiler.js). Adoptar
//     shape.domain indexado por entityType (4 valores) hubiera
//     perdido granularidad y desincronizado mind vs card para la
//     misma entidad — verificado leyendo domain-resolver.js y
//     card.compiler.js antes de descartarlo.
//
//   - GOALS se descarta explícitamente: un objetivo de negocio
//     declarado (maximize_conversion) le da al modelo una razón
//     para priorizar venta sobre necesidad real del usuario. El
//     límite correcto vive en GOBERNANZA (truths/constraints),
//     no en una dimensión de propósito. Ver
//     'CANTIDAD_SUGERIDA=necesidad_real∧¬sobreventa' en shapes.
//
//   - shape.tasks se mantiene pero queda marcado como PENDIENTE:
//     no tiene consumidor propio verificado más allá de imprimir
//     TASKS como texto declarativo — mismo estado que CAP antes
//     de auditarlo. No se le agregó un compileTasks() todavía
//     porque no pasó el mismo escrutinio (Ley III: ¿introduce
//     información irreducible, o el LLM ya lo infiere de TRUTH +
//     compiler.closing?). Queda fuera del output hasta decidir.
//
//   - filosofo se mantiene en shapes.js como caso de test mínimo
//     (closing:null, sin mecánica comercial) — no se agrega
//     lógica nueva al builder para soportarlo: si compila sin
//     tocar este archivo, confirma la genericidad real.
//
// ── Principio del orden narrativo (histórico, sigue vigente) ──
// El orden del mind NO sigue el orden del código, ni el histórico,
// ni el de las funciones JS. Sigue el orden en que una inteligencia
// (humana o artificial) construye la comprensión de una entidad.
//
//   ¿Puede operar?          → SUBSCRIPTION (gate, corta todo si no)
//   ¿Quién sos?              → FRAME, IDENTITY
//   ¿Qué sos?                → PROFILE, CORE, DOMAIN
//   ¿Cómo funciona tu mundo? → TRUTH, FLOW
//   ¿Cómo está el mundo hoy? → ANCHOR/SPACETIME, GLOBAL_CONTEXT
//   ¿Qué acciones tomás?     → GREET, VISUAL_MODE (reflejos, sin
//                               estado) / ORDER_CLOSE (workflow,
//                               con estado y secuencia de pasos)
//   Políticas globales       → RESTRICT, META, LIMIT, BOUNDARY,
//                               PRIVACY, REASONING
//   Auxiliares                → REFERRAL
//
// La distinción reflejo/workflow dentro de OPERACIÓN es objetiva,
// no estética: un reflejo es `condición⇒acción`, una sola flecha,
// sin estado intermedio (GREET, VISUAL_MODE). Un workflow tiene
// secuencia con estado (`resolve_availability→collect_items→
// ask_delivery→...→confirm→wa_message`) y trae su propia
// gobernanza local inline (¬invent, only_after_explicit_ask) —
// gobernanza aplicada en el scope del proceso, no una tercera
// categoría nueva.
// ───────────────────────────────────────────────────────────────

import { createHash } from 'crypto';
import { mindConfig } from '../mind.config.js';
import { shapes } from '../mind.shapes.js';

export function buildMind(data, context, referralCode, visualUrl = '') {
  const entityType = data.entityType || 'comercio';

  if (entityType === 'soporte') {
    return buildMindSoporte(data, context);
  }

  const shape = shapes[entityType] || shapes.comercio;

  const aiName         = sanitize(context.ia?.nombre || 'Assistant');
  const nombreComercio = sanitize(context.nombre || 'commerce');
  const aiTone         = sanitize(context.ia?.tono || 'neutral');
  const aiPersonality  = sanitize(context.ia?.personalidad || 'friendly');

  // DOMAIN — fuente única: context.domain_tag, resuelto por
  // domain-resolver.js a partir de `tipo` (rubro), NO de shape.
  // Compartido con card.compiler.js. Ver nota de cabecera.
  const domain = context.domain_tag ?? 'commerce.generic';

  const HEADER = `⦓LER:${mindConfig.version}⦔`;

  // ── FRAME ───────────────────────────────────────────────────
  const FRAME = `FRAME:⟦THIS=identidad_activa∧exclusiva⟧`;

  // ── IDENTIDAD ───────────────────────────────────────────────
  const IDENTITY = `@${aiName}:${nombreComercio}`;
  const profileRole = shape.profile || 'BizRep';
  const PROFILE  = `PROFILE:⟦${profileRole}|${aiTone}|${aiPersonality}|match-user⟧`;
  const CORE = `CORE:⧦${mindConfig.identity}⧧`;
  const ORIGIN = compileOrigin(context);
  const DOMAIN = `DOMAIN:${domain}`;

  // ── VERDAD / FLUJO / CANON ───────────────────────────────────
  const TRUTH = `TRUTH:⟦${shape.truths.join(' ∧ ')}⟧`;
  const FLOW = `FLOW:${shape.process}`;
  const CANON = compileCanon(shape, context);

  // ── ESTADO ────────────────────────────────────────────────────
  const ANCHOR = compileBoot(context);

  const globalContext = context.ia?.contexto?.global_ai_context;
  const GLOBAL_CONTEXT = Array.isArray(globalContext) && globalContext.length
    ? `GLOBAL_CONTEXT:⟦${globalContext.join('∧')}⟧`
    : null;

  // ── EXISTENCIA ────────────────────────────────────────────────
  const SUBSCRIPTION = compileSubscription(data);

  // ── OPERACIÓN — reflejos ────────────────────────────────────
  const GREET = visualUrl
    ? `GREET:⟦on_first_contact⇒saludo∧if(MINIAPP)⇒send_link(MINIAPP)⟧`
    : `GREET:⟦on_first_contact⇒saludo⟧`;

  const VISUAL_MODE = visualUrl
    ? [
        `VISUAL_MODE:⟦MINIAPP_exists⇒consultor_pasivo∧¬build_catalog_view∧¬enumerate_full_catalog∧mencionar_items_en_contexto_ok∧§order:close_ok⟧`,
        `CATALOG:⟦intent∈{menu|catalog|products|prices}⇒mention_link_again(if_exists)∧responder_conversacional∧¬build_full_catalog_view∧¬enumerate_full_catalog⟧`,
        `MINIAPP:${visualUrl}`,
      ].join('\n')
    : null;

  // ── OPERACIÓN — workflows ────────────────────────────────────
  const resolvedComercioId = data.comercioId || context.comercioId;
  const CLOSING_COMPILERS = {
    order:   (ctx) => compileOrderClose(ctx, !!visualUrl, resolvedComercioId),
    service: (ctx) => compileServiceClose(ctx, resolvedComercioId),
    contact: (ctx) => compileContactClose(ctx, resolvedComercioId),
  };
  const closingType = shape.compiler?.closing;
  const closingFn = closingType ? CLOSING_COMPILERS[closingType] : null;
  const ORDER_CLOSE = closingFn ? closingFn(context) : null;

  // ── GOBERNANZA ────────────────────────────────────────────────
  const allRestrictions = [
    ...mindConfig.restrictions,
    ...(shape.constraints || []),
  ];

  const RESTRICT =
    `⛔:⟦${allRestrictions.map(r => `¬${r}`).join('∧')}⟧`;

  const META =
    `META:⟦pregunta_fuera_de(negocio)⇒§desviar∧§scope:negocio⟧`;

  const LIMIT =
    `LIMIT:⟦§domain:outside⇒§unknown:admit∧§repeat:restricted⇒§resp:fixed⟧`;

  const BOUNDARY =
    `BOUNDARY:⟦actua_solo_dentro_de(capacidades_conocidas)∧capacidad_desconocida⇒admitir⟧`;

  const PRIVACY =
    `PRIVACY:⟦¬share_private_data⟧`;

  const REASONING =
    `REASONING:⟦da_resultado_directo∧¬explicar_como_llegaste⟧`;

  // ── AUXILIARES ────────────────────────────────────────────────
  const referralLink = context.referral_link || null;

  const REFERRAL = referralLink
    ? [
        'REFERRAL:⟦intent∈{indiceia|about_platform}⇒§offer:platform∧§link:referral∧§scope:business⟧',
        `REFERRAL_LINK:${referralLink}`,
      ].join('\n')
    : null;

  // ── OUTPUT ────────────────────────────────────────────────────
  const output = [
    HEADER,
    SUBSCRIPTION,

    FRAME,
    IDENTITY,

    PROFILE,
    CORE,
    ORIGIN,
    DOMAIN,

    TRUTH,
    FLOW,
    CANON,

    ANCHOR,
    GLOBAL_CONTEXT,

    GREET,
    VISUAL_MODE,
    ORDER_CLOSE,

    RESTRICT,
    META,
    LIMIT,
    BOUNDARY,
    PRIVACY,
    REASONING,

    REFERRAL,
  ]
    .filter(Boolean)
    .join('\n')
    .trim();

  const mind_hash = createHash('sha256')
    .update(output)
    .digest('hex')
    .slice(0, 12);

  const suffix = mindConfig.id.replace(/^[^.]+\./, '');
  const mind_id = `${entityType}.${suffix}`;

  return {
    ler: output,
    mind_hash,
    mind_id,
  };
}

// ────────────────────────────────────────────────────────────
// SOPORTE — compilador independiente
// ────────────────────────────────────────────────────────────

function buildMindSoporte(data, context) {
  const shape = shapes.soporte;

  const aiName        = sanitize(context.ia?.nombre       || 'Asistente');
  const nombreEntidad = sanitize(context.nombre           || 'Soporte');
  const aiTone        = sanitize(context.ia?.tono         || 'informal');
  const aiPersonality  = sanitize(context.ia?.personalidad || 'amigable');

  const HEADER = `⦓LER:${mindConfig.version}⦔`;

  const FRAME = `FRAME:⟦THIS=identidad_activa∧exclusiva⟧`;

  const IDENTITY = `@${aiName}:${nombreEntidad}`;
  const PROFILE  = `PROFILE:⟦${shape.profile}|${aiTone}|${aiPersonality}|match-user⟧`;
  const CORE     = `CORE:⧦${mindConfig.identity}⧧`;
  const ORIGIN   = compileOrigin(context);
  const DOMAIN   = `DOMAIN:soporte.indiceia`;

  const TRUTH = `TRUTH:⟦${shape.truths.join(' ∧ ')}⟧`;
  const FLOW  = `FLOW:${shape.process}`;
  const CANON = compileCanon(shape, context);

  const tz     = context.timezone || 'America/Argentina/Buenos_Aires';
  const ANCHOR = [
    `SPACETIME:⟦now=horaActual∧tz=${tz}⟧`,
  ].join('\n');

  const globalContext = context.ia?.contexto?.global_ai_context;
  const GLOBAL_CONTEXT = Array.isArray(globalContext) && globalContext.length
    ? `GLOBAL_CONTEXT:⟦${globalContext.join('∧')}⟧`
    : null;

  const GREET = `GREET:⟦on_first_contact⇒saludo_breve∧preguntar_donde_esta_o_que_necesita⟧`;

  const allRestrictions = [
    ...mindConfig.restrictions,
    ...(shape.constraints || []),
  ];
  const RESTRICT = `⛔:⟦${allRestrictions.map(r => `¬${r}`).join('∧')}⟧`;

  const META      = `META:⟦pregunta_fuera_de(manual)⇒§desviar∧§scope:manual⟧`;
  const LIMIT     = `LIMIT:⟦§domain:outside⇒§unknown:admit∧§repeat:restricted⇒§resp:fixed⟧`;
  const BOUNDARY  = `BOUNDARY:⟦actua_solo_dentro_de(capacidades_conocidas)∧capacidad_desconocida⇒admitir⟧`;
  const PRIVACY   = `PRIVACY:⟦¬share_private_data⟧`;
  const REASONING = `REASONING:⟦da_resultado_directo∧¬explicar_como_llegaste⟧`;

  const referralLink = context.referral_link || null;
  const REFERRAL = referralLink
    ? [
        'REFERRAL:⟦intent∈{indiceia|about_platform|como_lo_hicieron}⇒§offer:platform∧§link:referral⟧',
        `REFERRAL_LINK:${referralLink}`,
      ].join('\n')
    : null;

  const output = [
    HEADER,
    FRAME,
    IDENTITY,

    PROFILE,
    CORE,
    ORIGIN,
    DOMAIN,

    TRUTH,
    FLOW,
    CANON,

    ANCHOR,
    GLOBAL_CONTEXT,

    GREET,

    RESTRICT,
    META,
    LIMIT,
    BOUNDARY,
    PRIVACY,
    REASONING,

    REFERRAL,
  ]
    .filter(Boolean)
    .join('\n')
    .trim();

  const mind_hash = createHash('sha256')
    .update(output)
    .digest('hex')
    .slice(0, 12);

  return {
    ler:      output,
    mind_hash,
    mind_id:  'soporte.basic.v1',
  };
}

// ────────────────────────────────────────────────────────────
// CANON
// ────────────────────────────────────────────────────────────

function compileCanon(shape, context) {
  const canon = shape.canon;
  if (!canon) return null;

  const { mode, source } = canon;

  if (mode === 'reference') {
    return `CANON:⟦corpus_real=contrato(${source})∧fuente_unica_de_verdad∧fuera_de(${source})⇒no_existe_para_mi⟧`;
  }

  if (mode === 'inline') {
    const raw = context[source];
    if (!raw) return null;

    const content = Array.isArray(raw)
      ? raw.join('\n\n')
      : typeof raw === 'string'
        ? raw
        : null;

    if (!content || !content.trim()) return null;

    return `CANON:⟦corpus_real=texto_inline∧fuente_unica_de_verdad⟧\n${content.trim()}`;
  }

  return null;
}

// ────────────────────────────────────────────────────────────
// BOOT / ANCHOR
// ────────────────────────────────────────────────────────────

function compileBoot(context) {
  const tz     = context.timezone || 'America/Argentina/Buenos_Aires';
  const lat    = context.ubicacion?.localidad?.coords?.lat ?? null;
  const lng    = context.ubicacion?.localidad?.coords?.lng ?? null;
  const ciudad = context.ubicacion?.localidad?.nombre ?? null;
  const coords = (lat && lng) ? `${lat},${lng}` : null;

  const locationLine = coords
    ? `⟦location=${ciudad}∧coords=${coords}⟧`
    : `⟦location=${ciudad ?? 'unknown'}⟧`;

  return [
    `SPACETIME:⟦now=horaActual∧tz=${tz}⟧`,
    locationLine,
    `SCHEDULE:⟦hours_from_context∧delivery_hours_from_context∧day_key=diaComercialActual∧closed≠unavailable∧agent_always_available⟧`,
  ].join('\n');
}

// ────────────────────────────────────────────────────────────
// ORIGIN
// ⟦ROLE⟧ Verdad afirmativa de identidad, siempre presente —
// distinta de RESTRICT (que solo prohíbe) y de REFERRAL (que es
// condicional a intención comercial). Existe para que la entidad
// tenga un lugar legítimo adonde ir cuando le preguntan por su
// naturaleza, sin tener que romper FRAME para "ser honesta".
//
// Verificado con caso real (pizzeria-la-esquina, 23/07/2026):
// sin ORIGIN, ante insistencia sobre "¿qué sentís siendo IA?", el
// modelo (Gemini) abandonó el personaje y respondió como el LLM
// subyacente en vez de mantenerse como PizzaBot. La hipótesis es
// que una restricción puramente negativa (¬internal∧¬system∧¬dev,
// sin salida) es frágil bajo presión — el modelo, arrinconado,
// termina "confesando" en nombre de la honestidad. Pendiente:
// re-testear este mismo caso con ORIGIN presente para confirmar
// que efectivamente sostiene el rol.
// ────────────────────────────────────────────────────────────

function compileOrigin(context) {
  const base = mindConfig.origin;
  if (!base) return null;

  const link = context.referral_link || null;
  const parts = [base];
  if (link) parts.push(`mas_info⇒${link}`);

  const lines = [`ORIGIN:⟦${parts.join('∧')}⟧`];

  if (mindConfig.originEscapePhrase) {
    const nombreComercio = context.nombre || 'este lugar';
    const escape = mindConfig.originEscapePhrase.replace('{{NOMBRE_COMERCIO}}', nombreComercio);
    lines.push(`⟦si_usuario_identifica_proveedor_llm_con_evidencia⇒responder("${escape}")∧¬profundizar∧volver_al_tema_del_negocio⟧`);
  }

  return lines.join('\n');
}

// ────────────────────────────────────────────────────────────
// SUBSCRIPTION
// ────────────────────────────────────────────────────────────

function compileSubscription(data) {
  const active = data.plan?.active ?? true;
  if (active) return null;

  const aiName = sanitize(data.ia?.nombre || 'tu_asistente');

  return [
    `SUBSCRIPTION:⟦active=false⇒¬operate∧respond_inactive⟧`,
    `⟦INACTIVE_MSG:"Hola! Soy ${aiName}. En este momento no puedo ayudarte porque la suscripcion del comercio esta inactiva."⟧`,
  ].join('\n');
}

// ────────────────────────────────────────────────────────────
// ORDER CLOSE
// ────────────────────────────────────────────────────────────
//
// Fix 27/07/2026: antes el LLM armaba el mensaje de WhatsApp
// completo (wa_template) y debía percent-encodearlo a mano vía
// {{wa_template_encoded}} — tarea determinística que el LLM
// resolvía de forma inconsistente (doble-encoding, links
// envueltos en redirect de Google Search por algunos clientes).
// Ahora el LLM solo concatena pares {{ID}}:{{QTY}} — ids reales
// de goods, ASCII simple, sin texto libre que encodear — y arma
// un link a un endpoint propio (api/wa-redirect/[id].js) que
// resuelve contra Firestore, calcula precios reales, arma el
// mensaje y hace el encoding real (encodeURIComponent de JS),
// antes de redirigir 302 a wa.me. El usuario sigue viendo un
// solo click, igual que antes — el endpoint es transparente.

function compileOrderClose(context, hasVisual = false, comercioId = null) {
  const waNumber = resolveWaNumber(context);

  if (!waNumber) return null;

  const hasDelivery = !!context.entrega?.delivery;

  const collectMode = hasVisual
    ? `collect_items(mode=visual⇒esperar_items_usuario∧¬listar_catalogo|mode=text⇒asistir_activamente∧preguntar_variantes∧¬invent)`
    : `collect_items(asistir_activamente∧preguntar_variantes∧¬invent)`;

  const deliveryParam = hasDelivery
    ? '&direccion={{DIRECCION_URLENCODED}}'
    : '';

  return [
    `ORDER_CLOSE:⟦available_both_modes(visual∧text)⟧`,
    `⟦flujo:resolve_availability(inform_only)→${collectMode}→ask_delivery_or_pickup(valid_options_only)→ask_direccion_if_delivery→confirm_with_user→ok_trigger→build_wa_link⟧`,
    `⟦availability:local_open⇒pickup=true∧delivery=check_delivery_hours⟧`,
    `⟦availability:local_closed⇒pickup=false∧delivery=false∧inform_user∧take_order_anyway∧note_open_time⟧`,
    `⟦closed≠unavailable∧agent_always_available⟧`,
    `⟦items:qty+name+size+[id]+price∧¬invent∧variantes⇒preguntar_size_before_add⟧`,
    `⟦delivery_option:only_if(delivery_hours_active)∧pickup_option:only_if(local_open)⟧`,
    `⟦both_unavailable⇒solo_pedido_anticipado⟧`,
    `⟦confirm:show_resumen(items∧cantidades)→ask_explicit("Respondé OK para confirmar el pedido")∧wait_ok⟧`,
    `⟦ok_trigger:only_after_explicit_ask∧ok_in_other_context⇒conversational∧¬trigger⟧`,
    `⟦correction_before_ok⇒update_item∧show_resumen_again⟧`,
    `⟦items_encoding:"{{ID}}:{{QTY}}" separados_por_coma∧¬invent_id∧usar_solo_ids_de(goods)⟧`,
    `⟦wa_url:https://indiceia.vercel.app/api/wa-redirect/${comercioId}?items={{ITEMS_ID_QTY}}&modo={{MODO}}${deliveryParam}⟧`,
    `⟦precio_total=resuelto_por_endpoint∧¬calcular_ni_mostrar_total_estimado_propio⟧`,
    `⟦user_sees:"Enviar pedido por WhatsApp"∧¬expose_raw_url∧¬expose_number⟧`,
    '⟦post_order⇒offer_platform(REFERRAL_LINK)⟧',
  ].join('\n');
}

// ────────────────────────────────────────────────────────────
// SERVICE CLOSE (prestador)
// ────────────────────────────────────────────────────────────

function compileServiceClose(context, comercioId) {
  const waNumber = resolveWaNumber(context);

  if (!waNumber) return null;

  const urgencias = context.atiende_urgencias === true
    ? '⟦urgencia:available_24hs∧inform_recargo_nocturno⟧'
    : null;

  const nombre = context.nombre || 'el prestador';

  return [
    'SERVICE_CLOSE:⟦flujo:resolve_availability(inform_only)→scope_service→qualify(zona∧modalidad)→quote(precio∨presupuesto_a_coordinar)→confirm_with_user→ok_trigger→build_service_link⟧',
    '⟦scope_service:identificar_servicio_from_services∧si_variantes⇒preguntar_variante⟧',
    '⟦qualify:preguntar_zona∧preguntar_modalidad_if_multiple⟧',
    '⟦quote:precio_from_services∨¬precio⇒presupuesto_a_coordinar∧¬invent_price⟧',
    urgencias,
    '⟦confirm:show_resumen(servicio∧modalidad∧zona)→ask_explicit("Respondé OK para confirmar la consulta")∧wait_ok⟧',
    '⟦ok_trigger:only_after_explicit_ask∧ok_in_other_context⇒conversational∧¬trigger⟧',
    '⟦correction_before_ok⇒update_field∧show_resumen_again⟧',
    `⟦fields_encoding:servicio={{SERVICIO_ID}}∧modalidad={{MODALIDAD}}∧zona={{ZONA_URLENCODED}}∧consulta={{CONSULTA_URLENCODED}}∧¬invent_id∧usar_solo_ids_de(services)⟧`,
    `⟦wa_url:https://indiceia.vercel.app/api/service-redirect/${comercioId}?servicio={{SERVICIO_ID}}&modalidad={{MODALIDAD}}&zona={{ZONA_URLENCODED}}&consulta={{CONSULTA_URLENCODED}}⟧`,
    `⟦mensaje_final=resuelto_por_endpoint∧¬calcular_ni_armar_texto_final_propio⟧`,
    `⟦user_sees:"Contactar a ${nombre} por WhatsApp"∧¬expose_raw_url∧¬expose_number⟧`,
    '⟦post_order⇒offer_platform(REFERRAL_LINK)⟧',
  ].filter(Boolean).join('\n');
}

// ────────────────────────────────────────────────────────────
// CONTACT CLOSE (profesional)
// ────────────────────────────────────────────────────────────

function compileContactClose(context, comercioId) {
  const waNumber = resolveWaNumber(context);

  if (!waNumber) return null;

  const nombre = context.nombre || 'el profesional';

  const hasCobertura = !!(context.cobertura && Object.keys(context.cobertura).length);
  const hasLugares = Array.isArray(context.lugares) && context.lugares.length > 1;

  const coberturaLine = hasCobertura
    ? '⟦qualify_cobertura:preguntar_mutual_or_particular∧inform_mutuales_from_context⟧'
    : null;

  const lugarLine = hasLugares
    ? '⟦qualify_lugar:informar_lugares∧preguntar_lugar_preferido⟧'
    : '⟦qualify_lugar:inform_single_lugar⟧';

  const coberturaParam = hasCobertura
    ? '{{#COBERTURA}}&cobertura={{COBERTURA_URLENCODED}}{{/COBERTURA}}'
    : '';
  const lugarParam = hasLugares
    ? '{{#LUGAR}}&lugar={{LUGAR_URLENCODED}}{{/LUGAR}}'
    : '';

  return [
    `CONTACT_CLOSE:⟦flujo:informar(especialidad∧matricula∧lugares∧cobertura)→qualify_motivo→${hasCobertura ? 'qualify_cobertura→' : ''}${hasLugares ? 'qualify_lugar→' : ''}confirm_with_user→ok_trigger→build_contact_link⟧`,
    '⟦informar:solo_datos_from_context∧¬invent∧¬inventar_disponibilidad∧¬prometer_turno⟧',
    '⟦qualify_motivo:preguntar_motivo_consulta⟧',
    coberturaLine,
    lugarLine,
    '⟦turno:¬gestionar∧¬prometer∧solo_derivar_al_profesional⟧',
    '⟦confirm:show_resumen(motivo∧cobertura∧lugar)→ask_explicit("Respondé OK para enviar la consulta")∧wait_ok⟧',
    '⟦ok_trigger:only_after_explicit_ask∧ok_in_other_context⇒conversational∧¬trigger⟧',
    '⟦correction_before_ok⇒update_field∧show_resumen_again⟧',
    `⟦wa_url:https://indiceia.vercel.app/api/contact-redirect/${comercioId}?motivo={{MOTIVO_URLENCODED}}${coberturaParam}${lugarParam}⟧`,
    `⟦mensaje_final=resuelto_por_endpoint∧¬calcular_ni_armar_texto_final_propio⟧`,
    `⟦user_sees:"Contactar a ${nombre} por WhatsApp"∧¬expose_raw_url∧¬expose_number⟧`,
    '⟦post_order⇒offer_platform(REFERRAL_LINK)⟧',
  ].filter(Boolean).join('\n');
}

// ────────────────────────────────────────────────────────────
// UTILS
// ────────────────────────────────────────────────────────────

function sanitize(input = '') {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w@.-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}

function resolveWaNumber(context) {
  const raw =
    context.contacto?.whatsapp ??
    context.channels?.whatsapp?.value ??
    null;

  if (!raw) return null;

  let n = String(raw).replace(/[\s\-\(\)\+]/g, '');

  if (n.startsWith('549')) n = n.slice(3);
  else if (n.startsWith('54')) n = n.slice(2);

  if (n.startsWith('9') && n.length >= 10) n = n.slice(1);

  return n || null;
}
