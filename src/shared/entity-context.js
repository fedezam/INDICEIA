// ============================================================
// src/shared/entity-context.js
// ⟦ROLE⟧ Contexto unificado de entidad: ubicación + rubro
// NO LER | NO PROMPTS | NO SIDE EFFECTS
// ============================================================

import { getGeoContext }  from './geo-helpers.js';
import arGeo              from './ar-geo-enriched.json' with { type: 'json' };
import vocab              from './business-vocabulary.json' with { type: 'json' };

const sinonimos  = vocab.tags.mapa_sinonimos;
const resolucion = vocab.resolucion;
const tipos      = vocab.tipos;

// ============================================================
// HELPERS INTERNOS
// ============================================================

function normalizar(str) {
  return (str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function toPath(str) {
  return normalizar(str)
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

function _buscarLocalidadPorNombre(nombre, provincia) {
  const n = normalizar;
  for (const prov of Object.values(arGeo)) {
    if (n(prov.nombre) !== n(provincia)) continue;
    for (const dep of Object.values(prov.departamentos)) {
      for (const loc of dep.localidades) {
        if (n(loc.nombre) === n(nombre)) return loc;
      }
    }
  }
  return null;
}

function _resolverTipoDesdeTag(tag) {
  return Object.entries(resolucion)
    .find(([, tags]) => tags.includes(tag))?.[0] || 'GEN';
}

function _resolverRubroDesdeInput(input) {
  const norm = normalizar(input);
  if (!norm) return null;

  // match exacto en mapa de sinónimos
  const tagExacto = sinonimos[norm];
  if (tagExacto) {
    const tipo = _resolverTipoDesdeTag(tagExacto);
    return { tipo, tags: resolucion[tipo] || [] };
  }

  // match parcial
  const claveMatch = Object.keys(sinonimos).find(k => norm.includes(normalizar(k)));
  if (claveMatch) {
    const tag  = sinonimos[claveMatch];
    const tipo = _resolverTipoDesdeTag(tag);
    return { tipo, tags: resolucion[tipo] || [] };
  }

  return null;
}

// ============================================================
// UBICACION
// ============================================================

// ── Desde formulario → Firestore ─────────────────────────────
// formRefs: { fields: { provincia }, localidadSeleccionada }
export function ubicacionFromForm(formRefs) {
  const provincia   = formRefs.fields?.provincia?.input?.value?.trim() || '';
  const localidadObj = formRefs.localidadSeleccionada;

  if (!localidadObj?.id || !provincia) return null;

  return {
    pais:      'Argentina',
    provincia,
    localidad: {
      id:     localidadObj.id,
      nombre: localidadObj.nombre,
      lat:    localidadObj.lat,
      lng:    localidadObj.lng,
    }
  };
}

// ── Desde Firestore → entity.json (con vecinas para el LLM) ──
export function ubicacionToEntity(data) {
  const ubi = _resolverUbicacion(data);
  if (!ubi?.localidad?.id) return null;

  const geo = getGeoContext(ubi.localidad.id);

  return {
    pais:      ubi.pais || 'Argentina',
    provincia: ubi.provincia,
    localidad: ubi.localidad,
    ...(geo?.cercanas?.length ? { cercanas: geo.cercanas } : {})
  };
}

// ── Paths para URLs e índices ─────────────────────────────────
export function ubicacionToPaths(data) {
  const ubi = _resolverUbicacion(data);
  if (!ubi?.localidad?.nombre) return { ciudadPath: '', provinciaPath: '' };

  return {
    ciudadPath:    toPath(ubi.localidad.nombre),
    provinciaPath: toPath(ubi.provincia),
    localidadId:   ubi.localidad.id || null,
  };
}

// ── Validación ────────────────────────────────────────────────
export function validarUbicacion(data) {
  const ubi    = _resolverUbicacion(data);
  const errors = [];

  if (!ubi?.provincia?.trim())       errors.push('provincia_requerida');
  if (!ubi?.localidad?.id)           errors.push('localidad_id_requerido');
  if (!ubi?.localidad?.nombre?.trim()) errors.push('localidad_nombre_requerido');
  if (
    typeof ubi?.localidad?.lat !== 'number' ||
    typeof ubi?.localidad?.lng !== 'number'
  ) errors.push('coordenadas_invalidas');

  return { valid: errors.length === 0, errors };
}

// ── Compat legacy ─────────────────────────────────────────────
// Tolera: ubicacion objeto, localidad objeto, ciudad objeto + provincia suelta, strings
function _resolverUbicacion(data) {
  // 1. formato nuevo: data.ubicacion
  if (data.ubicacion?.localidad?.id) return data.ubicacion;

  // 2. localidad objeto con provincia dentro
  if (data.localidad?.id && data.localidad?.nombre) {
    return {
      pais:      data.pais || 'Argentina',
      provincia: data.localidad.provincia || data.provincia || '',
      localidad: data.localidad,
    };
  }

  // 3. ciudad objeto (legacy Firestore actual) + provincia suelta
  if (data.ciudad?.id && data.provincia) {
    return {
      pais:      data.pais || 'Argentina',
      provincia: data.provincia,
      localidad: {
        id:     data.ciudad.id,
        nombre: data.ciudad.nombre,
        lat:    data.ciudad.lat,
        lng:    data.ciudad.lng,
      }
    };
  }

  // 4. strings puro — intenta resolver desde arGeo
  if (typeof data.ciudad === 'string' && data.provincia) {
    const loc = _buscarLocalidadPorNombre(data.ciudad, data.provincia);
    if (loc) {
      return {
        pais:      data.pais || 'Argentina',
        provincia: data.provincia,
        localidad: { id: loc.id, nombre: loc.nombre, lat: loc.lat, lng: loc.lng },
      };
    }
  }

  return null;
}

// ============================================================
// RUBRO
// ============================================================

// ── Desde Firestore → rubro resuelto ─────────────────────────
export function resolverRubro(data) {
  // si ya viene resuelto en Firestore, lo usamos directamente
  if (data.rubro?.tipo) return data.rubro;

  // resolver desde categorías / businessType
  const fuentes = [
    data.businessType,
    ...(data.categories || []),
    data.especialidad,
  ].filter(Boolean);

  for (const fuente of fuentes) {
    const result = _resolverRubroDesdeInput(fuente);
    if (result) return result;
  }

  return { tipo: 'GEN', tags: [] };
}

// ── Enriquecer rubro con metadata del vocabulario ─────────────
export function enriquecerRubro(rubro) {
  const tipoObj = tipos.find(t => t.codigo === rubro.tipo) || null;

  return {
    tipo:       rubro.tipo,
    nombre:     tipoObj?.nombre     || 'General',
    schema_org: tipoObj?.schema_org || null,
    tags:       rubro.tags          || [],
  };
}

// ── Desde formulario → Firestore ─────────────────────────────
// categories viene del categorySelector
export function rubroFromForm(categories = []) {
  const fuentes = categories.filter(Boolean);

  for (const fuente of fuentes) {
    const result = _resolverRubroDesdeInput(fuente);
    if (result) return result;
  }

  return { tipo: 'GEN', tags: [] };
}

// ============================================================
// CONTEXTO COMPLETO — para entity.json
// Combina ubicacion enriquecida + rubro enriquecido
// ============================================================
export function buildEntityContext(data) {
  const ubicacion = ubicacionToEntity(data);
  const rubro     = enriquecerRubro(resolverRubro(data));

  return {
    ...(ubicacion ? { ubicacion } : {}),
    rubro,
  };
}
