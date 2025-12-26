// /api/entity-factory/index.js
// Entity Factory oficial — ÍndiceIA v1 (Production Ready – Mapeo completo con nombres reales de Firestore)
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import admin from 'firebase-admin';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

// ----- Template Registry (Bloque C) - Cargado desde el archivo generado por sync-templates.js
const templateRegistryPath = resolve(__dirname, 'templates/registry.entity.json');
let templateRegistry = { templates: {} };

try {
  const raw = readFileSync(templateRegistryPath, 'utf-8');
  const parsed = JSON.parse(raw);
  // El archivo generado tiene { registry_version, last_updated, templates: { ... } }
  if (parsed && parsed.templates && typeof parsed.templates === 'object') {
    templateRegistry.templates = parsed.templates;
    console.log(`✅ Registry entity cargado correctamente: ${Object.keys(templateRegistry.templates).length} template(s) disponibles`);
  } else {
    console.warn('⚠️ registry.entity.json no contiene un objeto "templates" válido. Usando registry vacío.');
  }
} catch (err) {
  console.error('❌ Error crítico leyendo api/entity-factory/templates/registry.entity.json', err);
  console.warn('⚠️ Block C (visual) estará deshabilitado hasta que el registry se genere correctamente.');
  templateRegistry = { templates: {} };
}

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

// Regla de oro: solo entra lo que existe y tiene datos reales
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

  // ----- Block B: Proyección completa con nombres reales de tu DB
  const B = { id: comercioId };

  // Nombre del comercio
  if (hasData(comercioData.nombreComercio)) B.nombre = comercioData.nombreComercio;
  // Descripción
  if (hasData(comercioData.descripcion)) B.descripcion = comercioData.descripcion;

  // Ubicación estructurada
  const ubicacion = {};
  if (hasData(comercioData.direccion)) ubicacion.direccion = comercioData.direccion;
  if (hasData(comercioData.ciudad)) ubicacion.ciudad = comercioData.ciudad;
  if (hasData(comercioData.provincia)) ubicacion.provincia = comercioData.provincia;
  if (hasData(comercioData.pais)) ubicacion.pais = comercioData.pais;
  if (Object.keys(ubicacion).length > 0) B.ubicacion = ubicacion;

  // Contacto estructurado
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

  // Categorías
  if (hasData(comercioData.categories)) B.categorias = comercioData.categories;

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

  // ----- Mensajes predefinidos (desde aiConfig)
  if (hasData(comercioData.aiConfig)) {
    const ai = comercioData.aiConfig;
    const mensajes = {};
    if (hasData(ai.aiGreeting)) mensajes.saludo = ai.aiGreeting;
    if (hasData(ai.mensajeDefault)) mensajes.mensajeDefault = ai.mensajeDefault;
    if (hasData(ai.mensajeWhatsapp)) mensajes.mensajeWhatsapp = ai.mensajeWhatsapp;
    if (hasData(ai.mensajeInstagram)) mensajes.mensajeInstagram = ai.mensajeInstagram;
    if (hasData(ai.mensajeWeb)) mensajes.mensajeWeb = ai.mensajeWeb;
    if (Object.keys(mensajes).length > 0) B.mensajes = mensajes;
  }

  // ----- Reglas de negocio (desde aiConfig)
  if (hasData(comercioData.aiConfig)) {
    const ai = comercioData.aiConfig;
    const reglas = {};
    if (hasData(ai.sinStock)) reglas.accionSinStock = ai.sinStock;
    if (hasData(ai.sinPrecio)) reglas.accionSinPrecio = ai.sinPrecio;
    if (hasData(ai.localCerrado)) reglas.accionLocalCerrado = ai.localCerrado;
    if (Object.keys(reglas).length > 0) B.reglasNegocio = reglas;
  }

  // ----- Pagos
  if (hasData(comercioData.paymentMethods)) {
    B.pagos = { metodosDisponibles: comercioData.paymentMethods };
  } else if (hasData(comercioData.metodos_pago)) {
    B.pagos = { metodosDisponibles: [comercioData.metodos_pago] };
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
      if (hasData(p.subcategoria)) item.subcategoria = p.subcategoria;
      if (hasData(p.marca)) item.marca = p.marca;
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
    // Productos destacados explícitos del comercio
    if (hasData(comercioData.productosDestacados)) {
      B.catalogo.destacados = comercioData.productosDestacados.map(d => typeof d === 'string' ? d : d.id);
    }
  }

  B.updatedAt = new Date().toISOString();
  Object.freeze(B);

  // ----- Block C (visual) - INYECTADO AUTOMÁTICAMENTE DESDE registry.entity.json
  let C = {};
  if (hasData(B.templateId)) {
    const templateConfig = templateRegistry.templates[B.templateId];
    if (!templateConfig) {
      console.warn(`⚠️ Template "${B.templateId}" no encontrado en registry.entity.json → Block C vacío`);
    } else {
      C = {
        visual: {
          available: true,
          template: {
            id: templateConfig.id,
            version: templateConfig.version,
            entrypoint: templateConfig.entrypoint,
            supports: templateConfig.supports || {},
            requirements: templateConfig.requirements || {}
          },
          mode: 'iframe', // futuro: 'ssr' o 'client'
          consumes: ['B'],
        },
      };
      console.log(`✅ Block C inyectado para template ${B.templateId}`);
    }
  } else {
    console.log('ℹ️ No hay templateId seleccionado → Block C desactivado');
  }

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
