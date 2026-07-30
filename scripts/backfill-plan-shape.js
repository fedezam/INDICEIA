// scripts/backfill-plan-shape.js
// ⟦ROLE⟧ Migra entidades existentes cuyo campo `plan` fue escrito por los
// 4 flujos de onboarding viejos (mi-perfil.js, mi-comercio.js,
// mi-perfil-profesional.js, mi-soporte.js) en camelCase
// (startedAt/expiresAt/createdAt/updatedAt) al shape canónico snake_case
// que usa applyPlanStateChange.js / resolvePlanStatus.js
// (started_at/expires_at/updated_at).
//
// Detecta y arregla también el caso mixto (visto en producción): doc con
// AMBOS shapes conviviendo — camelCase con el dato real + snake_case en
// null (por un update parcial posterior, ej. desde el panel admin).
//
// USO:
//   node scripts/backfill-plan-shape.js --dry-run   ← solo reporta, no escribe
//   node scripts/backfill-plan-shape.js              ← aplica los cambios
//
// Requiere FIREBASE_SERVICE_ACCOUNT en el entorno, igual que el resto
// del sistema.

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local', override: true });

import admin from 'firebase-admin';

// ── Parseo robusto de la service account ──────────────────────
// vercel env pull escribe el valor multilínea de FIREBASE_SERVICE_ACCOUNT
// con saltos de línea REALES dentro del JSON (en vez de \n escapado),
// lo cual rompe JSON.parse porque el private_key queda con caracteres
// de control crudos adentro de un string. En producción (Vercel runtime)
// esto no pasa — es un problema únicamente del archivo .env.local bajado
// localmente. Se normaliza acá antes de parsear.
function parseServiceAccount(raw) {
  try {
    return JSON.parse(raw);
  } catch {
    // Escapar saltos de línea SOLO dentro del valor de private_key
    const fixed = raw.replace(
      /"private_key":\s*"([^"]*)"/,
      (_match, keyBody) => `"private_key": "${keyBody.replace(/\n/g, '\\n')}"`
    );
    return JSON.parse(fixed);
  }
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(parseServiceAccount(process.env.FIREBASE_SERVICE_ACCOUNT)),
  });
}
const db = admin.firestore();

const DRY_RUN = process.argv.includes('--dry-run');

function needsMigration(plan) {
  if (!plan) return false;
  // Tiene campos camelCase con dato real, o snake_case faltante/null
  const hasCamelCase = plan.startedAt || plan.expiresAt || plan.createdAt;
  const snakeCaseMissing = !plan.started_at || !plan.expires_at;
  return hasCamelCase && snakeCaseMissing;
}

function buildMigratedPlan(plan) {
  // Preferencia: usar el valor snake_case si ya está bien seteado (no
  // null), si no, caer al camelCase equivalente.
  const started_at = plan.started_at || plan.startedAt || plan.createdAt || null;
  const expires_at = plan.expires_at || plan.expiresAt || null;
  const updated_at = plan.updated_at || plan.updatedAt || admin.firestore.Timestamp.now();

  return {
    type:          plan.type   ?? 'trial',
    active:        plan.active ?? false,
    trial:         plan.trial  ?? (plan.type === 'trial'),
    started_at,
    expires_at,
    source:        plan.source || 'backfill_migration',
    reason:        plan.reason || 'migrated_from_camelcase',
    last_event_id: plan.last_event_id ?? null,
    updated_at,
  };
}

async function run() {
  console.log(DRY_RUN ? '🔍 DRY RUN — no se escribe nada' : '✍️  Aplicando cambios');

  const snapshot = await db.collection('entidades').get();
  let migradas = 0;
  let sinCambios = 0;
  let sinPlan = 0;

  for (const docSnap of snapshot.docs) {
    const data = docSnap.data();
    const plan = data.plan;

    if (!plan) {
      sinPlan++;
      continue;
    }

    if (!needsMigration(plan)) {
      sinCambios++;
      continue;
    }

    const migratedPlan = buildMigratedPlan(plan);

    console.log(`\n📄 ${docSnap.id}`);
    console.log('  ANTES:', JSON.stringify(plan));
    console.log('  DESPUÉS:', JSON.stringify(migratedPlan));

    if (!DRY_RUN) {
      await docSnap.ref.set({ plan: migratedPlan }, { merge: true });
    }

    migradas++;
  }

  console.log('\n─────────────────────────────');
  console.log(`Total entidades:      ${snapshot.size}`);
  console.log(`Migradas:             ${migradas}`);
  console.log(`Sin cambios (ya OK):  ${sinCambios}`);
  console.log(`Sin plan asignado:    ${sinPlan}`);
  if (DRY_RUN) {
    console.log('\n⚠️  Esto fue un dry-run. Corré sin --dry-run para aplicar.');
  }
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Error en backfill:', err);
    process.exit(1);
  });