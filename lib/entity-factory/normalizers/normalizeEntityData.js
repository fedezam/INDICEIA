// ============================================================
// lib/entity-factory/normalizers/normalizeEntityData.js
// ============================================================
//
// Entry point del sistema de normalización.
// Se llama UNA VEZ antes de todos los builders.
//
// Flujo:
//   Firestore rawData
//         ↓
//   normalizeEntityData(rawData)
//         ↓
//   normalizedData
//         ↓
//   buildContext() / buildSeo() / buildIndex() / buildMind() / ...
//
// Agregar nuevos normalizers acá cuando aparezcan nuevas aristas.
//
// ============================================================

import { normalizeProfessional } from './normalizeProfessional.js';

/**
 * Normaliza rawData de Firestore según el entityType.
 * Garantiza que todos los builders reciban el shape canónico universal.
 *
 * @param {Object} data — rawData de Firestore
 * @returns {Object} — data normalizada (nunca muta el original)
 */
export function normalizeEntityData(data) {
  if (!data) return data;

  switch (data.entityType) {
    case 'profesional':
      return normalizeProfessional(data);

    // Próximas aristas:
    // case 'comercio':   return normalizeComercio(data);
    // case 'prestador':  return normalizePrestador(data);

    default:
      return data;
  }
}
