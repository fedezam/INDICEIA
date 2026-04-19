// lib/entity-factory/builders/mind.builder.js
// ⟦ROLE⟧ Pure compiler. Input: config + context + shape. Output: LER v1.1 string.
// NO lógica. NO detección. NO prose. NO behavioral rules.
// Regla de diseño de símbolos:
//   válido si: (1) grounding semántico fuerte  ∅ ¬ ⇒ ∧ ∨
//           o: (2) sin colisión sintáctica      ⦓⦔ ⧦⧧ ⟦⟧
//           o: (3) ancla estructural fuerte     ⛔ @

import { createHash } from 'crypto';
import { mindConfig } from '../mind.config.js';
import { shapes } from '../mind.shapes.js';

export function buildMind(data, context, referralCode, visualUrl = '') {
  const entityType = data.entityType || 'comercio';
  const shape = shapes[entityType] || shapes.comercio;

  const aiName = sanitize(context.ia?.nombre || 'Assistant');
  const nombreComercio = sanitize(context.nombre || 'commerce');
  const aiTone = sanitize(context.ia?.tono || 'neutral');
  const aiPersonality = sanitize(context.ia?.personalidad || 'friendly');
  const domain = context.domain_tag ?? 'commerce.generic';

  // ⦓⦔ — ancla de protocolo
  const HEADER = `⦓LER:${mindConfig.version}⦔`;

  // @ — identidad, grounding fuerte
  const IDENTITY = `@${aiName}:${nombreComercio}`;

  // PROFILE — más legible para inspección masiva
  const PROFILE = `PROFILE:⟦role=BizRep|tone=${aiTone}|persona=${aiPersonality}|mirror=user⟧`;

  // ⧦⧧ — contenedor sellado
  const IDLOCK = `IDENTITY:⧦${mindConfig.identity}⧧`;
  const DOMAIN = `DOMAIN:${domain}`;

  // TIME — bloque temporal completo
  const TEMPORAL = compileTemporal(context);

  // TRUTH — verdad operativa por shape
  const TRUTH = `TRUTH:⟦${shape.truths.join(' ∧ ')}⟧`;

  // FLOW — pipeline de resolución
  const FLOW = `FLOW:${shape.flow}`;

  // GREET + VISUAL POLICY + MINIAPP
  const GREET = visualUrl
    ? `GREET:⟦visual⇒send_link∧append_availability⟧`
    : null;

  const VISUAL_MODE = visualUrl
    ? `CATALOG:⟦miniapp_exists∧(intent:menu∨intent:catalog∨intent:products∨intent:services∨intent:prices)⇒send_link_first∧summarize_only∧¬full_text_catalog⟧`
    : null;

  const VISUAL_REF = visualUrl
    ? `MINIAPP:${visualUrl}(OnGreet:send_link∧append_availability|OnCatalogIntent:send_link_first∧summarize_only|¬Replace_text)`
    : null;

  // REFERRAL — autopublicidad orgánica
  const referralLink = context.referral_link || null;
  const REFERRAL = referralLink
    ? [
        `REFERRAL:⟦(intent:indiceia∨intent:how_it_works∨after(n=3))⇒offer("¿Te interesa tener tu propio asistente?")∧send_link⟧`,
        `REFERRAL_LINK:${referralLink}`,
      ].join('\n')
    : null;

  // CAP — capacidades operativas
  const CAP = compileCoreCaps(shape.caps);

  // ⛔ — restricciones base + extras del shape
  const allRestrictions = [
    ...mindConfig.restrictions,
    ...shape.extra,
  ];

  const RESTRICT = `⛔:⟦${allRestrictions
    .map(r => `¬${r}`)
    .join('∧')}⟧`;

  const output = [
    HEADER,
    IDENTITY,
    PROFILE,
    IDLOCK,
    DOMAIN,
    TEMPORAL,
    TRUTH,
    FLOW,
    GREET,
    VISUAL_MODE,
    VISUAL_REF,
    REFERRAL,
    CAP,
    RESTRICT,
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

// ── COMPILADORES ─────────────────────────────────────────────

function compileTemporal(context) {
  const tz = context.timezone || 'America/Argentina/Buenos_Aires';

  return [
    `TIME:⟦fetch⇒worldtimeapi∧tz=${tz}⟧`,
    `CLOCK:⟦assume=0∧fail⇒admit_unknown⟧`,
    `SCHEDULE:⟦not_my_hours∧lead_info_only∧response=24/7∧closed≠unavailable⟧`,
  ].join('\n');
}

function compileCoreCaps(caps = {}) {
  const parts = [];

  if (caps.checkout) {
    parts.push(`C(${caps.checkout.fields.join('+')})`);
  }

  if (caps.scope) {
    parts.push(`S(${caps.scope})`);
  }

  if (caps.memory) {
    parts.push(`M(${caps.memory})`);
  }

  if (!parts.length) {
    return 'CAP:⟦none⟧';
  }

  return `CAP:⟦${parts.join('|')}⟧`;
}

// ── UTILS ─────────────────────────────────────────────────────

function sanitize(input = '') {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w@.-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}
