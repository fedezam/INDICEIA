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

function buildOps(node) {
  const caps = node.capabilities || {};
  const ops  = node.operational  || {};
