// ============================================================
// lib/entity-factory/builders/index.builder.js
// ============================================================

import { put }                        from '@vercel/blob';
import fetch                          from 'node-fetch';
import { toIndexContext }             from '../../../src/shared/entity-context.js'; // ← NUEVO

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
function buildIndexEntry(data, comercioId, goods, services, idxCtx) {
  const slug          = data.landing?.slug || comercioId;
  const entityType    = data.entityType || 'comercio';
  const esPrestador   = entityType === 'prestador';
  const esProfesional = entityType === 'profesional';

  return {
    id:         slug,
    comercioId,
    tipo:       idxCtx.rubro.tipo,           // ← de toIndexContext
    tags:       idxCtx.rubro.tags,           // ← de toIndexContext
    entityType,
    nombre:     esProfesional || esPrestador
                  ? (data.nombre || '')
                  : (data.nombreComercio || ''),
    categorias: esProfesional || esPrestador
                  ? [data.especialidad].filter(Boolean)
                  : (data.categories || []),
    pais:       idxCtx.pais.toLowerCase(),   // ← de toIndexContext
    provincia:  idxCtx.paths.provinciaPath,  // ← de toIndexContext
    ciudad:     idxCtx.paths.ciudadPath,     // ← de toIndexContext
    ...(idxCtx.vecinas.length ? { geo: { localidad: { nombre: data.ubicacion?.localidad?.nombre || data.localidad?.nombre, provincia: data.ubicacion?.provincia || data.provincia }, vecinas: idxCtx.vecinas } } : {}),
    keywords:   extractKeywords(data, goods, services),
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
  console.log(`[index-builder] ✅ ${blobPath} actualizado (${indice.length} entidades) → ${url}`);
  return url;
}

// ─── Export principal ────────────────────────────────────────
export async function buildIndex(data, comercioId, goods, services) {
  try {
    // ✅ NUEVO: usar toIndexContext para obtener paths + rubro + vecinas
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
    return { url, pais: idxCtx.pais, provincia: idxCtx.paths.provinciaPath, ciudad: idxCtx.paths.ciudadPath, total: indice.length };

  } catch (err) {
    console.warn('[index-builder] No se pudo actualizar el índice:', err.message);
    return null;
  }
}
