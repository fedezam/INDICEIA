// ============================================================
// lib/entity-factory/base/validate-semantic-profile.js
// ============================================================
// Validator semántico de perfiles.
// NO throw. Devuelve array de errores estructurados.
// ============================================================

import {
  RESPONSE_TIMES,
  DELIVERY_TIMES,
  URGENCY_LEVELS,
  PEAK_MOMENTS,
  SEASONAL_TAGS,
  OCCASIONS,
  AUDIENCES,
  MOODS,
  INTENTS,
} from './semantic-vocabulary.js';

// ── Reglas de validación ─────────────────────────────────────
const FIELD_RULES = [
  { field: 'intents',              vocab: INTENTS,          required: true  },
  { field: 'moods',                vocab: MOODS,            required: true  },
  { field: 'occasions',            vocab: OCCASIONS,        required: true  },
  { field: 'audiences',            vocab: AUDIENCES,        required: true  },
  { field: 'peakMoments',          vocab: PEAK_MOMENTS,     required: true  },
  { field: 'seasonalTags',         vocab: SEASONAL_TAGS,    required: true  },
  { field: 'bestFor',              vocab: null,             required: false },
];

const OPERATIONAL_RULES = [
  { field: 'estimatedResponseTime', vocab: RESPONSE_TIMES, required: false },
  { field: 'estimatedDeliveryTime', vocab: DELIVERY_TIMES, required: false },
];

// ── Validator principal ──────────────────────────────────────

export function validateSemanticProfiles(profiles) {
  const errors = [];

  for (const [tipo, profile] of Object.entries(profiles)) {

    // Urgencia (campo directo)
    if (profile.urgency && !URGENCY_LEVELS.includes(profile.urgency)) {
      errors.push({
        tipo,
        field: 'urgency',
        invalid: [profile.urgency],
      });
    }

    // Arrays directos del profile
    for (const rule of FIELD_RULES) {
      const values = profile[rule.field];
      if (!values) {
        if (rule.required) {
          errors.push({
            tipo,
            field: rule.field,
            invalid: ['__missing__'],
          });
        }
        continue;
      }
      if (!Array.isArray(values)) {
        errors.push({
          tipo,
          field: rule.field,
          invalid: ['__not_array__'],
        });
        continue;
      }
      if (rule.vocab) {
        const bad = values.filter(v => !rule.vocab.includes(v));
        if (bad.length) {
          errors.push({ tipo, field: rule.field, invalid: bad });
        }
      }
    }

    // Operational (campo anidado)
    const ops = profile.operational;
    if (!ops) {
      errors.push({ tipo, field: 'operational', invalid: ['__missing__'] });
      continue;
    }
    for (const rule of OPERATIONAL_RULES) {
      const val = ops[rule.field];
      if (val === null || val === undefined) continue;
      if (!rule.vocab.includes(val)) {
        errors.push({
          tipo,
          field: `operational.${rule.field}`,
          invalid: [val],
        });
      }
    }
  }

  return errors;
}
