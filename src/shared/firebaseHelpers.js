// src/shared/firebaseHelpers.js
import { auth, db } from '../firebase.js';
import { 
  doc, 
  getDoc, 
  updateDoc, 
  setDoc, 
  collection, 
  query, 
  where, 
  getDocs,
  addDoc,
  deleteDoc 
} from 'firebase/firestore';
import { updateComercioJSON } from './utils.js';

/**
 * Obtiene el comercioId del usuario actual
 */
export async function getComercioId() {
  const user = auth.currentUser;
  if (!user) throw new Error('Usuario no autenticado');

  const userRef = doc(db, 'usuarios', user.uid);
  const userDoc = await getDoc(userRef);
  
  if (!userDoc.exists()) throw new Error('Usuario no encontrado');
  
  const comercioId = userDoc.data().comercioId;
  if (!comercioId) throw new Error('Usuario sin comercio asignado');
  
  return comercioId;
}

/**
 * Obtiene todos los datos del comercio
 */
export async function getUserData() {
  const comercioId = await getComercioId();
  const comercioRef = doc(db, 'comercios', comercioId);
  const comercioDoc = await getDoc(comercioRef);
  
  if (!comercioDoc.exists()) {
    throw new Error('Comercio no encontrado');
  }
  
  return { id: comercioId, ...comercioDoc.data() };
}

/**
 * Obtiene todos los productos del comercio
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
 * Agrega un nuevo producto
 */
export async function addProduct(productData) {
  const comercioId = await getComercioId();
  const productosRef = collection(db, 'comercios', comercioId, 'productos');
  
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
  const comercioId = await getComercioId();
  const productRef = doc(db, 'comercios', comercioId, 'productos', productId);
  
  await updateDoc(productRef, {
    ...updates,
    fechaActualizacion: new Date()
  });
}

/**
 * Elimina un producto
 */
export async function deleteProduct(productId) {
  const comercioId = await getComercioId();
  const productRef = doc(db, 'comercios', comercioId, 'productos', productId);
  await deleteDoc(productRef);
}

/**
 * Sincroniza datos del comercio a Gist (JSON público)
 */
export async function syncToGist() {
  try {
    const user = auth.currentUser;
    if (!user) return;
    
    const comercioId = await getComercioId();
    await updateComercioJSON(comercioId, user.uid);
    
    console.log('✅ Sincronización a Gist exitosa');
  } catch (error) {
    console.error('❌ Error sincronizando a Gist:', error);
    throw error;
  }
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
  const comercioId = await getComercioId();
  const comercioRef = doc(db, 'comercios', comercioId);
  
  await updateDoc(comercioRef, {
    horarios: horariosData,
    fechaActualizacion: new Date()
  });
}

/**
 * Actualiza datos del comercio
 */
export async function updateUserData(updates) {
  const comercioId = await getComercioId();
  const comercioRef = doc(db, 'comercios', comercioId);
  
  await updateDoc(comercioRef, {
    ...updates,
    fechaActualizacion: new Date()
  });
}
