// src/shared/firebaseHelpers.js
import { auth, db } from '../firebase.js';
import { 
  doc, 
  getDoc, 
  updateDoc, 
  setDoc, 
  collection, 
  getDocs,
  addDoc,
  deleteDoc 
} from 'firebase/firestore';

/**
 * Obtiene el comercioId del usuario actual
 */
export async function getEntidadId() {
  const user = auth.currentUser;
  if (!user) throw new Error('Usuario no autenticado');

  const userRef = doc(db, 'usuarios', user.uid);
  const userDoc = await getDoc(userRef);
  
  if (!userDoc.exists()) throw new Error('Usuario no encontrado');
  
  const entidadId = userDoc.data().comercioId;
  if (!entidadId) throw new Error('Usuario sin comercio asignado');
  
  return entidadId;
}

/**
 * Obtiene todos los datos del comercio
 */
export async function getUserData() {
  const entidadId = await getEntidadId();
  const comercioRef = doc(db, 'entidades', entidadId);
  const comercioDoc = await getDoc(comercioRef);
  
  if (!comercioDoc.exists()) {
    throw new Error('Comercio no encontrado');
  }
  
  return { id: entidadId, ...comercioDoc.data() };
}

/**
 * Obtiene todos los productos del comercio
 */
export async function getProducts() {
  const entidadId = await getEntidadId();
  const productosRef = collection(db, 'entidades', entidadId, 'productos');
  const snapshot = await getDocs(productosRef);
  
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
}

/**
 * Agrega un nuevo producto
 */
export async function addProduct(productData) {
  const entidadId = await getEntidadId();
  const productosRef = collection(db, 'entidades', entidadId, 'productos');
  
  const docRef = await addDoc(productosRef, {
    ...productData,
    fechaCreacion: new Date(),
    fechaActualizacion: new Date()
  });
  
  return docRef.id;
}

/**
 * Actualiza un producto existente
 */
export async function updateProduct(productId, updates) {
  const entidadId = await getEntidadId();
  const productRef = doc(db, 'entidades', entidadId, 'productos', productId);
  
  await updateDoc(productRef, {
    ...updates,
    fechaActualizacion: new Date()
  });
}

/**
 * Elimina un producto
 */
export async function deleteProduct(productId) {
  const entidadId = await getEntidadId();
  const productRef = doc(db, 'entidades', entidadId, 'productos', productId);
  await deleteDoc(productRef);
}

/**
 * Obtiene horarios del comercio
 */
export async function getHorarios() {
  const userData = await getUserData();
  return userData.horarios || {};
}

/**
 * Guarda horarios del comercio
 */
export async function saveHorarios(horariosData) {
  const entidadId = await getEntidadId();
  const comercioRef = doc(db, 'entidades', entidadId);
  
  await updateDoc(comercioRef, {
    horarios: horariosData,
    fechaActualizacion: new Date()
  });
}

/**
 * Actualiza datos del comercio
 */
export async function updateUserData(updates) {
  const entidadId = await getEntidadId();
  const comercioRef = doc(db, 'entidades', entidadId);
  
  await updateDoc(comercioRef, {
    ...updates,
    fechaActualizacion: new Date()
  });
}
