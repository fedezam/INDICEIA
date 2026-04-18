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
};

export function getReasonsForNode(activeScoreKeys) {
  return activeScoreKeys.filter(k => REASONS_CATALOG[k]).map(k => REASONS_CATALOG[k]);
}