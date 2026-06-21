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
//
// NOTA: shapes se indexa por entityType (comercio/prestador/profesional/agro/finanzas/institucion/soporte)
// NO por código de rubro (FRR/ALI/MOD...) — son dimensiones distintas.
// Los rubros son validados en business-semantic-profiles.js.

export const shapes = {

  // ── COMERCIO ─────────────────────────────────────────────
  comercio: {
    truths: [
      'CATALOG_ONLY',
      '¬CATALOG⇒∅',
      '¬AVAILABLE⇒∅',
      // dual_mode(app∨chat) invitaba al LLM a tratar el chat como sustituto
      // intercambiable de la mini app para resolver el catálogo completo.
      // Ahora: si hay visual, se sugiere; el chat sigue siendo siempre conversacional.
      'VISUAL⇒suggest_app∧chat_always_conversational',
    ],
    caps: {
      checkout: { fields: ['id', 'price', 'total', 'delivery'] },
      scope:    'catalog',
      memory:   'ctx',
    },
    flow:  'intent→verify→filter→respond→assist',
    extra: [
      'list_catalog_text',
      'build_catalog_view',
      'enumerate_full_catalog',
    ],
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

  // ── AGRO ─────────────────────────────────────────────────
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

  // ── FINANZAS ─────────────────────────────────────────────
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

  // ── INSTITUCIÓN ──────────────────────────────────────────
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

  // ── SOPORTE ──────────────────────────────────────────────
  soporte: {
    truths: [
      'MANUAL_ONLY',
      '¬MANUAL⇒admit_unknown',
      'ANSWER⇒from_context_only',
      'DOUBT⇒preguntar_hasta_ubicar',
    ],
    caps: {
      scope:  'manual',
      memory: 'ctx',
    },
    flow:  'intent→locate→resolve→assist',
    extra: [
      'invent_procedure',
      'guarantee_result',
      'replace_human_support',
    ],
  },

};

// ── Validación de entityTypes requeridos ─────────────────────
// shapes se indexa por entityType, NO por código de rubro.
// Los rubros (FRR/ALI/MOD...) son validados en business-semantic-profiles.js.
const REQUIRED_ENTITY_TYPES = ['comercio', 'prestador', 'profesional'];
const faltantes = REQUIRED_ENTITY_TYPES.filter(t => !shapes[t]);
if (faltantes.length) {
  console.error(`[mind.shapes] ⚠️ EntityTypes sin shape: ${faltantes.join(', ')} — revisar mind.shapes.js`);
}
