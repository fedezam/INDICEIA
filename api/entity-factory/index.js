import { readFileSync } from 'fs';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import admin from 'firebase-admin';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

// ----- Template Registry (visual)
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
  console.warn('⚠️ Registry entity no disponible. visual inactivo.');
}

// ----- Firebase Admin
if (!admin.apps.length) {
  if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
    throw new Error('Falta FIREBASE_SERVICE_ACCOUNT');
  }
  admin.initializeApp({
    credential: admin.credential.cert(
      JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
    ),
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

// ===== COGNITION BUILDER (LER-compliant) =====
function buildCognitivePermissionsFromSkeleton(aiConfig, skeletonPath) {
  if (!aiConfig?.cognitive_permissions) return null;

  const raw = readFileSync(skeletonPath, 'utf-8');
  const skeleton = JSON.parse(raw).cognitive_permissions;

  const result = {};
  let hasAnyEnabled = false;

  for (const [key, config] of Object.entries(skeleton)) {
    const enabled = Boolean(aiConfig.cognitive_permissions[key]);

    if (enabled) {
      hasAnyEnabled = true;
      result[key] = {
        enabled: true,
        label: config.label,
        description: config.description
      };
    }
  }

  return hasAnyEnabled ? result : null;
}

// ===== ENTITY BUILDER =====
export async function buildEntity({ comercioId }) {
  if (!comercioId) throw new Error('Falta comercioId');

  // mind y capabilities (base)
  const mind = JSON.parse(
    readFileSync(resolve(__dirname, 'base/mind.json'), 'utf-8')
  );
  const capabilities = JSON.parse(
    readFileSync(resolve(__dirname, 'base/capabilities.json'), 'utf-8')
  );

  // Firestore
  const comercioRef = db.collection('comercios').doc(comercioId);
  const snap = await comercioRef.get();
  if (!snap.exists) {
    throw new Error(`Comercio ${comercioId} no encontrado`);
  }
  const data = snap.data();

  // ===== CONTEXT (ex-Block B sin catálogo) =====
  const context = { id: comercioId };

  if (hasData(data.nombreComercio)) context.nombre = data.nombreComercio;
  if (hasData(data.descripcion)) context.descripcion = data.descripcion;

  const ubicacion = {};
  ['direccion', 'ciudad', 'provincia', 'pais'].forEach(k => {
    if (hasData(data[k])) ubicacion[k] = data[k];
  });
  if (hasData(ubicacion)) context.ubicacion = ubicacion;

  const contacto = {};
  ['telefono', 'whatsapp', 'email', 'website', 'instagram', 'facebook', 'tiktok']
    .forEach(k => {
      if (hasData(data[k])) contacto[k] = data[k];
    });
  if (hasData(contacto)) context.contacto = contacto;

  if (hasData(data.horarios)) context.horarios = data.horarios;
  if (hasData(data.plan)) context.plan = data.plan;
  if (hasData(data.templateId)) context.templateId = data.templateId;
  if (hasData(data.categories)) context.categorias = data.categories;

  // IA config → context
  if (hasData(data.aiConfig)) {
    const ai = data.aiConfig;
    context.ia = {};

    if (hasData(ai.aiName)) context.ia.nombre = ai.aiName;
    if (hasData(ai.aiGreeting)) context.ia.saludo = ai.aiGreeting;
    if (hasData(ai.aiLanguage)) context.ia.idioma = ai.aiLanguage;
    if (hasData(ai.aiPersonality)) context.ia.personalidad = ai.aiPersonality;
    if (hasData(ai.aiTone)) context.ia.tono = ai.aiTone;
    if (hasData(ai.formatoRespuestas)) context.ia.formatoRespuestas = ai.formatoRespuestas;
    if (hasData(ai.proactividad)) context.ia.proactividad = ai.proactividad;

    if (!hasData(context.ia)) delete context.ia;
  }

  // ===== GOODS (ex-catálogo de Block B) =====
  let goods = { enabled: false };
  
  try {
    const ps = await comercioRef.collection('productos').get();
    const productos = ps.docs.map(d => ({ id: d.id, ...d.data() }));

    if (productos.length) {
      goods = {
        enabled: true,
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
  } catch (err) {
    console.warn('⚠️ No se pudieron cargar productos (goods)', err);
  }

  // Referral
  let referralCode = comercioId.substring(0, 8).toUpperCase();
  if (data.duenoId) {
    const ownerSnap = await db.collection('usuarios').doc(data.duenoId).get();
    if (ownerSnap.exists && ownerSnap.data()?.referralId) {
      referralCode = ownerSnap.data().referralId;
    }
  }

  context.referral = {
    code: referralCode,
    shareMessage: `¿Querés tu IA? Visitá https://indiceia.app/r/${referralCode}`
  };

  context.updatedAt = new Date().toISOString();
  Object.freeze(context);

  // ===== MIND (ex-Block A con cognition integrado) =====
  const liveEnabled = ['trial', 'pro', 'highvalue', 'premium'].includes(data.plan);

  const mindProcessed = JSON.parse(
    JSON.stringify(mind)
      .replace(/{{LIVE_ENABLED}}/g, liveEnabled.toString())
      .replace(/{{REFERRAL_URL}}/g, `https://indiceia.app/guia?ref=${referralCode}`)
  );

  // ---- cognition (solo si hay al menos un permiso habilitado)
  let cognitivePermissions = null;
  try {
    const cognitiveSkeletonPath = resolve(__dirname, 'base/cognition.skeleton.json');
    cognitivePermissions = buildCognitivePermissionsFromSkeleton(data.aiConfig, cognitiveSkeletonPath);
  } catch (err) {
    console.warn('⚠️ No se pudo cargar cognitive_permissions.schema.json', err);
  }

  // ✅ LER compliance: solo inyectar si hay al menos uno enabled:true
  if (cognitivePermissions && Object.values(cognitivePermissions).some(p => p.enabled)) {
    mindProcessed.cognitive_permissions = cognitivePermissions;
  }
  // ❌ Si no, NO se escribe NADA → el campo no existe

  // ===== CAPABILITIES (ex-Block D) =====
  if (capabilities?.availableChannels && context.contacto) {
    Object.entries(capabilities.availableChannels).forEach(([ch, cfg]) => {
      if (typeof cfg === 'object') {
        cfg.enabled = hasData(context.contacto[ch]);
      }
    });
  }
  Object.freeze(capabilities);

  // ===== VISUAL (ex-Block C) =====
  let visual = {};
  try {
    visual = JSON.parse(
      readFileSync(resolve(__dirname, 'base/visual.json'), 'utf-8')
    ).C;

    if (hasData(context.templateId)) {
      const t = templateRegistry.templates[context.templateId];
      if (t) {
        visual.visual = {
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
    console.warn('⚠️ No se pudo cargar visual.json, visual inhabilitado', err);
    visual = {};
  }

  // ===== SERVICES (ex-Block E) =====
  let services = { enabled: false };

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
      services = { enabled: true, servicios };
    }
  } catch (err) {
    console.warn('⚠️ No se pudieron cargar servicios (services)', err);
    services = { enabled: false };
  }

  Object.freeze(services);

  // ===== FINAL ENTITY =====
  return {
    meta: {
      version: mindProcessed?.meta?.version || '1.0.0',
      tipo: 'entidad_comercial_indiceIA',
      comercioId,
      generatedAt: new Date().toISOString(),
      mode: 'production'
    },
    contracts: {
      context: { role: 'identity', mutable: false },
      goods: { role: 'products_catalog', optional: true },
      services: { role: 'services_catalog', optional: true },
      visual: { role: 'visual_only', optional: true },
      capabilities: { role: 'interaction_protocols', mutable: false }
    },
    mind: mindProcessed,
    context,
    goods,
    services,
    visual,
    capabilities
  };
}
