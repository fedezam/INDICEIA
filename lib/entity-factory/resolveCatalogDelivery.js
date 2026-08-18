// lib/entity-factory/resolveCatalogDelivery.js
// ⟦ROLE⟧ Decide estrategia de entrega del catálogo de productos.
//        goods siempre es el contrato: array (inline) o ref (external).
//        El LLM solo sabe "los productos están en goods".
// No compila productos — eso es goods.builder.js.
// No genera el endpoint /api/catalog — vive en otro repo.

/** Umbral en caracteres del JSON de goods. Por encima → external. */
const GOODS_INLINE_MAX_CHARS = 12_000;

/** Base del mirror de catálogo (otro repo). */
const CATALOG_BASE_URL = 'https://ia.indiceia.dev/api/catalog';

/**
 * @param {Array|null|undefined} compiled  Resultado de buildGoods (ya comprimido).
 * @param {{ slug?: string|null }} opts
 * @returns {{ goods: Array | { mode: 'external', url: string, format: 'html' } | null }}
 *
 * Caso inline:   goods = [ {id,n,cat,p,...}, ... ]
 * Caso external: goods = { mode: 'external', url, format: 'html' }
 * Caso vacío:    goods = null
 */
export function resolveCatalogDelivery(compiled, { slug } = {}) {
  if (!compiled || !Array.isArray(compiled) || compiled.length === 0) {
    return { goods: null };
  }

  const size = JSON.stringify(compiled).length;

  // Cabe en el payload → array embebido (cero fetch).
  if (size <= GOODS_INLINE_MAX_CHARS) {
    return { goods: compiled };
  }

  // Payload grande pero sin slug → no hay URL posible.
  // Preferimos entity usable (aunque pesada) a entity rota.
  if (!slug) {
    return { goods: compiled };
  }

  // Misma semántica de contrato: los productos están en goods.
  // Solo cambia la forma de entrega (ref en lugar de array).
  return {
    goods: {
      mode: 'external',
      url: `${CATALOG_BASE_URL}/${encodeURIComponent(slug)}?format=html`,
      format: 'html',
    },
  };
}
