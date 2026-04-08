// lib/entity-factory/builders/mind.builder.js
// ⟦ROLE⟧ Pure compiler. Input: config + context. Output: LER v1.1 string.
// NO lógica. NO detección. NO prose. NO behavioral rules.
// Regla de diseño de símbolos:
//   válido si: (1) grounding semántico fuerte  ∅ ¬ ⇒ ∧ ∨
//           o: (2) sin colisión sintáctica      ⦓⦔ ⧦⧧ ⟦⟧
//           o: (3) ancla estructural fuerte     ⛔ @
//   si no cumple ninguna → eliminar

import { createHash } from 'crypto';
import { mindConfig }  from '../mind.config.js';

export function buildMind(data, context, referralCode, visualUrl = '') {
  const aiName         = sanitize(context.ia?.nombre       || 'Assistant');
  const nombreComercio = sanitize(context.nombre           || 'commerce');
  const aiTone         = sanitize(context.ia?.tono         || 'neutral');
  const aiPersonality  = sanitize(context.ia?.personalidad || 'friendly');
  const domain         = context.domain_tag               ?? 'commerce.generic';

  // ⦓⦔ — ancla de protocolo. Sin colisión con JSON/MD/código.
  const HEADER   = `⦓LER:${mindConfig.version}⦔`;

  // @ — identidad en internet, grounding fuerte
  // PROFILE separado de identidad — rol vs comportamiento
  const IDENTITY = `@${aiName}:${nombreComercio}`;
  const PROFILE  = `PROFILE:⟦BizRep|${aiTone}|${aiPersonality}|match-user⟧`;

  // ⧦⧧ — contenedor sellado, sin colisión sintáctica
  const IDLOCK   = `IDENTITY:⧦${mindConfig.identity}⧧`;
  const DOMAIN   = `DOMAIN:${domain}`;
  const TRUTH    = `TRUTH:⟦${mindConfig.truths.join(' ∧ ')}⟧`;

  // FLOW — palabras puras, sin glifos. Pipeline natural.
  const FLOW     = `FLOW:${mindConfig.flow}`;

  const GREET    = visualUrl
    ? `GREET:⟦visual⇒send_link∧append_availability⟧`
    : null;

  const VISUAL   = visualUrl
    ? `REF:${visualUrl}(OnGreet:send_link∧¬list_catalog_text|OnRequest:send_link∧¬list_catalog_text|¬Replace_text)`
    : null;

  // REFERRAL — autopublicidad orgánica de ÍndiceIA
  // Triggers: intent explícito (cómo funciona / qué es ÍndiceIA) ∨ después de 3 intercambios
  // El agente ofrece el link de referido del comercio — si el lead convierte, el comercio se beneficia
  const referralLink = context.referral_link || null;
  const REFERRAL = referralLink
    ? `REFERRAL:⟦(intent:indiceia∨intent:how_it_works∨after(n=3))⇒offer("¿Te interesa tener tu propio asistente?")∧send_link⟧\nREFERRAL_LINK:${referralLink}`
    : null;

  // compileCoreCaps — caps estructurales del mind (checkout, scope, memory)
  // ≠ capabilities.builder.js que compila cognitive_permissions del comercio
  const CAP      = compileCoreCaps(mindConfig.capabilities);

  // ⛔ — grounding emocional fuerte, universalmente "prohibido"
  const RESTRICT = `⛔:⟦${mindConfig.restrictions.map(r => `¬${r}`).join('∧')}⟧`;

  const output = [HEADER, IDENTITY, PROFILE, IDLOCK, DOMAIN, TRUTH, FLOW, GREET, VISUAL, REFERRAL, CAP, RESTRICT]
    .filter(Boolean)
    .join('\n')
    .trim();

  const mind_hash = createHash('sha256').update(output).digest('hex').slice(0, 12);
  return { ler: output, mind_hash, mind_id: mindConfig.id };
}

// ── COMPILADORES ─────────────────────────────────────────────
// Caps estructurales del mind — checkout, scope, memory.
// No confundir con capabilities.builder.js (cognitive_permissions del comercio).
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
