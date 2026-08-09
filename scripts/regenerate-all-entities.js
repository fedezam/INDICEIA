// scripts/regenerate-all-entities.js
// ⟦ROLE⟧ Regenera el entity.json (Blob) de TODAS las entidades, llamando
// a /api/generate-and-upload-entity para cada una. Necesario para que
// los Blobs viejos (generados antes de sacar compileSubscription de
// mind.builder.js) queden limpios, sin el SUBSCRIPTION muerto horneado
// adentro del mind.
//
// NO llama a Firestore directo para escribir nada — solo dispara el
// mismo endpoint HTTP que ya usan los flujos de onboarding. Firestore
// se usa acá únicamente para LISTAR los comercioId a regenerar.
//
// USO:
//   node scripts/regenerate-all-entities.js --dry-run   ← solo lista, no llama al endpoint
//   node scripts/regenerate-all-entities.js              ← regenera de verdad
//
// Requiere .env.local con FIREBASE_SERVICE_ACCOUNT (mismo setup que
// backfill-plan-shape.js).

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local', override: true });

import admin from 'firebase-admin';

// ── Parseo robusto de la service account (ver backfill-plan-shape.js
// para la explicación completa del porqué) ──
function parseServiceAccount(raw) {
  try {
    return JSON.parse(raw);
  } catch {
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
const ENDPOINT = 'https://indiceia.dev/api/generate-and-upload-entity';
const DELAY_MS = 1500; // pausa entre llamadas — no saturar Vercel/Firestore

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function run() {
  console.log(DRY_RUN ? '🔍 DRY RUN — no se llama al endpoint' : '🔄 Regenerando entidades de verdad');

  const snapshot = await db.collection('entidades').get();
  const ids = snapshot.docs.map((doc) => doc.id);

  console.log(`\nTotal de entidades encontradas: ${ids.length}\n`);

  let ok = 0;
  let fail = 0;

  for (const comercioId of ids) {
    if (DRY_RUN) {
      console.log(`  [dry-run] regeneraría: ${comercioId}`);
      continue;
    }

    try {
      const response = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comercioId }),
      });

      if (response.ok) {
        console.log(`  ✅ ${comercioId}`);
        ok++;
      } else {
        const errorText = await response.text();
        console.error(`  ❌ ${comercioId} — ${response.status}: ${errorText}`);
        fail++;
      }
    } catch (err) {
      console.error(`  ❌ ${comercioId} — error de red: ${err.message}`);
      fail++;
    }

    await sleep(DELAY_MS);
  }

  console.log('\n─────────────────────────────');
  console.log(`Total:      ${ids.length}`);
  if (!DRY_RUN) {
    console.log(`OK:         ${ok}`);
    console.log(`Fallidas:   ${fail}`);
  }
  if (DRY_RUN) {
    console.log('\n⚠️  Esto fue un dry-run. Corré sin --dry-run para regenerar de verdad.');
  }
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Error en regenerate-all-entities:', err);
    process.exit(1);
  });