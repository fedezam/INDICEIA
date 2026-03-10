import admin from 'firebase-admin';

import { buildContext }      from '../../lib/entity-factory/builders/context.builder.js';
import { buildMind }         from '../../lib/entity-factory/builders/mind.builder.js';
import { buildGoods }        from '../../lib/entity-factory/builders/goods.builder.js';
import { buildServices }     from '../../lib/entity-factory/builders/services.builder.js';
import { buildCapabilities } from '../../lib/entity-factory/builders/capabilities.builder.js';
import { buildVisual }       from '../../lib/entity-factory/builders/visual.builder.js';

// ─── Firebase ───────────────────────────────────────────────
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

// ─── Referral code ──────────────────────────────────────────
async function resolveReferralCode(comercioId, duenoId) {
  if (duenoId) {
    const ownerSnap = await db.collection('usuarios').doc(duenoId).get();
    if (ownerSnap.exists && ownerSnap.data()?.referralId) {
      return ownerSnap.data().referralId;
    }
  }
  return comercioId.substring(0, 8).toUpperCase();
}

// ─── Entry point ────────────────────────────────────────────
export async function buildEntity({ comercioId }) {
  if (!comercioId) throw new Error('Falta comercioId');

  // Cargar doc principal
  const comercioRef = db.collection('comercios').doc(comercioId);
  const snap = await comercioRef.get();
  if (!snap.exists) throw new Error(`Comercio ${comercioId} no encontrado`);
  const data = snap.data();

  // Resolver referral
  const referralCode = await resolveReferralCode(comercioId, data.duenoId);

  // Construir bloques — cada builder sabe que schema sigue
  const context      = buildContext(data, comercioId, referralCode);
  const mind         = buildMind(data, context, referralCode);
  const goods        = await buildGoods(comercioRef, context);
  const services     = await buildServices(comercioRef);
  const capabilities = buildCapabilities(context);
  const visual       = await buildVisual(context, goods, comercioId);

  // Ensamblar entidad
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
