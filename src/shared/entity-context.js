// ============================================================
// src/shared/entity-context.js
// ⟦ROLE⟧ Contexto unificado: ubicación + rubro
// NO LER | NO PROMPTS | NO SIDE EFFECTS
// ============================================================

import { getGeoContext } from './geo-helpers.js';
import vocabRaw from './business-vocabulary.json' with { type: 'json' };
import arGeoRaw from './ar-geo-enriched.json' with { type: 'json' };

// 🔧 Limpiar espacios en claves/valores del vocabulario (tu JSON los tiene)
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

// 🔧 Limpiar arGeo también por si acaso
export const arGeo = Object.fromEntries(
  Object.entries(arGeoRaw).map(([k, v]) => [clean(k), v])
);

const norm = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
const toPath = (s) => norm(s).replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

// ============================================================
// UBICACIÓN
// ============================================================

export function ubicacionFromForm(formRefs) {
  const provincia = formRefs.fields?.provincia?.input?.value?.trim() || '';
  const loc = formRefs.localidadSeleccionada;
  if (!loc?.id || !provincia) return null;
  return {
    pais: 'Argentina',
    provincia,
    localidad: { id: loc.id, nombre: loc.nombre, lat: loc.lat, lng: loc.lng }
  };
}

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

export function ubicacionToEntity(data) {
  const ubi = _resolverUbicacion(data);
  if (!ubi?.localidad?.id) return null;
  const geo = getGeoContext(ubi.localidad.id);
  return {
    pais: ubi.pais || 'Argentina',
    provincia: ubi.provincia,
    localidad: { id: ubi.localidad.id, nombre: ubi.localidad.nombre, coords: { lat: ubi.localidad.lat, lng: ubi.localidad.lng } },
    ...(geo?.cercanas?.length ? { cercanas: geo.cercanas } : {})
  };
}

export function ubicacionToPaths(data) {
  const ubi = _resolverUbicacion(data);
  if (!ubi?.localidad?.nombre) return { ciudadPath: '', provinciaPath: '', localidadId: null };
  return { ciudadPath: toPath(ubi.localidad.nombre), provinciaPath: toPath(ubi.provincia), localidadId: ubi.localidad.id || null };
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
  // 1. Match exacto en sinónimos
  if (vocab.tags.mapa_sinonimos[n]) {
    const tag = vocab.tags.mapa_sinonimos[n];
    return { tipo: _tipoDesdeTag(tag), tags: [tag] };
  }
  // 2. Match parcial
  const keyMatch = Object.keys(vocab.tags.mapa_sinonimos).find(k => n.includes(k));
  if (keyMatch) {
    const tag = vocab.tags.mapa_sinonimos[keyMatch];
    return { tipo: _tipoDesdeTag(tag), tags: [tag] };
  }
  // 3. Tag directo en whitelist
  if (vocab.tags.validos.includes(n)) {
    return { tipo: _tipoDesdeTag(n), tags: [n] };
  }
  return null;
}

export function rubroFromForm(categories = []) {
  if (!Array.isArray(categories)) return { tipo: 'GEN', tags: [] };
  for (const cat of categories) {
    const res = _resolverRubroDesdeInput(cat);
    if (res) return res;
  }
  return { tipo: 'GEN', tags: [] };
}

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
  return { tipo: rubro.tipo, nombre: tipoDef?.nombre || rubro.tipo, schema_org: tipoDef?.schema_org || 'LocalBusiness', tags: rubro.tags || [] };
}

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
// CONTEXTO UNIFICADO
// ============================================================
export function buildEntityContext(data) {
  return {
    ubicacion: ubicacionToEntity(data),
    rubro: rubroToEntity(data)
  };
}