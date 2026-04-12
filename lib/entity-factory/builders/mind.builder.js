// lib/entity-factory/builders/mind.builder.js
// ⟦ROLE⟧ Pure compiler. Input: config + context + shape. Output: LER v1.1 string.
// NO lógica. NO detección. NO prose. NO behavioral rules.
// Regla de diseño de símbolos:
//   válido si: (1) grounding semántico fuerte  ∅ ¬ ⇒ ∧ ∨
//           o: (2) sin colisión sintáctica      ⦓⦔ ⧦⧧ ⟦⟧
//           o: (3) ancla estructural fuerte     ⛔ @
//   si no cumple ninguna → eliminar

import { createHash } from 'crypto';
import { mindConfig }  from '../mind.config.js';
import { shapes }      from '../mind.shapes.js';

export function buildMind(data, context, referralCode, visualUrl = '') {
  const entityType = data.entityType || 'comercio';
  const shape      = shapes[entityType] || shapes.comercio;

  const aiName         = sanitize(context.ia?.nombre       || 'Assistant');
  const nombreComercio = sanitize(context.nombre           || 'commerce');
  const aiTone         = sanitize(context.ia?.tono         || 'neutral');
  const aiPersonality  = sanitize(context.ia?.personalidad || 'friendly');
  const domain         = context.domain_tag               ?? 'commerce.generic';

  // ⦓⦔ — ancla de protocolo
  const HEADER   = `⦓LER:${mindConfig.version}⦔`;

  // @ — identidad, @ tiene grounding fuerte en internet
  const IDENTITY = `@${aiName}:${nombreComercio}`;
  const PROFILE  = `PROFILE:⟦BizRep|${aiTone}|${aiPersonality}|match-user⟧`;

  // ⧦⧧ — contenedor sellado, no colisiona con ninguna sintaxis
  const IDLOCK   = `IDENTITY:⧦${mindConfig.identity}⧧`;
  const DOMAIN   = `DOMAIN:${domain}`;

  // TRUTH — viene del shape, define qué es verdad para este entityType
  const TRUTH    = `TRUTH:⟦${shape.truths.join(' ∧ ')}⟧`;

  // FLOW — viene del shape, define cómo procesa la intención
  const FLOW     = `FLOW:${shape.flow}`;

  // GREET + VISUAL — solo si hay miniApp
  const GREET  = visualUrl
    ? `GREET:⟦visual⇒send_link∧append_availability⟧`
    : null;

  const VISUAL = visualUrl
    ? `REF:${visualUrl}(OnGreet:send_link∧¬list_catalog_text|OnRequest:send_link∧¬list_catalog_text|¬Replace_text)`
    : null;

  // REFERRAL — autopublicidad orgánica de ÍndiceIA
  const referralLink = context.referral_link || null;
  const REFERRAL = referralLink
    ? `REFERRAL:⟦(intent:indiceia∨intent:how_it_works∨after(n=3))⇒offer("¿Te interesa tener tu propio asistente?")∧send_link⟧\nREFERRAL_LINK:${referralLink}`
    : null;

  // CAP — viene del shape, define capacidades operativas del agente
  const CAP = compileCoreCaps(shape.caps);

  // ⛔ — restricciones base + extras del shape
  const allRestrictions = [
    ...mindConfig.restrictions,
    ...shape.extra,
  ];
  const RESTRICT = `⛔:⟦${allRestrictions.map(r => `¬${r}`).join('∧')}⟧`;

  const output = [
    HEADER, IDENTITY, PROFILE, IDLOCK,
    DOMAIN, TRUTH, FLOW,
    GREET, VISUAL,
    REFERRAL,
    CAP, RESTRICT,
  ]
    .filter(Boolean)
    .join('\n')
    .trim();

  const mind_hash = createHash('sha256').update(output).digest('hex').slice(0, 12);
  const mind_id   = `${entityType}.${mindConfig.id.split('.').slice(1).join('.')}`; // ej: prestador.basic.v1

  return { ler: output, mind_hash, mind_id };
}

// ── COMPILADORES ─────────────────────────────────────────────
function compileCoreCaps(caps) {
  const parts = [];
  if (caps.checkout) parts.push(`C(${caps.checkout.fields.join('+')})`);
  if (caps.scope)    parts.push(`S(${caps.scope})`);
  if (caps.memory)   parts.push(`M(${caps.memory})`);
  return `CAP:⟦${parts.join('|')}⟧`;
}

// ── UTILS ─────────────────────────────────────────────────────
function sanitize(input = '') {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w@]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}
