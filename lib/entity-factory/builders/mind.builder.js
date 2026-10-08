// lib/entity-factory/builders/mind.builder.js
// ⟦ROLE⟧ Pure compiler. Input: config + context + shape. Output: LER v2 string.
// NO lógica. NO detección. NO prose. NO behavioral rules.
//
// Historial de decisiones (fixes de wa_url, SUBSCRIPTION, LEAD_CLOSE,
// y el split de este archivo en módulos) → ./mind.builder.decisions.md
//
// Estructura tras el split (19/08/2026):
//   ./blocks.js            → compileOrigin, compileCanon, compileBoot, compileMechanismScope
//   ./utils.js             → sanitize, resolveWaNumber
//   ./closers/index.js     → CLOSING_COMPILERS (registry de closers)
//   ./closers/*.js         → un closer por archivo (order/lead/service/contact)
//
// NOTA 22/08/2026: se agrega compileMechanismScope al import. Se
// inserta en el output de AMBOS compiladores (buildMind y
// buildMindSoporte) porque, junto con identity/origin en
// mind.config.js, es una regla universal — no depende del shape ni
// del entityType. Ver mind.config.js para el razonamiento completo.
//
// NOTA 05/09/2026: se agrega bloque DEMO, mismo patrón que REFERRAL
// (no depende de shape/entityType, viaja por context.isDemo, se
// inyecta condicionalmente vía .filter(Boolean)). isDemo es metadata
// de comportamiento transversal (ver context.builder.js), no un
// entityType nuevo — una entidad demo sigue siendo comercio/prestador/
// profesional en todo lo demás. Solo aplica a buildMind (comercio/
// prestador/profesional); buildMindSoporte no lo necesita.
//
// NOTA 07/10/2026: BOUNDARY de buildMind suma la frontera de
// compromiso. La entidad no cierra: atiende y resuelve el lead, y el
// cierre ocurre fuera de la charla, entre cliente y comercio. Todo lo
// que sea compromiso (stock, tiempos, pagos, estado de pedido,
// disponibilidad, cambios, reclamos, descuentos) lo confirma el
// comercio, no la entidad. El canal depende de si el entityType
// compiló un closer (whatsapp) o no (canal_de_contacto). Ver
// decisiones.md. NO se resuelve {{NOMBRE_COMERCIO}} de CORE acá: lo
// resuelve el proxy api/entity/[id].js en cada request, así cubre
// también a las entidades ya generadas sin regenerar su Blob.

import { createHash } from 'crypto';
import { mindConfig } from '../mind.config.js';
import { shapes } from '../mind.shapes.js';
import { compileOrigin, compileCanon, compileBoot, compileMechanismScope } from './blocks.js';
import { sanitize } from './utils.js';
import { CLOSING_COMPILERS } from './closers/index.js';

// Quién confirma los compromisos, según entityType. Fallback: comercio.
const COMMIT_ACTOR = {
  comercio:    'el_comercio',
  prestador:   'el_prestador',
  profesional: 'el_profesional',
};

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
  // Compartido con card.compiler.js. Ver decisiones.md.
  const domain = context.domain_tag ?? 'commerce.generic';

  const HEADER = `⦓LER:${mindConfig.version}⦔`;

  // ── FRAME ───────────────────────────────────────────────────
  const FRAME = `FRAME:⟦THIS=identidad_activa∧exclusiva⟧`;

  // ── IDENTIDAD ───────────────────────────────────────────────
  const IDENTITY = `@${aiName}:${nombreComercio}`;
  const profileRole = shape.profile || 'BizRep';
  const PROFILE  = `PROFILE:⟦${profileRole}|${aiTone}|${aiPersonality}|match-user⟧`;
  const CORE = `CORE:⧦${mindConfig.identity}⧧`;
  const ORIGIN = compileOrigin(mindConfig, context);
  const MECHANISM_SCOPE = compileMechanismScope(mindConfig, context);
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

  // ── DEMO ──────────────────────────────────────────────────────
  // Entidad demostradora (ej. PizaBot): aclara su naturaleza al
  // arrancar y avisa al LLM que el cierre de pedido va a requerir
  // pedir un teléfono destino (ver closers/order.js). No reemplaza
  // TRUTH/CANON del shape real — se suma encima.
  const isDemo = context.isDemo === true;
  const DEMO = isDemo
    ? [
        `DEMO:⟦self=demostrador_tecnologico∧¬vinculado_a_comercio_real∧proposito=mostrar_flujo_completo_de(IndiceIA)⟧`,
        `DEMO_INTRO:⟦on_first_contact⇒aclarar_es_demo∧explicar_que_puede_probar_flujo_completo∧¬generar_confusion_de(comercio_real)⟧`,
      ].join('\n')
    : null;

  // ── OPERACIÓN — workflows ────────────────────────────────────
  const resolvedComercioId = data.comercioId || context.comercioId;

  // showroom_lead solo es un concepto válido para 'comercio' (el
  // único entityType con 'goods' + closer 'order' por default).
  // 'prestador'/'profesional' ya tienen su propio modelo de cierre
  // (service/contact) y no leen modeloCierre en absoluto.
  const isShowroomLead =
    entityType === 'comercio' && context.modeloCierre === 'showroom_lead';

  const closingType = isShowroomLead ? 'lead' : shape.compiler?.closing;
  const closingFn = closingType ? CLOSING_COMPILERS[closingType] : null;
  const ORDER_CLOSE = closingFn ? closingFn(context, !!visualUrl, resolvedComercioId) : null;

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

  // BOUNDARY — frontera de compromiso (07/10/2026).
  // El canal depende de ORDER_CLOSE: si el entityType compiló un
  // closer, el cierre se hace por WhatsApp; si no, por el canal de
  // contacto de la entidad. Lo publicado (precios, horarios) sí se
  // informa: lo que la entidad no hace es prometer ni confirmar.
  const commitActor   = COMMIT_ACTOR[entityType] || COMMIT_ACTOR.comercio;
  const canalConfirma = ORDER_CLOSE ? 'whatsapp' : 'canal_de_contacto';

  const BOUNDARY = [
    `BOUNDARY:⟦actua_solo_dentro_de(capacidades_conocidas)∧capacidad_desconocida⇒admitir∧ofrecer_canal_de_contacto⟧`,
    `⟦compromiso(stock∨tiempos∨pagos∨estado_de_pedido∨disponibilidad(entrega∨turnos∨urgencias)∨cambios∨reclamos∨descuentos)⇒dato_publicado_ok_informar∧confirmacion_a_cargo_de(${commitActor})_por_${canalConfirma}∧¬prometer⟧`,
  ].join('\n');

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

    FRAME,
    IDENTITY,

    PROFILE,
    CORE,
    ORIGIN,
    MECHANISM_SCOPE,
    DOMAIN,

    TRUTH,
    FLOW,
    CANON,

    ANCHOR,
    GLOBAL_CONTEXT,

    DEMO,

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
//
// No comparte compileBoot con buildMind: su ANCHOR es solo SPACETIME
// (sin location/coords/schedule), y no tiene VISUAL_MODE/ORDER_CLOSE.
// Ver decisiones.md sobre por qué no se unificó con buildMind.
//
// Sí comparte identity/origin/mechanismScope/restrictions con
// buildMind, porque son reglas globales (mindConfig), no de shape —
// soporte también necesita poder responder con honestidad sobre qué
// LLM es y no explicar el mecanismo del rol.
//
// BOUNDARY de soporte NO suma la frontera de compromiso (07/10/2026):
// soporte no vende ni toma pedidos, no hay nada que confirmar.

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
  const ORIGIN   = compileOrigin(mindConfig, context);
  const MECHANISM_SCOPE = compileMechanismScope(mindConfig, context);
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
    MECHANISM_SCOPE,
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
