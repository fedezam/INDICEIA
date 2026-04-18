/**
 * Segunda pasada: transforma un índice base en un grafo enriquecido.
 * Se puede invocar desde un hook post-build, CLI o CI/CD.
 */

import { buildRelationsForCity } from './relations.builder.js';
import { put } from '@vercel/blob';

const BLOB_BASE_URL = process.env.BLOB_BASE_URL ||
  'https://oigwwzzmvibflie8.public.blob.vercel-storage.com';

/**
 * Enriquece un índice plano y lo persiste.
 * @param {Array} baseIndex - Índice sin relaciones
 * @param {string} pais
 * @param {string} provincia
 * @param {string} ciudad
 * @returns {Promise<{ url: string, total: number }>}
 */
export async function enrichAndSaveCityIndex(baseIndex, pais, provincia, ciudad) {
  if (!Array.isArray(baseIndex)) throw new Error('baseIndex debe ser un array');

  const enriched = buildRelationsForCity(baseIndex);

  const blobPath = `index/${pais}/${provincia}/${ciudad}.json`;
  const { url } = await put(
    blobPath,
    JSON.stringify(enriched, null, 2),
    {
      access: 'public',
      addRandomSuffix: false,
      contentType: 'application/json; charset=utf-8',
      token: process.env.BLOB_READ_WRITE_TOKEN,
    }
  );

  console.log(`[enrich-index] ✅ Grafo guardado: ${blobPath} (${enriched.length} nodos)`);
  return { url, total: enriched.length };
}