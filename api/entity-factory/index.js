// /api/entity-factory/index.js
// Entity Factory oficial — ÍndiceIA v1 (Production Ready)
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
  if (parsed && parsed.templates && typeof parsed.templates === 'object') {
    templateRegistry.templates = parsed.templates;
    console.log(`✅ Registry entity cargado: ${Object.keys(templateRegistry.templates).length} template(s)`);
  } else {
    console.warn('⚠️ registry.entity.json sin "templates" válido → Block C vacío');
  }
} catch (err) {
  console.error('❌ Error leyendo registry.entity.json', err);
  console.warn('⚠️ Block C deshabilitado hasta que se genere el registry');
}

// Inicialización segura de Firebase Admin
if (!admin.apps.length) {
  if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
    throw new Error('Falta FIREBASE_SERVICE_ACCOUNT');
  }
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}
const db = admin.firestore();

// Solo incluir campos con datos reales
function hasData(value) {
  if (typeof value === 'boolean') return true;
  if (typeof value === 'string') return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'object' && value !== null) return Object.keys(value).length > 0;
  return value !== undefined && value !== null;
}

export async function buildEntity({ comercioId }) {
  if (!comercioId) throw new Error('Falta comercioId');

  // ----- Block A (archivo base hardcodeado)
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
  if (!comercioSnap.exists) throw new Error(`Comercio ${comercioId} no encontrado`);

  const comercioData = comercioSnap.data();

  // ===== DETERMINAR .LIVE SEGÚN PLAN =====
  const plan = comercioData.plan || 'trial';
  const PLANS_WITH_LIVE = ['trial', 'pro', 'highvalue', 'premium'];
  const liveEnabled = PLANS_WITH_LIVE.includes(plan);
  console.log(`🔧 Plan "${plan}" → .live ${liveEnabled ? 'HABILITADO' : 'DESHABILITADO'}`);
  // ===== FIN .LIVE =====

  // ===== OBTENER REFERRAL DEL DUEÑO =====
  let referralCode = comercioId.substring(0, 8).toUpperCase(); // fallback seguro

  if (comercioData.duenoId) {
    try {
      const ownerSnap = await db.collection('usuarios').doc(comercioData.duenoId).get();
      if (ownerSnap.exists) {
        const ownerData = ownerSnap.data();
        if (ownerData.referralId) {
          referralCode = ownerData.referralId;
        }
      }
    } catch (err) {
      console.warn('⚠️ No se pudo obtener referralId del dueño, usando fallback');
    }
  }
  console.log(`🔗 Referral code: ${referralCode}`);
  // ===== FIN REFERRAL =====

  // ----- Productos
  let productos = [];
  try {
    const productosSnap = await comercioRef.collection('productos').get();
    productos = productosSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (err) {
    console.warn('⚠️ Subcolección productos vacía o no encontrada');
  }

  // ----- Block B
  const B = { id: comercioId };

  if (hasData(comercioData.nombreComercio)) B.nombre = comercioData.nombreComercio;
  if (hasData(comercioData.descripcion)) B.descripcion = comercioData.descripcion;

  const ubicacion = {};
  if (hasData(comercioData.direccion)) ubicacion.direccion = comercioData.direccion;
  if (hasData(comercioData.ciudad)) ubicacion.ciudad = comercioData.ciudad;
  if (hasData(comercioData.provincia)) ubicacion.provincia = comercioData.provincia;
  if (hasData(comercioData.pais)) ubicacion.pais = comercioData.pais;
  if (Object.keys(ubicacion).length > 0) B.ubicacion = ubicacion;

  const contacto = {};
  if (hasData(comercioData.telefono)) contacto.telefono = comercioData.telefono;
  if (hasData(comercioData.whatsapp)) contacto.whatsapp = comercioData.whatsapp;
  if (hasData(comercioData.email)) contacto.email = comercioData.email;
  if (hasData(comercioData.website)) contacto.website = comercioData.website;
  if (hasData(comercioData.instagram)) contacto.instagram = comercioData.instagram;
  if (hasData(comercioData.facebook)) contacto.facebook = comercioData.facebook;
  if (hasData(comercioData.tiktok)) contacto.tiktok = comercioData.tiktok;
  if (Object.keys(contacto).length > 0) B.contacto = contacto;

  if (hasData(comercioData.horarios)) B.horarios = comercioData.horarios;
  if (hasData(comercioData.plan)) B.plan = comercioData.plan;
  if (hasData(comercioData.templateId)) B.templateId = comercioData.templateId;
  if (hasData(comercioData.categories)) B.categorias = comercioData.categories;

  // IA Config
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

  // Mensajes y reglas
  if (hasData(comercioData.aiConfig)) {
    const ai = comercioData.aiConfig;
    const mensajes = {};
    if (hasData(ai.aiGreeting)) mensajes.saludo = ai.aiGreeting;
    if (hasData(ai.mensajeDefault)) mensajes.mensajeDefault = ai.mensajeDefault;
    if (hasData(ai.mensajeWhatsapp)) mensajes.mensajeWhatsapp = ai.mensajeWhatsapp;
    if (hasData(ai.mensajeInstagram)) mensajes.mensajeInstagram = ai.mensajeInstagram;
    if (hasData(ai.mensajeWeb)) mensajes.mensajeWeb = ai.mensajeWeb;
    if (Object.keys(mensajes).length > 0) B.mensajes = mensajes;

    const reglas = {};
    if (hasData(ai.sinStock)) reglas.accionSinStock = ai.sinStock;
    if (hasData(ai.sinPrecio)) reglas.accionSinPrecio = ai.sinPrecio;
    if (hasData(ai.localCerrado)) reglas.accionLocalCerrado = ai.localCerrado;
    if (Object.keys(reglas).length > 0) B.reglasNegocio = reglas;
  }

  // Pagos
  if (hasData(comercioData.paymentMethods)) {
    B.pagos = { metodosDisponibles: comercioData.paymentMethods };
  } else if (hasData(comercioData.metodos_pago)) {
    B.pagos = { metodosDisponibles: [comercioData.metodos_pago] };
  }

  // Catálogo
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
      secciones: [{
        id: 'principal',
        titulo: comercioData.nombreComercio || 'Catálogo',
        tipo: 'grid',
        prioridad: 1,
        items,
      }],
    };

    if (hasData(comercioData.productosDestacados)) {
      B.catalogo.destacados = comercioData.productosDestacados.map(d => typeof d === 'string' ? d : d.id);
    }
  }

  // ===== INYECCIÓN VIRALIDAD ORGÁNICA EN BLOCK B =====
  B.referral = {
    code: referralCode,
    shareMessage: `¿Te gustaría tener una IA como yo para tu negocio? Visitá https://indiceia.app/r/${referralCode} y empezá gratis.`
  };
  // ===== FIN INYECCIÓN =====

  B.updatedAt = new Date().toISOString();
  Object.freeze(B);

  // ===== RESOLVER PLACEHOLDERS EN BLOCK A =====
  const blockAString = JSON.stringify(blockA);
  const blockAResolved = blockAString
    .replace(/\{\{LIVE_ENABLED\}\}/g, liveEnabled.toString())
    .replace(/\{\{REFERRAL_URL\}\}/g, `https://indiceia.app/guia?ref=${referralCode}`);

  const A = JSON.parse(blockAResolved);
  console.log(`✅ Block A con placeholders resueltos: .live=${liveEnabled}, referralUrl con código ${referralCode}`);
  // ===== FIN RESOLUCIÓN PLACEHOLDERS =====

  // ----- Block C - Dinámico con URL absoluta al component.jsx
  let C = {};

  if (hasData(B.templateId)) {
    const templateConfig = templateRegistry.templates[B.templateId];

    if (!templateConfig) {
      console.warn(`⚠️ Template "${B.templateId}" no encontrado → Block C vacío`);
    } else {
      const TEMPLATES_BASE_URL = 'https://indiceia-templates.vercel.app/templates';

      const componentUrl = `${TEMPLATES_BASE_URL}/${templateConfig.entrypoint}/component.jsx`;
      const baseUrl = `${TEMPLATES_BASE_URL}/${templateConfig.entrypoint}/`;

      C = {
        visual: {
          available: true,
          template: {
            id: templateConfig.id,
            version: templateConfig.version,
            entrypoint: componentUrl,
            baseUrl: baseUrl,
            supports: templateConfig.supports || {},
            requirements: templateConfig.requirements || {}
          },
          mode: 'dynamic-client',
          consumes: ['B']
        }
      };

      console.log(`✅ Block C listo con entrypoint: ${componentUrl}`);
    }
  }

  // ----- Entidad final
  return {
    meta: {
      version: A?.meta?.version || '1.0.0',
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
    A,  // ← Block A con placeholders resueltos
    B,  // ← Block B con datos del comercio + referral
    C,  // ← Block C con template visual
  };
}