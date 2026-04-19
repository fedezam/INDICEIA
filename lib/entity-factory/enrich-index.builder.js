/**
 * Segunda pasada: transforma un índice base en un grafo enriquecido.
 * Agrega relaciones semánticas y compila la card LER de cada nodo.
 * Se puede invocar desde un hook post-build, CLI o CI/CD.
 */

import { buildRelationsForCity } from './relations.builder.js';
import { compileIndexCards }     from './compiler/card.compiler.js';
import { put } from '@vercel/blob';

const BLOB_BASE_URL = process.env.BLOB_BASE_URL ||
  'https://oigwwzzmvibflie8.public.blob.vercel-storage.com';

/**
 * Enriquece un índice plano, compila cards LER y persiste.
 * @param {Array}  baseIndex  - Índice sin relaciones
 * @param {string} pais
 * @param {string} provincia
 * @param {string} ciudad
 * @returns {Promise<{ url: string, total: number }>}
 */
export async function enrichAndSaveCityIndex(baseIndex, pais, provincia, ciudad) {
  if (!Array.isArray(baseIndex)) throw new Error('baseIndex debe ser un array');

  // Paso 1: calcular relaciones entre nodos
  const enriched = buildRelationsForCity(baseIndex);

  // Paso 2: compilar card LER para cada nodo
  const withCards = compileIndexCards(enriched);

  // Paso 3: persistir índice completo
  const blobPath = `index/${pais}/${provincia}/${ciudad}.json`;
  const { url } = await put(
    blobPath,
    JSON.stringify(withCards, null, 2),
    {
      access: 'public',
      addRandomSuffix: false,
      contentType: 'application/json; charset=utf-8',
      token: process.env.BLOB_READ_WRITE_TOKEN,
    }
  );

  // Paso 4: actualizar manifest de ciudades
  await updateManifest({ pais, provincia, ciudad, url, total: withCards.length });

  console.log(`[enrich-index] ✅ Grafo guardado: ${blobPath} (${withCards.length} nodos, cards compiladas)`);
  return { url, total: withCards.length };
}

/**
 * Mantiene un manifest central de ciudades indexadas.
 * Permite que cualquier LLM descubra qué ciudades existen
 * sin conocer la convención de URLs de antemano.
 */
async function updateManifest({ pais, provincia, ciudad, url, total }) {
  const manifestPath = 'index/manifest.json';
  const manifestUrl  = `${BLOB_BASE_URL}/${manifestPath}`;

  // Leer manifest existente o arrancar vacío
  let manifest = { updatedAt: null, ciudades: [] };
  try {
    const res = await fetch(manifestUrl);
    if (res.ok) manifest = await res.json();
  } catch {
    // Primera vez — manifest no existe todavía
  }

  // Actualizar o insertar entrada de ciudad
  const idx = manifest.ciudades.findIndex(
    c => c.pais === pais && c.provincia === provincia && c.id === ciudad
  );

  const entry = { id: ciudad, provincia, pais, url, total, updatedAt: new Date().toISOString() };

  if (idx >= 0) {
    manifest.ciudades[idx] = entry;
  } else {
    manifest.ciudades.push(entry);
  }

  manifest.updatedAt = new Date().toISOString();

  await put(
    manifestPath,
    JSON.stringify(manifest, null, 2),
    {
      access: 'public',
      addRandomSuffix: false,
      contentType: 'application/json; charset=utf-8',
      token: process.env.BLOB_READ_WRITE_TOKEN,
    }
  );

  console.log(`[enrich-index] ✅ Manifest actualizado: ${manifest.ciudades.length} ciudades`);
}
