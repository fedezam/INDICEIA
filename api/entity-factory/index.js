// /api/entity-factory/index.js
// Entity Factory oficial — ÍndiceIA v1 (Production Ready – Mapeo completo IA + mensajes + reglas)

import { readFileSync } from 'fs';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import admin from 'firebase-admin';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

// Inicialización segura de Firebase Admin (Vercel production)
if (!admin.apps.length) {
  if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
    throw new Error('Falta variable de entorno FIREBASE_SERVICE_ACCOUNT');
  }

  let serviceAccount;
  try {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  } catch (err) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT inválido (JSON mal formado)');
  }

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

// Regla de oro: solo lo que existe y tiene datos reales entra
function hasData(value) {
  if (typeof value === 'boolean') return true;
  if (typeof value === 'string') return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'object' && value !== null) return Object.keys(value).length > 0;
  return value !== undefined && value !== null;
}

export async function buildEntity({ comercioId }) {
  if (!comercioId) throw new Error('Falta comercioId');

  // ----- Block A: Copiado literal
  const blockAPath = resolve(__dirname, 'base/blockA.json');
  let blockA;
  try {
    blockA = JSON.parse(readFileSync(blockAPath, 'utf-8'));
  } catch (err) {
    console.error('❌ Error leyendo blockA.json', err);
    throw new Error('No se pudo cargar Block A');
  }

  // ----- Lectura Firestore
  const comercioRef = db.collection('comercios').doc(comercioId);
  const comercioSnap = await comercioRef.get();

  if (!comercioSnap.exists) {
    throw new Error(`Comercio ${comercioId} no encontrado`);
  }

  const comercioData = comercioSnap.data();

  // Productos subcolección
  let productos = [];
  try {
    const productosSnap = await comercioRef.collection('productos').get();
    productos = productosSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (err) {
    console.warn('⚠️ Subcolección productos no encontrada o vacía');
  }

  // ----- Block B: Proyección completa y limpia
  const B = { id: comercioId };

  // Básicos del comercio
  if (hasData(comercioData.nombreComercio)) B.nombre = comercioData.nombreComercio;
  if (hasData(comercioData.descripcion)) B.descripcion = comercioData.descripcion;
  if (hasData(comercioData.direccion)) B.direccion = comercioData.direccion;
  if (hasData(comercioData.telefono)) B.telefono = comercioData.telefono;
  if (hasData(comercioData.whatsapp)) B.whatsapp = comercioData.whatsapp;
  if (hasData(comercioData.email)) B.email = comercioData.email;

  // Ubicación estructurada
  const ubicacion = {};
  if (hasData(comercioData.direccion)) ubicacion.direccion = comercioData.direccion;
  if (hasData(comercioData.ciudad)) ubicacion.ciudad = comercioData.ciudad;
  if (hasData(comercioData.provincia)) ubicacion.provincia = comercioData.provincia;
  if (hasData(comercioData.pais)) ubicacion.pais = comercioData.pais;
  if (Object.keys(ubicacion).length > 0) B.ubicacion = ubicacion;

  // Contacto estructurado (redes)
  const contacto = {};
  if (hasData(comercioData.telefono)) contacto.telefono = comercioData.telefono;
  if (hasData(comercioData.whatsapp)) contacto.whatsapp = comercioData.whatsapp;
  if (hasData(comercioData.email)) contacto.email = comercioData.email;
  if (hasData(comercioData.website)) contacto.website = comercioData.website;
  if (hasData(comercioData.instagram)) contacto.instagram = comercioData.instagram;
  if (hasData(comercioData.facebook)) contacto.facebook = comercioData.facebook;
  if (hasData(comercioData.tiktok)) contacto.tiktok = comercioData.tiktok;
  if (Object.keys(contacto).length > 0) B.contacto = contacto;

  // Horarios
  if (hasData(comercioData.horarios)) B.horarios = comercioData.horarios;

  // Plan y template
  if (hasData(comercioData.plan)) B.plan = comercioData.plan;
  if (hasData(comercioData.templateId)) B.templateId = comercioData.templateId;

  // ----- IA Config → Block B.ia
  if (hasData(comercioData.aiConfig)) {
    const ai = comercioData.aiConfig;
    const iaBlock = {};

    if (hasData(ai.aiName)) iaBlock.nombre = ai.aiName;
    if (hasData(ai.aiGreeting)) iaBlock.saludo = ai.aiGreeting;
    if (hasData(ai.aiLanguage)) iaBlock.idioma = ai.aiLanguage;
    if (hasData(ai.aiPersonality)) iaBlock.personalidad = ai.aiPersonality;
    if (hasData(ai.aiTone)) iaBlock.tono = ai.aiTone;
    if (hasData(ai.formatoRespuestas)) iaBlock.formatoRespuestas = ai.formatoRespuestas;
    if (hasData(ai.proactividad)) iaBlock.proactividad = ai.proactividad;

    if (Object.keys(iaBlock).length > 0) B.ia = iaBlock;
  }

  // ----- Mensajes predefinidos
  const mensajesBlock = {};
  if (hasData(comercioData.aiConfig?.aiGreeting)) mensajesBlock.saludo = comercioData.aiConfig.aiGreeting;
  if (hasData(comercioData.aiConfig?.mensajeDefault)) mensajesBlock.mensajeDefault = comercioData.aiConfig.mensajeDefault;
  if (hasData(comercioData.aiConfig?.mensajeWhatsapp)) mensajesBlock.mensajeWhatsapp = comercioData.aiConfig.mensajeWhatsapp;
  if (hasData(comercioData.aiConfig?.mensajeInstagram)) mensajesBlock.mensajeInstagram = comercioData.aiConfig.mensajeInstagram;
  if (hasData(comercioData.aiConfig?.mensajeWeb)) mensajesBlock.mensajeWeb = comercioData.aiConfig.mensajeWeb;
  if (hasData(comercioData.aiConfig?.sinStock)) mensajesBlock.mensajeSinStock = "Lo siento, ese producto no tiene stock";
  if (hasData(comercioData.aiConfig?.sinPrecio)) mensajesBlock.mensajeSinPrecio = "Te paso el precio por privado";

  if (Object.keys(mensajesBlock).length > 0) B.mensajes = mensajesBlock;

  // ----- Reglas de negocio
  const reglasBlock = {};
  if (hasData(comercioData.aiConfig?.sinStock)) reglasBlock.accionSinStock = comercioData.aiConfig.sinStock;
  if (hasData(comercioData.aiConfig?.sinPrecio)) reglasBlock.accionSinPrecio = comercioData.aiConfig.sinPrecio;
  if (hasData(comercioData.aiConfig?.localCerrado)) reglasBlock.accionLocalCerrado = comercioData.aiConfig.localCerrado;

  if (Object.keys(reglasBlock).length > 0) B.reglasNegocio = reglasBlock;

  // ----- Pagos (si existe)
  if (hasData(comercioData.paymentMethods) || hasData(comercioData.metodos_pago)) {
    B.pagos = {};
    if (hasData(comercioData.paymentMethods)) B.pagos.metodosDisponibles = comercioData.paymentMethods;
    if (hasData(comercioData.metodos_pago)) B.pagos.metodosDisponibles = [comercioData.metodos_pago];
  }

  // ----- Catálogo completo
  if (productos.length > 0) {
    const items = productos.map(p => {
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
      if (hasData(p.destacado)) item.destacado = p.destacado;

      return item;
    });

    B.catalogo = {
      moneda: comercioData.moneda || 'ARS',
      secciones: [
        {
          id: 'principal',
          titulo: comercioData.nombreComercio || 'Catálogo',
          tipo: 'grid',
          prioridad: 1,
          items,
        },
      ],
    };

    // Productos destacados (si el comercio los definió explícitamente)
    if (hasData(comercioData.productosDestacados)) {
      B.catalogo.destacados = comercioData.productosDestacados.map(d => d.id || d);
    }
  }

  B.updatedAt = new Date().toISOString();

  Object.freeze(B);

  // ----- Block C (vacío por ahora)
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
