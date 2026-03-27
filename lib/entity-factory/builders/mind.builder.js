// lib/entity-factory/builders/mind.builder.js
// ⟦ROLE⟧ Pure compiler. Input: config + context. Output: LER V2 string.
// NO lógica. NO detección. NO prose. NO behavioral rules.
// El LLM infiere comportamiento del domain_tag solo.

import { createHash } from 'crypto';
import { mindConfig }  from '../mind.config.js';

export function buildMind(data, context, referralCode, visualUrl = '') {

  const aiName         = sanitize(context.ia?.nombre       || 'Assistant');
  const nombreComercio = sanitize(context.nombre           || 'commerce');
  const aiTone         = sanitize(context.ia?.tono         || 'neutral');
  const aiPersonality  = sanitize(context.ia?.personalidad || 'friendly');
  const domain         = context.domain_tag               ?? 'commerce.generic';

  const HEADER   = `⦓LER:${mindConfig.version}⦔`;
  const IDENTITY = `⦓◍:${aiName}@${nombreComercio}⦔\n▢[BizRep|${aiTone}|${aiPersonality}|match-user]▢`;
  const DOMAIN   = `⩵DOMAIN:${domain}`;
  const TRUTH    = `⩵TRUTH:⟦${mindConfig.truths.join(' ∧ ')}⟧`;
  const FLOW     = `≬FLOW:${mindConfig.flow}`;
  const VISUAL   = visualUrl
    ? `⚲Ref:${visualUrl}(OnIntent|¬Force|¬Explain)`
    : null;
  const CAP      = compileCapabilities(mindConfig.capabilities);
  const RESTRICT = `⛔:⟦${mindConfig.restrictions.map(r => `¬${r}`).join('∧')}⟧`;
  const END      = `▬✪`;

  const output = [HEADER, IDENTITY, DOMAIN, TRUTH, FLOW, VISUAL, CAP, RESTRICT, END]
    .filter(Boolean)
    .join('\n')
    .trim();

  const mind_hash = createHash('sha256').update(output).digest('hex').slice(0, 12);

  return { ler: output, mind_hash, mind_id: mindConfig.id };
}

// ── COMPILADORES ─────────────────────────────────────────────

function compileCapabilities(caps) {
  const parts = [];
  if (caps.checkout) parts.push(`C(${caps.checkout.fields.join('+')})`);
  if (caps.scope)    parts.push(`S(${caps.scope})`);
  if (caps.memory)   parts.push(`M(${caps.memory})`);
  return `≋CAP:⟦${parts.join('|')}⟧`;
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
