// lib/alerts/crearAlerta.js
import { getFirestore, Timestamp } from "firebase-admin/firestore";

export async function crearAlerta({ id, scope, tipo, comercioId = null, titulo, mensaje, createdBy }) {
  const db = getFirestore();
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
