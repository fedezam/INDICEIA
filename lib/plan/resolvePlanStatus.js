// lib/plan/resolvePlanStatus.js
// ⟦ROLE⟧ Calcula el estado REAL de un plan en el momento de la lectura,
// sin depender exclusivamente del cron (plan-expiration-check.js).
//
// Por qué existe: el cron corre 1 vez al día y escribe plan.active=false
// en Firestore cuando detecta vencimiento. Entre corridas hay un gap de
// hasta 24hs donde Firestore todavía dice active:true aunque expires_at
// ya haya pasado. Esta función cierra ese gap calculando en tiempo real,
// mismo principio que getHoraActual()/getDiaComercialActual(): no confiar
// en un valor pre-calculado guardado, calcularlo fresco en cada request.
//
// Esta función NO escribe a Firestore. Es de solo lectura — el cron
// sigue siendo el responsable de la escritura y los side effects
// (regeneración de entidad, notificaciones, referral, etc).
//
// reason posibles:
//   'no_plan'       → la entidad no tiene plan asignado
//   'inactive'      → plan.active=false y sin reason específico
//   'trial_expired' → venció el trial (detectado en tiempo real)
//   'plan_expired'  → venció un plan pago (detectado en tiempo real)
//   'ok'            → activo y vigente

export function resolvePlanStatus(plan) {
  if (!plan) {
    return { active: false, reason: 'no_plan' };
  }

  const now = Date.now();
  const expiresAtMs = plan.expires_at?.toMillis?.() ?? null;

  // Firestore ya lo marcó inactivo (el cron ya corrió y procesó esto) → confiamos
  if (!plan.active) {
    return { active: false, reason: plan.reason || 'inactive' };
  }

  // Firestore todavía dice activo, pero expires_at ya pasó y el cron
  // todavía no corrió sobre esta entidad — gap de hasta 24hs cerrado acá.
  if (expiresAtMs && now >= expiresAtMs) {
    return { active: false, reason: plan.trial ? 'trial_expired' : 'plan_expired' };
  }

  return { active: true, reason: 'ok' };
}

// Días hasta expires_at. Positivo = faltan N días, 0 = vence hoy,
// negativo = ya venció. null si no hay expires_at (ej. no_plan).
// Mismo principio que resolvePlanStatus: se calcula fresco, no se guarda.
export function getDiasHastaVencimiento(plan) {
  const expiresAtMs = plan?.expires_at?.toMillis?.() ?? null;
  if (!expiresAtMs) return null;

  const msPorDia = 1000 * 60 * 60 * 24;
  return Math.ceil((expiresAtMs - Date.now()) / msPorDia);
}
