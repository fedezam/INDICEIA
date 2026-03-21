// ============================================================
// lib/entity-factory/builders/index.builder.js
// ============================================================

import { put }   from '@vercel/blob';
import fetch     from 'node-fetch';

const BLOB_BASE_URL = process.env.BLOB_BASE_URL ||
  'https://oigwwzzmvibflie8.public.blob.vercel-storage.com';

// ─── Extraer keywords ────────────────────────────────────────

function extractKeywords(data, goods, services) {
  const sources = [
    ...(data.categories   || []),
    ...(data.especialidad ? [data.especialidad] : []),
    ...(data.zona         ? data.zona.split(/\s+/) : []),
    ...(data.descripcion  || '').split(/\s+/),
  ];

  // Productos
  if (goods?.goods) {
    goods.goods.forEach(p => {
      if (p.nombre)    p.nombre.toLowerCase().split(/\s+/).forEach(w => sources.push(w));
      if (p.categoria) sources.push(p.categoria.toLowerCase());
    });
  }

  // Servicios
  if (services?.servicios) {
    services.servicios.forEach(s => {
      if (s.nombre) s.nombre.toLowerCase().split(/\s+/).forEach(w => sources.push(w));
    });
  }

  const stopWords = new Set([
    'de','la','el','los','las','con','para','del','una','uno',
    'y','o','a','en','que','se','su','por','es','al'
  ]);

  return [...new Set(
    sources
      .map(w => w.toLowerCase().replace(/[^a-záéíóúüñ]/gi, '').trim())
      .filter(w => w.length > 2 && !stopWords.has(w))
  )].slice(0, 20);
}

// ─── Entry del índice ────────────────────────────────────────

function buildIndexEntry(data, comercioId, goods, services) {
  const slug      = data.landing?.slug || comercioId;
  const prestador = data.entityType === 'prestador';

  return {
    id:         slug,
    comercioId,
    tipo:       prestador ? 'prestador' : 'comercio',
    nombre:     prestador ? (data.nombre || '') : (data.nombreComercio || ''),
    categorias: prestador
      ? [data.especialidad].filter(Boolean)
      : (data.categories || []),
    pais:       (data.pais      || 'Argentina').toLowerCase().trim(),
    provincia:  (data.provincia || '').toLowerCase().trim(),
    ciudad:     (data.ciudad    || '').toLowerCase().trim(),
    // zona — solo prestador, para búsqueda por cobertura
    ...(prestador && data.zona ? { zona: data.zona } : {}),
    keywords:   extractKeywords(data, goods, services),
    gateway:    `https://indiceia-public.vercel.app/c/${slug}`,
    seo:        `https://indiceia-public.vercel.app/p/${slug}`,
    updatedAt:  new Date().toISOString(),
  };
}

// ─── Normalizar string para path ─────────────────────────────

function toPath(str) {
  return (str || '')
    .toLowerCase()
    .trim()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
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

// ─── Export principal ────────────────────────────────────────

export async function buildIndex(data, comercioId, goods, services) {
  try {
    const pais     = toPath(data.pais      || 'ar');
    const provincia = toPath(data.provincia || '');
    const ciudad   = toPath(data.ciudad    || '');

    if (!ciudad) {
      console.warn('[index-builder] sin ciudad, saltando');
      return null;
    }

    const indice    = await readIndex(pais, provincia, ciudad);
    const entry     = buildIndexEntry(data, comercioId, goods, services);
    const existente = indice.findIndex(e => e.comercioId === comercioId);

    if (existente >= 0) {
      indice[existente] = entry;
    } else {
      indice.push(entry);
    }

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

    console.log(`[index-builder] ✅ ${blobPath} actualizado (${indice.length} comercios) → ${url}`);
    return { url, pais, provincia, ciudad, total: indice.length };

  } catch (err) {
    console.warn('[index-builder] No se pudo actualizar el índice:', err.message);
    return null;
  }
}
