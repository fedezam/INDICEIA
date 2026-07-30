// /api/generate-and-upload-entity/index.js
//
// ── Nota (25/07/2026) ──────────────────────────────────────────
// Se evaluó envolver el entity acá con buildPublicView() (filtrar
// meta/contracts antes de subir a Blob) y se descartó: el Blob es
// el artefacto completo para uso interno (debug, auditoría,
// versionado) — filtrarlo acá perdería esa utilidad sin ganar nada,
// porque api/entity/[id].js YA hace el filtrado/reorden real en el
// punto donde el LLM efectivamente lee la entidad (mind primero,
// meta/contracts al final, horarios y hora resueltos). Aplicar el
// mismo filtro en dos lugares es redundante — un solo punto de
// verdad para "qué ve el LLM" es más simple de mantener.
// ────────────────────────────────────────────────────────────────
//
// ── Nota (28/07/2026) ──────────────────────────────────────────
// Se agregó createInitialPlan como flag opcional en vez de crear un
// endpoint serverless nuevo — el proyecto está en el límite de
// funciones serverless del plan de Vercel. Este endpoint YA se llama
// desde el cliente al dar de alta una entidad.
// ────────────────────────────────────────────────────────────────
//
// ── Nota (30/07/2026) ──────────────────────────────────────────
// Se agregan dos acciones administrativas (action: 'regenerate_all'
// y action: 'backfill_plan_shape'), reutilizando este mismo endpoint
// en vez de sumar funciones nuevas. Ambas requieren ADMIN_SECRET
// (env var, se define en Vercel — nunca hardcodear). Pensado para ser
// llamado desde un botón en super-admin.js/super-admin-entity.js, sin
// necesidad de correr scripts locales ni lidiar con env vars a mano
// (en producción Vercel ya inyecta FIREBASE_SERVICE_ACCOUNT bien
// formateado — el lío de parseo que tuvimos corriendo esto local con
// vercel env pull no aplica acá).
//
// Uso desde el panel:
//   fetch('/api/generate-and-upload-entity', {
//     method: 'POST',
//     headers: { 'Content-Type': 'application/json' },
//     body: JSON.stringify({ action: 'regenerate_all', adminSecret: '...' })
//   })
//
//   fetch('/api/generate-and-upload-entity', {
//     method: 'POST',
//     headers: { 'Content-Type': 'application/json' },
//     body: JSON.stringify({ action: 'backfill_plan_shape', adminSecret: '...', dryRun: true })
//   })
//
// El comportamiento original (comercioId + createInitialPlan opcional)
// sigue funcionando igual que siempre cuando no se manda `action`.
// ────────────────────────────────────────────────────────────────

import { buildEntity } from '../entity-factory/index.js';
import { buildIndex } from '../../lib/entity-factory/builders/index.builder.js';
import { enrichAndSaveCityIndex } from '../../lib/entity-factory/enrich-index.builder.js';
import { normalizeEntityData } from '../../lib/entity-factory/normalizers/normalizeEntityData.js';
import { applyPlanStateChange } from '../../lib/plan/applyPlanStateChange.js';
import { put } from '@vercel/blob';
import admin from 'firebase-admin';
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)),
  });
}
const db = admin.firestore();

const TRIAL_DURATION_DAYS = 30; // ← ajustar si el trial real es de 7 días u otro valor

// ── Guard de seguridad para acciones admin ──────────────────────
function checkAdminSecret(adminSecret) {
  const expected = process.env.ADMIN_SECRET;
  if (!expected) {
    throw new Error('ADMIN_SECRET no configurado en el entorno — acción admin bloqueada por seguridad');
  }
  return adminSecret === expected;
}

// ── Regenera una entidad puntual (misma lógica que el flujo normal,
//    extraída para reutilizar en regenerate_all) ──
async function regenerateOne(comercioId) {
  const comercioSnap = await db.collection('entidades').doc(comercioId).get();
  if (!comercioSnap.exists) {
    throw new Error(`Comercio ${comercioId} no encontrado`);
  }
  const rawData = normalizeEntityData(comercioSnap.data());
  const entity = await buildEntity({ comercioId });
  const jsonString = JSON.stringify(entity, null, 2);

  const blobPath = `entidades/${comercioId}/entity.json`;
  const { url } = await put(blobPath, jsonString, {
    access: 'public',
    addRandomSuffix: false,
    contentType: 'application/json',
    token: process.env.BLOB_READ_WRITE_TOKEN,
  });

  const indexResult = await buildIndex(rawData, comercioId, entity.goods, entity.services);
  if (indexResult?.url) {
    try {
      await enrichAndSaveCityIndex(
        indexResult.indice,
        indexResult.pais,
        indexResult.provincia,
        indexResult.ciudad
      );
    } catch (enrichErr) {
      console.warn('[entity-factory] ⚠️ Enriquecimiento falló (no crítico):', enrichErr.message);
    }
  }

  await db.collection('entidades').doc(comercioId).update({
    entityPublicUrl: url,
    entityGeneratedAt: new Date().toISOString(),
  });

  return url;
}

// ── Acción: regenerar TODAS las entidades ──
async function handleRegenerateAll(res) {
  const snapshot = await db.collection('entidades').get();
  const ids = snapshot.docs.map((d) => d.id);

  const results = { total: ids.length, ok: [], failed: [] };

  for (const comercioId of ids) {
    try {
      await regenerateOne(comercioId);
      results.ok.push(comercioId);
    } catch (err) {
      results.failed.push({ comercioId, error: err.message });
    }
  }

  return res.status(200).json(results);
}

// ── Acción: backfill del shape de plan (camelCase → snake_case) ──
function needsMigration(plan) {
  if (!plan) return false;
  const hasCamelCase = plan.startedAt || plan.expiresAt || plan.createdAt;
  const snakeCaseMissing = !plan.started_at || !plan.expires_at;
  return hasCamelCase && snakeCaseMissing;
}

function buildMigratedPlan(plan) {
  const started_at = plan.started_at || plan.startedAt || plan.createdAt || null;
  const expires_at = plan.expires_at || plan.expiresAt || null;
  const updated_at = plan.updated_at || plan.updatedAt || admin.firestore.Timestamp.now();

  return {
    type: plan.type ?? 'trial',
    active: plan.active ?? false,
    trial: plan.trial ?? (plan.type === 'trial'),
    started_at,
    expires_at,
    source: plan.source || 'backfill_migration',
    reason: plan.reason || 'migrated_from_camelcase',
    last_event_id: plan.last_event_id ?? null,
    updated_at,
  };
}

async function handleBackfillPlanShape(res, dryRun) {
  const snapshot = await db.collection('entidades').get();
  const results = { total: snapshot.size, migrated: [], unchanged: 0, noPlan: 0, dryRun: !!dryRun };

  for (const docSnap of snapshot.docs) {
    const plan = docSnap.data().plan;

    if (!plan) {
      results.noPlan++;
      continue;
    }
    if (!needsMigration(plan)) {
      results.unchanged++;
      continue;
    }

    const migratedPlan = buildMigratedPlan(plan);
    results.migrated.push({ comercioId: docSnap.id, before: plan, after: migratedPlan });

    if (!dryRun) {
      await docSnap.ref.set({ plan: migratedPlan }, { merge: true });
    }
  }

  return res.status(200).json(results);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  try {
    const { action, adminSecret, dryRun, comercioId, createInitialPlan } = req.body;

    // ── Acciones administrativas ──
    if (action === 'regenerate_all') {
      if (!checkAdminSecret(adminSecret)) {
        return res.status(403).json({ error: 'No autorizado' });
      }
      return await handleRegenerateAll(res);
    }

    if (action === 'backfill_plan_shape') {
      if (!checkAdminSecret(adminSecret)) {
        return res.status(403).json({ error: 'No autorizado' });
      }
      return await handleBackfillPlanShape(res, dryRun);
    }

    // ── Comportamiento normal (sin action) ──
    if (!comercioId || typeof comercioId !== 'string') {
      return res.status(400).json({ error: 'comercioId inválido' });
    }

    if (createInitialPlan === true) {
      const startedAt = admin.firestore.Timestamp.now();
      const expiresAt = admin.firestore.Timestamp.fromMillis(
        startedAt.toMillis() + TRIAL_DURATION_DAYS * 24 * 60 * 60 * 1000
      );

      await applyPlanStateChange({
        comercioId,
        type: 'trial',
        active: true,
        trial: true,
        startedAt,
        expiresAt,
        source: 'system',
        reason: 'trial_created',
      });
    }

    console.log('Generando entidad para:', comercioId);
    const url = await regenerateOne(comercioId);
    console.log('Entidad completa para', comercioId, '→', url);
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Error en generate-and-upload-entity:', err);
    return res.status(500).json({ error: err.message || 'Falló la generación pública' });
  }
}