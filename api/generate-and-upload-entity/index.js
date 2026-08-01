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
// Se agregan cuatro acciones administrativas (action: 'regenerate_all',
// 'backfill_plan_shape', 'plan_reactivate', 'plan_extend'), reutilizando
// este mismo endpoint en vez de sumar funciones nuevas (límite de
// funciones serverless del plan free de Vercel).
//
// 'regenerate_all' y 'backfill_plan_shape' son operaciones masivas —
// requieren ADMIN_SECRET (env var, se define en Vercel — nunca
// hardcodear).
//
// 'plan_reactivate' y 'plan_extend' son scoped a UNA entidad puntual
// (comercioId) — no requieren ADMIN_SECRET porque no pueden hacer daño
// masivo, y ya están gateadas client-side por el chequeo de
// role !== 'admin' en super-admin-entity.js. NOTA DE SEGURIDAD: ese
// chequeo es solo de UI — cualquiera que le pegue directo al endpoint
// con {action:'plan_reactivate', comercioId:'X'} puede reactivar
// cualquier entidad sin pasar por el panel. Si en algún momento importa
// cerrar ese hueco, sumarles el mismo checkAdminSecret que las otras dos.
//
// 'plan_reactivate': reactiva una entidad (active:true + trial nuevo de
// TRIAL_DURATION_DAYS días, reinicia started_at). Usar cuando el trial
// venció y se lo reinicia de cero.
// 'plan_extend': suma N días al vencimiento SIN reiniciar started_at —
// el trial sigue siendo "el mismo", solo se le da más margen. Si
// expires_at ya venció, la base para sumar es "ahora" (no la fecha
// vieja), así "extender 7 días" algo vencido hace 2 meses da 7 días
// reales desde hoy, no lo deja vencido igual.
// ────────────────────────────────────────────────────────────────
//
// ── Nota (01/08/2026) ──────────────────────────────────────────
// Se agrega action: 'create_payment_preference' — mismo motivo que las
// anteriores (límite de funciones serverless de Vercel, no se puede
// sumar un endpoint nuevo).
//
// Reemplaza al sistema viejo de links fijos de MercadoPago
// (plan.mercadoPagoLink hardcodeado en plans.pricing.js). Ese sistema
// generaba UNA preference fija por plan, sin external_reference
// dinámico → el webhook (api/webhooks/mercadopago.js) nunca podía saber
// qué comercio había pagado. Esta acción genera una preference NUEVA
// en cada compra, con external_reference = "comercioId:planType", que
// es lo que el webhook necesita para poder llamar a
// applyPlanStateChange() correctamente.
//
// Scoped a una entidad puntual (comercioId), igual que plan_reactivate/
// plan_extend — no requiere ADMIN_SECRET por el mismo motivo: no puede
// hacer daño masivo. El comercioId debería venir de un usuario
// autenticado en el frontend (resolveFirebaseContext), pero OJO: este
// endpoint hoy NO valida que el comercioId recibido corresponda al
// usuario que hace el request. Si en algún momento importa cerrar ese
// hueco, habría que validar un idToken de Firebase acá antes de crear
// la preference.
// ────────────────────────────────────────────────────────────────
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
//   fetch('/api/generate-and-upload-entity', {
//     method: 'POST',
//     headers: { 'Content-Type': 'application/json' },
//     body: JSON.stringify({ action: 'plan_reactivate', comercioId: '...' })
//   })
//
//   fetch('/api/generate-and-upload-entity', {
//     method: 'POST',
//     headers: { 'Content-Type': 'application/json' },
//     body: JSON.stringify({ action: 'plan_extend', comercioId: '...', days: 7 })
//   })
//
//   fetch('/api/generate-and-upload-entity', {
//     method: 'POST',
//     headers: { 'Content-Type': 'application/json' },
//     body: JSON.stringify({ action: 'create_payment_preference', comercioId: '...', planType: 'pro' })
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
import mercadopago from 'mercadopago';
import { PLAN_PRICING } from '../../src/shared/pricing/plans.pricing.js';

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)),
  });
}
const db = admin.firestore();

mercadopago.configure({
  access_token: process.env.MP_ACCESS_TOKEN,
});

const TRIAL_DURATION_DAYS = 15;
const SITE_URL = 'https://indiceia.vercel.app';

// ── Guard de seguridad para acciones admin masivas ──────────────
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

// ── Acción: reactivar plan de una entidad puntual ──
// ⟦ROLE⟧ Reactivar NO es solo poner active:true — si expires_at quedó
// en el pasado (ej. trial viejo vencido), resolvePlanStatus() sigue
// devolviendo inactivo aunque active:true, porque el chequeo en tiempo
// real da prioridad a la fecha de vencimiento real sobre el booleano
// (ver 30/07/2026: caso real donde tocar solo `active` a mano desde el
// panel no sacaba a la entidad de huelga). Esta acción empuja
// expires_at a una fecha futura además de active:true, usando
// applyPlanStateChange (shape canónico snake_case + mirror camelCase).
async function handleReactivatePlan(res, comercioId, days) {
  if (!comercioId || typeof comercioId !== 'string') {
    return res.status(400).json({ error: 'comercioId requerido' });
  }

  const durationDays = Number.isFinite(days) && days > 0 ? days : TRIAL_DURATION_DAYS;
  const startedAt = admin.firestore.Timestamp.now();
  const expiresAt = admin.firestore.Timestamp.fromMillis(
    startedAt.toMillis() + durationDays * 24 * 60 * 60 * 1000
  );

  await applyPlanStateChange({
    comercioId,
    type: 'trial',
    active: true,
    trial: true,
    startedAt,
    expiresAt,
    source: 'admin_panel',
    reason: 'reactivated_manually',
  });

  return res.status(200).json({ ok: true, comercioId, expiresAt: expiresAt.toDate().toISOString() });
}

// ── Acción: extender plan de una entidad puntual (sumar N días) ──
// No toca started_at — el trial sigue siendo "el mismo", solo se le da
// más margen. Si expires_at ya venció, la base para sumar es "ahora",
// no la fecha vieja (si no, "extender 7 días" algo vencido hace 2 meses
// seguiría dando vencido).
async function handleExtendPlan(res, comercioId, days) {
  if (!comercioId || typeof comercioId !== 'string') {
    return res.status(400).json({ error: 'comercioId requerido' });
  }
  const extendDays = Number(days);
  if (!Number.isFinite(extendDays) || extendDays <= 0) {
    return res.status(400).json({ error: 'days debe ser un número > 0' });
  }

  const comercioSnap = await db.collection('entidades').doc(comercioId).get();
  if (!comercioSnap.exists) {
    return res.status(404).json({ error: `Comercio ${comercioId} no encontrado` });
  }
  const plan = comercioSnap.data().plan || {};

  const currentExpiresMs = plan.expires_at?.toMillis?.() ?? 0;
  const nowMs = Date.now();
  const baseMs = Math.max(currentExpiresMs, nowMs);
  const expiresAt = admin.firestore.Timestamp.fromMillis(baseMs + extendDays * 24 * 60 * 60 * 1000);
  const startedAt = plan.started_at || admin.firestore.Timestamp.now();

  await applyPlanStateChange({
    comercioId,
    type: plan.type ?? 'trial',
    active: true,
    trial: plan.trial ?? true,
    startedAt,
    expiresAt,
    source: 'admin_panel',
    reason: 'extended_manually',
  });

  return res.status(200).json({ ok: true, comercioId, expiresAt: expiresAt.toDate().toISOString() });
}

// ── Acción: crear preference dinámica de pago (MercadoPago) ──
// Genera una preference NUEVA por cada compra, con external_reference
// = "comercioId:planType" — es lo que el webhook necesita leer para
// saber a quién activarle el plan. Reemplaza los links fijos viejos
// de plans.pricing.js (mercadoPagoLink / preferenceId).
async function handleCreatePaymentPreference(res, comercioId, planType) {
  if (!comercioId || typeof comercioId !== 'string') {
    return res.status(400).json({ error: 'comercioId requerido' });
  }
  const pricing = PLAN_PRICING[planType];
  if (!pricing) {
    return res.status(400).json({ error: `planType inválido: ${planType}` });
  }

  const preference = {
    items: [
      {
        title: pricing.checkoutLabel,
        quantity: 1,
        currency_id: pricing.currency,
        unit_price: pricing.price,
      },
    ],
    external_reference: `${comercioId}:${planType}`,
    notification_url: `${SITE_URL}/api/webhooks/mercadopago`,
    back_urls: {
      success: `${SITE_URL}/pago-exitoso.html`,
      pending: `${SITE_URL}/pago-exitoso.html`,
      failure: `${SITE_URL}/plans.html`,
    },
    auto_return: 'approved',
  };

  const response = await mercadopago.preferences.create(preference);
  return res.status(200).json({ initPoint: response.body.init_point });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  try {
    const { action, adminSecret, dryRun, comercioId, createInitialPlan, days, planType } = req.body;

    // ── Acciones administrativas masivas (requieren ADMIN_SECRET) ──
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

    // ── Acciones administrativas scoped a una entidad ──
    if (action === 'plan_reactivate') {
      return await handleReactivatePlan(res, comercioId, days);
    }

    if (action === 'plan_extend') {
      return await handleExtendPlan(res, comercioId, days);
    }

    // ── Acción: crear preference de pago (usuario final, no admin) ──
    if (action === 'create_payment_preference') {
      return await handleCreatePaymentPreference(res, comercioId, planType);
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
