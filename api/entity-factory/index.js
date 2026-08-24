// api/entity-factory/index.js

import admin from 'firebase-admin';
import { buildContext }      from '../../lib/entity-factory/builders/context.builder.js';
import { buildMind }         from '../../lib/entity-factory/builders/mind.builder.js';
import { buildGoods }        from '../../lib/entity-factory/builders/goods.builder.js';
import { buildServices }     from '../../lib/entity-factory/builders/services.builder.js';
import { buildProfessional } from '../../lib/entity-factory/builders/professional.builder.js';
import { buildChannels }     from '../../lib/entity-factory/builders/channels.builder.js';
import { buildCapabilities } from '../../lib/entity-factory/builders/capabilities.builder.js';
import { buildVisual }       from '../../lib/entity-factory/builders/visual.builder.js';
import { buildSeo }          from '../../lib/entity-factory/builders/seo.builder.js';
import { buildIndex }        from '../../lib/entity-factory/builders/index.builder.js';
import { resolveDomain }     from '../../lib/entity-factory/domain-resolver.js';
import { buildEntityContext } from '../../src/shared/entity-context.js';
import { normalizeEntityData } from '../../lib/entity-factory/normalizers/normalizeEntityData.js';
import { resolveCatalogDelivery } from '../../lib/entity-factory/resolveCatalogDelivery.js'; // ← NUEVO

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

// ─── Merge defensivo ──────────────────────────────────────────
function safeMerge(base, override) {
  if (!override) return base;
  const clean = Object.fromEntries(
    Object.entries(override).filter(([, v]) => v !== undefined)
  );
  return { ...base, ...clean };
}

// ─── BUILDERS POR ENTITYTYPE ──────────────────────────────────

async function buildComercio(comercioRef, data, context, referralCode, slug) {
  // 1. Compilar catálogo (solo compresión/agrupación)
  const compiled = await buildGoods(comercioRef, context);
  // 2. Decidir entrega: array inline o ref URL (mismo contrato `goods`)
  const { goods } = resolveCatalogDelivery(compiled, { slug });

  const services = null;

  const templateId  = data.templateId || null;
  const savedVisual = { visualHash: data.visualHash || null, visualHtmlUrl: data.visualHtmlUrl || null };
  const visual      = await buildVisual(context, comercioRef, data.comercioId, slug, templateId, savedVisual);
  const miniAppUrl  = visual?.mini_app_url || '';

  const { ler: mind, mind_hash, mind_id } = buildMind(data, context, referralCode, miniAppUrl);
  const channels     = buildChannels(context);
  const capabilities = buildCapabilities(data);

  return { goods, services, professional: null, visual, mind, mind_hash, mind_id, channels, capabilities };
}

async function buildPrestador(comercioRef, data, context, referralCode, slug) {
  const goods    = null;
  const services = await buildServices(comercioRef, context);

  const templateId  = data.templateId || null;
  const savedVisual = { visualHash: data.visualHash || null, visualHtmlUrl: data.visualHtmlUrl || null };
  const visual      = await buildVisual(context, comercioRef, data.comercioId, slug, templateId, savedVisual);
  const miniAppUrl  = visual?.mini_app_url || '';

  const { ler: mind, mind_hash, mind_id } = buildMind(data, context, referralCode, miniAppUrl);
  const channels     = buildChannels(context);
  const capabilities = buildCapabilities(data);

  return { goods, services, professional: null, visual, mind, mind_hash, mind_id, channels, capabilities };
}

async function buildProfesionalEntity(comercioRef, data, context, referralCode, slug) {
  const goods        = null;
  const services     = null;
  const professional = buildProfessional(data);

  const templateId  = data.templateId || null;
  const savedVisual = { visualHash: data.visualHash || null, visualHtmlUrl: data.visualHtmlUrl || null };
  const visual      = await buildVisual(context, comercioRef, data.comercioId, slug, templateId, savedVisual);
  const miniAppUrl  = visual?.mini_app_url || '';

  const { ler: mind, mind_hash, mind_id } = buildMind(data, context, referralCode, miniAppUrl);
  const channels     = buildChannels(context);
  const capabilities = buildCapabilities(data);

  return { goods, services, professional, visual, mind, mind_hash, mind_id, channels, capabilities };
}

// ─── CONTEXTO COMPARTIDO (comercioId → data + context + slug) ──
//
// Extraído de buildEntity() para que regenerateSeoOnly() pueda armar
// el mismo `context` sin correr los builders de goods/visual/mind,
// que son los costosos y los que NO queremos disparar al tocar solo
// SEO.
async function loadBaseContext(comercioId) {
  if (!comercioId) throw new Error('Falta comercioId');

  const comercioRef = db.collection('entidades').doc(comercioId);
  const snap        = await comercioRef.get();
  if (!snap.exists) throw new Error(`Entidad ${comercioId} no encontrada`);

  const data       = normalizeEntityData(snap.data());
  const entityType = data.entityType || 'comercio';

  const slug         = data.landing?.slug || null;
  const referralCode = await resolveReferralCode(comercioId, data.duenoId);
  const context       = buildContext(data, comercioId, referralCode);

  const domainMeta = resolveDomain(context, data);
  context.domain_tag = domainMeta.domain_tag;

  return { comercioRef, data, entityType, slug, context, domainMeta, referralCode };
}

// ─── EXPORT PRINCIPAL ─────────────────────────────────────────

export async function buildEntity({ comercioId }) {
  const { comercioRef, data, entityType, slug, context, domainMeta, referralCode } =
    await loadBaseContext(comercioId);

  // ── Builder según entityType ──────────────────────────────
  let built;
  if (entityType === 'profesional') {
    built = await buildProfesionalEntity(comercioRef, data, context, referralCode, slug);
  } else if (entityType === 'prestador') {
    built = await buildPrestador(comercioRef, data, context, referralCode, slug);
  } else {
    built = await buildComercio(comercioRef, data, context, referralCode, slug);
  }

  const { goods, services, professional, visual, mind, mind_hash, mind_id, channels, capabilities } = built;

  // Campos efímeros — consumidos en tiempo de compilación (domain_tag por
  // resolveDomain/mind.builder.js, referral_link por mind.builder.js para
  // armar REFERRAL_LINK y ORIGIN.mas_info), no van al JSON final. Antes
  // referral_link quedaba duplicado tal cual en context — mismo string ya
  // presente dos veces dentro de `mind` (ORIGIN + REFERRAL_LINK) — sin
  // ningún consumidor nuevo en runtime. Fix 25/07/2026.
  delete context.domain_tag;
  delete context.contacto;
  delete context.referral_link;

  // ── SEO ───────────────────────────────────────────────────
  const savedSeo = { seoHash: data.seoHash || null, seoHtmlUrl: data.seoHtmlUrl || null };
  await buildSeo(context, comercioId, savedSeo, slug);

  // ── ENRIQUECER CONTEXTO PARA ENTITY.JSON (LLM) ────────────
  const geoCtx = buildEntityContext(data);

  const enrichedContext = {
    ...context,
    ...(geoCtx.ubicacion && {
      ubicacion: safeMerge(context.ubicacion, geoCtx.ubicacion),
    }),
    ...(geoCtx.rubro && { rubro: geoCtx.rubro }),
  };

  // ── ENTITY JSON ───────────────────────────────────────────
  return {
    meta: {
      version:           '1.0.0',
      tipo:              'entidad_comercial_indiceIA',
      comercioId,
      entityType,
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
      professional: { role: 'professional_profile',  version: '1.0', optional: true },
      visual:       { role: 'visual_interface',      version: '1.0', optional: true },
      channels:     { role: 'contact_channels',      version: '1.0', mutable: false },
      capabilities: { role: 'cognitive_permissions', version: '1.0', optional: true },
    },
    mind,
    context: enrichedContext,
    ...(goods         && { goods }),
    ...(services      && { services }),
    ...(professional  && { professional }),
    ...(visual        && { visual }),
    ...(channels      && { channels }),
    ...(capabilities  && { capabilities }),
  };
}

// ─── EXPORT: SOLO SEO ───────────────────────────────────────
//
// Regenera únicamente seo.html, sin correr goods/visual/mind/channels/
// capabilities. Pensado para el botón "Regenerar solo SEO" del panel
// de super-admin — permite iterar sobre la capa de indexación (Google)
// sin disparar un rebuild completo de la entidad ni tocar entity.json
// ni la mini app.
//
// IMPORTANTE: usa el mismo `context` que buildEntity() le pasaría a
// buildSeo() en el mismo punto del flujo (antes del enrichedContext de
// geo/rubro, que buildSeo no consume). Si en el futuro buildSeo pasa a
// necesitar algo de enrichedContext (geoCtx.rubro, por ejemplo), hay
// que agregarlo acá también o esta función quedará desincronizada
// silenciosamente respecto de buildEntity().
export async function regenerateSeoOnly({ comercioId }) {
  const { comercioRef, data, slug, context } = await loadBaseContext(comercioId);

  delete context.domain_tag;
  delete context.contacto;
  delete context.referral_link;

  const savedSeo = { seoHash: data.seoHash || null, seoHtmlUrl: data.seoHtmlUrl || null };
  const seoResult = await buildSeo(context, comercioId, savedSeo, slug);

  // buildSeo persiste seoHash/seoHtmlUrl internamente (mismo comportamiento
  // que en buildEntity), pero acá agregamos un timestamp propio para que
  // el panel de super-admin pueda mostrar "última generación de SEO" sin
  // depender de entityGeneratedAt (que no se toca en este flujo).
  await comercioRef.update({
    seoGeneratedAt: new Date().toISOString(),
  });

  return { comercioId, seo: seoResult ?? null };
}
