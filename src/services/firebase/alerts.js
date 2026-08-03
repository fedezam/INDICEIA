// src/services/firebase/
import { db } from './firebase.js';
import {
  collection, query, where, getDocs,
  doc, setDoc, Timestamp
} from 'firebase/firestore';

// Trae todas las alertas visibles para esta entidad: las broadcast
// (para todos) + las individuales de este comercio puntual.
// Dos queries porque Firestore no permite OR entre campos distintos.
export async function listarAlertas(comercioId) {
  const broadcastQ = query(
    collection(db, 'alertas'),
    where('scope', '==', 'broadcast')
  );
  const individualQ = query(
    collection(db, 'alertas'),
    where('scope', '==', 'individual'),
    where('comercioId', '==', comercioId)
  );

  const [broadcastSnap, individualSnap] = await Promise.all([
    getDocs(broadcastQ),
    getDocs(individualQ)
  ]);

  const alertas = [];
  broadcastSnap.forEach(d => alertas.push({ id: d.id, ...d.data() }));
  individualSnap.forEach(d => alertas.push({ id: d.id, ...d.data() }));

  alertas.sort((a, b) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0));
  return alertas;
}

// IDs de alertas ya leídas por este usuario.
export async function getAlertasLeidas(uid) {
  const snap = await getDocs(collection(db, 'usuarios', uid, 'alertasLeidas'));
  const leidas = new Set();
  snap.forEach(d => leidas.add(d.id));
  return leidas;
}

export async function marcarAlertaLeida(uid, alertaId) {
  await setDoc(doc(db, 'usuarios', uid, 'alertasLeidas', alertaId), {
    leidoAt: Timestamp.now()
  });
}

export async function contarAlertasNoLeidas(uid, comercioId) {
  if (!uid || !comercioId) return 0;
  const [alertas, leidas] = await Promise.all([
    listarAlertas(comercioId),
    getAlertasLeidas(uid)
  ]);
  return alertas.filter(a => !leidas.has(a.id)).length;
}
