// src/controllers/panelCore.js

import { db } from '../services/firebase/firebase.js';
import { doc, getDoc, collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { buildFlowContext, buildPipeline } from './flowController.js';

// ============================================================
// 🔹 LOAD ENTIDAD
// ============================================================
export async function loadEntidad(comercioId) {
  if (!comercioId) {
    throw new Error('[panelCore] comercioId requerido');
  }

  const entidadRef = doc(db, 'entidades', comercioId);
  const entidadSnap = await getDoc(entidadRef);

  if (!entidadSnap.exists()) {
    throw new Error(`[panelCore] Entidad '${comercioId}' no encontrada`);
  }

  const comercioData = entidadSnap.data();

  let userData = {};
  if (comercioData.duenoId) {
    const userSnap = await getDoc(doc(db, 'usuarios', comercioData.duenoId));
    if (userSnap.exists()) userData = userSnap.data();
  }

  const ctx = buildFlowContext(userData, comercioData);
  const pipeline = buildPipeline(ctx);

  return {
    user: userData,
    entidad: comercioData,
    ctx,
    pipeline,
    steps: comercioData.onboardingSteps || {}
  };
}

// ============================================================
// 🔹 SUBCOLECCIONES
// ============================================================
export async function loadSubcollections(comercioId) {
  const baseRef = collection(db, 'entidades', comercioId);

  let productos = [];
  let servicios = [];

  try {
    const snap = await getDocs(collection(baseRef, 'productos'));
    productos = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch {}

  try {
    const snap = await getDocs(collection(baseRef, 'servicios'));
    servicios = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch {}

  return { productos, servicios };
}

// ============================================================
// 🔹 LISTADO
// ============================================================
export async function listEntidades({ maxResults = 100 } = {}) {
  try {
    const q = query(
      collection(db, 'entidades'),
      orderBy('fechaActualizacion', 'desc'),
      limit(maxResults)
    );

    const snap = await getDocs(q);

    return snap.docs.map(doc => {
      const d = doc.data();
      return {
        id: doc.id,
        nombreComercio: d.nombre || d.nombreComercio || '',
        duenoId: d.duenoId || null,
        entityType: d.entityType || 'comercio',
        fechaActualizacion: d.fechaActualizacion?.toDate?.() || null
      };
    });

  } catch (err) {
    console.error('[panelCore]', err);
    return [];
  }
}
