// ============================================================
// src/shared/entity-context.js
// ⟦ROLE⟧ Contexto unificado: ubicación + rubro
// NO LER | NO PROMPTS | NO SIDE EFFECTS
// ============================================================

import { getGeoContext }  from './geo-helpers.js';
import vocabRaw from './business-vocabulary.json' with { type: 'json' };
import arGeoRaw from './ar-geo-enriched.json'     with { type: 'json' };

// ── Limpiar espacios en claves/valores del vocabulario ───────
const clean = (str) => typeof str === 'string' ? str.trim() : str;

export const vocab = {
  tipos: (vocabRaw.tipos || []).map(t => ({
    codigo:       clean(t.codigo),
    nombre:       clean(t.nombre),
    schema_org:   clean(t.schema_org),
    tier_default: clean(t.tier_default)
  })),
  tags: {
    validos: (vocabRaw.tags?.validos || []).map(clean),
    mapa_sinonimos: Object.fromEntries(
      Object.entries(vocabRaw.tags?.mapa_sinonimos || {}).map(([k, v]) => [clean(k), clean(v)])
    )
  },
  resolucion: Object.fromEntries(
    Object.entries(vocabRaw.resolucion || {}).map(([k, v]) => [
      clean(k),
      (v || []).map(clean)
    ])
  )
};

export const arGeo = Object.fromEntries(
  Object.entries(arGeoRaw).map(([k, v]) => [clean(k), v])
);

// ============================================================
// HELPERS INTERNOS
// ============================================================

const norm   = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
const toPath = (s) => norm(s).replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

function _resolverUbicacion(data) {
  if (data.ubicacion?.localidad?.id) return data.ubicacion;
  if (data.localidad?.id && data.localidad.nombre) {
    return {
      pais:      data.pais || 'Argentina',
      provincia: data.localidad.provincia || data.provincia || '',
      localidad: data.localidad
    };
  }
  if (data.ciudad?.id && data.provincia) {
    return {
      pais:      data.pais || 'Argentina',
      provincia: data.provincia,
      localidad: {
        id:     data.ciudad.id,
        nombre: data.ciudad.nombre,
        lat:    data.ciudad.lat,
        lng:    data.ciudad.lng
      }
    };
  }
  return null;
}

function _tipoDesdeTag(tag) {
  for (const [tipo, tags] of Object.entries(vocab.resolucion)) {
    if (tags.includes(tag)) return tipo;
  }
  return 'GEN';
}

function _resolverRubroDesdeInput(input) {
  const n = norm(input);
  if (!n) return null;

  if (vocab.tags.mapa_sinonimos[n]) {
    const tag = vocab.tags.mapa_sinonimos[n];
    return { tipo: _tipoDesdeTag(tag), tags: [tag] };
  }

  const keyMatch = Object.keys(vocab.tags.mapa_sinonimos).find(k => n.includes(k));
  if (keyMatch) {
    const tag = vocab.tags.mapa_sinonimos[keyMatch];
    return { tipo: _tipoDesdeTag(tag), tags: [tag] };
  }

  if (vocab.tags.validos.includes(n)) {
    return { tipo: _tipoDesdeTag(n), tags: [n] };
  }

  return null;
}

function _resolverRubro(data) {
  if (data.rubro?.tipo) return data.rubro;
  const fuentes = [
    data.businessType,
    ...(data.categories || []),
    data.especialidad
  ].filter(Boolean);
  for (const f of fuentes) {
    const res = _resolverRubroDesdeInput(f);
    if (res) return res;
  }
  return { tipo: 'GEN', tags: [] };
}

function _enriquecerRubro(rubro) {
  const tipoDef = vocab.tipos.find(t => t.codigo === rubro.tipo);
  return {
    tipo:       rubro.tipo,
    nombre:     tipoDef?.nombre     || rubro.tipo,
    schema_org: tipoDef?.schema_org || 'LocalBusiness',
    tags:       rubro.tags          || [],
  };
}

// ============================================================
// EXPORTS ESPECIALIZADOS
// ============================================================

// ── Para entity.json (LLM que responde al usuario) ───────────
// Necesita: ubicacion propia con coords + rubro enriquecido
// NO necesita: vecinas (eso es contexto del índice, no de la entidad)
export function toEntityContext(data) {
  const ubi = _resolverUbicacion(data);
  const rub = _enriquecerRubro(_resolverRubro(data));

  return {
    ...(ubi ? {
      ubicacion: {
        pais:      ubi.pais || 'Argentina',
        provincia: ubi.provincia,
        localidad: {
          id:     ubi.localidad.id,
          nombre: ubi.localidad.nombre,
          coords: { lat: ubi.localidad.lat, lng: ubi.localidad.lng }
        }
      }
    } : {}),
    rubro: rub,
  };
}

// ── Para seo.builder (Google) ─────────────────────────────────
// Necesita: texto legible para <title>, <h1>, meta + paths para canonical URLs
// NO necesita: coords, vecinas, tags
export function toSeoContext(data) {
  const ubi     = _resolverUbicacion(data);
  const rubro   = _resolverRubro(data);
  const tipoDef = vocab.tipos.find(t => t.codigo === rubro.tipo);

  return {
    pais:        ubi?.pais || 'Argentina',  // ← FIX: agregado
    localidad:   ubi?.localidad?.nombre || '',
    provincia:   ubi?.provincia         || '',
    rubroNombre: tipoDef?.nombre        || '',
    paths: {
      ciudadPath:    ubi ? toPath(ubi.localidad.nombre) : '',
      provinciaPath: ubi ? toPath(ubi.provincia)        : '',
    }
  };
}

// ── Para index.builder (LLM crawler) ─────────────────────────
// Necesita: paths para URLs + rubro.tipo/tags para filtrar + vecinas legibles para navegar
// NO necesita: schema_org, coords precisas
export function toIndexContext(data) {
  const ubi = _resolverUbicacion(data);
  const rub = _resolverRubro(data);

  const paths = ubi ? {
    ciudadPath:    toPath(ubi.localidad.nombre),
    provinciaPath: toPath(ubi.provincia),
    localidadId:   ubi.localidad.id || null,
  } : { ciudadPath: '', provinciaPath: '', localidadId: null };

  // vecinas con nombres legibles + distancia para que el LLM navegue
  const geo     = paths.localidadId ? getGeoContext(paths.localidadId) : null;
  const vecinas = geo?.cercanas || [];

  return {
    pais:    ubi?.pais || 'Argentina',  // ← FIX: agregado
    paths,
    rubro:   { tipo: rub.tipo, tags: rub.tags },
    vecinas, // [{ id, nombre, provincia, dist_km }]
  };
}

// ── Validación ────────────────────────────────────────────────
export function validarUbicacion(data) {
  const ubi = _resolverUbicacion(data);
  return !!(ubi?.localidad?.id && ubi.provincia);
}

export function validarRubro(data) {
  const rub = _resolverRubro(data);
  return !!(rub?.tipo && rub.tipo !== 'GEN');
}

// ── Para formularios → Firestore ──────────────────────────────
export function ubicacionFromForm(formRefs) {
  const provincia = formRefs.fields?.provincia?.input?.value?.trim() || '';
  const loc       = formRefs.localidadSeleccionada;
  if (!loc?.id || !provincia) return null;
  return {
    pais:      'Argentina',
    provincia,
    localidad: { id: loc.id, nombre: loc.nombre, lat: loc.lat, lng: loc.lng }
  };
}

export function rubroFromForm(categories = []) {
  if (!Array.isArray(categories)) return { tipo: 'GEN', tags: [] };
  for (const cat of categories) {
    const res = _resolverRubroDesdeInput(cat);
    if (res) return res;
  }
  return { tipo: 'GEN', tags: [] };
}

// ── Compat — buildEntityContext sigue funcionando ─────────────
export function buildEntityContext(data) {
  const entity = toEntityContext(data);
  return {
    ubicacion: entity.ubicacion || null,
    rubro:     entity.rubro,
  };
}
