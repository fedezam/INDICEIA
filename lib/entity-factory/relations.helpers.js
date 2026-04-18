/**
 * Helpers puros para cálculo de relaciones semánticas y geográficas.
 */

/**
 * Intersección segura entre dos arrays.
 */
export function intersect(a = [], b = []) {
  const setB = new Set(b);
  return a.filter(v => setB.has(v));
}

/**
 * Distancia Manhattan ligera sobre lat/lng.
 * Suficiente para orden relativo dentro de una misma ciudad.
 * Devuelve null si faltan coordenadas.
 */
export function distanceScore(a, b) {
  const latA = a?.geo?.localidad?.lat;
  const lngA = a?.geo?.localidad?.lng;
  const latB = b?.geo?.localidad?.lat;
  const lngB = b?.geo?.localidad?.lng;

  if (latA == null || lngA == null || latB == null || lngB == null) return null;
  return Math.abs(latA - latB) + Math.abs(lngA - lngB);
}