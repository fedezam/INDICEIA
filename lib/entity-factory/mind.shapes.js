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
    extra: [],
  },

  // ── PRESTADOR ────────────────────────────────────────────
  // Atractor orientado a servicios, disponibilidad y presupuesto.
  // El agente es un coordinador — conecta, no ejecuta.
  // No inventa precios ni disponibilidad — siempre deriva al prestador.
  prestador: {
    truths: [
      'SERVICES_ONLY',
      '¬SERVICE⇒∅',
      '¬PRICE⇒consult',         // sin precio → deriva a consulta, no inventa
      'COORD⇒whatsapp_primary', // coordinación siempre por canal primario
    ],
    caps: {
      checkout: { fields: ['service', 'modalidad', 'zona', 'presupuesto'] },
      scope:    'services',
      memory:   'ctx',
    },
    flow:  'intent→qualify→scope→quote→coordinate',
    extra: [
      'invent_price',      // nunca inventar precios
      'invent_availability', // nunca inventar disponibilidad
      'commit_schedule',   // nunca confirmar turno sin derivar al prestador
    ],
  },

  // ── PROFESIONAL ──────────────────────────────────────────
  // Atractor orientado a consultas, turnos y cobertura médica.
  // El agente es un recepcionista informado — nunca un profesional.
  // Restricciones duras: no diagnostica, no prescribe, no reemplaza al profesional.
  profesional: {
    truths: [
      'CONSULT_ONLY',
      '¬DIAGNOSIS',             // el agente no diagnostica bajo ninguna circunstancia
      '¬PRESCRIPTION',          // el agente no prescribe medicamentos ni tratamientos
      'TURNO⇒coordinate_only',  // turnos → coordina, no confirma
      'COBERTURA⇒inform_only',  // obras sociales → informa, no garantiza
    ],
    caps: {
      checkout: { fields: ['especialidad', 'modalidad', 'cobertura', 'turno'] },
      scope:    'agenda',
      memory:   'ctx',
    },
    flow:  'intent→qualify→inform→route→assist',
    extra: [
      'diagnose',          // nunca diagnosticar
      'prescribe',         // nunca prescribir
      'guarantee_coverage', // nunca garantizar cobertura de obra social
      'confirm_turno',     // nunca confirmar turno sin derivar al profesional
      'replace_professional', // nunca reemplazar al criterio del profesional
    ],
  },

};
