// /api/entity-factory/fetch.js

/**
 * Módulo de Fetch desde Firebase
 * Obtiene datos del comercio y su catálogo
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, collection, getDocs } from 'firebase/firestore';
import { generateSemanticTags } from './utils/tags-generator.js';
import { Logger } from './utils/logger.js';
import { firebaseConfig } from './config/firebase.js'; // 🔹 nueva recomendación

// Inicializar Firebase (si no está inicializado)
let db;
try {
  const app = initializeApp(firebaseConfig);
  db = getFirestore(app);
} catch (e) {
  // Si ya está inicializado, se evita el error “app already exists”
  db = getFirestore();
}

/**
 * Fetch datos principales del comercio
 */
export async function fetchComercioData(comercio_id) {
  try {
    const comercioRef = doc(db, 'comercios', comercio_id);
    const comercioSnap = await getDoc(comercioRef);

    if (!comercioSnap.exists()) {
      Logger.warn(`⚠️ Comercio ${comercio_id} no encontrado`);
      throw new Error(`Comercio ${comercio_id} not found`);
    }

    const data = comercioSnap.data();
    Logger.info(`✅ Comercio data fetched: ${data.nombre}`);
    
    return { ...data, id: comercio_id };
  } catch (error) {
    Logger.error(`❌ Error fetching comercio ${comercio_id}:`, error);
    throw error;
  }
}

/**
 * Fetch catálogo completo con procesamiento
 */
export async function fetchCatalogo(comercio_id) {
  try {
    const catalogoRef = collection(db, `comercios/${comercio_id}/catalogo`);
    const catalogoSnap = await getDocs(catalogoRef);

    const rawItems = [];
    catalogoSnap.forEach((doc) => {
      rawItems.push({ id: doc.id, ...doc.data() });
    });

    Logger.info(`📦 ${rawItems.length} items obtenidos del catálogo`);

    // Procesar items y detectar categorías
    const processedItems = rawItems.map(processItem);
    const categorias = [...new Set(processedItems.map((i) => i.categoria))];

    Logger.info(`📂 Categorías detectadas: ${categorias.join(', ')}`);

    return {
      categorias,
      items: processedItems,
      metadata: {
        total_items: processedItems.length,
        last_sync: new Date().toISOString(),
      },
    };
  } catch (error) {
    Logger.error(`❌ Error fetching catalogo for ${comercio_id}:`, error);
    throw error;
  }
}

/**
 * Procesar un item individual del catálogo
 */
function processItem(item) {
  if (!item.nombre) Logger.warn(`Item ${item.id} missing nombre`);
  if (!item.categoria) {
    Logger.warn(`Item ${item.id} missing categoria → set 'General'`);
    item.categoria = 'General';
  }

  if (!item.id) item.id = `${item.categoria.toUpperCase()}_${Date.now()}`;

  // Generar tags si no existen
  if (!item.tags || item.tags.length === 0) {
    item.tags = generateSemanticTags(item.nombre, item.descripcion);
  }

  const processed = {
    id: item.id,
    nombre: item.nombre || 'Sin nombre',
    descripcion: item.descripcion || '',
    categoria: item.categoria,
    disponible: item.disponible !== false,
    stock: item.stock ?? null,
    tags: item.tags,
    image_url: item.image_url || item.imagen || null,
    images: item.images || (item.image_url ? [item.image_url] : []),
    precio: item.precio ?? null,
    precio_mediana: item.precio_mediana ?? null,
    precio_grande: item.precio_grande ?? null,
    specs: item.specs || null,
    created_at: item.created_at || new Date().toISOString(),
    updated_at: item.updated_at || new Date().toISOString(),
  };

  if (!processed.precio && !processed.precio_mediana && !processed.precio_grande) {
    Logger.warn(`⚠️ Item ${item.id} sin precio definido`);
  }

  return processed;
}

/**
 * Configuración IA (opcional)
 */
export async function fetchIAConfig(comercio_id) {
  try {
    const configRef = doc(db, `comercios/${comercio_id}/config/ia`);
    const configSnap = await getDoc(configRef);

    if (!configSnap.exists()) {
      Logger.debug(`No IA config found for ${comercio_id}, usando defaults`);
      return null;
    }

    return configSnap.data();
  } catch (error) {
    Logger.warn(`⚠️ Error fetching IA config:`, error);
    return null;
  }
}

/**
 * Histórico de cambios (placeholder)
 */
export async function fetchChangeHistory(comercio_id, since) {
  try {
    // En futuras versiones: detectar campos modificados para builds incrementales
    return null;
  } catch (error) {
    Logger.warn(`⚠️ Error fetching change history:`, error);
    return null;
  }
}
