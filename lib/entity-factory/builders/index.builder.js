// ============================================================
// lib/entity-factory/builders/index.builder.js
// ============================================================

import { put }            from '@vercel/blob';
import fetch              from 'node-fetch';
import { toIndexContext } from '../../../src/shared/entity-context.js';
import { RUBRO_PROFILES } from '../base/business-semantic-profiles.js';

const BLOB_BASE_URL = process.env.BLOB_BASE_URL ||
  'https://oigwwzzmvibflie8.public.blob.vercel-storage.com';

const DIAS  = ['lunes','martes','miercoles','jueves','viernes','sabado','domingo'];
const FINDE = new Set(['sabado','domingo']);

// ─── Keywords ────────────────────────────────────────────────
function extractKeywords(data, goods, services, semantic = {}) {
  const sources = [
    ...(data.categories   || []),
    ...(data.especialidad ? [data.especialidad] : []),
    ...(data.descripcion  || '').split(/\s+/),
    ...(semantic.intentMatches || []),
    ...(semantic.moods         || []),
    ...(semantic.occasions     || []),
    ...(semantic.audiences     || []),
  ];

  if (goods?.goods) {
    goods.goods.forEach(p => {
      if (p.nombre)    p.nombre.toLowerCase().split(/\s+/).forEach(w => sources.push(w));
      if (p.categoria) sources.push(p.categoria.toLowerCase());
    });
  }

  if (services?.servicios) {
    services.servicios.forEach(s => {
      if (s.n) s.n.toLowerCase().split(/\s+/).forEach(w => sources.push(w));
    });
  }

  const stopWords = new Set([
    'de','la','el','los','las','con','para','del','una','uno',
    'y','o','a','en','que','se','su','por','es','al'
  ]);

  return [...new Set(
    sources
      .map(w => String(w).toLowerCase().replace(/[^a-záéíóúüñ]/gi, '').trim())
      .filter(w => w.length > 2 && !stopWords.has(w))
  )].slice(0, 30);
}

// ─── Capabilities ────────────────────────────────────────────
// virtual: true si data.virtual.enabled, o si hay señales de presencia digital
// (tienda online, catálogo, ecommerce, instagram shop, pedidos por whatsapp)
function hasVirtualCapability(data) {
  if (data.virtual?.enabled === true) return true;

  const signals = [
    data.tiendaOnline,
    data.ecommerce?.enabled,
    data.catalogo?.enabled,
    data.instagramShop?.enabled,
    data.pedidosPorWhatsapp?.enabled,
    data.linkTienda,
  ];
  return signals.some(Boolean);
}

function buildCapabilities(data) {
  const entrega = data.entrega || {};
  const caps = {
    presencial: data.tieneLocalFisico    === true,
    delivery:   entrega.delivery?.enabled === true,
    pickup:     entrega.pickup?.enabled   === true,
    salon:      entrega.salon?.enabled    === true,
    takeaway:   entrega.takeaway?.enabled === true,
    virtual:    hasVirtualCapability(data),
  };
  caps.hasAny = Object.values(caps).some(Boolean);
  return caps;
}

// ─── Schedule ────────────────────────────────────────────────
function compileSchedule(horarios, channelId) {
  if (!horarios || typeof horarios !== 'object') return null;

  const schedule = {};

  DIAS.forEach(dia => {
    const d = horarios?.[dia];
    if (!d) return;

    if (d.closed) {
      schedule[dia] = { closed: true };
      return;
    }

    const blocks = [];

    if (d.continuous) {
      if (d.open && d.close) {
        blocks.push({ from: d.open, to: d.close, label: 'continuous', source: channelId });
      }
    } else {
      if (d.morning?.enabled && d.morning.open && d.morning.close) {
        blocks.push({ from: d.morning.open, to: d.morning.close, label: 'morning', source: channelId });
      }
      if (d.afternoon?.enabled && d.afternoon.open && d.afternoon.close) {
        blocks.push({ from: d.afternoon.open, to: d.afternoon.close, label: 'afternoon', source: channelId });
      }
    }

    if (blocks.length) schedule[dia] = { blocks };
  });

  if (!Object.keys(schedule).length) return null;

  return { channelId, schedule, timezone: 'America/Argentina/Buenos_Aires' };
}

function buildSchedule(data) {
  const result = {};

  if (data.tieneLocalFisico === true && data.horarios_presencial) {
    const s = compileSchedule(data.horarios_presencial, 'presencial');
    if (s) result.presencial = s;
  }

  if (data.entrega?.delivery?.enabled === true && data.horarios_delivery) {
    const s = compileSchedule(data.horarios_delivery, 'delivery');
    if (s) result.delivery = s;
  }

  return Object.keys(result).length ? result : null;
}

// ─── Temporal ────────────────────────────────────────────────
// Recibe el schedule procesado por buildSchedule():
//   { presencial: { channelId, schedule: { lunes: { blocks|closed }, ... } }, ... }
// La presencia de la key ya implica canal activo — no necesita campo enabled.
//
// availabilityPatterns derivados:
//   'abre-temprano'       → algún bloque abre antes de las 08:00
//   'abre-tarde'          → algún bloque cierra a las 20:00 o después (>= 20)
//   'abre-fines-de-semana'→ tiene bloques abiertos en sábado o domingo
//   'abre-todos-los-dias' → tiene bloques abiertos los 7 días
function buildTemporal(schedule, profile) {
  const allDayEntries = Object.values(schedule || {})
    .filter(ch => ch?.schedule)
    .flatMap(ch => Object.entries(ch.schedule));

  const openCloseHours = [];  // { from, to } de cada bloque abierto
  const openDays       = new Set();

  for (const [dia, dayData] of allDayEntries) {
    if (dayData.closed) continue;
    const blocks = dayData.blocks || [];
    if (!blocks.length) continue;

    openDays.add(dia);
    blocks.forEach(b => {
      if (b.from && b.to) openCloseHours.push({ from: b.from, to: b.to });
    });
  }

  const toHour = t => {
    const [hh, mm] = t.split(':').map(Number);
    return hh + (mm || 0) / 60;
  };

  const patterns = [];

  // Abre temprano: algún bloque arranca antes de las 8
  const abreTemprano = openCloseHours.some(b => toHour(b.from) < 8);
  if (abreTemprano) patterns.push('abre-temprano');

  // Horario nocturno: algún bloque cierra a las 20:00 o después (>= 20)
  const horarioNocturno = openCloseHours.some(b => toHour(b.to) >= 20);
  if (horarioNocturno) patterns.push('abre-tarde');

  // Finde: tiene al menos un día abierto sábado o domingo
  const abreFinde = [...openDays].some(d => FINDE.has(d));
  if (abreFinde) patterns.push('abre-fines-de-semana');

  // Todos los días: los 7 días tienen al menos un bloque abierto
  const abreTodosLosDias = DIAS.every(d => openDays.has(d));
  if (abreTodosLosDias) patterns.push('abre-todos-los-dias');

  return {
    peakMoments:          profile.peakMoments  || [],
    seasonalTags:         profile.seasonalTags  || [],
    availabilityPatterns: patterns,
  };
}

// ─── Operational ─────────────────────────────────────────────
// Defaults desde profile.operational + overrides por capabilities.
//   walkInFriendly: si tiene presencial activo → siempre true
//   estimatedDeliveryTime: solo si delivery activo
function buildOperational(capabilities, profile) {
  const defaults = profile.operational || {};

  const estimatedDeliveryTime = capabilities.delivery
    ? (defaults.estimatedDeliveryTime || null)
    : null;

  const walkInFriendly = capabilities.presencial
    ? true
    : (defaults.walkInFriendly ?? false);

  return {
    bookingRequired:       defaults.bookingRequired       ?? false,
    walkInFriendly,
    urgencyCompatible:     defaults.urgencyCompatible     ?? false,
    estimatedResponseTime: defaults.estimatedResponseTime || 'medium',
    estimatedDeliveryTime,
  };
}

// ─── Entrypoints ─────────────────────────────────────────────
// preferredChannel : whatsapp > instagram > presencial > virtual > consulta
// quickActions     : base del rubro + channelActions filtradas por capabilities activas
function buildEntrypoints(data, capabilities, profile) {
  const preferredChannel =
    data.whatsapp           ? 'whatsapp'   :
    data.instagram          ? 'instagram'  :
    capabilities.presencial ? 'presencial' :
    capabilities.virtual    ? 'virtual'    :
    'consulta';

  const supportsAILeadCapture = !!data.whatsapp;

  const ca = profile.channelActions || {};

  const actions = [
    ...(profile.quickActions                        || []),
    ...(capabilities.delivery   ? ca.delivery   || [] : []),
    ...(capabilities.presencial ? ca.presencial || [] : []),
    ...(capabilities.pickup     ? ca.pickup     || [] : []),
    ...(capabilities.salon      ? ca.salon      || [] : []),
    ...(capabilities.takeaway   ? ca.takeaway   || [] : []),
    ...(capabilities.virtual    ? ca.virtual    || [] : []),
    ...(data.whatsapp           ? ca.whatsapp   || [] : []),
  ];

  return {
    preferredChannel,
    supportsAILeadCapture,
    quickActions: [...new Set(actions)],
  };
}

// ─── Semantic ────────────────────────────────────────────────
function buildSemantic(data, capabilities, rubroTipo) {
  const profile = RUBRO_PROFILES[rubroTipo] || RUBRO_PROFILES.GEN;

  const capIntents = [];
  if (capabilities.presencial || capabilities.salon) capIntents.push('visitar-local', 'comprar-en-persona');
  if (capabilities.delivery)                         capIntents.push('delivery', 'pedir-ahora', 'envio-domicilio');
  if (capabilities.pickup || capabilities.takeaway)  capIntents.push('retirar', 'takeaway', 'buscar-pedido');
  if (capabilities.virtual)                          capIntents.push('compra-online', 'tienda-digital');

  const intentMatches = [...new Set([...(profile.intents || []), ...capIntents])];

  return {
    intentMatches,
    moods:      profile.moods      || [],
    occasions:  profile.occasions  || [],
    audiences:  profile.audiences  || [],
    bestFor:    profile.bestFor    || [],
    urgency:    profile.urgency    || 'low',
  };
}

// ─── Trust ───────────────────────────────────────────────────
function buildTrust(data, capabilities, schedule, goods, services, idxCtx) {
  const checks = [
    !!data.nombreComercio || !!data.nombre,
    !!data.descripcion,
    !!(data.localidad || data.localidad?.nombre || data.ubicacion?.localidad?.nombre),
    !!data.telefono,
    !!data.whatsapp || !!data.instagram || !!data.email,
    (data.categories?.length > 0) || !!data.especialidad,
    capabilities.hasAny,
    !!data.logo,
    !!data.coverImage,
  ];
  const completenessScore = Math.round(checks.filter(Boolean).length / checks.length * 100) / 100;

  return {
    completenessScore,
    hasSchedule:     !!schedule,
    hasWhatsApp:     !!data.whatsapp,
    hasLocation:     !!(idxCtx.paths?.ciudadPath || data.localidad?.nombre || data.ubicacion?.localidad?.nombre),
    hasProducts:     (goods?.goods?.length       || 0) > 0,
    hasServices:     (services?.servicios?.length || 0) > 0,
    hasDelivery:     capabilities.delivery,
    hasPresencial:   capabilities.presencial,
    hasPickup:       capabilities.pickup || capabilities.takeaway,
    hasCapabilities: capabilities.hasAny,
    updatedAt:       new Date().toISOString(),
  };
}

// ─── Entry del índice ────────────────────────────────────────
function buildIndexEntry(data, comercioId, goods, services, idxCtx) {
  const slug          = data.landing?.slug || data.slug || comercioId;
  const entityType    = data.entityType || 'comercio';
  const esPrestador   = entityType === 'prestador';
  const esProfesional = entityType === 'profesional';

  // Fallback garantizado — nunca null
  const profile = RUBRO_PROFILES[idxCtx.rubro.tipo] || RUBRO_PROFILES.GEN;

  // Orden de construcción:
  // capabilities → schedule → semantic → temporal → operational → entrypoints → trust → keywords
  const capabilities = buildCapabilities(data);
  const schedule     = buildSchedule(data);
  const semantic     = buildSemantic(data, capabilities, idxCtx.rubro.tipo);
  const temporal     = buildTemporal(schedule, profile);
  const operational  = buildOperational(capabilities, profile);
  const entrypoints  = buildEntrypoints(data, capabilities, profile);
  const trust        = buildTrust(data, capabilities, schedule, goods, services, idxCtx);

  // channels — lista plana de capabilities activas para el router semántico
  const channels = Object.entries(capabilities)
    .filter(([key, val]) => key !== 'hasAny' && val === true)
    .map(([key]) => key);

  // searchHints — shape listo para ranking futuro
  const searchHints = {
    boosts:  semantic.bestFor  || [],
    urgency: semantic.urgency  || 'low',
    tags:    idxCtx.rubro.tags || [],
  };

  const keywords = extractKeywords(data, goods, services, semantic);

  return {
    id:         slug,
    comercioId,
    tipo:       idxCtx.rubro.tipo,
    tags:       idxCtx.rubro.tags,
    entityType,
    nombre:     esProfesional || esPrestador
                  ? (data.nombre || '')
                  : (data.nombreComercio || ''),
    categorias: esProfesional || esPrestador
                  ? [data.especialidad].filter(Boolean)
                  : (data.categories || []),
    pais:       (idxCtx.pais || 'argentina').toLowerCase(),
    provincia:  idxCtx.paths.provinciaPath,
    ciudad:     idxCtx.paths.ciudadPath,
    geo: {
      localidad: {
        nombre:    data.ubicacion?.localidad?.nombre || data.localidad?.nombre || data.localidad || null,
        provincia: data.ubicacion?.provincia         || data.provincia?.nombre || data.provincia || null,
        lat:       data.ubicacion?.lat || data.lat   || null,
        lng:       data.ubicacion?.lng || data.lng   || null,
      },
      ...(idxCtx.vecinas.length ? { vecinas: idxCtx.vecinas } : {}),
    },
    keywords,
    capabilities,
    channels,
    ...(schedule ? { schedule } : {}),
    semantic,
    temporal,
    operational,
    entrypoints,
    rubroProfile: {
      urgency: semantic.urgency,
      bestFor: semantic.bestFor,
    },
    searchHints,
    trust,
    gateway:   `https://indiceia-public.vercel.app/c/${slug}`,
    seo:       `https://indiceia-public.vercel.app/p/${slug}`,
    updatedAt:  new Date().toISOString(),
  };
}

// ─── Leer índice actual desde Blob ───────────────────────────
async function readIndex(pais, provincia, ciudad) {
  try {
    const url = `${BLOB_BASE_URL}/index/${pais}/${provincia}/${ciudad}.json`;
    const res = await fetch(url);
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

// ─── Escribir índice de ciudad ───────────────────────────────
async function writeIndex(pais, provincia, ciudad, indice) {
  const blobPath = `index/${pais}/${provincia}/${ciudad}.json`;
  const { url }  = await put(
    blobPath,
    JSON.stringify(indice, null, 2),
    {
      access:          'public',
      addRandomSuffix: false,
      contentType:     'application/json; charset=utf-8',
      token:           process.env.BLOB_READ_WRITE_TOKEN,
    }
  );
  console.log(`[index-builder] ✅ ${blobPath} actualizado (${indice.length} entidades) → ${url}`);
  return url;
}

// ─── Export principal ────────────────────────────────────────
export async function buildIndex(data, comercioId, goods, services) {
  try {
    const idxCtx = toIndexContext(data);

    if (!idxCtx.paths.ciudadPath) {
      console.warn('[index-builder] entrada sin ciudad, saltando');
      return null;
    }

    const indice    = await readIndex(idxCtx.pais, idxCtx.paths.provinciaPath, idxCtx.paths.ciudadPath);
    const entry     = buildIndexEntry(data, comercioId, goods, services, idxCtx);
    const existente = indice.findIndex(e => e.comercioId === comercioId);

    if (existente >= 0) {
      indice[existente] = entry;
    } else {
      indice.push(entry);
    }

    const url = await writeIndex(idxCtx.pais, idxCtx.paths.provinciaPath, idxCtx.paths.ciudadPath, indice);
    return {
      url,
      pais:      idxCtx.pais,
      provincia: idxCtx.paths.provinciaPath,
      ciudad:    idxCtx.paths.ciudadPath,
      total:     indice.length,
    };

  } catch (err) {
    console.warn('[index-builder] No se pudo actualizar el índice:', err.message);
    return null;
  }
}
