// lib/alerts/crearAlerta.js
import { getFirestore, Timestamp } from "firebase-admin/firestore";

const db = getFirestore();

// Crea (o pisa) una alerta de forma idempotente. El id determinístico
// evita duplicar la misma alerta si el cron corre más de una vez el
// mismo día para la misma entidad.
export async function crearAlerta({ id, scope, tipo, comercioId = null, titulo, mensaje, createdBy }) {
  await db.collection('alertas').doc(id).set({
    scope,
    tipo,
    comercioId,
    titulo,
    mensaje,
    createdBy,
    createdAt: Timestamp.now(),
  }, { merge: true });
}