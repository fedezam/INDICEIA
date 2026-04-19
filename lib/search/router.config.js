/**
 * Contrato de pesos, razones y forma de query parseada.
 * Único punto de tuning para el ranking.
 */

export const SCORE_WEIGHTS = {
  exactTipo:          10,
  keywordMatch:       3,
  intentMatch:        4,
  capabilityMatch:    3,
  openNow:            8,
  urgencyCompatible:  6,
  nearby:             5,
  sameAudience:       2,
  sameOccasion:       2,
  similarRelation:    3,
  fallbackRelation:   4,

  // Nuevos — desempate semántico
  // typePriority: score base normalizado por tipo (SAL=100 → ~2.0 pts, TRV=45 → ~0.9 pts)
  // contextualAffinity: boost cuando el tipo del nodo tiene alta afinidad con el tipo buscado
  typePriority:       0.02,  // multiplicador sobre TYPE_PRIORITY[tipo]
  contextualAffinity: 3,     // multiplicador sobre score de afinidad (0-1)
};

export const REASONS_CATALOG = {
  exactTipo:          'rubro coincide exactamente',
  keywordMatch:       'coincide con palabras clave',
  intentMatch:        'atiende la intención buscada',
  capabilityMatch:    'ofrece el canal solicitado',
  openNow:            'abierto en este momento',
  urgencyCompatible:  'compatible con urgencias',
  nearby:             'cercanía geográfica',
  sameAudience:       'orientado a la audiencia solicitada',
  sameOccasion:       'ideal para la ocasión mencionada',
  similarRelation:    'alternativa similar recomendada',
  fallbackRelation:   'disponible como fallback (horario extendido)',
  typePriority:       'prioridad base por tipo de negocio',
  contextualAffinity: 'afinidad contextual con la búsqueda',
};

export function getReasonsForNode(activeScoreKeys) {
  return activeScoreKeys.filter(k => REASONS_CATALOG[k]).map(k => REASONS_CATALOG[k]);
}
