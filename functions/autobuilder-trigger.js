/**
 * Firebase Cloud Function
 * Trigger automático cuando se actualiza un comercio o su catálogo.
 *
 * Deploy:
 * firebase deploy --only functions:autobuilderTrigger,functions:catalogoTrigger
 */

import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import { logger } from 'firebase-functions';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import fetch from 'node-fetch'; // 🔧 Asegurar compatibilidad con Node 20+

initializeApp();
const db = getFirestore();

/* -------------------------------------------------------------------------- */
/* ⚙️ CONFIGURACIONES GENERALES */
/* -------------------------------------------------------------------------- */

const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minuto
const MAX_BUILDS_PER_WINDOW = 5;
const DEBOUNCE_DEFAULT_MS = 3_000;

const rateLimitCache = new Map(); // memoria efímera

/* -------------------------------------------------------------------------- */
/* 🚀 TRIGGER PRINCIPAL - comercios/{comercioId} */
/* -------------------------------------------------------------------------- */

export const autobuilderTrigger = onDocumentWritten(
  'comercios/{comercioId}',
  async (event) => {
    const comercioId = event.params.comercioId;
    const before = event.data?.before?.data() || null;
    const after = event.data?.after?.data() || null;

    logger.info(`🔔 Trigger fired for comercio: ${comercioId}`);

    try {
      // 1️⃣ Si fue borrado → ignorar
      if (!after) {
        logger.info(`🗑️ Document ${comercioId} deleted, skipping build.`);
        return null;
      }

      // 2️⃣ Si no hubo cambios relevantes → ignorar
      if (before && !checkRelevantChanges(before, after)) {
        logger.debug(`No relevant changes detected for ${comercioId}`);
        return null;
      }

      // 3️⃣ Rate limiting
      if (!checkRateLimit(comercioId)) {
        logger.warn(`⏱️ Rate limit exceeded for ${comercioId}`);
        await logRateLimitViolation(comercioId);
        return null;
      }

      // 4️⃣ Debouncing
      if (!(await checkDebounce(comercioId))) {
        logger.info(`🕒 Debounce active for ${comercioId}`);
        return null;
      }

      // 5️⃣ Llamar al EntityFactory
      const metadata = {
        trigger_type: 'firebase_update',
        path: `comercios/${comercioId}`,
        changes: detectChanges(before, after),
      };

      const buildResult = await triggerBuild(comercioId, metadata);

      logger.info(`✅ Build triggered successfully`, buildResult);
      return buildResult;
    } catch (error) {
      logger.error(`❌ Trigger failed for ${comercioId}: ${error.message}`, error);

      await db.collection('autobuilder_errors').add({
        comercio_id: comercioId,
        error_message: error.message,
        error_stack: error.stack,
        phase: 'autobuilder',
        timestamp: Timestamp.now(),
      });

      return null;
    }
  }
);

/* -------------------------------------------------------------------------- */
/* 📦 TRIGGER SECUNDARIO - comercios/{comercioId}/catalogo/{itemId} */
/* -------------------------------------------------------------------------- */

export const catalogoTrigger = onDocumentWritten(
  'comercios/{comercioId}/catalogo/{itemId}',
  async (event) => {
    const comercioId = event.params.comercioId;
    const itemId = event.params.itemId;
    const before = event.data?.before?.data() || null;
    const after = event.data?.after?.data() || null;

    logger.info(`📦 Catalogo change detected: ${comercioId}/${itemId}`);

    try {
      const changeType = !before && after
        ? 'item_added'
        : before && !after
        ? 'item_removed'
        : 'item_modified';

      if (!checkRateLimit(comercioId)) {
        logger.warn(`⏱️ Rate limit exceeded for ${comercioId} (catalogo change)`);
        return null;
      }

      if (!(await checkDebounce(comercioId, 3_000))) {
        logger.info(`🕒 Debounce catalogo for ${comercioId}`);
        return null;
      }

      const buildResult = await triggerBuild(comercioId, {
        trigger_type: 'firebase_catalogo_update',
        path: `comercios/${comercioId}/catalogo/${itemId}`,
        change_type: changeType,
        item_id: itemId,
      });

      logger.info(`✅ Catalogo build triggered`, buildResult);
      return buildResult;
    } catch (error) {
      logger.error(`❌ Catalogo trigger failed for ${comercioId}: ${error.message}`, error);
      return null;
    }
  }
);

/* -------------------------------------------------------------------------- */
/* 🧠 UTILIDADES */
/* -------------------------------------------------------------------------- */

function checkRelevantChanges(before, after) {
  const fields = [
    'nombre',
    'descripcion',
    'tipo_negocio',
    'whatsapp',
    'direccion',
    'horarios',
    'metodos_pago',
  ];

  return fields.some((f) => JSON.stringify(before[f]) !== JSON.stringify(after[f]));
}

function detectChanges(before, after) {
  if (!before) return { type: 'created' };

  const fields = Object.keys(after).filter(
    (key) => JSON.stringify(before[key]) !== JSON.stringify(after[key])
  );

  return { type: 'updated', fields };
}

/* -------------------------------------------------------------------------- */
/* ⚡ RATE LIMIT + DEBOUNCE */
/* -------------------------------------------------------------------------- */

function checkRateLimit(comercioId) {
  const now = Date.now();
  const key = `rate_${comercioId}`;
  const timestamps = rateLimitCache.get(key) || [];

  const valid = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  if (valid.length >= MAX_BUILDS_PER_WINDOW) return false;

  valid.push(now);
  rateLimitCache.set(key, valid);
  return true;
}

async function checkDebounce(comercioId, delayMs = DEBOUNCE_DEFAULT_MS) {
  const now = Date.now();
  const key = `debounce_${comercioId}`;
  const last = rateLimitCache.get(key);

  if (last && now - last < delayMs) return false;
  rateLimitCache.set(key, now);
  return true;
}

/* -------------------------------------------------------------------------- */
/* 🌐 LLAMADA AL ENTITY FACTORY */
/* -------------------------------------------------------------------------- */

async function triggerBuild(comercioId, metadata) {
  const apiUrl =
    process.env.ENTITY_FACTORY_API_URL ||
    'https://tudominio.com/api/entity-factory/build';
  const apiKey = process.env.ENTITY_FACTORY_API_KEY;

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(apiKey && { Authorization: `Bearer ${apiKey}` }),
    },
    body: JSON.stringify({ comercio_id: comercioId, metadata }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`EntityFactory API error ${response.status}: ${text}`);
  }

  return await response.json();
}

/* -------------------------------------------------------------------------- */
/* 🧾 LOGS AUXILIARES */
/* -------------------------------------------------------------------------- */

async function logRateLimitViolation(comercioId) {
  await db.collection('autobuilder_rate_limits').add({
    comercio_id: comercioId,
    timestamp: Timestamp.now(),
    window_ms: RATE_LIMIT_WINDOW_MS,
    max_builds: MAX_BUILDS_PER_WINDOW,
  });
}
