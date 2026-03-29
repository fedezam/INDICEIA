import admin from 'firebase-admin';
import { buildContext }      from '../../lib/entity-factory/builders/context.builder.js';
import { buildMind }         from '../../lib/entity-factory/builders/mind.builder.js';
import { buildGoods }        from '../../lib/entity-factory/builders/goods.builder.js';
import { buildServices }     from '../../lib/entity-factory/builders/services.builder.js';
import { buildCapabilities } from '../../lib/entity-factory/builders/capabilities.builder.js';
import { buildVisual }       from '../../lib/entity-factory/builders/visual.builder.js';
import { buildSeo }          from '../../lib/entity-factory/builders/seo.builder.js';
import { buildIndex }        from '../../lib/entity-factory/builders/index.builder.js';

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

async function resolveReferralCode(comercioId, duenoId) {
  if (duenoId) {
    const ownerSnap = await db.collection('usuarios').doc(duenoId).get();
    if (ownerSnap.exists && ownerSnap.data()?.referralId) {
      return ownerSnap.data().referralId;
    }
  }
  return comercioId.substring(0, 8).toUpperCase();
}

export async function buildEntity({ comercioId, slug = null }) {
  if (!comercioId) throw new Error('Falta comercioId');

  const comercioRef = db.collection('entidades').doc(comercioId);
  const snap        = await comercioRef.get();
  if (!snap.exists) throw new Error(`Comercio ${comercioId} no encontrado`);

  const data         = snap.data();
  const referralCode = await resolveReferralCode(comercioId, data.duenoId);
  const context      = buildContext(data, comercioId, referralCode);

  // Cada builder lee de Firestore de manera independiente:
  // goods.builder  → comprime para LLM (entity.json)
  // visual.builder → lee crudo para el template (visual.html)
  const goods    = await buildGoods(comercioRef, context);
  const services = await buildServices(comercioRef);

  // Visual lee sus propios datos de Firestore — no depende de goods
  const visual     = await buildVisual(context, comercioRef, comercioId, slug);
  const miniAppUrl = visual?.mini_app_url || '';

  const mind         = buildMind(data, context, referralCode, miniAppUrl);
  const capabilities = buildCapabilities(context);

  await buildSeo(data, comercioId);
  await buildIndex(data, comercioId, goods, services);

  return {
    meta: {
      version:     '1.0.0',
      tipo:        'entidad_comercial_indiceIA',
      comercioId,
      generatedAt: new Date().toISOString(),
    },
    contracts: {
      context:      { role: 'identity',             version: '1.0', mutable: false },
      goods:        { role: 'products_catalog',      version: '1.0', optional: true },
      services:     { role: 'services_catalog',      version: '1.0', optional: true },
      visual:       { role: 'visual_interface',      version: '1.0', optional: true },
      capabilities: { role: 'interaction_protocols', version: '1.0', mutable: false },
    },
    mind,
    context,
    ...(goods    && { goods }),
    ...(services && { services }),
    ...(visual   && { visual }),
    capabilities,
  };
}
