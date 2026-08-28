/**
 * vocab-relations.resolver.js
 *
 * Lee las relaciones del grafo desde business-vocabulary.json (fuente única,
 * src/shared/ — mismo archivo que rubro-resolver.js). Fallback a
 * relations.constants.js (legado) para tipos que todavía no tengan
 * `relaciones` cargado ahí — no debería pasar en v4.3 (27/27 tipos cubiertos),
 * pero el fallback queda como red de seguridad ante ediciones futuras del vocab.
 *
 * Formato (v4.3+): array de aristas tipadas, no mapas fijos.
 *   { hacia: 'VEH', tipo: 'complementario', peso: 0.88, nota: '...' }
 *
 * Esto permite agregar tipos de relación nuevos (ej. 'temporada',
 * 'geografico', 'capacidad_ofrecida') sin tocar código — el LLM que
 * consume el grafo lee la arista y el campo `nota` en lenguaje natural.
 */
import vocab from '../../src/shared/business-vocabulary.json' with { type: 'json' };
import {
  COMPLEMENTARY_BY_TYPE,
  SAME_AUDIENCE_BY_TYPE,
  SAME_OCCASION_BY_TYPE,
} from './relations.constants.js';

const tipoIndex = Object.fromEntries(
  vocab.tipos.map(t => [t.codigo, t])
);

// Mapea el nombre de tipo de arista nuevo -> mapa legado equivalente,
// para el fallback cuando el tipo todavía no tiene `relaciones` en el vocab.
const LEGACY_FALLBACK = {
  complementario: COMPLEMENTARY_BY_TYPE,
  misma_audiencia: SAME_AUDIENCE_BY_TYPE,
  misma_ocasion: SAME_OCCASION_BY_TYPE,
};

/**
 * Devuelve las aristas de un tipo, opcionalmente filtradas por tipoRelacion.
 * Si el tipo no tiene `relaciones` en el vocabulario, cae al mapa legado
 * correspondiente (si existe) y lo normaliza al mismo shape de arista.
 */
export function getRelaciones(codigo, tipoRelacion = null) {
  const entry = tipoIndex[codigo];
  const aristas = entry?.relaciones;

  if (aristas && aristas.length) {
    return tipoRelacion ? aristas.filter(r => r.tipo === tipoRelacion) : aristas;
  }

  // Fallback legado: solo cubre los 3 tipos de relación que existían antes.
  if (tipoRelacion && LEGACY_FALLBACK[tipoRelacion]) {
    const targets = LEGACY_FALLBACK[tipoRelacion][codigo] || [];
    return targets.map(hacia => ({ hacia, tipo: tipoRelacion, peso: null }));
  }

  if (!tipoRelacion) {
    // sin filtro: junta lo que haya en los 3 mapas legado
    return Object.entries(LEGACY_FALLBACK).flatMap(([tipo, map]) =>
      (map[codigo] || []).map(hacia => ({ hacia, tipo, peso: null }))
    );
  }

  return [];
}

// Helpers de conveniencia — mismo output que las funciones viejas
// (array de códigos), para que relations.builder.js cambie lo mínimo.
export const getComplementary = codigo =>
  getRelaciones(codigo, 'complementario').map(r => r.hacia);

export const getSameAudience = codigo =>
  getRelaciones(codigo, 'misma_audiencia').map(r => r.hacia);

export const getSameOccasion = codigo =>
  getRelaciones(codigo, 'misma_ocasion').map(r => r.hacia);

export const getPrioridad = codigo =>
  tipoIndex[codigo]?.prioridad ?? null;