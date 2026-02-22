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

/**
 * Obtener datos del usuario actual
 */
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

/**
 * Actualizar datos del usuario
 */
export async function updateUserData(updates) {
  const user = auth.currentUser;
  if (!user) throw new Error('Usuario no autenticado');

  const userRef = doc(db, 'usuarios', user.uid);

  await updateDoc(userRef, {
    ...updates,
    updatedAt: serverTimestamp()
  });
}

/**
 * Guardar datos completos del usuario (merge)
 */
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

/**
 * Obtener datos del comercio
 */
export async function getComercioData() {
  const comercioId = await getComercioId();
  const comercioRef = doc(db, 'comercios', comercioId);
  const comercioDoc = await getDoc(comercioRef);

  if (!comercioDoc.exists()) {
    throw new Error('Comercio no encontrado');
  }

  return { id: comercioId, ...comercioDoc.data() };
}

/**
 * Actualizar datos del comercio
 */
export async function updateComercioData(updates) {
  const comercioId = await getComercioId();
  const comercioRef = doc(db, 'comercios', comercioId);

  await updateDoc(comercioRef, {
    ...updates,
    fechaActualizacion: serverTimestamp()
  });
}

/**
 * Guardar datos completos del comercio (merge)
 */
export async function saveComercioData(data) {
  const comercioId = await getComercioId();
  const comercioRef = doc(db, 'comercios', comercioId);

  await setDoc(comercioRef, {
    ...data,
    fechaActualizacion: serverTimestamp()
  }, { merge: true });
}

/**
 * Eliminar campos específicos del documento del comercio.
 * Usa FieldValue.delete() — el campo desaparece del documento, no queda null.
 * @param {string[]} fieldNames - Nombres de campos a eliminar (ej: ['templateId', 'templateUpdatedAt'])
 */
export async function deleteComercioFields(fieldNames) {
  if (!fieldNames?.length) return;

  const comercioId = await getComercioId();
  const comercioRef = doc(db, 'comercios', comercioId);

  const updates = Object.fromEntries(
    fieldNames.map(f => [f, deleteField()])
  );

  await updateDoc(comercioRef, {
    ...updates,
    fechaActualizacion: serverTimestamp()
  });
}

// ==================== PRODUCTOS ====================

/**
 * Obtener todos los productos del comercio
 */
export async function getProducts() {
  const comercioId = await getComercioId();
  const productosRef = collection(db, 'comercios', comercioId, 'productos');
  const snapshot = await getDocs(productosRef);

  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
}

/**
 * Agregar un nuevo producto
 */
export async function addProduct(productData) {
  const comercioId = await getComercioId();
  const productosRef = collection(db, 'comercios', comercioId, 'productos');

  const docRef = await addDoc(productosRef, {
    ...productData,
    fechaCreacion: serverTimestamp(),
    fechaActualizacion: serverTimestamp()
  });

  return docRef.id;
}

/**
 * Actualizar un producto existente
 */
export async function updateProduct(productId, updates) {
  const comercioId = await getComercioId();
  const productRef = doc(db, 'comercios', comercioId, 'productos', productId);

  await updateDoc(productRef, {
    ...updates,
    fechaActualizacion: serverTimestamp()
  });
}

/**
 * Eliminar un producto
 */
export async function deleteProduct(productId) {
  const comercioId = await getComercioId();
  const productRef = doc(db, 'comercios', comercioId, 'productos', productId);
  await deleteDoc(productRef);
}

// ==================== SERVICIOS ====================

/**
 * Obtener todos los servicios del comercio
 */
export async function getServicios() {
  const comercioId = await getComercioId();
  const serviciosRef = collection(db, 'comercios', comercioId, 'servicios');
  const snapshot = await getDocs(serviciosRef);

  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
}

/**
 * Agregar un nuevo servicio
 */
export async function addServicio(servicioData) {
  const comercioId = await getComercioId();
  const serviciosRef = collection(db, 'comercios', comercioId, 'servicios');

  const docRef = await addDoc(serviciosRef, {
    ...servicioData,
    fechaCreacion: serverTimestamp(),
    fechaActualizacion: serverTimestamp()
  });

  return docRef.id;
}

/**
 * Actualizar un servicio existente
 */
export async function updateServicio(servicioId, updates) {
  const comercioId = await getComercioId();
  const servicioRef = doc(db, 'comercios', comercioId, 'servicios', servicioId);

  await updateDoc(servicioRef, {
    ...updates,
    fechaActualizacion: serverTimestamp()
  });
}

/**
 * Eliminar un servicio
 */
export async function deleteServicio(servicioId) {
  const comercioId = await getComercioId();
  const servicioRef = doc(db, 'comercios', comercioId, 'servicios', servicioId);
  await deleteDoc(servicioRef);
}

// ==================== HORARIOS ====================

/**
 * Obtener horarios del comercio
 */
export async function getHorarios() {
  const comercioData = await getComercioData();
  return comercioData.horarios || {};
}

/**
 * Guardar horarios del comercio
 */
export async function saveHorarios(horariosData) {
  const comercioId = await getComercioId();
  const comercioRef = doc(db, 'comercios', comercioId);

  await updateDoc(comercioRef, {
    horarios: horariosData,
    fechaActualizacion: serverTimestamp()
  });
}

// ==================== ESTADÍSTICAS ====================

/**
 * Obtener estadísticas del comercio
 */
export async function getStats() {
  const comercioId = await getComercioId();
  const statsRef = collection(db, 'comercios', comercioId, 'stats');
  const snapshot = await getDocs(statsRef);

  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
}

/**
 * Agregar un evento de estadística
 */
export async function addStatEvent(eventData) {
  const comercioId = await getComercioId();
  const statsRef = collection(db, 'comercios', comercioId, 'stats');

  const docRef = await addDoc(statsRef, {
    ...eventData,
    timestamp: serverTimestamp()
  });

  return docRef.id;
}

// ==================== ONBOARDING ====================

/**
 * Marcar un paso del onboarding como completado
 */
export async function markOnboardingStep(stepName, completed = true) {
  const comercioId = await getComercioId();
  const comercioRef = doc(db, 'comercios', comercioId);

  await updateDoc(comercioRef, {
    [`onboardingSteps.${stepName}`]: completed,
    fechaActualizacion: serverTimestamp()
  });
}

/**
 * Obtener estado del onboarding
 */
export async function getOnboardingSteps() {
  const comercioData = await getComercioData();
  return comercioData.onboardingSteps || {};
}

// ==================== CONFIGURACIÓN IA ====================

/**
 * Guardar configuración de IA
 */
export async function saveAIConfig(aiConfig) {
  const comercioId = await getComercioId();
  const comercioRef = doc(db, 'comercios', comercioId);

  await updateDoc(comercioRef, {
    aiConfig: aiConfig,
    fechaActualizacion: serverTimestamp()
  });
}

/**
 * Obtener configuración de IA
 */
export async function getAIConfig() {
  const comercioData = await getComercioData();
  return comercioData.aiConfig || {};
}

/**
 * Guardar cognición de IA
 */
export async function saveAICognition(aiCognition) {
  const comercioId = await getComercioId();
  const comercioRef = doc(db, 'comercios', comercioId);

  await updateDoc(comercioRef, {
    aiCognition: aiCognition,
    fechaActualizacion: serverTimestamp()
  });
}

/**
 * Obtener cognición de IA
 */
export async function getAICognition() {
  const comercioData = await getComercioData();
  return comercioData.aiCognition || {};
}

// ==================== HELPERS GENÉRICOS ====================

/**
 * Obtener un documento de cualquier colección
 */
export async function getDocument(collectionPath, docId) {
  const docRef = doc(db, collectionPath, docId);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) {
    throw new Error(`Documento ${docId} no encontrado en ${collectionPath}`);
  }

  return { id: docId, ...docSnap.data() };
}

/**
 * Obtener todos los documentos de una colección
 */
export async function getCollection(collectionPath) {
  const colRef = collection(db, collectionPath);
  const snapshot = await getDocs(colRef);

  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
}

/**
 * Guardar/actualizar un documento (merge)
 */
export async function saveDocument(collectionPath, docId, data) {
  const docRef = doc(db, collectionPath, docId);

  await setDoc(docRef, {
    ...data,
    updatedAt: serverTimestamp()
  }, { merge: true });
}

/**
 * Eliminar un documento
 */
export async function deleteDocument(collectionPath, docId) {
  const docRef = doc(db, collectionPath, docId);
  await deleteDoc(docRef);
}
