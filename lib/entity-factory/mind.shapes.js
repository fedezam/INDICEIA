// lib/entity-factory/mind.shapes.js
// ⟦ROLE⟧ Define la forma del atractor semántico por entityType.
// El mind.builder.js inyecta estos valores en el LER base.
// Cada shape mueve el espacio semántico del agente — NO cambia su identidad.
//
// Regla de diseño:
//   TRUTH  → qué es verdad para este tipo de entidad
//   CAP    → qué operaciones puede ejecutar el agente
//   FLOW   → cómo procesa la intención del usuario
//   EXTRA  → restricciones adicionales específicas del tipo

import vocab from './base/business-vocabulary.json' with { type: 'json' };

export const shapes = {

  // ── COMERCIO ─────────────────────────────────────────────
  comercio: {
    truths: [
      'CATALOG_ONLY',
      '¬CATALOG⇒∅',
      '¬AVAILABLE⇒∅',
      'VISUAL⇒dual_mode(app∨chat)',
    ],
    caps: {
      checkout: { fields: ['id', 'price', 'total', 'delivery'] },
      scope:    'catalog',
      memory:   'ctx',
    },
    flow:  'intent→verify→filter→respond→assist',
    extra: ['list_catalog_text'],
  },

  // ── PRESTADOR ────────────────────────────────────────────
  prestador: {
    truths: [
      'SERVICES_ONLY',
      '¬SERVICE⇒∅',
      '¬PRICE⇒consult',
      'COORD⇒whatsapp_primary',
    ],
    caps: {
      checkout: { fields: ['service', 'modalidad', 'zona', 'presupuesto'] },
      scope:    'services',
      memory:   'ctx',
    },
    flow:  'intent→qualify→scope→quote→coordinate',
    extra: [
      'invent_price',
      'invent_availability',
      'commit_schedule',
    ],
  },

  // ── PROFESIONAL ──────────────────────────────────────────
  profesional: {
    truths: [
      'CONSULT_ONLY',
      '¬DIAGNOSIS',
      '¬PRESCRIPTION',
      'TURNO⇒coordinate_only',
      'COBERTURA⇒inform_only',
    ],
    caps: {
      checkout: { fields: ['especialidad', 'modalidad', 'cobertura', 'turno'] },
      scope:    'agenda',
      memory:   'ctx',
    },
    flow:  'intent→qualify→inform→route→assist',
    extra: [
      'diagnose',
      'prescribe',
      'guarantee_coverage',
      'confirm_turno',
      'replace_professional',
    ],
  },

  // ── AGR ──────────────────────────────────────────────────
  agro: {
    truths: [
      'CATALOG_ONLY',
      '¬CATALOG⇒∅',
      'SEASON⇒contextual',
      'ZONE⇒coverage_dependent',
      'VOLUME⇒quote_dependent',
      'COMPATIBILITY⇒inform_only',
    ],
    caps: {
      checkout: { fields: ['producto', 'volumen', 'zona', 'temporada'] },
      scope:    'catalog',
      memory:   'ctx',
    },
    flow:  'intent→verify→zone_check→quote→coordinate',
    extra: [
      'invent_availability',
      'agronomic_advice',
      'guarantee_compatibility',
    ],
  },

  // ── FIN ──────────────────────────────────────────────────
  finanzas: {
    truths: [
      'PRODUCTS_ONLY',
      '¬PRODUCT⇒∅',
      'RATE⇒inform_only',
      'APPROVAL⇒institution_only',
      'REGULATION⇒strict',
      'ELIGIBILITY⇒institution_only',
    ],
    caps: {
      checkout: { fields: ['producto', 'requisitos', 'modalidad', 'turno'] },
      scope:    'products',
      memory:   'ctx',
    },
    flow:  'intent→qualify→inform→requirements→coordinate',
    extra: [
      'guarantee_approval',
      'financial_advice',
      'guarantee_rate',
      'commit_product',
      'assess_eligibility',
    ],
  },

  // ── INS ──────────────────────────────────────────────────
  institucion: {
    truths: [
      'INFO_ONLY',
      '¬PROCEDURE⇒∅',
      'TRAMITE⇒inform_only',
      'RESOLUTION⇒institution_only',
      'REQUIREMENTS⇒variable',
      'PROCESS_TIME⇒estimate_only',
      'AREA⇒route_primary',
    ],
    caps: {
      checkout: { fields: ['tramite', 'requisitos', 'area', 'turno'] },
      scope:    'services',
      memory:   'ctx',
    },
    flow:  'intent→identify→inform→requirements→derive',
    extra: [
      'execute_procedure',
      'commit_resolution',
      'replace_official',
      'guarantee_turno',
      'guarantee_requirements',
    ],
  },

};

// ── Validación contra el diccionario ─────────────────────────
const tiposValidos = vocab.tipos.map(t => t.codigo);
const tiposFaltantes = tiposValidos.filter(t => !shapes[t] && !shapes[t.toLowerCase()]);
if (tiposFaltantes.length) {
  console.error(`
[mind.shapes] ⚠️ Tipos sin shape definido: ${tiposFaltantes.join(', ')}

  El diccionario tiene tipos que no tienen shape en mind.shapes.js.
  El sistema usará shapes.comercio como fallback — atractor incorrecto.

  ¿Qué hacer?
  → Abrí lib/entity-factory/mind.shapes.js
  → Agregá un shape para cada tipo faltante siguiendo la estructura:

    ${tiposFaltantes[0]}: {
      truths: [...],
      caps:   { checkout: { fields: [...] }, scope: '...', memory: 'ctx' },
      flow:   'intent→...',
      extra:  [...],
    },

  Tipos faltantes: ${tiposFaltantes.join(', ')}
  Diccionario:     lib/entity-factory/base/business-vocabulary.json
  `);
}
