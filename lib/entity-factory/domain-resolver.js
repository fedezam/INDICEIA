// lib/entity-factory/domain-resolver.js
// ⟦ROLE⟧ Resuelve domain tag a partir de señales del context.
// Pure function. NO LER. NO side effects.
//
// v2 — El domain_tag se resuelve por SUBCATEGORÍA (nivel 2), no por tipo (nivel 1).
// Esto es lo que arregla el caso Automotores Norte: VEH-VTA y VEH-TAL
// son negocios distintos y no pueden compartir domain_tag.
//
// v4.3 — Agregadas 6 subcategorías nuevas (MOD-DEP, SEG-FIN, INS-MUN, INS-CLU,
// INS-REL, INS-EDU) y el tipo INS al fallback, para que coincidan con
// business-vocabulary.json v4.3. Sin esto, entidades de esas subcategorías
// caían silenciosamente en 'commerce.generic'.

import { resolveRubro } from './rubro-resolver.js';

// Único lugar donde vive el mapeo subcategoria → domain_tag.
// card.compiler.js y mind.builder.js consumen esto.
// Si agregás una subcategoría nueva en business-vocabulary.json,
// agregala acá también — si no, cae en el fallback commerce.generic.
export const SUBCATEGORIA_TO_DOMAIN = {
  // AGR
  'AGR-INS': 'agro.supply',
  'AGR-MAQ': 'agro.machinery',
  'AGR-SER': 'agro.services',
  // ALI
  'ALI-SUP': 'food.retail',
  'ALI-FRE': 'food.retail',
  // ALT
  'ALT-HOL': 'health.alternative',
  'ALT-ESO': 'professional.esoteric',
  // ART
  'ART-TEJ': 'crafts.textile',
  'ART-CER': 'crafts.artisan',
  // BIE
  'BIE-GYM': 'sports.gym',
  'BIE-SPA': 'health.wellness',
  'BIE-CLU': 'sports.club',
  // CON
  'CON-COR': 'construction.materials',
  'CON-HOR': 'construction.services',
  'CON-TER': 'construction.materials',
  'CON-MAR': 'construction.materials',
  'CON-FER': 'home.store',
  // EDU
  'EDU-ACA': 'education.institute',
  // EST
  'EST-PEL': 'beauty.salon',
  'EST-MAN': 'beauty.salon',
  // EVT
  'EVT-SAL': 'events.venue',
  // FAR
  'FAR-FAR': 'health.pharmacy',
  'FAR-OPT': 'health.optician',
  // FRR
  'FRR-RES': 'food.restaurant',
  'FRR-ROT': 'food.restaurant',
  'FRR-BAR': 'food.cafe',
  'FRR-HEL': 'food.icecream',
  // HOM
  'HOM-BAZ': 'home.store',
  'HOM-DEC': 'home.store',
  'HOM-ELE': 'home.electronics',
  'HOM-LIB': 'home.bookstore',
  // IND
  'IND-BUL': 'industry.hardware',
  'IND-MET': 'industry.metalwork',
  // INM
  'INM-AGE': 'real.estate',
  // INS (nuevo v4.3)
  'INS-MUN': 'institution.government',
  'INS-CLU': 'institution.social',
  'INS-REL': 'institution.worship',
  'INS-EDU': 'education.public',
  // MAD
  'MAD-ASE': 'lumber.raw',
  'MAD-PUE': 'lumber.finished',
  // MAS
  'MAS-VET': 'pets.vet',
  'MAS-PET': 'pets.retail',
  // MOD
  'MOD-ROP': 'fashion.retail',
  'MOD-CAL': 'fashion.footwear',
  'MOD-ACC': 'fashion.accessories',
  'MOD-MUE': 'home.furniture',
  'MOD-DEP': 'fashion.sports', // nuevo v4.3
  // OFI
  'OFI-HUM': 'home.services',
  'OFI-AIR': 'home.hvac',
  'OFI-GAS': 'home.store',
  'OFI-SEC': 'home.services',
  'OFI-CON': 'home.services',
  // PRO
  'PRO-LEG': 'professional.legal',
  'PRO-CON': 'professional.accounting',
  'PRO-IT':  'tech.services',
  'PRO-DIS': 'professional.creative',
  // REP
  'REP-PAN': 'food.bakery',
  'REP-TOR': 'food.bakery',
  // SAL
  'SAL-MED': 'health.clinic',
  'SAL-DEN': 'health.dental',
  'SAL-KIN': 'health.therapy',
  'SAL-LAB': 'health.lab',
  // SEG
  'SEG-PAS': 'finance.insurance',
  'SEG-ART': 'finance.insurance',
  'SEG-FIN': 'finance.credit', // nuevo v4.3
  // TEC
  'TEC-CEL': 'tech.retail',
  'TEC-PC':  'tech.retail',
  // TRV
  'TRV-AGE': 'travel.agency',
  // VEH — acá vivía el bug: antes todo VEH caía en auto.repair
  'VEH-VTA': 'auto.dealer',
  'VEH-MOT': 'auto.dealer',
  'VEH-BIC': 'auto.bicycle',
  'VEH-TAL': 'auto.repair',
  'VEH-REP': 'auto.parts',
  'VEH-AUX': 'auto.roadside',
  'VEH-FLE': 'transport.delivery',
  'VEH-LAV': 'auto.wash',
  // VID
  'VID-CRI': 'home.glass',
  'VID-ALU': 'construction.services',
};

// Fallback por TIPO (nivel 1) — solo se usa si hay tipo pero NO subcategoría
// (entidades viejas migradas a medias, o onboarding sin completar nivel 2).
// Es deliberadamente más genérico que antes: ya no asume una sola subcategoría.
export const TIPO_TO_DOMAIN_FALLBACK = {
  FRR: 'food.generic',
  ALI: 'food.retail',
  ALT: 'health.alternative',
  ART: 'crafts.generic',
  BIE: 'health.wellness',
  CON: 'construction.generic',
  EDU: 'education.institute',
  EST: 'beauty.salon',
  EVT: 'events.venue',
  FAR: 'health.pharmacy',
  HOM: 'home.store',
  IND: 'industry.generic',
  INM: 'real.estate',
  INS: 'institution.generic', // nuevo v4.3
  MAD: 'lumber.generic',
  MAS: 'pets.generic',
  MOD: 'fashion.generic',
  OFI: 'home.services',
  PRO: 'professional.service',
  REP: 'food.bakery',
  SAL: 'health.clinic',
  SEG: 'finance.insurance',
  TEC: 'tech.retail',
  TRV: 'travel.agency',
  VEH: 'auto.generic', // antes era 'auto.repair' — ya no asumimos taller por default
  VID: 'construction.generic',
  AGR: 'agro.supply',
};

// ⚠️ COMPAT: card.compiler.js importa TIPO_TO_DOMAIN directo (bypasea resolveDomain()).
// Alias temporal para no romper producción. TODO: migrar card.compiler.js a usar
// resolveDomain(context, data) en vez de leer este mapa crudo — así también se
// beneficia de la resolución por subcategoría en vez de quedarse en nivel 1.
export const TIPO_TO_DOMAIN = TIPO_TO_DOMAIN_FALLBACK;

export function resolveDomain(context = {}, data = {}) {
  const { tipo, subcategoria } = resolveRubro(context, data);

  // 1. Camino principal: domain por subcategoría exacta
  if (subcategoria && SUBCATEGORIA_TO_DOMAIN[subcategoria]) {
    return {
      domain_tag:        SUBCATEGORIA_TO_DOMAIN[subcategoria],
      domain_confidence: 'explicit',
      domain_source:     'rubro-resolver.subcategoria',
    };
  }

  // 2. Fallback: solo hay tipo (nivel 1), sin subcategoría elegida.
  //    Ya no se asume una subcategoría específica silenciosamente.
  if (tipo && tipo !== 'GEN' && TIPO_TO_DOMAIN_FALLBACK[tipo]) {
    return {
      domain_tag:        TIPO_TO_DOMAIN_FALLBACK[tipo],
      domain_confidence: 'partial',
      domain_source:     'rubro-resolver.tipo_sin_subcategoria',
    };
  }

  // 3. Sin match
  return {
    domain_tag:        'commerce.generic',
    domain_confidence: 'low',
    domain_source:     'fallback',
  };
}
