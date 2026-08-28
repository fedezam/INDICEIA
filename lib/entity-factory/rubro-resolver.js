// lib/entity-factory/rubro-resolver.js
// ⟦ROLE⟧ Pure data enrichment. NO LER | NO PROMPTS | NO SIDE EFFECTS
//
// v2 — Trabaja sobre el árbol de 2 niveles (business-vocabulary-v4.json).
// Camino principal: recibe un codigo de subcategoría (ej. "VEH-VTA") elegido
// explícitamente en el selector y lo resuelve por lookup directo — sin heurística.
// Camino legado: si sólo hay texto libre (imports viejos, datos legacy sin codigo),
// cae a fuzzy-match sobre "sinonimos" como fallback, nunca como default silencioso.

import vocab from '../../src/shared/business-vocabulary.json' with { type: 'json' };

// ── Índices precalculados (una sola pasada al cargar el módulo) ─────
const TIPOS_POR_CODIGO = new Map();
const SUBS_POR_CODIGO  = new Map();       // "VEH-VTA" -> { tipo, sub }
const SINONIMO_A_SUB   = new Map();       // "concesionaria" -> { tipo, sub }

for (const tipo of vocab.tipos) {
  TIPOS_POR_CODIGO.set(tipo.codigo, tipo);
  for (const sub of tipo.subcategorias) {
    SUBS_POR_CODIGO.set(sub.codigo, { tipo, sub });
    for (const s of sub.sinonimos || []) {
      const norm = normalizar(s);
      // primer match gana; si hay colisión entre subcategorías distintas
      // para el mismo sinónimo, se mantiene el primero cargado (orden del JSON)
      if (!SINONIMO_A_SUB.has(norm)) {
        SINONIMO_A_SUB.set(norm, { tipo, sub });
      }
    }
  }
}

function normalizar(str) {
  return (str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

// ── Resolución por código directo (camino principal) ────────────────
// Recibe el codigo de SUBCATEGORÍA elegido en el selector, ej: "VEH-VTA"
function resolverPorCodigo(codigoSub) {
  if (!codigoSub) return null;
  const match = SUBS_POR_CODIGO.get(codigoSub);
  if (!match) return null;

  return {
    tipo:          match.tipo.codigo,
    subcategoria:  match.sub.codigo,
    nombre:        match.sub.nombre,
    schema_org:    match.sub.schema_org,
    domain_source: 'selector_directo',
    domain_confidence: 'explicit'
  };
}

// ── Resolución legada por texto libre (fallback, no default) ────────
// Sólo se usa si NO vino codigoSub — datos legacy, imports externos, etc.
function resolverPorTexto(input) {
  const norm = normalizar(input);
  if (!norm) return null;

  // 1. match exacto contra sinónimos indexados
  const exacto = SINONIMO_A_SUB.get(norm);
  if (exacto) {
    return {
      tipo:          exacto.tipo.codigo,
      subcategoria:  exacto.sub.codigo,
      nombre:        exacto.sub.nombre,
      schema_org:    exacto.sub.schema_org,
      domain_source: 'texto_libre_match_exacto',
      domain_confidence: 'heuristic'
    };
  }

  // 2. match parcial — ordenado por longitud de clave descendente,
  //    para que la clave más específica gane sobre una genérica
  //    (ej: "automotor" antes que "auto")
  const claves = [...SINONIMO_A_SUB.keys()].sort((a, b) => b.length - a.length);
  const claveMatch = claves.find(k => norm.includes(k));
  if (claveMatch) {
    const match = SINONIMO_A_SUB.get(claveMatch);
    return {
      tipo:          match.tipo.codigo,
      subcategoria:  match.sub.codigo,
      nombre:        match.sub.nombre,
      schema_org:    match.sub.schema_org,
      domain_source: 'texto_libre_match_parcial',
      domain_confidence: 'heuristic_low'
    };
  }

  return null;
}

// ── Export principal ──────────────────────────────────────────────
// Estructura real en Firestore hoy: context.rubro = { tipo: "VEH", tags: [...] }
// Con el selector de 2 niveles, rubro pasa a tener también:
//   context.rubro.subcategoria = "VEH-VTA"  (codigo de subcategoría elegido)
// Mientras conviven entidades viejas (solo tipo) y nuevas (tipo + subcategoria),
// el resolver prioriza subcategoria cuando existe.
export function resolveRubro(context = {}, data = {}) {
  const rubro = context.rubro || data.rubro || {};

  // 1. Camino principal: subcategoría explícita del selector de 2 niveles
  const porCodigo = resolverPorCodigo(rubro.subcategoria || context.rubroCodigo || data.rubroCodigo);
  if (porCodigo) return { ...porCodigo, mind_override: null };

  // 1.b Solo hay tipo (nivel 1) sin subcategoría — entidad vieja o formulario
  //     que todavía no migró al selector de 2 niveles. No inventamos una
  //     subcategoría: devolvemos el tipo con schema_org genérico y marcamos
  //     para que el onboarding pida completar el nivel 2.
  if (rubro.tipo && TIPOS_POR_CODIGO.has(rubro.tipo)) {
    const tipo = TIPOS_POR_CODIGO.get(rubro.tipo);
    return {
      tipo: tipo.codigo,
      subcategoria: null,
      nombre: tipo.nombre,
      schema_org: 'LocalBusiness', // genérico: sin nivel 2 no hay schema_org específico
      domain_source: 'solo_tipo_sin_subcategoria',
      domain_confidence: 'partial',
      mind_override: null,
      requiere_completar_subcategoria: true
    };
  }

  // 2. Fallback legado: texto libre (tags[], categorias[], businessType, etc.)
  const fuentesTexto = [
    ...(rubro.tags || []),
    context.categorias?.[0],
    context.especialidad,
    data.businessType,
    ...(data.categories || []),
  ].filter(Boolean);

  for (const fuente of fuentesTexto) {
    const result = resolverPorTexto(fuente);
    if (result) return { ...result, mind_override: null };
  }

  // 3. Sin match: GEN explícito, NUNCA se inventa una subcategoría por default
  return {
    tipo: 'GEN',
    subcategoria: null,
    nombre: null,
    schema_org: 'LocalBusiness',
    domain_source: 'sin_match',
    domain_confidence: 'none',
    mind_override: null,
    // señal para que la capa de onboarding/UI pueda alertar
    // "no reconocemos este rubro" en vez de fallar en silencio
    requiere_revision: true
  };
}

// ── Helpers exportados para otros builders / UI ─────────────────────
export function getTipo(codigo) {
  return TIPOS_POR_CODIGO.get(codigo) || null;
}

export function getSubcategoria(codigoSub) {
  return SUBS_POR_CODIGO.get(codigoSub) || null;
}

// Para el selector: lista de subcategorías de un rubro dado
export function getSubcategoriasDeTipo(codigoTipo) {
  return TIPOS_POR_CODIGO.get(codigoTipo)?.subcategorias || [];
}

// Sugerencia de subcategoría más cercana para texto libre — usada por la UI
// para avisar "¿quisiste decir X?" en vez de dejar que el usuario cree un tag ciego
export function sugerirSubcategoria(textoLibre) {
  const result = resolverPorTexto(textoLibre);
  if (!result) return null;
  return {
    tipo: result.tipo,
    subcategoria: result.subcategoria,
    nombre: result.nombre,
    confidence: result.domain_confidence
  };
}
