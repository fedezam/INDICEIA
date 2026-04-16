// src/shared/entity-context.js
// ⟦ROLE⟧ Contexto unificado de entidad: ubicación + rubro
// NO LER | NO PROMPTS | NO SIDE EFFECTS
// ============================================================

import { getGeoContext } from './geo-helpers.js';
import vocabRaw          from './business-vocabulary.json' with { type: 'json' };

// 🔧 Normalizar vocabulario al cargar (elimina espacios que rompen matches)
const clean = (str) => typeof str === 'string' ? str.trim() : str;

export const vocab = {
  tipos: (vocabRaw.tipos || []).map(t => ({
    codigo: clean(t.codigo),
    nombre: clean(t.nombre),
    schema_org: clean(t.schema_org),
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

const norm   = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
const toPath = (s) => norm(s).replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

// ============================================================
// UBICACIÓN
// ============================================================

// 📝 FORM → FIRESTORE
export function ubicacionFromForm(refs) {
  const prov   = refs?.fields?.provincia?.input?.value?.trim() || '';
  const locObj = refs?.localidadSeleccionada;
  if (!locObj?.id || !prov) return null;
  return {
    pais: 'Argentina',
    provincia: prov,
    localidad: {
      id: String(locObj.id),
      nombre: locObj.nombre,
      lat: Number(locObj.lat),
      lng: Number(locObj.lng)
    }
  };
}

// 🔍 Internal: tolera formato nuevo, legacy o string suelto
function _resolverUbicacion(data) {
  if (data.ubicacion?.localidad?.id) return data.ubicacion;
  if (data.localidad?.id && data.localidad.nombre) {
    return { pais: data.pais || 'Argentina', provincia: data.localidad.provincia || data.provincia || '', localidad: data.localidad };
  }
  if (data.ciudad?.id && data.provincia) {
    return { pais: data.pais || 'Argentina', provincia: data.provincia, localidad: { id: data.ciudad.id, nombre: data.ciudad.nombre, lat: data.ciudad.lat, lng: data.ciudad.lng } };
  }
  return null;
}

// 🧠 FIRESTORE → ENTITY.JSON (con vecinas para LLM)
export function ubicacionToEntity(data) {
  const ubi = _resolverUbicacion(data);
  if (!ubi?.localidad?.id) return null;
  const geo = getGeoContext(ubi.localidad.id);
  return {
    pais: ubi.pais,
    provincia: ubi.provincia,
    localidad: { id: ubi.localidad.id, nombre: ubi.localidad.nombre, coords: { lat: ubi.localidad.lat, lng: ubi.localidad.lng } },
    contexto: { vecinas: geo?.cercanas || [] }
  };
}

// 🔗 FIRESTORE → PATHS/URLS
export function ubicacionToPaths(data) {
  const ubi = _resolverUbicacion(data);
  if (!ubi?.localidad?.nombre) return { ciudadPath: '', provinciaPath: '', localidadId: null };
  return {
    ciudadPath: toPath(ubi.localidad.nombre),
    provinciaPath: toPath(ubi.provincia),
    localidadId: ubi.localidad.id || null
  };
}

export function validarUbicacion(data) {
  const ubi = _resolverUbicacion(data);
  return !!(ubi?.localidad?.id && ubi.provincia);
}

// ============================================================
// RUBRO
// ============================================================

function _tipoDesdeTag(tag) {
  for (const [tipo, tags] of Object.entries(vocab.resolucion)) {
    if (tags.includes(tag)) return tipo;
  }
  return 'GEN';
}

function _resolverRubroDesdeInput(input) {
  const n = norm(input);
  if (!n) return null;
  // 1. Exacto
  if (vocab.tags.mapa_sinonimos[n]) {
    const tag = vocab.tags.mapa_sinonimos[n];
    return { tipo: _tipoDesdeTag(tag), tags: [tag] };
  }
  // 2. Parcial
  const keyMatch = Object.keys(vocab.tags.mapa_sinonimos).find(k => n.includes(k));
  if (keyMatch) {
    const tag = vocab.tags.mapa_sinonimos[keyMatch];
    return { tipo: _tipoDesdeTag(tag), tags: [tag] };
  }
  // 3. Tag directo
  if (vocab.tags.validos.includes(n)) {
    return { tipo: _tipoDesdeTag(n), tags: [n] };
  }
  return null;
}

// 📝 FORM → FIRESTORE
export function rubroFromForm(categories = []) {
  if (!Array.isArray(categories)) return { tipo: 'GEN', tags: [] };
  for (const cat of categories) {
    const res = _resolverRubroDesdeInput(cat);
    if (res) return res;
  }
  return { tipo: 'GEN', tags: [] };
}

// 🧠 FIRESTORE → ENTITY.JSON (enriquecido)
export function rubroToEntity(data) {
  let rubro = data.rubro;
  if (!rubro?.tipo) {
    const fuentes = [data.businessType, ...(data.categories || []), data.especialidad].filter(Boolean);
    for (const f of fuentes) {
      const res = _resolverRubroDesdeInput(f);
      if (res) { rubro = res; break; }
    }
  }
  if (!rubro?.tipo || rubro.tipo === 'GEN') return { tipo: 'GEN', tags: [] };
  const tipoDef = vocab.tipos.find(t => t.codigo === rubro.tipo);
  return {
    tipo: rubro.tipo,
    nombre: tipoDef?.nombre || rubro.tipo,
    schema_org: tipoDef?.schema_org || 'LocalBusiness',
    tags: rubro.tags || []
  };
}

// 📑 FIRESTORE → INDEX (ligero)
export function rubroToIndex(data) {
  let rubro = data.rubro;
  if (!rubro?.tipo) {
    const fuentes = [data.businessType, ...(data.categories || [])].filter(Boolean);
    for (const f of fuentes) {
      const res = _resolverRubroDesdeInput(f);
      if (res) { rubro = res; break; }
    }
  }
  return rubro || { tipo: 'GEN', tags: [] };
}

export function validarRubro(data) {
  return !!(data.rubro?.tipo && data.rubro.tipo !== 'GEN');
}

// ============================================================
// CONTEXTO UNIFICADO — para entity.json
// ============================================================
export function buildEntityContext(data) {
  return {
    ubicacion: ubicacionToEntity(data),
    rubro: rubroToEntity(data)
  };
}
