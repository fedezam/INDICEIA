/**
 * card.compiler.js
 * ⟦ROLE⟧ Pure compiler. Input: enriched node. Output: LER card string.
 * NO lógica de negocio. NO invención. NO prose.
 * Si un campo no existe → bloque omitido.
 */

import { CONTEXTUAL_AFFINITY, TYPE_PRIORITY } from './relations.constants.js';

// ─────────────────────────────────────────────────────────────
// DOMAIN MAP
// ─────────────────────────────────────────────────────────────
const DOMAIN_MAP = {
  FRR: 'food.restaurant',
  ALI: 'food.retail',
  MOD: 'fashion.retail',
  SAL: 'health.clinic',
  BIE: 'health.wellness',
  EST: 'beauty.salon',
  DEP: 'sports.gym',
  FAR: 'health.pharmacy',
  HOM: 'home.store',
  VEH: 'auto.repair',
  PRO: 'professional.service',
  EDU: 'education.institute',
  MAS: 'pets.vet',
  INM: 'real.estate',
  EVT: 'events.venue',
  TRV: 'travel.agency',
  AGR: 'agro.supply',
  FIN: 'finance.service',
  TEC: 'tech.retail',
  INS: 'institution.public',
};

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────

// Toma un array, devuelve los primeros N como string pipe-separado
function pipe(arr = [], max = 5) {
  if (!arr?.length) return null;
  return arr.slice(0, max).join('|');
}

// Toma un objeto {key: score}, devuelve los N más altos como "K=V∧K=V"
function affinity(obj = {}, max = 4) {
  if (!obj || !Object.keys(obj).length) return null;
  return Object.entries(obj)
    .sort((a, b) => b[1] - a[1])
    .slice(0, max)
    .map(([k, v]) => `${k}=${v}`)
    .join('∧');
}

// Convierte capabilities a flags LER
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

  if (ops.walkInFriendly)       parts.push('walkin');
  if (ops.urgencyCompatible)    parts.push('urgency');
  if (ops.bookingRequired)      parts.push('booking_required');
  if (ops.estimatedResponseTime === 'fast') parts.push('fast_response');

  if (ops.estimatedDeliveryTime) parts.push(`eta=${ops.estimatedDeliveryTime}`);

  return parts.length ? parts.join('∧') : null;
}

// Construye bloque REL desde relations enriquecidas
function buildRel(node) {
  const rel = node.relations || {};
  const parts = [];

  const comp     = rel.complementary?.slice(0, 4);
  const fallback = rel.fallbackWhenClosed?.slice(0, 3);
  const aud      = rel.sameAudience?.slice(0, 3);
  const occ      = rel.sameOccasion?.slice(0, 3);

  // Soporta tanto arrays de strings como arrays de objetos {id}
  const ids = arr => arr?.map(x => typeof x === 'string' ? x : x.id).filter(Boolean);

  if (ids(comp)?.length)     parts.push(`comp(${ids(comp).join('|')})`);
  if (ids(fallback)?.length) parts.push(`fallback(${ids(fallback).join('|')})`);
  if (ids(aud)?.length)      parts.push(`aud(${ids(aud).join('|')})`);
  if (ids(occ)?.length)      parts.push(`occ(${ids(occ).join('|')})`);

  return parts.length ? parts.join('∧') : null;
}

// ─────────────────────────────────────────────────────────────
// COMPILER PRINCIPAL
// ─────────────────────────────────────────────────────────────

/**
 * Compila un nodo enriquecido a su card LER comprimida.
 * @param {object} node - Nodo completo del índice (post-enriquecimiento)
 * @returns {string} LER card string
 */
export function compileCard(node) {
  const lines = [];

  // Header
  lines.push('⦓LER:v1.1⦔');
  lines.push(`@node:${node.id}`);

  // Domain
  const domain = DOMAIN_MAP[node.tipo] || `unknown.${node.tipo?.toLowerCase() || 'gen'}`;
  lines.push(`DOMAIN:${domain}`);

  // CARD — perfil base del nodo
  const moods    = pipe(node.semantic?.moods, 4);
  const cardParts = ['IndexNode'];
  if (moods) cardParts.push(moods);
  lines.push(`CARD:⟦${cardParts.join('|')}⟧`);

  // SEM — contexto semántico
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

  // TEMP — contexto temporal
  const peaks    = pipe(node.temporal?.peakMoments, 4);
  const seasons  = pipe(node.temporal?.seasonalTags, 3);
  const patterns = pipe(node.temporal?.availabilityPatterns, 3);
  const tempParts = [];
  if (peaks)    tempParts.push(`peak(${peaks})`);
  if (seasons)  tempParts.push(`season(${seasons})`);
  if (patterns) tempParts.push(`pattern(${patterns})`);
  if (tempParts.length) lines.push(`TEMP:⟦${tempParts.join('∧')}⟧`);

  // OPS — capacidades operacionales
  const ops = buildOps(node);
  if (ops) lines.push(`OPS:⟦${ops}⟧`);

  // REL — relaciones del grafo
  const rel = buildRel(node);
  if (rel) lines.push(`REL:⟦${rel}⟧`);

  // AFF — afinidad contextual por tipo
  const aff = affinity(CONTEXTUAL_AFFINITY[node.tipo], 4);
  if (aff) lines.push(`AFF:⟦${aff}⟧`);

  // TRUST — score de completitud
  const trust = node.trust?.completenessScore;
  if (trust !== undefined) lines.push(`TRUST:${trust}`);

  // Restricción base
  lines.push('⛔:⟦¬invent∧¬lie∧¬internal⟧');

  return lines.join('\n');
}

/**
 * Inyecta la card en cada nodo de un índice enriquecido.
 * @param {Array} enrichedIndex
 * @returns {Array} índice con campo `card` en cada nodo
 */
export function compileIndexCards(enrichedIndex) {
  if (!Array.isArray(enrichedIndex)) return enrichedIndex;
  return enrichedIndex.map(node => ({
    ...node,
    card: compileCard(node),
  }));
}
