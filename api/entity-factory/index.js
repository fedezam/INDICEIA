// /api/entity-factory/index.js
// Entity Factory oficial — ÍndiceIA (A + B + C) – Modo update

import { readFileSync } from 'fs';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import admin from 'firebase-admin';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

// Inicializar Firebase solo una vez (serverless safe)
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
  });
}
const db = admin.firestore();

// Función hasData – La regla de oro: solo entra lo que realmente existe
function hasData(value) {
  if (typeof value === 'boolean') return true; // false semántico SÍ entra
  if (typeof value === 'string') return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'object' && value !== null) return Object.keys(value).length > 0;
  return value !== undefined && value !== null;
}

export async function buildEntity({ comercioId }) {
  if (!comercioId) throw new Error('Falta comercioId');

  // ----- Block A: Copiado literal desde archivo (inmutable global)
  const blockAPath = resolve(__dirname, 'base/blockA.json');
  let blockA;
  try {
    blockA = JSON.parse(readFileSync(blockAPath, 'utf-8'));
  } catch (err) {
    console.error('❌ Error leyendo blockA.json', err);
    throw new Error('No se pudo cargar Block A');
  }

  // ----- Datos crudos desde Firestore
  const comercioDoc = await db.collection('comercios').doc(comercioId).get();
  if (!comercioDoc.exists) {
    throw new Error(`Comercio ${comercioId} no encontrado en Firestore`);
  }
  const comercioData = comercioDoc.data();

  // Opcional: cargar productos si existen como subcolección
  let productos = [];
  try {
    const productosSnap = await db
      .collection('comercios')
      .doc(comercioId)
      .collection('productos')
      .get();
    productos = productosSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (err) {
    console.warn('No se encontraron productos o subcolección inexistente');
  }

  // ----- Block B: Proyección controlada – SOLO lo que existe
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

  // Catálogo: solo si tiene secciones o productos
  if (hasData(productos) || hasData(comercioData.catalogo)) {
    B.catalogo = {
      moneda: comercioData.moneda || 'ARS',
      secciones: comercioData.catalogo?.secciones || [
        {
          id: 'principal',
          titulo: 'Productos',
          tipo: 'grid',
          prioridad: 1,
          items: productos.map(p => {
            const item = {
              id: p.id,
              nombre: p.nombre,
              precio_final: p.precio_final,
              paused: p.paused || false
            };
            // Aplicar hasData a cada campo del producto
            if (hasData(p.codigo)) item.codigo = p.codigo;
            if (hasData(p.descripcion)) item.descripcion = p.descripcion;
            if (hasData(p.categoria)) item.categoria = p.categoria;
            if (hasData(p.imagen)) item.imagen = p.imagen;
            if (hasData(p.stock)) item.stock = p.stock;
            if (hasData(p.etiquetas)) item.etiquetas = p.etiquetas;
            if (hasData(p.atributos)) item.atributos = p.atributos;
            if (hasData(p.destacado)) item.destacado = p.destacado; // ← Aquí entra solo si existe
            return item;
          }).filter(item => hasData(item.nombre)) // seguridad extra
        }
      ]
    };
  }

  B.updatedAt = new Date().toISOString();

  // Blindaje
  Object.freeze(B);

  // ----- Block C: por ahora vacío (se puede expandir después)
  const C = {};

  // ----- Entidad final
  return {
    meta: {
      version: blockA?.meta?.version || '1.0.0',
      tipo: 'entidad_comercial_indiceIA',
      comercioId,
      generatedAt: new Date().toISOString(),
      mode: 'update'
    },
    contracts: {
      blockB: {
        role: 'single_source_of_truth',
        mutable: false,
        renderReady: true,
        allowedConsumers: ['renderer', 'llm']
      },
      blockC: {
        role: 'visual_only',
        optional: true,
        consumedBy: ['renderer'],
        ignoredByEntity: true
      }
    },
    A: blockA,
    B,
    C
  };
}
