/**
 * card.compiler.js
 * ⟦ROLE⟧ Pure compiler. Input: enriched node. Output: LER card string.
 * NO lógica de negocio. NO invención. NO prose.
 * Si un campo no existe → bloque omitido.
 */

import { CONTEXTUAL_AFFINITY, TYPE_PRIORITY } from '../relations.constants.js';
import { TIPO_TO_DOMAIN } from '../domain-resolver.js';

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────

function pipe(arr = [], max = 5) {
  if (!arr?.length) return null;
  return arr.slice(0, max).join('|');
}

function affinity(obj = {}, max = 4) {
  if (!obj || !Object.keys(obj).length) return null;
  return Object.entries(obj)
    .sort((a, b) => b[1] - a[1])
    .slice(0, max)
    .map(([k, v]) => `${k}=${v}`)
    .join('∧');
}

function compactEdge(edge) {
  if (typeof edge === 'string') return edge;
  if (edge?.id && edge?.score !== undefined) return `${edge.id}:${edge.score}`;
  return null;
}

function buildOps(node) {
  const caps = node.capabilities || {};
  const ops  = node.operational  || {};
  const parts = [];

  if (caps.delivery)   parts.push('delivery');
  if (caps.presencial) parts.push('presencial');
  if (caps.salon)      parts.push('salon');
  if (caps.pickup)     parts.push('pickup');
  if (caps.takeaway)   parts.push('takeaway');
  if (caps.virtual)    parts.push('virtual');
  if (caps.on_site)    parts.push('on_site');

  if (ops.walkInFriendly)       parts.push('walkin');
  if (ops.urgencyCompatible)    parts.push('urgency');
  if (ops.bookingRequired)      parts.push('booking_required');
  if (ops.estimatedResponseTime === 'fast') parts.push('fast_response');

  if (ops.estimatedDeliveryTime) parts.push(`eta=${ops.estimatedDeliveryTime}`);

  return parts.length ? parts.join('∧') : null;
}

const ids = arr => arr?.map(x => typeof x === 'string' ? x : x.id).filter(Boolean);

function buildSemanticRel(node) {
  const rel = node.relations?.semantic || {};
  const parts = [];

  const sim = rel.similar?.slice(0, 4)
    ?.map(compactEdge)
    .filter(Boolean);
  const aud = ids(rel.sameAudience?.slice(0, 3));
  const occ = ids(rel.sameOccasion?.slice(0, 3));

  if (sim?.length) parts.push(`sim(${sim.join('|')})`);
  if (aud?.length) parts.push(`aud(${aud.join('|')})`);
  if (occ?.length) parts.push(`occ(${occ.join('|')})`);

  return parts.length ? parts.join('∧') : null;
}

function buildOperationalRel(node) {
  const rel = node.relations?.operational || {};
  const parts = [];

  const comp     = ids(rel.complementary?.slice(0, 4));
  const fallback = ids(rel.fallbackWhenClosed?.slice(0, 3));

  if (comp?.length)     parts.push(`comp(${comp.join('|')})`);
  if (fallback?.length) parts.push(`fallback(${fallback.join('|')})`);

  return parts.length ? parts.join('∧') : null;
}

function buildSpatialRel(node) {
  const rel = node.relations?.spatial || {};
  const parts = [];

  const near = ids(rel.nearby?.slice(0, 5));

  if (near?.length) parts.push(`near(${near.join('|')})`);

  return parts.length ? parts.join('∧') : null;
}

// ─────────────────────────────────────────────────────────────
// COMPILER PRINCIPAL
// ─────────────────────────────────────────────────────────────

export function compileCard(node) {
  console.log('[card-compiler] node.id:', node.id, '— node.tipo:', node.tipo);
  const lines = [];

  lines.push('⦓LER:v1.1⦔');
  lines.push(`@node:${node.id}`);

  // Domain — desde fuente de verdad única
  const domain = TIPO_TO_DOMAIN[node.tipo] || `unknown.${node.tipo?.toLowerCase() || 'gen'}`;
  lines.push(`DOMAIN:${domain}`);

  // CARD
  const moods    = pipe(node.semantic?.moods, 4);
  const cardParts = ['IndexNode'];
  if (moods) cardParts.push(moods);
  lines.push(`CARD:⟦${cardParts.join('|')}⟧`);

  // SEM
  const intents   = pipe(node.semantic?.intentMatches, 5);
  const moodsAll  = pipe(node.semantic?.moods, 4);
  const audiences = pipe(node.semantic?.audiences, 4);
  const occasions = pipe(node.semantic?.occasions, 4);
  const semParts  = [];
  if (intents)   semParts.push(`intent(${intents})`);
  if (moodsAll)  semParts.push(`mood(${moodsAll})`);
  if (audiences) semParts.push(`audience(${audiences})`);
  if (occasions) semParts.push(`occasion(${occasions})`);
  if (semParts.length) lines.push(`SEM:⟦${semParts.join('∧')}⟧`);

  // TEMP
  const peaks    = pipe(node.temporal?.peakMoments, 4);
  const seasons  = pipe(node.temporal?.seasonalTags, 3);
  const patterns = pipe(node.temporal?.availabilityPatterns, 3);
  const tempParts = [];
  if (peaks)    tempParts.push(`peak(${peaks})`);
  if (seasons)  tempParts.push(`season(${seasons})`);
  if (patterns) tempParts.push(`pattern(${patterns})`);
  if (tempParts.length) lines.push(`TEMP:⟦${tempParts.join('∧')}⟧`);

  // OPS
  const ops = buildOps(node);
  if (ops) lines.push(`OPS:⟦${ops}⟧`);

  // REL — ontológica separada
  const semRel = buildSemanticRel(node);
  if (semRel) lines.push(`SEM_REL:⟦${semRel}⟧`);

  const opsRel = buildOperationalRel(node);
  if (opsRel) lines.push(`OPS_REL:⟦${opsRel}⟧`);

  const geoRel = buildSpatialRel(node);
  if (geoRel) lines.push(`GEO_REL:⟦${geoRel}⟧`);

  // AFF
  const aff = affinity(CONTEXTUAL_AFFINITY[node.tipo], 4);
  if (aff) lines.push(`AFF:⟦${aff}⟧`);

  // TRUST
  const trust = node.trust?.completenessScore;
  if (trust !== undefined) lines.push(`TRUST:${trust}`);

  lines.push('⛔:⟦¬invent∧¬lie∧¬internal⟧');

  return lines.join('\n');
}

export function compileIndexCards(enrichedIndex) {
  if (!Array.isArray(enrichedIndex)) return enrichedIndex;
  return enrichedIndex.map(node => ({
    ...node,
    card: compileCard(node),
  }));
}

