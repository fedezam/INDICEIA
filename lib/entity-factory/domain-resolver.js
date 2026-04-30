// lib/entity-factory/domain-resolver.js
// ⟦ROLE⟧ Resuelve domain tag a partir de señales del context.
// Pure function. NO LER. NO side effects.

import { resolveRubro } from './rubro-resolver.js';

// Único lugar donde vive el mapeo código → domain_tag.
// card.compiler.js y mind.builder.js consumen esto.
export const TIPO_TO_DOMAIN = {
  FRR: 'food.restaurant',
  ALI: 'food.retail',
  MOD: 'fashion.retail',
  SAL: 'health.clinic',
  BIE: 'health.wellness',
  EST: 'beauty.salon',
  DEP: 'sports.gym',
  FAR: 'health.pharmacy',
  HOM: 'home.store',
  VEH: 'auto.repair',
  PRO: 'professional.service',
  EDU: 'education.institute',
  MAS: 'pets.vet',
  INM: 'real.estate',
  EVT: 'events.venue',
  TRV: 'travel.agency',
  AGR: 'agro.supply',
  FIN: 'finance.service',
  TEC: 'tech.retail',
  INS: 'institution.public',
  OFI: 'home.services',
};

export function resolveDomain(context = {}, data = {}) {
  const { tipo } = resolveRubro(context, data);

  if (tipo !== 'GEN' && TIPO_TO_DOMAIN[tipo]) {
    return {
      domain_tag:        TIPO_TO_DOMAIN[tipo],
      domain_confidence: 'heuristic',
      domain_source:     'rubro-resolver',
    };
  }

  return {
    domain_tag:        'commerce.generic',
    domain_confidence: 'low',
    domain_source:     'fallback',
  };
}
