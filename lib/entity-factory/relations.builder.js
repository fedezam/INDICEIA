/**
 * Construcción de aristas semánticas sobre un índice plano.
 * Cada función es exportada para testing unitario independiente.
 *
 * Migrado (v4.3): complementary / sameAudience / sameOccasion ya no leen
 * directo de relations.constants.js — pasan por vocab-relations.resolver.js,
 * que primero busca `relaciones` en business-vocabulary.json (fuente única,
 * compartida con la clasificación de entidades) y solo cae a las constantes
 * legado para tipos que todavía no las tengan cargadas ahí.
 *
 * FALLBACK_PATTERNS se queda como constante global: no es semántica de tipo,
 * es taxonomía de disponibilidad, no vive en el vocabulario.
 */
import { FALLBACK_PATTERNS } from './relations.constants.js';
import { getComplementary, getSameAudience, getSameOccasion } from './vocab-relations.resolver.js';
import { intersect, distanceScore } from './relations.helpers.js';

const GENERIC_INTENTS = new Set([
  'visitar-local',
  'comprar-en-persona',
  'delivery',
  'pedir-ahora',
  'envio-domicilio',
  'visita-domicilio',
  'coordinar-visita',
  'retirar',
  'takeaway',
  'buscar-pedido',
  'compra-online',
  'tienda-digital',
]);

export function findSimilar(entry, cityIndex) {
  const filterGeneric = intents =>
    (intents || []).filter(i => !GENERIC_INTENTS.has(i));

  return cityIndex
    .filter(other => other.id !== entry.id)
    .map(other => {
      const sharedIntents = intersect(
        filterGeneric(entry.semantic?.intentMatches),
        filterGeneric(other.semantic?.intentMatches)
      );
      const sharedMoods = intersect(entry.semantic?.moods, other.semantic?.moods);
      const sameType    = other.tipo === entry.tipo;

      let score = 0;
      if (sameType) score += 3;
      score += sharedIntents.length * 2;
      score += sharedMoods.length;

      return {
        id: other.id,
        score,
        signals: { sameType, sharedIntents, sharedMoods },
      };
    })
    .filter(x => x.score >= 4)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
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
  const targets = getComplementary(entry.tipo);
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
  const allowed = getSameAudience(entry.tipo);
  return cityIndex
    .filter(other => other.id !== entry.id)
    .filter(other => allowed.includes(other.tipo))
    .map(other => ({
      id: other.id,
      overlap: intersect(entry.semantic?.audiences, other.semantic?.audiences),
    }))
    .filter(x => x.overlap.length >= 1)
    .map(x => ({ id: x.id, score: x.overlap.length, overlap: x.overlap }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
}

export function findSameOccasion(entry, cityIndex) {
  const allowed = getSameOccasion(entry.tipo);
  return cityIndex
    .filter(other => other.id !== entry.id)
    .filter(other => allowed.includes(other.tipo))
    .map(other => ({
      id: other.id,
      overlap: intersect(entry.semantic?.occasions, other.semantic?.occasions),
    }))
    .filter(x => x.overlap.length >= 1)
    .map(x => ({ id: x.id, score: x.overlap.length, overlap: x.overlap }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
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