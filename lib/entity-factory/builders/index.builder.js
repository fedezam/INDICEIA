// ============================================================
// lib/entity-factory/builders/index.builder.js
// ============================================================

import { put }                        from '@vercel/blob';
import fetch                          from 'node-fetch';
import { resolveRubro, normalizarTags } from '../rubro-resolver.js';
import { getGeoContext }              from '../../../src/shared/geo-helpers.js';

const BLOB_BASE_URL = process.env.BLOB_BASE_URL ||
  'https://oigwwzzmvibflie8.public.blob.vercel-storage.com';

// ─── Normalizar string para path (resiliente a objetos geo) ─────────────────────────────

function toPath(value) {
  // Extraer valor textual EXPLÍCITAMENTE: solo campos que existen, sin inferir
  const str = typeof value === 'string'
    ? value
    : (value?.nombre || value?.id || '');

  // Normalizar para URL
  return (str || '')
    .toLowerCase()
    .trim()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

// ─── Resolver localidad (string o objeto) ────────────────────

function resolverLocalidad(data) {
  // localidad puede ser objeto { id, nombre, lat, lng, provincia }
  // o string legacy "Casilda"
  const loc = data.localidad;

  if (loc && typeof loc === 'object') {
    return {
      ciudadPath:    toPath(loc.nombre),
      provinciaPath: toPath(loc.provincia || data.provincia || ''),
      localidadId:   loc.id || null,
    };
  }

  return {
    ciudadPath:    toPath(data.ciudad || loc || ''),
    provinciaPath: toPath(data.provincia || ''),
    localidadId:   null,
  };
}

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

function buildIndexEntry(data, comercioId, goods, services, ciudadPath, provinciaPath, localidadId) {
  const slug          = data.landing?.slug || comercioId;
  const entityType    = data.entityType || 'comercio';
  const esPrestador   = entityType === 'prestador';
  const esProfesional = entityType === 'profesional';

  // resolver tipo de negocio desde vocabulario
  const { rubro: tipo, tags: tagsResueltos } = resolveRubro(
    { categorias: data.categories },
    data
  );

  // normalizar tags adicionales que pueda traer data.tags
  const tagsExtra = normalizarTags(data.tags || []);
  const tags = [...new Set([...tagsResueltos, ...tagsExtra])];

  // contexto geo para navegación LLM
  const geo = localidadId ? getGeoContext(localidadId) : null;

  return {
    id:         slug,
    comercioId,
    tipo,                    // código vocabulario: FRR, PRO, SAL, etc.
    tags,                    // tags controlados del vocabulario
    entityType,              // comercio | prestador | profesional
    nombre:     esProfesional || esPrestador
                  ? (data.nombre || '')
                  : (data.nombreComercio || ''),
    categorias: esProfesional || esPrestador
                  ? [data.especialidad].filter(Boolean)
                  : (data.categories || []),
    pais:      (data.pais || 'Argentina').toLowerCase().trim(),
    provincia:  provinciaPath,
    ciudad:     ciudadPath,
    ...(geo ? { geo } : {}),  // localidad + vecinas para el LLM
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
    const pais = toPath(data.pais || 'argentina');

    let ciudades = [];

    if (data.entityType === 'profesional' &&
        Array.isArray(data.lugares) && data.lugares.length) {
      // profesional → itera lugares[] (consultorio por ciudad)
      ciudades = data.lugares
        .filter(l => l.ciudad && l.provincia)
        .map(l => ({
          ciudadPath:    toPath(l.ciudad?.nombre ?? l.ciudad),
          provinciaPath: toPath(l.provincia?.nombre ?? l.provincia),
          localidadId:   l.ciudad?.id || null,
        }));

    } else if (Array.isArray(data.cobertura) && data.cobertura.length) {
      // prestador → itera cobertura[]
      ciudades = data.cobertura.map(c => ({
        ciudadPath:    toPath(c.ciudad?.nombre ?? c.ciudad),
        provinciaPath: toPath(c.provincia?.nombre ?? c.provincia),
        localidadId:   c.ciudad?.id || null,
      }));

    } else {
      // comercio → localidad única
      const { ciudadPath, provinciaPath, localidadId } = resolverLocalidad(data);
      ciudades = [{ ciudadPath, provinciaPath, localidadId }];
    }

    // deduplicar
    const vistas = new Set();
    ciudades = ciudades.filter(({ ciudadPath, provinciaPath }) => {
      const key = `${provinciaPath}/${ciudadPath}`;
      if (vistas.has(key)) return false;
      vistas.add(key);
      return true;
    });

    const resultados = [];

    for (const { ciudadPath, provinciaPath, localidadId } of ciudades) {
      if (!ciudadPath) {
        console.warn('[index-builder] entrada sin ciudad, saltando');
        continue;
      }

      const indice    = await readIndex(pais, provinciaPath, ciudadPath);
      const entry     = buildIndexEntry(data, comercioId, goods, services, ciudadPath, provinciaPath, localidadId);
      const existente = indice.findIndex(e => e.comercioId === comercioId);

      if (existente >= 0) {
        indice[existente] = entry;
      } else {
        indice.push(entry);
      }

      const url = await writeIndex(pais, provinciaPath, ciudadPath, indice);
      resultados.push({ url, pais, provincia: provinciaPath, ciudad: ciudadPath, total: indice.length });
    }

    return resultados.length ? resultados : null;

  } catch (err) {
    console.warn('[index-builder] No se pudo actualizar el índice:', err.message);
    return null;
  }
}
