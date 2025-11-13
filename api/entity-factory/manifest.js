/**
 * Manifest Module - Control de builds y estado en Firestore
 * ----------------------------------------------------------
 * Administra los registros de builds de entidades generadas por el Entity Factory.
 * Guarda metadatos, logs y resultados de validación en tiempo real.
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, updateDoc, getDoc, collection, addDoc, Timestamp } from 'firebase/firestore';
import { Logger } from './utils/logger.js';
import { firebaseConfig } from './config/firebase.js';

// 🔹 Inicializar Firebase (solo una vez)
let db;
try {
  const app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  Logger.debug('🔥 Firestore inicializado (manifest.js)');
} catch (e) {
  db = getFirestore();
  Logger.debug('⚙️ Firestore ya estaba inicializado (manifest.js)');
}

/**
 * 🧾 Crear nuevo registro de build en Firestore
 */
export async function createManifestEntry(build_id, comercio_id, metadata = {}) {
  try {
    const ref = doc(db, 'entity_builds', build_id);

    const payload = {
      build_id,
      comercio_id,
      status: 'in_progress',
      created_at: Timestamp.now(),
      updated_at: Timestamp.now(),
      logs: [],
      metadata,
    };

    await setDoc(ref, payload);
    Logger.info(`🧱 Build manifest creado → ${build_id}`);
    return payload;

  } catch (error) {
    Logger.error(`❌ Error creando manifest ${build_id}:`, error);
    throw error;
  }
}

/**
 * 🔁 Actualizar manifest existente
 */
export async function updateManifest(build_id, data = {}) {
  try {
    const ref = doc(db, 'entity_builds', build_id);

    const payload = {
      ...data,
      updated_at: Timestamp.now(),
    };

    await updateDoc(ref, payload);
    Logger.debug(`🪶 Manifest actualizado (${build_id})`);
    return true;

  } catch (error) {
    Logger.error(`❌ Error actualizando manifest ${build_id}:`, error);
    throw error;
  }
}

/**
 * 🧩 Agregar log en tiempo real al manifest
 */
export async function appendLog(build_id, message, level = 'info') {
  try {
    const ref = doc(db, 'entity_builds', build_id);
    const snap = await getDoc(ref);

    if (!snap.exists()) {
      Logger.warn(`⚠️ Manifest no encontrado para build ${build_id}`);
      return false;
    }

    const oldLogs = snap.data().logs || [];
    const newLog = {
      timestamp: new Date().toISOString(),
      level,
      message,
    };

    const updatedLogs = [...oldLogs, newLog].slice(-1000); // límite de logs
    await updateDoc(ref, { logs: updatedLogs, updated_at: Timestamp.now() });

    Logger.debug(`📜 Log añadido a manifest ${build_id}: ${message}`);
    return true;

  } catch (error) {
    Logger.error(`❌ Error agregando log al manifest ${build_id}:`, error);
    return false;
  }
}

/**
 * 📄 Obtener manifest completo
 */
export async function getManifest(build_id) {
  try {
    const ref = doc(db, 'entity_builds', build_id);
    const snap = await getDoc(ref);

    if (!snap.exists()) {
      Logger.warn(`⚠️ Manifest no encontrado: ${build_id}`);
      return null;
    }

    Logger.info(`📖 Manifest obtenido: ${build_id}`);
    return snap.data();

  } catch (error) {
    Logger.error(`❌ Error obteniendo manifest ${build_id}:`, error);
    throw error;
  }
}

/**
 * 📚 Listar builds recientes (últimos N)
 */
export async function listRecentBuilds(limit = 10) {
  try {
    const buildsRef = collection(db, 'entity_builds');
    const querySnapshot = await getDocs(buildsRef);

    const all = [];
    querySnapshot.forEach((doc) => {
      all.push(doc.data());
    });

    const sorted = all.sort((a, b) => b.created_at?.toMillis() - a.created_at?.toMillis());
    return sorted.slice(0, limit);

  } catch (error) {
    Logger.error('❌ Error listando builds recientes:', error);
    return [];
  }
}

/**
 * ✅ Marcar un build como exitoso
 */
export async function markBuildAsSuccess(build_id, extra = {}) {
  try {
    const payload = {
      status: 'success',
      finished_at: Timestamp.now(),
      ...extra
    };

    await updateManifest(build_id, payload);
    Logger.info(`✅ Build marcado como SUCCESS: ${build_id}`);
    return true;

  } catch (error) {
    Logger.error(`❌ Error marcando build ${build_id} como success:`, error);
    throw error;
  }
}

/**
 * ❌ Marcar un build como fallido
 */
export async function markBuildAsFailed(build_id, error) {
  try {
    const payload = {
      status: 'failed',
      finished_at: Timestamp.now(),
      error_message: error?.message || 'Unknown error',
      error_stack: error?.stack || null
    };

    await updateManifest(build_id, payload);
    Logger.warn(`❌ Build marcado como FAILED: ${build_id}`);
    return true;

  } catch (err) {
    Logger.error(`Error marcando build ${build_id} como failed:`, err);
    throw err;
  }
}
