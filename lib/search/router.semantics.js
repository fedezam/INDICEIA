/**
 * Pipeline completo: parse → filter → rank → format
 * Exporta internals para testing unitario.
 */

import { parseQuery } from './parseQuery.js';
import { SCORE_WEIGHTS, getReasonsForNode } from './router.config.js';
import { TYPE_PRIORITY, CONTEXTUAL_AFFINITY } from '../../lib/entity-factory/relations.constants.js';
import { resolveActiveTags, countActivePeaks } from '../../lib/search/temporal.resolver.js';

function parseTime(t) { if (!t) return 0; const [h, m] = t.split(':').map(Number); return h + (m || 0) / 60; }

export function filterCandidates(cityIndex, parsed, opts = {}) {
  const { strictMode = true } = opts;
  let candidates = [...cityIndex];

  if (parsed.tipo && parsed.confidence.tipo >= 0.7) candidates = candidates.filter(n => n.tipo === parsed.tipo);
  if (parsed.capabilities?.length) candidates = candidates.filter(n => {
    const caps = Object.keys(n.capabilities || {}).filter(k => n.capabilities[k] === true);
    return parsed.capabilities.some(req => caps.includes(req));
  });
  if (parsed.urgency === 'high') {
    const urgent = candidates.filter(n => n.operational?.urgencyCompatible === true);
    if (urgent.length) candidates = urgent;
  }

  if (parsed.temporal.openNow) {
    const now = new Date();
    const day = ['domingo','lunes','martes','miercoles','jueves','viernes','sabado'][now.getDay()];
    const hour = now.getHours() + now.getMinutes() / 60;
    const open = candidates.filter(n => {
      const s = n.schedule?.presencial?.schedule?.[day] || n.schedule?.delivery?.schedule?.[day];
      if (!s || s.closed) return false;
      return (s.blocks || []).some(b => hour >= parseTime(b.from) && hour <= parseTime(b.to));
    });
    candidates = open.length ? open : (strictMode ? (parsed.tipo ? cityIndex.filter(n => n.tipo === parsed.tipo) : cityIndex) : candidates);
  }

  if (candidates.length === 0 && parsed.tipo) {
    const primary = cityIndex.find(n => n.tipo === parsed.tipo);
    if (primary?.relations?.similar?.length) candidates = cityIndex.filter(n => primary.relations.similar.includes(n.id));
    if (candidates.length === 0 && primary?.relations?.fallbackWhenClosed?.length) candidates = cityIndex.filter(n => primary.relations.fallbackWhenClosed.includes(n.id));
  }

  return candidates.length ? candidates : [...cityIndex];
}

export function rankCandidates(candidates, parsed, cityIndex, opts = {}) {
  const { maxResults = 10 } = opts;
  const ref = cityIndex.find(n => n.geo?.localidad?.lat) || null;

  // Calcular tags temporales activos una sola vez para toda la query
  const activeTags = resolveActiveTags(new Date());

  return candidates.map(node => {
    let score = 0, reasons = [];

    // ── Scores existentes ──────────────────────────────────────

    if (parsed.tipo && node.tipo === parsed.tipo && parsed.confidence.tipo >= 0.7) {
      score += SCORE_WEIGHTS.exactTipo; reasons.push('exactTipo');
    }

    if (parsed.normalized && node.keywords?.length) {
      const m = node.keywords.filter(k => parsed.normalized.includes(k));
      if (m.length) { score += SCORE_WEIGHTS.keywordMatch * Math.min(m.length, 3); reasons.push('keywordMatch'); }
    }

    if (parsed.intents?.length && node.semantic?.intentMatches?.length) {
      const m = parsed.intents.filter(i => node.semantic.intentMatches.includes(i));
      if (m.length) { score += SCORE_WEIGHTS.intentMatch * m.length; reasons.push('intentMatch'); }
    }

    if (parsed.capabilities?.length) {
      const caps = Object.keys(node.capabilities || {}).filter(k => node.capabilities[k]);
      const m = parsed.capabilities.filter(c => caps.includes(c));
      if (m.length) { score += SCORE_WEIGHTS.capabilityMatch * m.length; reasons.push('capabilityMatch'); }
    }

    if (parsed.temporal.openNow) {
      const now = new Date();
      const day = ['domingo','lunes','martes','miercoles','jueves','viernes','sabado'][now.getDay()];
      const hour = now.getHours() + now.getMinutes() / 60;
      const s = node.schedule?.presencial?.schedule?.[day] || node.schedule?.delivery?.schedule?.[day];
      if (s && !s.closed && (s.blocks || []).some(b => hour >= parseTime(b.from) && hour <= parseTime(b.to))) {
        score += SCORE_WEIGHTS.openNow; reasons.push('openNow');
      }
    }

    if (parsed.urgency === 'high' && node.operational?.urgencyCompatible) {
      score += SCORE_WEIGHTS.urgencyCompatible; reasons.push('urgencyCompatible');
    }

    if (parsed.geo?.nearUser && node.geo?.localidad?.lat && ref) {
      const d = Math.abs(node.geo.localidad.lat - ref.geo.localidad.lat) + Math.abs(node.geo.localidad.lng - ref.geo.localidad.lng);
      if (d < 0.01) { score += SCORE_WEIGHTS.nearby; reasons.push('nearby'); }
    }

    if (parsed.audience && node.semantic?.audiences?.includes(parsed.audience)) {
      score += SCORE_WEIGHTS.sameAudience; reasons.push('sameAudience');
    }

    if (parsed.occasion && node.semantic?.occasions?.includes(parsed.occasion)) {
      score += SCORE_WEIGHTS.sameOccasion; reasons.push('sameOccasion');
    }

    // ── Scores semánticos ──────────────────────────────────────

    const priority = TYPE_PRIORITY[node.tipo];
    if (priority !== undefined) {
      score += priority * SCORE_WEIGHTS.typePriority;
      reasons.push('typePriority');
    }

    if (parsed.tipo && parsed.tipo !== node.tipo) {
      const affinity = CONTEXTUAL_AFFINITY[parsed.tipo]?.[node.tipo];
      if (affinity && affinity >= 0.40) {
        score += affinity * SCORE_WEIGHTS.contextualAffinity;
        reasons.push('contextualAffinity');
      }
    }

    // ── Peak moment boost ──────────────────────────────────────
    // Cuántos peakMoments del nodo coinciden con el momento actual.
    // Expandible: temporal.resolver.js agrega feriados, clima, eventos.
    const activePeaks = countActivePeaks(node, activeTags);
    if (activePeaks > 0) {
      score += activePeaks * SCORE_WEIGHTS.peakMoment;
      reasons.push('peakMoment');
    }

    return {
      id: node.id,
      nombre: node.nombre,
      tipo: node.tipo,
      score,
      reasons: getReasonsForNode(reasons),
      _node: node,
    };
  })
  .filter(r => r.score > 0)
  .sort((a, b) => b.score - a.score)
  .slice(0, maxResults);
}

export function formatResults(ranked, parsed, opts = {}) {
  return {
    parsedQuery: {
      raw:        parsed.raw,
      tipo:       parsed.tipo,
      intents:    parsed.intents,
      temporal:   parsed.temporal,
      urgency:    parsed.urgency,
      confidence: parsed.confidence,
    },
    totalCandidates: ranked.length,
    results: ranked.map(({ _node, ...rest }) => rest),
  };
}

export async function resolveQuery(query, cityIndex, opts = {}) {
  const parsed   = parseQuery(query);
  const filtered = filterCandidates(cityIndex, parsed, opts);
  const ranked   = rankCandidates(filtered, parsed, cityIndex, opts);
  return formatResults(ranked, parsed, opts);
}
