// ============================================
// firebaseDB.js
// Operaciones de base de datos y helpers
// ============================================

import { auth, db } from './firebase.js';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  deleteField,
  collection,
  getDocs,
  addDoc,
  serverTimestamp
} from 'firebase/firestore';

// ==================== STEPS POR COLECCIÓN ====================
// 🔥 CORREGIDO: Solo 'usuario' pertenece al doc del usuario
const USER_STEPS = ['usuario'];

// ==================== OBTENER comercioId DEL USUARIO ACTUAL ====================
export async function getEntidadId() {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('Usuario no autenticado');
  }

  const userRef = doc(db, 'usuarios', user.uid);
  const userDoc = await getDoc(userRef);

  if (!userDoc.exists()) {
    throw new Error('Usuario no encontrado en Firestore');
  }

  const entidadId = userDoc.data().entidadActivaId ?? userDoc.data().comercioId;
  if (!entidadId) {
    throw new Error('Usuario sin comercio asignado');
  }

  return entidadId;
}

// ==================== USUARIOS ====================

export async function getUserData() {
  const user = auth.currentUser;
  if (!user) throw new Error('Usuario no autenticado');

  const userRef = doc(db, 'usuarios', user.uid);
  const userDoc = await getDoc(userRef);

  if (!userDoc.exists()) {
    throw new Error('Usuario no encontrado');
  }

  return { id: user.uid, ...userDoc.data() };
}

export async function updateUserData(updates) {
  const user = auth.currentUser;
  if (!user) throw new Error('Usuario no autenticado');

  const userRef = doc(db, 'usuarios', user.uid);

  await updateDoc(userRef, {
    ...updates,
    updatedAt: serverTimestamp()
  });
}

export async function saveUserData(data) {
  const user = auth.currentUser;
  if (!user) throw new Error('Usuario no autenticado');

  const userRef = doc(db, 'usuarios', user.uid);

  await setDoc(userRef, {
    ...data,
    updatedAt: serverTimestamp()
  }, { merge: true });
}

// ==================== COMERCIOS ====================

export async function getEntidadData() {
  const entidadId = await getEntidadId();
  const comercioRef = doc(db, 'entidades', entidadId);
  const comercioDoc = await getDoc(comercioRef);

  if (!comercioDoc.exists()) {
    throw new Error('Comercio no encontrado');
  }

  return { id: entidadId, ...comercioDoc.data() };
}

export async function updateEntidadData(updates) {
  const entidadId = await getEntidadId();
  const comercioRef = doc(db, 'entidades', entidadId);

  // Campos que requieren reemplazo total (no merge)
  const FULL_REPLACE_FIELDS = ['horarios', 'horariosDelivery'];

  const fullReplaceKeys = Object.keys(updates).filter(k => FULL_REPLACE_FIELDS.includes(k));

  if (fullReplaceKeys.length) {
    // Paso 1: borrar los campos completos
    const deletions = Object.fromEntries(
      fullReplaceKeys.map(k => [k, deleteField()])
    );
    await updateDoc(comercioRef, deletions);
  }

  // Paso 2: escribir todo limpio
  await updateDoc(comercioRef, {
    ...updates,
    fechaActualizacion: serverTimestamp()
  });
}

export async function saveEntidadData(data) {
  const entidadId = await getEntidadId();
  const comercioRef = doc(db, 'entidades', entidadId);

  await setDoc(comercioRef, {
    ...data,
    fechaActualizacion: serverTimestamp()
  }, { merge: true });
}

export async function deleteComercioFields(fieldNames) {
  if (!fieldNames?.length) return;

  const entidadId = await getEntidadId();
  const comercioRef = doc(db, 'entidades', entidadId);

  const updates = Object.fromEntries(
    fieldNames.map(f => [f, deleteField()])
  );

  await updateDoc(comercioRef, {
    ...updates,
    fechaActualizacion: serverTimestamp()
  });
}

// ==================== PRODUCTOS ====================

export async function getProducts() {
  const entidadId = await getEntidadId();
  const productosRef = collection(db, 'entidades', entidadId, 'productos');
  const snapshot = await getDocs(productosRef);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

export async function addProduct(productData) {
  const entidadId = await getEntidadId();
  const productosRef = collection(db, 'entidades', entidadId, 'productos');
  const docRef = await addDoc(productosRef, {
    ...productData,
    fechaCreacion: serverTimestamp(),
    fechaActualizacion: serverTimestamp()
  });
  return docRef.id;
}

export async function updateProduct(productId, updates) {
  const entidadId = await getEntidadId();
  const productRef = doc(db, 'entidades', entidadId, 'productos', productId);
  await updateDoc(productRef, {
    ...updates,
    fechaActualizacion: serverTimestamp()
  });
}

export async function deleteProduct(productId) {
  const entidadId = await getEntidadId();
  const productRef = doc(db, 'entidades', entidadId, 'productos', productId);
  await deleteDoc(productRef);
}

// ==================== SERVICIOS ====================

export async function getServicios() {
  const entidadId = await getEntidadId();
  const serviciosRef = collection(db, 'entidades', entidadId, 'servicios');
  const snapshot = await getDocs(serviciosRef);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

export async function addServicio(servicioData) {
  const entidadId = await getEntidadId();
  const serviciosRef = collection(db, 'entidades', entidadId, 'servicios');
  const docRef = await addDoc(serviciosRef, {
    ...servicioData,
    fechaCreacion: serverTimestamp(),
    fechaActualizacion: serverTimestamp()
  });
  return docRef.id;
}

export async function updateServicio(servicioId, updates) {
  const entidadId = await getEntidadId();
  const servicioRef = doc(db, 'entidades', entidadId, 'servicios', servicioId);
  await updateDoc(servicioRef, {
    ...updates,
    fechaActualizacion: serverTimestamp()
  });
}

export async function deleteServicio(servicioId) {
  const entidadId = await getEntidadId();
  const servicioRef = doc(db, 'entidades', entidadId, 'servicios', servicioId);
  await deleteDoc(servicioRef);
}

// ==================== HORARIOS ====================

export async function getHorarios() {
  const entidadData = await getEntidadData();
  return entidadData.horarios || {};
}

export async function saveHorarios(horariosData) {
  const entidadId = await getEntidadId();
  const comercioRef = doc(db, 'entidades', entidadId);
  await updateDoc(comercioRef, {
    horarios: horariosData,
    fechaActualizacion: serverTimestamp()
  });
}

// ==================== ONBOARDING ====================

export async function markOnboardingStep(stepName, completed = true) {
  const user = auth.currentUser;
  if (!user) throw new Error('Usuario no autenticado');

  if (USER_STEPS.includes(stepName)) {
    const userRef = doc(db, 'usuarios', user.uid);
    await updateDoc(userRef, {
      [`onboardingSteps.${stepName}`]: completed,
      updatedAt: serverTimestamp()
    });
  } else {
    const entidadId = await getEntidadId();
    const comercioRef = doc(db, 'entidades', entidadId);
    await updateDoc(comercioRef, {
      [`onboardingSteps.${stepName}`]: completed,
      fechaActualizacion: serverTimestamp()
    });
  }
}

export async function getOnboardingSteps() {
  const entidadData = await getEntidadData();
  return entidadData.onboardingSteps || {};
}
