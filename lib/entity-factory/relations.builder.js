/**
 * Construcción de aristas semánticas sobre un índice plano.
 * Cada función es exportada para testing unitario independiente.
 */

import { COMPLEMENTARY_BY_TYPE, FALLBACK_PATTERNS } from './relations.constants.js';
import { intersect, distanceScore } from './relations.helpers.js';

export function findSimilar(entry, cityIndex) {
  return cityIndex
    .filter(other => other.id !== entry.id)
    .map(other => {
      let score = 0;
      if (other.tipo === entry.tipo) score += 3;
      score += intersect(entry.semantic?.intentMatches, other.semantic?.intentMatches).length * 2;
      score += intersect(entry.keywords, other.keywords).length;
      return { id: other.id, score };
    })
    .filter(x => x.score >= 4)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map(x => x.id);
}

export function findNearby(entry, cityIndex) {
  return cityIndex
    .filter(other => other.id !== entry.id)
    .map(other => ({ id: other.id, distance: distanceScore(entry, other) }))
    .filter(x => x.distance !== null)
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 5)
    .map(x => x.id);
}

export function findComplementary(entry, cityIndex) {
  const targets = COMPLEMENTARY_BY_TYPE[entry.tipo] || [];
  if (!targets.length) return [];
  return cityIndex
    .filter(other => other.id !== entry.id && targets.includes(other.tipo))
    .slice(0, 5)
    .map(other => other.id);
}

export function findFallbackWhenClosed(entry, cityIndex) {
  return cityIndex
    .filter(other => other.id !== entry.id && other.tipo === entry.tipo)
    .filter(other => {
      const p = other.temporal?.availabilityPatterns || [];
      return p.some(pattern => FALLBACK_PATTERNS.includes(pattern));
    })
    .slice(0, 5)
    .map(other => other.id);
}

export function findSameAudience(entry, cityIndex) {
  return cityIndex
    .filter(other => other.id !== entry.id)
    .filter(other => intersect(entry.semantic?.audiences, other.semantic?.audiences).length > 0)
    .slice(0, 5)
    .map(other => other.id);
}

export function findSameOccasion(entry, cityIndex) {
  return cityIndex
    .filter(other => other.id !== entry.id)
    .filter(other => intersect(entry.semantic?.occasions, other.semantic?.occasions).length > 0)
    .slice(0, 5)
    .map(other => other.id);
}

function buildRelations(entry, cityIndex) {
  return {
    semantic: {
      similar:      findSimilar(entry, cityIndex),
      sameAudience: findSameAudience(entry, cityIndex),
      sameOccasion: findSameOccasion(entry, cityIndex),
    },

    operational: {
      complementary:      findComplementary(entry, cityIndex),
      fallbackWhenClosed: findFallbackWhenClosed(entry, cityIndex),
    },

    spatial: {
      nearby: findNearby(entry, cityIndex),
    },
  };
}

export function buildRelationsForCity(cityIndex) {
  return cityIndex.map(entry => ({
    ...entry,
    relations: buildRelations(entry, cityIndex),
  }));
}
