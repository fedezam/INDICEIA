// /api/entity-factory/index.js
// Entity Factory oficial — ÍndiceIA v1 (Production Ready)

import { readFileSync } from 'fs';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import admin from 'firebase-admin';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

// ----- Template Registry (Block C)
const templateRegistryPath = resolve(__dirname, 'templates/registry.entity.json');
let templateRegistry = { templates: {} };

try {
  const raw = readFileSync(templateRegistryPath, 'utf-8');
  const parsed = JSON.parse(raw);
  if (parsed?.templates && typeof parsed.templates === 'object') {
    templateRegistry.templates = parsed.templates;
    console.log(`✅ Registry entity cargado: ${Object.keys(templateRegistry.templates).length} template(s)`);
  }
} catch {
  console.warn('⚠️ Block C deshabilitado (registry no disponible)');
}

// ----- Firebase Admin
if (!admin.apps.length) {
  if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
    throw new Error('Falta FIREBASE_SERVICE_ACCOUNT');
  }
  admin.initializeApp({
    credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)),
  });
}
const db = admin.firestore();

// ----- Utils
function hasData(value) {
  if (typeof value === 'boolean') return true;
  if (typeof value === 'string') return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'object' && value !== null) return Object.keys(value).length > 0;
  return value !== undefined && value !== null;
}

// ===== ENTITY BUILDER =====
export async function buildEntity({ comercioId }) {
  if (!comercioId) throw new Error('Falta comercioId');

  // ----- Block A
  const blockAPath = resolve(__dirname, 'base/blockA.json');
  const blockA = JSON.parse(readFileSync(blockAPath, 'utf-8'));

  // ----- Block D
  const blockDPath = resolve(__dirname, 'base/blockD.json');
  const blockD = JSON.parse(readFileSync(blockDPath, 'utf-8'));

  // ----- Firestore comercio
  const comercioRef = db.collection('comercios').doc(comercioId);
  const comercioSnap = await comercioRef.get();
  if (!comercioSnap.exists) throw new Error(`Comercio ${comercioId} no encontrado`);

  const comercioData = comercioSnap.data();

  // ===== LIVE MODE =====
  const plan = comercioData.plan || 'trial';
  const liveEnabled = ['trial', 'pro', 'highvalue', 'premium'].includes(plan);

  // ===== REFERRAL =====
  let referralCode = comercioId.substring(0, 8).toUpperCase();
  if (comercioData.duenoId) {
    const ownerSnap = await db.collection('usuarios').doc(comercioData.duenoId).get();
    if (ownerSnap.exists && ownerSnap.data()?.referralId) {
      referralCode = ownerSnap.data().referralId;
    }
  }

  // ===== PRODUCTOS =====
  let productos = [];
  try {
    const snap = await comercioRef.collection('productos').get();
    productos = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch {}

  // ===== BLOCK B =====
  const B = { id: comercioId };

  if (hasData(comercioData.nombreComercio)) B.nombre = comercioData.nombreComercio;
  if (hasData(comercioData.descripcion)) B.descripcion = comercioData.descripcion;

  // Ubicación
  const ubicacion = {};
  ['direccion', 'ciudad', 'provincia', 'pais'].forEach(k => {
    if (hasData(comercioData[k])) ubicacion[k] = comercioData[k];
  });
  if (hasData(ubicacion)) B.ubicacion = ubicacion;

  // Contacto
  const contacto = {};
  ['telefono', 'whatsapp', 'email', 'website', 'instagram', 'facebook', 'tiktok'].forEach(k => {
    if (hasData(comercioData[k])) contacto[k] = comercioData[k];
  });
  if (hasData(contacto)) B.contacto = contacto;

  if (hasData(comercioData.horarios)) B.horarios = comercioData.horarios;
  if (hasData(comercioData.plan)) B.plan = comercioData.plan;
  if (hasData(comercioData.templateId)) B.templateId = comercioData.templateId;
  if (hasData(comercioData.categories)) B.categorias = comercioData.categories;

  // IA Config
  if (hasData(comercioData.aiConfig)) {
    const ai = comercioData.aiConfig;
    B.ia = {};
    if (hasData(ai.aiName)) B.ia.nombre = ai.aiName;
    if (hasData(ai.aiGreeting)) B.ia.saludo = ai.aiGreeting;
    if (hasData(ai.aiLanguage)) B.ia.idioma = ai.aiLanguage;
    if (hasData(ai.aiPersonality)) B.ia.personalidad = ai.aiPersonality;
    if (hasData(ai.aiTone)) B.ia.tono = ai.aiTone;
    if (hasData(ai.formatoRespuestas)) B.ia.formatoRespuestas = ai.formatoRespuestas;
    if (hasData(ai.proactividad)) B.ia.proactividad = ai.proactividad;
    if (!hasData(B.ia)) delete B.ia;
  }

  // Catálogo
  if (productos.length) {
    B.catalogo = {
      moneda: comercioData.moneda || 'ARS',
      secciones: [{
        id: 'principal',
        titulo: comercioData.nombreComercio || 'Catálogo',
        tipo: 'grid',
        prioridad: 1,
        items: productos.map(p => ({
          id: p.id,
          nombre: p.nombre,
          precio_final: p.precio_final,
          paused: p.paused ?? false,
          ...(hasData(p.codigo) && { codigo: p.codigo }),
          ...(hasData(p.descripcion) && { descripcion: p.descripcion }),
          ...(hasData(p.stock) && { stock: p.stock })
        }))
      }]
    };
  }

  // Referral injection
  B.referral = {
    code: referralCode,
    shareMessage: `¿Te gustaría tener una IA como yo para tu negocio? Visitá https://indiceia.app/r/${referralCode}`
  };

  B.updatedAt = new Date().toISOString();
  Object.freeze(B);

  // ===== RESOLVER BLOCK A PLACEHOLDERS =====
  const A = JSON.parse(
    JSON.stringify(blockA)
      .replace(/\{\{LIVE_ENABLED\}\}/g, liveEnabled.toString())
      .replace(/\{\{REFERRAL_URL\}\}/g, `https://indiceia.app/guia?ref=${referralCode}`)
  );

  // ===== RESOLVER AVAILABLE CHANNELS (BLOCK D) =====
  if (blockD?.availableChannels && B.contacto) {
    Object.entries(blockD.availableChannels).forEach(([channel, cfg]) => {
      if (typeof cfg === 'object') {
        cfg.enabled = hasData(B.contacto[channel]);
      }
    });
  }
  Object.freeze(blockD);

  // ===== BLOCK C =====
  let C = {};
  if (hasData(B.templateId)) {
    const t = templateRegistry.templates[B.templateId];
    if (t) {
      const base = 'https://indiceia-templates.vercel.app/templates';
      C = {
        visual: {
          available: true,
          template: {
            id: t.id,
            version: t.version,
            entrypoint: `${base}/${t.entrypoint}/component.jsx`,
            baseUrl: `${base}/${t.entrypoint}/`
          },
          mode: 'dynamic-client',
          consumes: ['B']
        }
      };
    }
  }

  // ===== FINAL ENTITY =====
  return {
    meta: {
      version: A?.meta?.version || '1.0.0',
      tipo: 'entidad_comercial_indiceIA',
      comercioId,
      generatedAt: new Date().toISOString(),
      mode: 'production',
    },
    contracts: {
      blockB: { role: 'single_source_of_truth', mutable: false },
      blockC: { role: 'visual_only', optional: true },
      blockD: { role: 'interaction_protocols', mutable: false }
    },
    A,
    B,
    C,
    D: blockD
  };
}
