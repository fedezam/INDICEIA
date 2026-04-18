/**
 * Loader con caché en memoria y TTL configurable.
 * Puro fetch + Map. Compatible con Vercel Edge y Node 18+.
 */

const BLOB_BASE_URL = process.env.BLOB_BASE_URL || 'https://oigwwzzmvibflie8.public.blob.vercel-storage.com';
const cache = new Map();
const CACHE_TTL = parseInt(process.env.INDEX_CACHE_TTL_MS || '300000', 10);

export async function loadCityIndex(ciudad, opts = {}) {
  if (!ciudad) throw new Error('ciudad es requerida');
  const pais = (opts.pais || 'argentina').toLowerCase();
  const prov = (opts.provincia || 'santa-fe').toLowerCase().replace(/\s+/g, '-');
  const key = `${pais}/${prov}/${ciudad}`;

  if (!opts.forceRefresh) {
    const c = cache.get(key);
    if (c && Date.now() - c.t < CACHE_TTL) return c.d;
  }

  try {
    const res = await fetch(`${BLOB_BASE_URL}/index/${key}.json`);
    if (!res.ok) return [];
    const data = await res.json();
    cache.set(key, { d: data, t: Date.now() });
    return data;
  } catch (e) {
    console.warn('[loader] Fallo:', e.message);
    return [];
  }
}

export function invalidateCache(key) { if (key) cache.delete(key); else cache.clear(); }