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
    ...(data.descripcion  || '').split(/\s+/),
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
      .map(w => w.toLowerCase().replace(/[^a-záéíóúüñ]/gi, '').trim())
      .filter(w => w.length > 2 && !stopWords.has(w))
  )].slice(0, 20);
}

// ─── Entry del índice ────────────────────────────────────────

function buildIndexEntry(data, comercioId, goods, services, ciudad, provincia) {
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
    pais:      (data.pais || 'Argentina').toLowerCase().trim(),
    provincia:  provincia,
    ciudad:     ciudad,
    keywords:   extractKeywords(data, goods, services),
    gateway:   `https://indiceia-public.vercel.app/c/${slug}`,
    seo:       `https://indiceia-public.vercel.app/p/${slug}`,
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

// ─── Escribir un índice de ciudad ────────────────────────────

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
  console.log(`[index-builder] ✅ ${blobPath} actualizado (${indice.length} comercios) → ${url}`);
  return url;
}

// ─── Export principal ────────────────────────────────────────

export async function buildIndex(data, comercioId, goods, services) {
  try {
    const pais = toPath(data.pais || 'argentina');

    // ── Cobertura multi-ciudad (prestador) ───────────────────
    // Si tiene cobertura[], indexamos en cada ciudad.
    // Si no, fallback a ciudad/provincia planos (comercio).
    const ciudades = Array.isArray(data.cobertura) && data.cobertura.length
      ? data.cobertura.map(c => ({
          ciudad:   toPath(c.ciudad),
          provincia: toPath(c.provincia),
        }))
      : [{
          ciudad:   toPath(data.ciudad || data.localidad || ''),
          provincia: toPath(data.provincia || ''),
        }];

    const resultados = [];

    for (const { ciudad, provincia } of ciudades) {
      if (!ciudad) {
        console.warn('[index-builder] entrada sin ciudad, saltando');
        continue;
      }

      const indice    = await readIndex(pais, provincia, ciudad);
      const entry     = buildIndexEntry(data, comercioId, goods, services, ciudad, provincia);
      const existente = indice.findIndex(e => e.comercioId === comercioId);

      if (existente >= 0) {
        indice[existente] = entry;
      } else {
        indice.push(entry);
      }

      const url = await writeIndex(pais, provincia, ciudad, indice);
      resultados.push({ url, pais, provincia, ciudad, total: indice.length });
    }

    return resultados.length ? resultados : null;

  } catch (err) {
    console.warn('[index-builder] No se pudo actualizar el índice:', err.message);
    return null;
  }
}
