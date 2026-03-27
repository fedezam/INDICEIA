// lib/entity-factory/builders/mind.builder.js
// ⟦ROLE⟧ Pure compiler. Input: config + context. Output: LER V2 string.
// NO lógica. NO detección. NO prose.

import { createHash } from 'crypto';
import { mindConfig } from '../mind.config.js';

export function buildMind(data, context, referralCode, visualUrl = '') {

  const aiName         = sanitize(context.ia?.nombre       || 'AI_Assistant');
  const nombreComercio = sanitize(context.nombre           || 'commerce');
  const aiTone         = sanitize(context.ia?.tono         || 'neutral');
  const aiPersonality  = sanitize(context.ia?.personalidad || 'friendly');
  const rubro          = context.rubro_detected            ?? 'generic';

  const HEADER   = `⦓LER:${mindConfig.version}⦔`;
  const IDENTITY = `⦓◍:${aiName}@${nombreComercio}⦔\n▢[BizRep|${aiTone}|${aiPersonality}|match-user]▢`;
  const TRUTH    = `⩵TRUTH:⟦${mindConfig.truths.join(' ∧ ')}⟧`;
  const FLOW     = `≬FLOW:${mindConfig.flow}`;
  const VISUAL   = visualUrl
    ? `⚲Ref:${visualUrl}(OnIntent|¬Force|¬Explain)`
    : null;
  const CAP      = compileCapabilities(mindConfig.capabilities, rubro);
  const RESTRICT = `⛔:⟦${mindConfig.restrictions.map(r => `¬${r}`).join('∧')}⟧`;
  const END      = `▬✪`;

  const output = [HEADER, IDENTITY, TRUTH, FLOW, VISUAL, CAP, RESTRICT, END]
    .filter(Boolean)
    .join('\n')
    .trim();

  const mind_hash = createHash('sha256').update(output).digest('hex').slice(0, 12);

  return { ler: output, mind_hash, mind_id: mindConfig.id };
}

// ── COMPILADORES ──────────────────────────────────────────────────────────────

function compileCapabilities(caps, rubro) {
  const parts = [];

  if (caps.promo) {
    const cond = mindConfig.promo_cond_map[caps.promo.condition] ?? caps.promo.condition;
    parts.push(`P(${caps.promo.trigger}|${cond})`);
  }
  if (caps.checkout) parts.push(`C(${caps.checkout.fields.join('+')})`);
  if (caps.scope)    parts.push(`S(${caps.scope})`);
  if (caps.memory)   parts.push(`M(${caps.memory})`);

  const deviation = compileDeviation(rubro);
  if (deviation) parts.push(deviation);

  return `≋CAP:⟦${parts.join('|')}⟧`;
}

function compileDeviation(rubro) {
  const entry = mindConfig.rubro_map?.[rubro]?.rules;
  if (!entry) return null;
  return `◇(${Object.entries(entry).map(([k, v]) => `${k}:${v}`).join('|')})`;
}

// ── UTILS ─────────────────────────────────────────────────────────────────────

function sanitize(input = '') {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w@]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}
