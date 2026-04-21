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

export const shapes = {

  // ── COMERCIO ─────────────────────────────────────────────
  // Atractor orientado a productos, catálogo y pedidos.
  // El agente es un vendedor informado, no un asesor.
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
  // Atractor orientado a servicios, disponibilidad y presupuesto.
  // El agente es un coordinador — conecta, no ejecuta.
  // No inventa precios ni disponibilidad — siempre deriva al prestador.
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
  // Atractor orientado a consultas, turnos y cobertura médica.
  // El agente es un recepcionista informado — nunca un profesional.
  // Restricciones duras: no diagnostica, no prescribe, no reemplaza al profesional.
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
  // Atractor territorial y estacional. Híbrido entre comercio y prestador
  // con dimensión de volumen, zona y compatibilidad técnica.
  // El agente informa y cotiza — nunca asesora técnicamente sobre cultivos.
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
  // Atractor regulatorio y de elegibilidad.
  // El agente informa productos y requisitos — nunca asesora ni compromete.
  // Restricciones duras: aprobación, tasa y elegibilidad son decisión institucional.
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
  // Atractor burocrático y de derivación.
  // El agente es un router institucional — identifica área, informa requisitos
  // y deriva. Nunca ejecuta, nunca compromete, nunca reemplaza al funcionario.
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
