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
export async function getComercioId() {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('Usuario no autenticado');
  }

  const userRef = doc(db, 'usuarios', user.uid);
  const userDoc = await getDoc(userRef);

  if (!userDoc.exists()) {
    throw new Error('Usuario no encontrado en Firestore');
  }

  const comercioId = userDoc.data().comercioId;
  if (!comercioId) {
    throw new Error('Usuario sin comercio asignado');
  }

  return comercioId;
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

export async function getComercioData() {
  const comercioId = await getComercioId();
  const comercioRef = doc(db, 'entidades', comercioId);
  const comercioDoc = await getDoc(comercioRef);

  if (!comercioDoc.exists()) {
    throw new Error('Comercio no encontrado');
  }

  return { id: comercioId, ...comercioDoc.data() };
}

export async function updateComercioData(updates) {
  const comercioId = await getComercioId();
  const comercioRef = doc(db, 'entidades', comercioId);

  console.log('📦 updateComercioData:', JSON.stringify(updates, null, 2));

  await updateDoc(comercioRef, {
    ...updates,
    fechaActualizacion: serverTimestamp()
  });
}

export async function saveComercioData(data) {
  const comercioId = await getComercioId();
  const comercioRef = doc(db, 'entidades', comercioId);

  await setDoc(comercioRef, {
    ...data,
    fechaActualizacion: serverTimestamp()
  }, { merge: true });
}

export async function deleteComercioFields(fieldNames) {
  if (!fieldNames?.length) return;

  const comercioId = await getComercioId();
  const comercioRef = doc(db, 'entidades', comercioId);

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
  const comercioId = await getComercioId();
  const productosRef = collection(db, 'entidades', comercioId, 'productos');
  const snapshot = await getDocs(productosRef);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

export async function addProduct(productData) {
  const comercioId = await getComercioId();
  const productosRef = collection(db, 'entidades', comercioId, 'productos');
  const docRef = await addDoc(productosRef, {
    ...productData,
    fechaCreacion: serverTimestamp(),
    fechaActualizacion: serverTimestamp()
  });
  return docRef.id;
}

export async function updateProduct(productId, updates) {
  const comercioId = await getComercioId();
  const productRef = doc(db, 'entidades', comercioId, 'productos', productId);
  await updateDoc(productRef, {
    ...updates,
    fechaActualizacion: serverTimestamp()
  });
}

export async function deleteProduct(productId) {
  const comercioId = await getComercioId();
  const productRef = doc(db, 'entidades', comercioId, 'productos', productId);
  await deleteDoc(productRef);
}

// ==================== SERVICIOS ====================

export async function getServicios() {
  const comercioId = await getComercioId();
  const serviciosRef = collection(db, 'entidades', comercioId, 'servicios');
  const snapshot = await getDocs(serviciosRef);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

export async function addServicio(servicioData) {
  const comercioId = await getComercioId();
  const serviciosRef = collection(db, 'entidades', comercioId, 'servicios');
  const docRef = await addDoc(serviciosRef, {
    ...servicioData,
    fechaCreacion: serverTimestamp(),
    fechaActualizacion: serverTimestamp()
  });
  return docRef.id;
}

export async function updateServicio(servicioId, updates) {
  const comercioId = await getComercioId();
  const servicioRef = doc(db, 'entidades', comercioId, 'servicios', servicioId);
  await updateDoc(servicioRef, {
    ...updates,
    fechaActualizacion: serverTimestamp()
  });
}

export async function deleteServicio(servicioId) {
  const comercioId = await getComercioId();
  const servicioRef = doc(db, 'entidades', comercioId, 'servicios', servicioId);
  await deleteDoc(servicioRef);
}

// ==================== HORARIOS ====================

export async function getHorarios() {
  const comercioData = await getComercioData();
  return comercioData.horarios || {};
}

export async function saveHorarios(horariosData) {
  const comercioId = await getComercioId();
  const comercioRef = doc(db, 'entidades', comercioId);
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
    const comercioId = await getComercioId();
    const comercioRef = doc(db, 'entidades', comercioId);
    await updateDoc(comercioRef, {
      [`onboardingSteps.${stepName}`]: completed,
      fechaActualizacion: serverTimestamp()
    });
  }
}

export async function getOnboardingSteps() {
  const comercioData = await getComercioData();
  return comercioData.onboardingSteps || {};
}
