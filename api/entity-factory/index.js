import admin from 'firebase-admin';
import { buildContext }      from '../../lib/entity-factory/builders/context.builder.js';
import { buildMind }         from '../../lib/entity-factory/builders/mind.builder.js';
import { buildGoods }        from '../../lib/entity-factory/builders/goods.builder.js';
import { buildServices }     from '../../lib/entity-factory/builders/services.builder.js';
import { buildCapabilities } from '../../lib/entity-factory/builders/capabilities.builder.js';
import { buildVisual }       from '../../lib/entity-factory/builders/visual.builder.js';
import { buildSeo }          from '../../lib/entity-factory/builders/seo.builder.js';
import { buildIndex }        from '../../lib/entity-factory/builders/index.builder.js';
import { resolveDomain }     from '../../lib/entity-factory/domain-resolver.js';

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

  // Goods y services primero — visual los necesita
  const goods    = await buildGoods(comercioRef, context);
  const services = await buildServices(comercioRef);

  // ── DOMAIN RESOLVER ─────────────────────────────────────────
  const domainMeta = resolveDomain(context);
  context.domain_tag        = domainMeta.domain_tag;
  context.domain_confidence = domainMeta.domain_confidence;
  context.domain_source     = domainMeta.domain_source;
  // ────────────────────────────────────────────────────────────

  // Visual antes que mind — necesitamos la URL
  const visual     = await buildVisual(context, goods, comercioId, services, slug);
  const miniAppUrl = visual?.mini_app_url || '';

  // Mind — devuelve { ler, mind_hash, mind_id }
  const { ler: mind, mind_hash, mind_id } = buildMind(data, context, referralCode, miniAppUrl);

  const capabilities = buildCapabilities(context);

  await buildSeo(data, comercioId);
  await buildIndex(data, comercioId, goods, services);

  return {
    meta: {
      comercioId,
      generatedAt: new Date().toISOString(),
      mind_id,
      mind_hash,
    },
    mind,
    context,
    ...(goods        && { goods }),
    ...(services     && { services }),
    ...(visual       && { visual }),
    ...(capabilities && { capabilities }),
  };
}
