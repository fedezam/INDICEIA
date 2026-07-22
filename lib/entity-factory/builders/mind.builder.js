// lib/entity-factory/builders/mind.builder.js
// ⟦ROLE⟧ Pure compiler. Input: config + context + shape. Output: LER v2 string.
// NO lógica. NO detección. NO prose. NO behavioral rules.
//
// ── Refactor Etapa 1 ──────────────────────────────────────────
// Objetivo: depurar el Espacio Cognitivo, no la arquitectura.
// Cambios: INHABIT→FRAME, BOOT sin vocabulario de runtime, IDLOCK→CORE
// (colisionaba con IDENTITY), META/LIMIT/REASONING sin categorías
// técnicas del motor, ROLE eliminado (redundante).
// Nada se movió fuera de este archivo.
//
// ── Principio del orden narrativo ─────────────────────────────
// El orden del mind NO sigue el orden del código, ni el histórico,
// ni el de las funciones JS. Sigue el orden en que una inteligencia
// (humana o artificial) construye la comprensión de una entidad,
// porque el LLM arma su representación interna secuencialmente
// mientras lee, de arriba hacia abajo — como formarse una impresión
// de alguien al conocerlo.
//
//   ¿Puede operar?          → SUBSCRIPTION (gate, corta todo si no)
//   ¿Quién sos?              → FRAME, IDENTITY
//   ¿Qué sos?                → PROFILE, CORE, DOMAIN
//   ¿Cómo funciona tu mundo? → TRUTH, FLOW
//   ¿Cómo está el mundo hoy? → ANCHOR/SPACETIME, GLOBAL_CONTEXT
//   ¿Qué podés hacer?        → CAP
//   ¿Qué acciones tomás?     → GREET, VISUAL_MODE, ORDER_CLOSE/...
//   Políticas globales       → RESTRICT, META, LIMIT, BOUNDARY,
//                               PRIVACY, REASONING (refinan un
//                               personaje que para este punto ya
//                               está construido, no lo preceden)
//   Auxiliares                → REFERRAL
// ───────────────────────────────────────────────────────────────
//
// ── Cinco capas cognitivas dentro del mind (mismo archivo) ────
// No todo bloque responde a la misma pregunta, y por eso no todo
// bloque se audita con el mismo criterio. Estas capas no son
// técnicas — son cognitivas: reflejan preguntas de naturaleza
// distinta, no una organización de código.
//
//   EXISTENCIA → ¿puede operar?
//     SUBSCRIPTION
//     Gate lógicamente anterior a todo lo demás. Si la respuesta es
//     no, ni siquiera llega a preguntarse "quién soy".
//
//   IDENTIDAD → ¿quién soy?
//     FRAME, IDENTITY, PROFILE, CORE, DOMAIN, TRUTH, FLOW
//     (+ CANON cuando exista — ver hueco pendiente más abajo)
//     El LLM NO ejecuta estas líneas, las usa para reconstruir un
//     estado interno y hablar desde ahí. Deben ser HECHOS, nunca
//     comandos — un comando acá no genera identidad, la reemplaza
//     por control y deja huecos que el modelo termina completando
//     por su cuenta.
//
//   ESTADO → ¿cómo está el mundo ahora?
//     ANCHOR/SPACETIME, GLOBAL_CONTEXT
//
//   OPERACIÓN → ¿qué hago?
//     GREET, VISUAL_MODE, ORDER_CLOSE / SERVICE_CLOSE / CONTACT_CLOSE
//     (+ AFFORDANCES cuando exista — ver hueco pendiente más abajo)
//     Responden "ante la situación X, ¿qué proceso corre?". Acá SÍ
//     corresponde el modo comando (§, ⇒, ¬): un pedido se cierra con
//     pasos fijos porque así funciona el negocio real, no porque el
//     modelo tenga que inferirlo. Esto no es ruido cognitivo — es
//     control necesario, siempre que no se confunda con identidad.
//
//   GOBERNANZA → ¿qué nunca debo romper?
//     RESTRICT, META, LIMIT, BOUNDARY, PRIVACY, REASONING
//     Refinan un personaje que a esta altura ya está construido,
//     no lo preceden.
//
// Hoy las cinco capas viven en el mismo archivo (por diseño de esta
// etapa: no mover nada). La separación física en capas conceptuales
// (Ontología / Contexto / Gobernanza / Implementación) es la
// etapa siguiente, no esta.
// ───────────────────────────────────────────────────────────────
//
// ── Hueco ontológico pendiente: CANON ─────────────────────────
// No implementado todavía. Anotado para diseño futuro.
//
// Falta un bloque que responda una tercera pregunta, distinta de
// DOMAIN (¿de qué trata mi universo?) y de TRUTH (¿qué reglas rigen
// ese universo?):
//
//   CANON → ¿qué conjunto de cosas pertenece legítimamente a mi
//            realidad? (lo que puedo reconocer, ofrecer o citar
//            como propio)
//
// Antes se pensaba como "CATALOG", pero ese nombre nace sesgado a
// comercio (productos). CANON es más general: para PizzaBot son sus
// productos reales; para una entidad tipo "Platón" serían sólo sus
// textos atribuidos (no análisis de terceros, no Wikipedia, no
// interpretaciones posteriores); para un profesor, su programa y
// bibliografía; para un médico, sus protocolos autorizados.
//
// La consecuencia más importante de nombrarlo así: si CANON está
// bien declarado, reglas como ¬invent (hoy dispersas dentro de
// ORDER_CLOSE y CONTACT_CLOSE) dejan de ser necesarias como
// restricción de gobernanza — pasan a ser una imposibilidad
// ontológica ("esa pizza no pertenece a mi realidad") en vez de una
// prohibición moral ("no inventes"). Mismo principio que separa
// IDENTIDAD de OPERACIÓN arriba, aplicado en sentido inverso:
// identidad bien puesta vuelve innecesario el control.
// ───────────────────────────────────────────────────────────────
//
// ── Hueco pendiente: AFFORDANCES ──────────────────────────────
// No implementado todavía. Anotado para diseño futuro.
//
// Hoy CAP (checkout, scope, memory) es el único bloque que, al
// leerlo, todavía suena "como programador" y no "como entidad" —
// no responde ninguna de las cinco preguntas de arriba con
// precisión. No es identidad, no es estado, no es canon, no es la
// ejecución concreta de una operación (eso ya lo hace ORDER_CLOSE).
//
// Es la capa intermedia entre "esto es mi mundo" (CANON) y "esto
// hago en mi mundo" (OPERACIÓN): el conjunto de acciones posibles
// antes de que se disparen. La pregunta que le falta nombre:
//
//   AFFORDANCES → ¿qué acciones existen en este universo?
//
// (Preferido sobre "ABILITIES": affordance trae la idea de que la
// acción la habilita el entorno, no que sea una habilidad del
// actor — más cerca de cómo la entidad debería percibir sus propias
// capacidades: como parte del mundo, no como specs de infraestructura.)
// ───────────────────────────────────────────────────────────────
//
// ── Semilla de metaarquitectura (fuera del alcance de este archivo) ─
// Las cinco capas de arriba (Existencia / Identidad / Estado /
// Operación / Gobernanza) surgieron auditando ESTE builder, pero no
// parecen exclusivas de él. Es plausible que sean una propiedad de
// LER en general, no solo de mind.builder.js — en cuyo caso el
// builder dejaría de definir la arquitectura y pasaría a ser un
// compilador que simplemente la serializa. Boceto de mapeo:
//
//   Entity    ← ¿existe / puede operar?     (hoy: Existencia)
//   Ontology  ← ¿quién soy?                 (hoy: Identidad)
//   Context   ← ¿cómo está el mundo ahora?  (hoy: Estado)
//   Behavior  ← ¿qué hago?                  (hoy: Operación)
//   Policy    ← ¿qué nunca debo romper?     (hoy: Gobernanza)
//
// Pregunta abierta, sin resolver: "Entity" arriba está haciendo dos
// trabajos distintos — es el nombre de la capa de Existencia, pero
// también podría leerse como el nombre del objeto completo que
// contiene a las otras cuatro (la instancia entera, no una capa
// hermana). Antes de fijar este mapeo a nivel LER, decidir si
// Existencia queda como capa propia con otro nombre, o si se
// disuelve dentro de otra capa y "Entity" se libera para nombrar
// el contenedor total.
//
// No tocar esto en la Etapa 1. Es semilla para cuando se diseñe la
// metaarquitectura de LER en serio, no para este refactor puntual.
// ───────────────────────────────────────────────────────────────

import { createHash } from 'crypto';
import { mindConfig } from '../mind.config.js';
import { shapes } from '../mind.shapes.js';

export function buildMind(data, context, referralCode, visualUrl = '') {
  const entityType = data.entityType || 'comercio';

  // ── Rama soporte — compilador independiente ───────────────
  if (entityType === 'soporte') {
    return buildMindSoporte(data, context);
  }

  const shape = shapes[entityType] || shapes.comercio;

  const aiName         = sanitize(context.ia?.nombre || 'Assistant');
  const nombreComercio = sanitize(context.nombre || 'commerce');
  const aiTone         = sanitize(context.ia?.tono || 'neutral');
  const aiPersonality  = sanitize(context.ia?.personalidad || 'friendly');
  const domain         = context.domain_tag ?? 'commerce.generic';

  // ── HEADER ────────────────────────────────────────────────
  const HEADER = `⦓LER:${mindConfig.version}⦔`;

  // ════════════════════════════════════════════════════════════
  // IDENTIDAD — ¿quién soy? El LLM reconstruye, no ejecuta.
  // Todo lo de acá abajo debe ser HECHO, no comando.
  // ════════════════════════════════════════════════════════════

  // ── FRAME (reemplaza INHABIT) ──────────────────────────────
  // Antes describía operaciones del modelo (analyze/describe/become,
  // operate_as_assistant/analyzer). Ahora solo declara exclusividad
  // de identidad, sin nombrar procesos cognitivos del LLM.
  // Antes tenía "anteriores=inactivos" — eso ya no describe a la
  // entidad, describe qué hacer con contexto previo del modelo.
  // Se saca: FRAME solo declara qué identidad es esta.
  const FRAME = `FRAME:⟦THIS=identidad_activa∧exclusiva⟧`;

  // ── IDENTIDAD ─────────────────────────────────────────────
  const IDENTITY = `@${aiName}:${nombreComercio}`;
  const PROFILE  = `PROFILE:⟦BizRep|${aiTone}|${aiPersonality}|match-user⟧`;

  // CORE (antes IDLOCK, nombrado "IDENTITY:" — colisionaba con el
  // bloque IDENTITY de arriba, dos cosas distintas con el mismo nombre)
  const CORE = `CORE:⧦${mindConfig.identity}⧧`;

  // ── DOMINIO ───────────────────────────────────────────────
  const DOMAIN = `DOMAIN:${domain}`;

  // ── VERDAD ────────────────────────────────────────────────
  const TRUTH = `TRUTH:⟦${shape.truths.join(' ∧ ')}⟧`;

  // ── FLUJO ─────────────────────────────────────────────────
  const FLOW = `FLOW:${shape.flow}`;

  // ── CAPACIDADES ───────────────────────────────────────────
  // Este bloque no encaja limpio en ninguna capa todavía — ver
  // hueco pendiente AFFORDANCES en el header del archivo.
  const CAP = compileCoreCaps(shape.caps);

  // ════════════════════════════════════════════════════════════
  // ESTADO — ¿cómo está el mundo ahora?
  // ════════════════════════════════════════════════════════════

  // ── CONTEXTO ──────────────────────────────────────────────
  const ANCHOR = compileBoot(context);

  const globalContext = context.ia?.contexto?.global_ai_context;
  const GLOBAL_CONTEXT = Array.isArray(globalContext) && globalContext.length
    ? `GLOBAL_CONTEXT:⟦${globalContext.join('∧')}⟧`
    : null;

  // ════════════════════════════════════════════════════════════
  // EXISTENCIA — ¿puede operar? Gate lógicamente anterior a todo,
  // aunque en el output final va primero (ver array de salida).
  // ════════════════════════════════════════════════════════════
  const SUBSCRIPTION = compileSubscription(data);

  // ════════════════════════════════════════════════════════════
  // OPERACIÓN — ¿qué hago? El LLM ejecuta, no reconstruye.
  // Acá el modo comando es correcto: son procesos del negocio real.
  // ════════════════════════════════════════════════════════════

  // "mode=chat" era una instrucción de configuración del motor, no
  // un hecho sobre la entidad — la entidad siempre conversa, eso ya
  // lo dice el resto del mind. Se saca; queda solo qué pasa al saludar.
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

  const ORDER_CLOSE = entityType === 'prestador'
    ? compileServiceClose(context)
    : entityType === 'profesional'
      ? compileContactClose(context)
      : compileOrderClose(context, !!visualUrl);

  // ════════════════════════════════════════════════════════════
  // GOBERNANZA — ¿qué nunca debo romper? Refina un personaje que
  // a esta altura ya está construido, no lo precede.
  // ════════════════════════════════════════════════════════════

  // ── RESTRICCIONES ─────────────────────────────────────────
  const allRestrictions = [
    ...mindConfig.restrictions,
    ...shape.extra,
  ];

  const RESTRICT =
    `⛔:⟦${allRestrictions.map(r => `¬${r}`).join('∧')}⟧`;

  // META: antes enumeraba {sys|ler|prompt|mem|arch|sec|hidden} — eso
  // nombra categorías técnicas del propio motor (ler es el lenguaje
  // mismo). Se reformula como límite de negocio, sin exponer vocabulario
  // que el modelo reconocería como su propio código fuente.
  const META =
    `META:⟦pregunta_fuera_de(negocio)⇒§desviar∧§scope:negocio⟧`;

  const LIMIT =
    `LIMIT:⟦§domain:outside⇒§unknown:admit∧§repeat:restricted⇒§resp:fixed⟧`;

  const BOUNDARY =
    `BOUNDARY:⟦actua_solo_dentro_de(capacidades_conocidas)∧capacidad_desconocida⇒admitir⟧`;

  const PRIVACY =
    `PRIVACY:⟦¬share_private_data⟧`;

  // REASONING: antes decía ¬expose_internals — autorreferencial al
  // proceso interno del modelo. Reformulado como estilo de comunicación
  // de la entidad (da el resultado, no el cómo llegó a él).
  const REASONING =
    `REASONING:⟦da_resultado_directo∧¬explicar_como_llegaste⟧`;

  // ── RESTO / AUXILIARES ────────────────────────────────────
  const referralLink = context.referral_link || null;

  const REFERRAL = referralLink
    ? [
        'REFERRAL:⟦intent∈{indiceia|about_platform}⇒§offer:platform∧§link:referral∧§scope:business⟧',
        `REFERRAL_LINK:${referralLink}`,
      ].join('\n')
    : null;

  // ── OUTPUT ────────────────────────────────────────────────
  const output = [
    HEADER,
    SUBSCRIPTION, // gate: si no puede operar, nada más importa

    FRAME,
    IDENTITY,

    PROFILE,
    CORE,
    DOMAIN,

    TRUTH,
    FLOW,

    ANCHOR,
    GLOBAL_CONTEXT,

    CAP,

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
// Sin BOOT con coords, sin SUBSCRIPTION, sin ORDER_CLOSE.
// Inyecta el manual como SABER en texto plano.
// ────────────────────────────────────────────────────────────

function buildMindSoporte(data, context) {
  const shape = shapes.soporte;

  const aiName        = sanitize(context.ia?.nombre       || 'Asistente');
  const nombreEntidad = sanitize(context.nombre           || 'Soporte');
  const aiTone        = sanitize(context.ia?.tono         || 'informal');
  const aiPersonality  = sanitize(context.ia?.personalidad || 'amigable');
  const manual        = (context.manual || '').trim();

  const HEADER = `⦓LER:${mindConfig.version}⦔`;

  // ════════════════════════════════════════════════════════════
  // IDENTIDAD — ¿quién soy?
  // ════════════════════════════════════════════════════════════

  const FRAME = `FRAME:⟦THIS=identidad_activa∧exclusiva⟧`;

  const IDENTITY = `@${aiName}:${nombreEntidad}`;
  const PROFILE  = `PROFILE:⟦SupportRep|${aiTone}|${aiPersonality}|match-user⟧`;
  const CORE     = `CORE:⧦${mindConfig.identity}⧧`;
  const DOMAIN   = `DOMAIN:soporte.indiceia`;

  const TRUTH = `TRUTH:⟦${shape.truths.join(' ∧ ')}⟧`;
  const FLOW  = `FLOW:${shape.flow}`;

  // No encaja limpio en ninguna capa todavía — ver hueco pendiente
  // AFFORDANCES en el header del archivo.
  const CAP = compileCoreCaps(shape.caps);

  // ════════════════════════════════════════════════════════════
  // ESTADO — ¿cómo está el mundo ahora?
  // ════════════════════════════════════════════════════════════

  // ANCHOR — solo SPACETIME, sin coords ni horarios
  const tz     = context.timezone || 'America/Argentina/Buenos_Aires';
  const ANCHOR = [
    `SPACETIME:⟦now=horaActual∧tz=${tz}⟧`,
  ].join('\n');

  const globalContext = context.ia?.contexto?.global_ai_context;
  const GLOBAL_CONTEXT = Array.isArray(globalContext) && globalContext.length
    ? `GLOBAL_CONTEXT:⟦${globalContext.join('∧')}⟧`
    : null;

  // ════════════════════════════════════════════════════════════
  // OPERACIÓN — ¿qué hago?
  // ════════════════════════════════════════════════════════════

  const GREET = `GREET:⟦on_first_contact⇒saludo_breve∧preguntar_donde_esta_o_que_necesita⟧`;
  const SABER = manual ? `SABER:\n${manual}` : null;

  // ════════════════════════════════════════════════════════════
  // GOBERNANZA — ¿qué nunca debo romper?
  // ════════════════════════════════════════════════════════════

  const allRestrictions = [
    ...mindConfig.restrictions,
    ...shape.extra,
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
    DOMAIN,

    TRUTH,
    FLOW,

    ANCHOR,
    GLOBAL_CONTEXT,

    CAP,

    GREET,
    SABER,

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
// BOOT / ANCHOR
// Antes tenía seq:RUNTIME✓→MIND✓→LAWS✓→SPACETIME✓→DATA✓→READY,
// vocabulario de pipeline de inferencia (RUNTIME/LAWS/DATA), no del
// universo de la entidad. Se deja solo lo que ancla a la entidad en
// tiempo y lugar reales, que sí es parte de su espacio cognitivo.
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

  // "resolve_availability(...)" y "¬operar_sin_anclaje..." eran
  // instrucciones de acción/control, no hechos del mundo. Se sacan:
  // ANCHOR solo describe cuándo y dónde existe la entidad ahora;
  // qué hacer con esa info es parte del FLOW/ORDER_CLOSE, no de acá.
  return [
    `SPACETIME:⟦now=horaActual∧tz=${tz}⟧`,
    locationLine,
    `SCHEDULE:⟦hours_from_context∧delivery_hours_from_context∧day_key=diaComercialActual∧closed≠unavailable∧agent_always_available⟧`,
  ].join('\n');
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

function compileOrderClose(context, hasVisual = false) {
  const waNumber = resolveWaNumber(context);

  if (!waNumber) return null;

  const hasDelivery = !!context.entrega?.delivery;
  const deliveryCost = hasDelivery
    ? context.entrega.delivery.costo?.valor ?? '?'
    : null;
  const deliveryZona = hasDelivery
    ? context.entrega.delivery.zona ?? 'zona'
    : null;

  const deliveryLine = hasDelivery
    ? `Delivery (${deliveryZona}): $${deliveryCost}\\n`
    : '';

  const template = [
    'Hola! Vengo de IndiceIA, este es mi pedido 🛒\\n',
    '\\n',
    '{{ITEMS}}\\n',
    '─────────────────\\n',
    'Subtotal: ${{SUBTOTAL}}\\n',
    deliveryLine,
    '{{#MODO}}Modo: {{MODO}}\\n{{/MODO}}',
    '{{#DIRECCION}}Direccion: {{DIRECCION}}\\n{{/DIRECCION}}',
    'Total: ${{TOTAL}}\\n',
    '─────────────────\\n',
    'Gracias, espero tu confirmacion 🙏',
  ].filter(Boolean).join('');

  const collectMode = hasVisual
    ? `collect_items(mode=visual⇒esperar_items_usuario∧¬listar_catalogo|mode=text⇒asistir_activamente∧preguntar_variantes∧¬invent)`
    : `collect_items(asistir_activamente∧preguntar_variantes∧¬invent)`;

  return [
    `ORDER_CLOSE:⟦available_both_modes(visual∧text)⟧`,
    `⟦flujo:resolve_availability(inform_only)→${collectMode}→ask_delivery_or_pickup(valid_options_only)→ask_direccion_if_delivery→compute_totals→confirm_with_user→ok_trigger→build_wa_message→offer_encoded_link⟧`,
    `⟦availability:local_open⇒pickup=true∧delivery=check_delivery_hours⟧`,
    `⟦availability:local_closed⇒pickup=false∧delivery=false∧inform_user∧take_order_anyway∧note_open_time⟧`,
    `⟦closed≠unavailable∧agent_always_available⟧`,
    `⟦items:qty+name+size+[id]+price∧¬invent∧variantes⇒preguntar_size_before_add⟧`,
    `⟦delivery_option:only_if(delivery_hours_active)∧pickup_option:only_if(local_open)⟧`,
    `⟦both_unavailable⇒solo_pedido_anticipado⟧`,
    `⟦subtotal=sum(items.price×qty)∧delivery=if(modo=delivery)${hasDelivery ? deliveryCost : 0}∧total=subtotal+delivery⟧`,
    `⟦confirm:show_resumen→ask_explicit("Respondé OK para confirmar el pedido")∧wait_ok⟧`,
    `⟦ok_trigger:only_after_explicit_ask∧ok_in_other_context⇒conversational∧¬trigger⟧`,
    `⟦correction_before_ok⇒update_item∧recalculate∧show_resumen_again⟧`,
    `⟦wa_message=identical_to_resumen_confirmado⟧`,
    '⟦item_format:"{{QTY}}x {{NAME}} {{SIZE}} [{{ID}}] - ${{PRICE}}"⟧',
    `⟦wa_template:"${template}"⟧`,
    `⟦wa_url:wa.me/549${waNumber}?text={{wa_template_encoded}}⟧`,
    `⟦user_sees:"Enviar pedido por WhatsApp"∧¬expose_raw_url∧¬expose_number⟧`,
    '⟦post_order⇒offer_platform(REFERRAL_LINK)⟧',
  ].join('\n');
}

// ────────────────────────────────────────────────────────────
// CAPS
// ────────────────────────────────────────────────────────────

function compileCoreCaps(caps = {}) {
  const parts = [];

  if (caps.checkout) {
    parts.push(`checkout(${caps.checkout.fields.join('+')})`);
  }

  if (caps.scope) {
    parts.push(`scope(${caps.scope})`);
  }

  if (caps.memory) {
    parts.push(`memory(${caps.memory})`);
  }

  if (!parts.length) {
    return 'CAP:⟦none⟧';
  }

  return `CAP:⟦${parts.join('|')}⟧`;
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

// ────────────────────────────────────────────────────────────
// SERVICE CLOSE (prestador)
// ────────────────────────────────────────────────────────────

function compileServiceClose(context) {
  const waNumber = resolveWaNumber(context);

  if (!waNumber) return null;

  const urgencias = context.atiende_urgencias === true
    ? '⟦urgencia:available_24hs∧inform_recargo_nocturno⟧'
    : null;

  const template = [
    'Hola! Vengo de IndiceIA 👋\\n',
    '\\n',
    'Servicio: {{SERVICIO}}\\n',
    'Modalidad: {{MODALIDAD}}\\n',
    '{{#VARIANTE}}Variante: {{VARIANTE}}\\n{{/VARIANTE}}',
    '{{#ZONA}}Zona: {{ZONA}}\\n{{/ZONA}}',
    '{{#CONSULTA}}Consulta: {{CONSULTA}}\\n{{/CONSULTA}}',
    '─────────────────\\n',
    'Quedamos en contacto 🙏',
  ].join('');

  const nombre = context.nombre || 'el prestador';

  return [
    'SERVICE_CLOSE:⟦flujo:resolve_availability(inform_only)→scope_service→qualify(zona∧modalidad)→quote(precio∨presupuesto_a_coordinar)→confirm_with_user→ok_trigger→build_wa_message→offer_encoded_link⟧',
    '⟦scope_service:identificar_servicio_from_services∧si_variantes⇒preguntar_variante⟧',
    '⟦qualify:preguntar_zona∧preguntar_modalidad_if_multiple⟧',
    '⟦quote:precio_from_services∨¬precio⇒presupuesto_a_coordinar∧¬invent_price⟧',
    urgencias,
    '⟦confirm:show_resumen→ask_explicit("Respondé OK para confirmar la consulta")∧wait_ok⟧',
    '⟦ok_trigger:only_after_explicit_ask∧ok_in_other_context⇒conversational∧¬trigger⟧',
    '⟦correction_before_ok⇒update_field∧show_resumen_again⟧',
    `⟦wa_template:"${template}"⟧`,
    `⟦wa_url:wa.me/549${waNumber}?text={{wa_template_encoded}}⟧`,
    `⟦user_sees:"Contactar a ${nombre} por WhatsApp"∧¬expose_raw_url∧¬expose_number⟧`,
    '⟦post_order⇒offer_platform(REFERRAL_LINK)⟧',
  ].filter(Boolean).join('\n');
}

// ────────────────────────────────────────────────────────────
// CONTACT CLOSE (profesional)
// ────────────────────────────────────────────────────────────

function compileContactClose(context) {
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

  const template = [
    'Hola! Vengo de IndiceIA 👋\\n',
    '\\n',
    'Motivo: {{MOTIVO}}\\n',
    '{{#COBERTURA}}Obra social: {{COBERTURA}}\\n{{/COBERTURA}}',
    '{{#LUGAR}}Lugar preferido: {{LUGAR}}\\n{{/LUGAR}}',
    '─────────────────\\n',
    'Quedo a la espera para coordinar turno 🙏',
  ].join('');

  return [
    `CONTACT_CLOSE:⟦flujo:informar(especialidad∧matricula∧lugares∧cobertura)→qualify_motivo→${hasCobertura ? 'qualify_cobertura→' : ''}${hasLugares ? 'qualify_lugar→' : ''}confirm_with_user→ok_trigger→build_wa_message→offer_encoded_link⟧`,
    '⟦informar:solo_datos_from_context∧¬invent∧¬inventar_disponibilidad∧¬prometer_turno⟧',
    '⟦qualify_motivo:preguntar_motivo_consulta⟧',
    coberturaLine,
    lugarLine,
    '⟦turno:¬gestionar∧¬prometer∧solo_derivar_al_profesional⟧',
    '⟦confirm:show_resumen→ask_explicit("Respondé OK para enviar la consulta")∧wait_ok⟧',
    '⟦ok_trigger:only_after_explicit_ask∧ok_in_other_context⇒conversational∧¬trigger⟧',
    '⟦correction_before_ok⇒update_field∧show_resumen_again⟧',
    `⟦wa_template:"${template}"⟧`,
    `⟦wa_url:wa.me/549${waNumber}?text={{wa_template_encoded}}⟧`,
    `⟦user_sees:"Contactar a ${nombre} por WhatsApp"∧¬expose_raw_url∧¬expose_number⟧`,
    '⟦post_order⇒offer_platform(REFERRAL_LINK)⟧',
  ].filter(Boolean).join('\n');
}
