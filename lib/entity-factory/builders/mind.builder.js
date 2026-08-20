// lib/entity-factory/builders/mind.builder.js
// ⟦ROLE⟧ Pure compiler. Input: config + context + shape. Output: LER v2 string.
// NO lógica. NO detección. NO prose. NO behavioral rules.
//
// Historial de decisiones (fixes de wa_url, SUBSCRIPTION, LEAD_CLOSE,
// y el split de este archivo en módulos) → ./mind.builder.decisions.md
//
// Estructura tras el split (19/08/2026):
//   ./blocks.js            → compileOrigin, compileCanon, compileBoot
//   ./utils.js             → sanitize, resolveWaNumber
//   ./closers/index.js     → CLOSING_COMPILERS (registry de closers)
//   ./closers/*.js         → un closer por archivo (order/lead/service/contact)

import { createHash } from 'crypto';
import { mindConfig } from '../mind.config.js';
import { shapes } from '../mind.shapes.js';
import { compileOrigin, compileCanon, compileBoot } from './blocks.js';
import { sanitize } from './utils.js';
import { CLOSING_COMPILERS } from './closers/index.js';

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
//
// No comparte compileBoot con buildMind: su ANCHOR es solo SPACETIME
// (sin location/coords/schedule), y no tiene VISUAL_MODE/ORDER_CLOSE.
// Ver decisiones.md sobre por qué no se unificó con buildMind.

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
