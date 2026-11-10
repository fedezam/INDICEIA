// lib/plan/isIndexable.js
// Una sola regla para el HTML (meta robots) y para el sitemap.
//   - indexable === false  → apagado a mano (demos, pruebas)
//   - en cualquier otro caso → depende del plan (calculado en tiempo real)
import { resolvePlanStatus } from './resolvePlanStatus.js';

export function isIndexable(entidadData) {
  if (entidadData?.indexable === false) return false;
  return resolvePlanStatus(entidadData?.plan).active;
}