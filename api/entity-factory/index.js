import admin from 'firebase-admin';
import { buildContext }      from '../../lib/entity-factory/builders/context.builder.js';
import { buildMind }         from '../../lib/entity-factory/builders/mind.builder.js';
import { buildGoods }        from '../../lib/entity-factory/builders/goods.builder.js';
import { buildServices }     from '../../lib/entity-factory/builders/services.builder.js';
import { buildChannels }     from '../../lib/entity-factory/builders/channels.builder.js';
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

  // ── DOMAIN ───────────────────────────────────────────────
  const domainMeta   = resolveDomain(context);
  context.domain_tag = domainMeta.domain_tag;

  const goods    = await buildGoods(comercioRef, context);
  const services = await buildServices(comercioRef, data);

  // ── VISUAL (con dirty state) ──────────────────────────────
  const templateId   = data.templateId || null;
  const savedVisual  = {
    visualHash:    data.visualHash    || null,
    visualHtmlUrl: data.visualHtmlUrl || null,
  };
  const visual     = await buildVisual(context, comercioRef, comercioId, slug, templateId, savedVisual);
  const miniAppUrl = visual?.mini_app_url || '';

  // Mind consume domain_tag desde context
  const { ler: mind, mind_hash, mind_id } = buildMind(data, context, referralCode, miniAppUrl);

  // channels — canales de contacto (whatsapp, email, redes)
  // capabilities — cognitive_permissions del comercio (LER comprimido)
  const channels     = buildChannels(context);
  const capabilities = buildCapabilities(data);

  // Campos efímeros — consumidos, no van al JSON final
  delete context.domain_tag;
  delete context.contacto;

  // ── SEO (con dirty state) ─────────────────────────────────
  const savedSeo = {
    seoHash:    data.seoHash    || null,
    seoHtmlUrl: data.seoHtmlUrl || null,
  };
  await buildSeo(context, comercioId, savedSeo, slug);

  await buildIndex(data, comercioId, goods, services);

  return {
    meta: {
      version:           '1.0.0',
      tipo:              'entidad_comercial_indiceIA',
      comercioId,
      generatedAt:       new Date().toISOString(),
      mind_id,
      mind_hash,
      domain_tag:        domainMeta.domain_tag,
      domain_confidence: domainMeta.domain_confidence,
      domain_source:     domainMeta.domain_source,
    },
    contracts: {
      context:      { role: 'identity',             version: '1.0', mutable: false },
      goods:        { role: 'products_catalog',      version: '1.0', optional: true },
      services:     { role: 'services_catalog',      version: '1.0', optional: true },
      visual:       { role: 'visual_interface',      version: '1.0', optional: true },
      channels:     { role: 'contact_channels',      version: '1.0', mutable: false },
      capabilities: { role: 'cognitive_permissions', version: '1.0', optional: true },
    },
    mind,
    context,
    ...(goods         && { goods }),
    ...(services      && { services }),
    ...(visual        && { visual }),
    ...(channels      && { channels }),
    ...(capabilities  && { capabilities }),
  };
}
