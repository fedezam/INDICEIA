// functions/index.js
import * as functions from 'firebase-functions';
import admin from 'firebase-admin';
import { buildAndUploadJSON } from './exportBuilder.js'; // ver archivo siguiente

admin.initializeApp();
const db = admin.firestore();

/**
 * Config
 * - MIN_EXPORT_INTERVAL_MS: tiempo mínimo entre exports para un mismo comercio (throttle)
 * - EXPORT_ON_FIELDS: opcional, lista de campos que disparan export (si querés más control)
 */
const MIN_EXPORT_INTERVAL_MS = 8 * 1000; // 8s (ajustá según necesidades)
const REGION = 'us-central1';

export const onComercioUpdated = functions
  .region(REGION)
  .firestore
  .document('comercios/{comercioId}')
  .onWrite(async (change, context) => {
    const comercioId = context.params.comercioId;
    const before = change.before.exists ? change.before.data() : null;
    const after = change.after.exists ? change.after.data() : null;
    const now = Date.now();

    try {
      // si el doc fue borrado, salimos
      if (!after) {
        console.log(`[onComercioUpdated] comercio ${comercioId} eliminado — skip`);
        return null;
      }

      // Prevención de loops: si la última export la hizo el propio exporter, no disparamos
      if (after.lastJsonExportBy === 'export-builder') {
        console.log(`[onComercioUpdated] skip export (lastJsonExportBy == export-builder) for ${comercioId}`);
        return null;
      }

      // Throttle: si se exportó recientemente, saltamos
      if (after.lastJsonExportAt) {
        const last = new Date(after.lastJsonExportAt).getTime();
        if ((now - last) < MIN_EXPORT_INTERVAL_MS) {
          console.log(`[onComercioUpdated] throttled export for ${comercioId} (last export ${now - last}ms ago)`);
          return null;
        }
      }

      // Opcional: si querés comparar cambios relevantes, lo podés hacer aquí (aiConfig, productos, horarios...)
      // For simplicity, disparamos siempre cuando pasen las comprobaciones previas.

      console.log(`[onComercioUpdated] triggering exportBuilder for ${comercioId}`);
      const res = await buildAndUploadJSON({ comercioId, throttleBy: MIN_EXPORT_INTERVAL_MS });

      if (res?.success) {
        console.log(`[onComercioUpdated] export success for ${comercioId}: ${res.url}`);
      } else {
        console.warn(`[onComercioUpdated] exportBuilder reported failure for ${comercioId}`, res);
      }

      return null;
    } catch (err) {
      console.error(`[onComercioUpdated] unexpected error for ${comercioId}:`, err);
      // Persistir error para debugging
      try {
        await db.collection('comercios').doc(comercioId).update({
          lastJsonExportError: String(err.message || err),
          lastJsonExportErrorAt: new Date().toISOString()
        });
      } catch (e) {
        console.warn('[onComercioUpdated] could not write error to firestore:', e);
      }
      return null;
    }
  });
