// lib/entity-factory/rubro-resolver.js
// ⟦ROLE⟧ Pure data enrichment. NO LER | NO PROMPTS | NO SIDE EFFECTS

import vocab from './base/business-vocabulary.json' with { type: 'json' };

const sinonimos  = vocab.tags.mapa_sinonimos;
const resolucion = vocab.resolucion;

function normalizar(str) {
  return (str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

// Dada una string de entrada, intenta encontrar el tipo via:
// 1. match directo en mapa_sinonimos → tag → tipo
// 2. match parcial (la entrada contiene alguna clave del mapa)
// 3. fallback a 'GEN'
function resolverTipo(input) {
  const norm = normalizar(input);
  if (!norm) return { tipo: 'GEN', tags: [] };

  // 1. match exacto
  const tagExacto = sinonimos[norm];
  if (tagExacto) {
    const tipo = _tipoDesdeTag(tagExacto);
    return { tipo, tags: resolucion[tipo] || [] };
  }

  // 2. match parcial — la entrada contiene alguna clave
  const claveMatch = Object.keys(sinonimos).find(k => norm.includes(normalizar(k)));
  if (claveMatch) {
    const tag  = sinonimos[claveMatch];
    const tipo = _tipoDesdeTag(tag);
    return { tipo, tags: resolucion[tipo] || [] };
  }

  return { tipo: 'GEN', tags: [] };
}

function _tipoDesdeTag(tag) {
  return Object.entries(resolucion)
    .find(([, tags]) => tags.includes(tag))?.[0] || 'GEN';
}

// ── Export principal ──────────────────────────────────────────

export function resolveRubro(context = {}, data = {}) {
  // fuentes en orden de prioridad
  const fuentes = [
    context.categorias?.[0],
    data.businessType,
    data.rubro,
    ...(data.categories || []),
  ].filter(Boolean);

  for (const fuente of fuentes) {
    const result = resolverTipo(fuente);
    if (result.tipo !== 'GEN') return { ...result, mind_override: null };
  }

  // fallback con tags genéricos según si tiene goods/services
  const tags = [];
  if (Array.isArray(data.goods))    tags.push('alimentos');
  if (Array.isArray(data.services)) tags.push('tech');

  return { rubro: 'GEN', tags, mind_override: null };
}

// ── Helpers exportados para otros builders ────────────────────

// Devuelve el objeto tipo completo desde el vocabulario
export function getTipo(codigo) {
  return vocab.tipos.find(t => t.codigo === codigo) || null;
}

// Normaliza un array de tags libres contra la whitelist
export function normalizarTags(tagsLibres = []) {
  return [...new Set(
    tagsLibres
      .map(t => sinonimos[normalizar(t)] || null)
      .filter(Boolean)
  )];
}