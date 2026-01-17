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
  console.warn('⚠️ Registry entity no disponible. Block C inactivo.');
}

// ----- Firebase Admin
if (!admin.apps.length) {
  if (!process.env.FIREBASE_SERVICE_ACCOUNT) throw new Error('Falta FIREBASE_SERVICE_ACCOUNT');
  admin.initializeApp({
    credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)),
  });
}
const db = admin.firestore();

// ----- Utils
const hasData = (value) => {
  if (typeof value === 'boolean') return true;
  if (typeof value === 'string') return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'object' && value !== null) return Object.keys(value).length > 0;
  return value !== undefined && value !== null;
};

// ===== ENTITY BUILDER =====
export async function buildEntity({ comercioId }) {
  if (!comercioId) throw new Error('Falta comercioId');

  // Block A y D
  const blockA = JSON.parse(readFileSync(resolve(__dirname, 'base/blockA.json'), 'utf-8'));
  const blockD = JSON.parse(readFileSync(resolve(__dirname, 'base/blockD.json'), 'utf-8'));

  // Firestore
  const comercioRef = db.collection('comercios').doc(comercioId);
  const snap = await comercioRef.get();
  if (!snap.exists) throw new Error(`Comercio ${comercioId} no encontrado`);
  const data = snap.data();

  // ===== BLOCK B =====
  const B = { id: comercioId };

  if (hasData(data.nombreComercio)) B.nombre = data.nombreComercio;
  if (hasData(data.descripcion)) B.descripcion = data.descripcion;

  const ubicacion = {};
  ['direccion', 'ciudad', 'provincia', 'pais'].forEach(k => {
    if (hasData(data[k])) ubicacion[k] = data[k];
  });
  if (hasData(ubicacion)) B.ubicacion = ubicacion;

  const contacto = {};
  ['telefono', 'whatsapp', 'email', 'website', 'instagram', 'facebook', 'tiktok'].forEach(k => {
    if (hasData(data[k])) contacto[k] = data[k];
  });
  if (hasData(contacto)) B.contacto = contacto;

  if (hasData(data.horarios)) B.horarios = data.horarios;
  if (hasData(data.plan)) B.plan = data.plan;
  if (hasData(data.templateId)) B.templateId = data.templateId;
  if (hasData(data.categories)) B.categorias = data.categories;

  if (hasData(data.aiConfig)) {
    const ai = data.aiConfig;
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

  // Productos
  let productos = [];
  try {
    const ps = await comercioRef.collection('productos').get();
    productos = ps.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch {}

  if (productos.length) {
    B.catalogo = {
      moneda: data.moneda || 'ARS',
      secciones: [{
        id: 'principal',
        titulo: data.nombreComercio || 'Catálogo',
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

  // Referral
  let referralCode = comercioId.substring(0, 8).toUpperCase();
  if (data.duenoId) {
    const ownerSnap = await db.collection('usuarios').doc(data.duenoId).get();
    if (ownerSnap.exists && ownerSnap.data()?.referralId) {
      referralCode = ownerSnap.data().referralId;
    }
  }

  B.referral = {
    code: referralCode,
    shareMessage: `¿Querés tu IA? Visitá https://indiceia.app/r/${referralCode}`
  };

  B.updatedAt = new Date().toISOString();
  Object.freeze(B);

  // Block A placeholders
  const liveEnabled = ['trial', 'pro', 'highvalue', 'premium'].includes(data.plan);
  const A = JSON.parse(
    JSON.stringify(blockA)
      .replace(/\{\{LIVE_ENABLED\}\}/g, liveEnabled.toString())
      .replace(/\{\{REFERRAL_URL\}\}/g, `https://indiceia.app/guia?ref=${referralCode}`)
  );

  // Block D channels
  if (blockD?.availableChannels && B.contacto) {
    Object.entries(blockD.availableChannels).forEach(([ch, cfg]) => {
      if (typeof cfg === 'object') cfg.enabled = hasData(B.contacto[ch]);
    });
  }
  Object.freeze(blockD);

  // ===== BLOCK C =====
  let C = {};
  try {
    C = JSON.parse(readFileSync(resolve(__dirname, 'base/blockC.json'), 'utf-8')).C;

    if (hasData(B.templateId)) {
      const t = templateRegistry.templates[B.templateId];
      if (t) {
        C.visual = {
          available: true,
          mode: 'iframe',
          runtime: {
            iframe_url: `https://indiceia-templates.vercel.app${t.paths.runtime_html}`,
            input: {
              binding: 'bloque_B_contexto_comercial',
              strategy: 'postMessage'
            }
          }
        };
      }
    }
  } catch (err) {
    console.warn('⚠️ No se pudo cargar blockC.json, Bloque C inhabilitado', err);
    C = {};
  }

  // ===== BLOCK E (Servicios) =====
  let E = { habilitado: false };

  try {
    const ss = await comercioRef.collection('servicios').get();

    const servicios = ss.docs.map(d => {
      const s = d.data();
      return {
        id: d.id,
        titulo: s.nombre || '',
        que: s.descripcion || '',
        como: s.modalidad || '',
        cuando: s.disponibilidad || '',
        prestacion: s.prestacion || 'variable',
        activo: s.activo === true,
        ...(hasData(s.precio) && { precio: s.precio }),
        ...(hasData(s.notas) && { notas: s.notas })
      };
    });

    if (servicios.length > 0) {
      E = {
        habilitado: true,
        servicios
      };
    }
  } catch (err) {
    console.warn('⚠️ No se pudieron cargar servicios (Block E)', err);
    E = { habilitado: false };
  }

  Object.freeze(E);

  // ===== FINAL ENTITY =====
  return {
    meta: {
      version: A?.meta?.version || '1.0.0',
      tipo: 'entidad_comercial_indiceIA',
      comercioId,
      generatedAt: new Date().toISOString(),
      mode: 'production'
    },
    contracts: {
      blockB: { role: 'single_source_of_truth', mutable: false },
      blockC: { role: 'visual_only', optional: true },
      blockD: { role: 'interaction_protocols', mutable: false },
      blockE: { role: 'services_runtime', optional: true }
    },
    A,
    B,
    C,
    D: blockD,
    E
  };
}
