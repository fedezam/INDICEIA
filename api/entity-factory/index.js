// /api/entity-factory/index.js
// Entity Factory oficial — ÍndiceIA v1 (Production Ready)

import { readFileSync } from 'fs';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import admin from 'firebase-admin';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

// Inicialización segura de Firebase Admin (producción Vercel)
if (!admin.apps.length) {
  if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
    throw new Error('Falta variable de entorno FIREBASE_SERVICE_ACCOUNT');
  }

  let serviceAccount;
  try {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  } catch (err) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT inválido (no es JSON válido)');
  }

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

// Regla de oro: solo entra lo que realmente existe y tiene datos
function hasData(value) {
  if (typeof value === 'boolean') return true; // false semántico SÍ entra
  if (typeof value === 'string') return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'object' && value !== null) return Object.keys(value).length > 0;
  return value !== undefined && value !== null;
}

export async function buildEntity({ comercioId }) {
  if (!comercioId) throw new Error('Falta comercioId');

  // ----- Block A: Copiado literal (inmutable global)
  const blockAPath = resolve(__dirname, 'base/blockA.json');
  let blockA;
  try {
    blockA = JSON.parse(readFileSync(blockAPath, 'utf-8'));
  } catch (err) {
    console.error('❌ Error leyendo blockA.json', err);
    throw new Error('No se pudo cargar Block A');
  }

  // ----- Lectura de datos crudos desde Firestore
  const comercioRef = db.collection('comercios').doc(comercioId);
  const comercioSnap = await comercioRef.get();

  if (!comercioSnap.exists) {
    throw new Error(`Comercio con ID ${comercioId} no encontrado`);
  }

  const comercioData = comercioSnap.data();

  // Productos (subcolección opcional)
  let productos = [];
  try {
    const productosSnap = await comercioRef.collection('productos').get();
    productos = productosSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (err) {
    console.warn(`⚠️ No se pudo leer subcolección productos: ${err.message}`);
  }

  // ----- Block B: Proyección limpia y mínima
  const B = { id: comercioId };

  if (hasData(comercioData.nombre)) B.nombre = comercioData.nombre;
  if (hasData(comercioData.descripcion)) B.descripcion = comercioData.descripcion;
  if (hasData(comercioData.direccion)) B.direccion = comercioData.direccion;
  if (hasData(comercioData.telefono)) B.telefono = comercioData.telefono;
  if (hasData(comercioData.categoria)) B.categoria = comercioData.categoria;
  if (hasData(comercioData.plan)) B.plan = comercioData.plan;

  if (hasData(comercioData.horarios)) B.horarios = comercioData.horarios;
  if (hasData(comercioData.pagos)) B.pagos = comercioData.pagos;
  if (hasData(comercioData.envios)) B.envios = comercioData.envios;
  if (hasData(comercioData.imagenes)) B.imagenes = comercioData.imagenes;

  // Catálogo: solo si hay productos o configuración explícita
  const tieneProductos = productos.length > 0;
  const tieneConfigCatalogo = hasData(comercioData.catalogo);

  if (tieneProductos || tieneConfigCatalogo) {
    const itemsFiltrados = productos.map(p => {
      const item = {
        id: p.id,
        nombre: p.nombre,
        precio_final: p.precio_final,
        paused: p.paused ?? false,
      };

      if (hasData(p.codigo)) item.codigo = p.codigo;
      if (hasData(p.descripcion)) item.descripcion = p.descripcion;
      if (hasData(p.categoria)) item.categoria = p.categoria;
      if (hasData(p.imagen)) item.imagen = p.imagen;
      if (hasData(p.stock)) item.stock = p.stock;
      if (hasData(p.etiquetas)) item.etiquetas = p.etiquetas;
      if (hasData(p.atributos)) item.atributos = p.atributos;
      if (hasData(p.destacado)) item.destacado = p.destacado; // ← Entra solo si existe

      return item;
    });

    B.catalogo = {
      moneda: comercioData.moneda || 'ARS',
      secciones: comercioData.catalogo?.secciones || [
        {
          id: 'principal',
          titulo: 'Productos',
          tipo: 'grid',
          prioridad: 1,
          items: itemsFiltrados,
        },
      ],
    };
  }

  B.updatedAt = new Date().toISOString();

  // Blindaje: B es inmutable
  Object.freeze(B);

  // ----- Block C: por ahora vacío (preparado para futuro)
  const C = {};

  // ----- Entidad final
  return {
    meta: {
      version: blockA?.meta?.version || '1.0.0',
      tipo: 'entidad_comercial_indiceIA',
      comercioId,
      generatedAt: new Date().toISOString(),
      mode: 'production',
    },
    contracts: {
      blockB: {
        role: 'single_source_of_truth',
        mutable: false,
        renderReady: true,
        allowedConsumers: ['renderer', 'llm'],
      },
      blockC: {
        role: 'visual_only',
        optional: true,
        consumedBy: ['renderer'],
        ignoredByEntity: true,
      },
    },
    A: blockA,
    B,
    C,
  };
}
