// ============================================================
// src/shared/entity-context.js
// ⟦ROLE⟧ Contexto unificado: ubicación + rubro
// NO LER | NO PROMPTS | NO SIDE EFFECTS
//
// v2 — Ya NO carga business-vocabulary.json ni reimplementa matching propio.
// Toda resolución de rubro (tipo + subcategoria + schema_org) delega a
// rubro-resolver.js — única fuente de verdad. Esto reemplaza la 5ta copia
// del vocabulario que existía acá (incompatible además con el árbol de
// 2 niveles: schema_org vive en subcategoria, no en tipo).
// ============================================================

import { getGeoContext }  from './geo-helpers.js';
import arGeoRaw from './ar-geo-enriched.json' with { type: 'json' };
import {
  resolveRubro,
  getTipo,
  getSubcategoria
} from '../../lib/entity-factory/rubro-resolver.js';

const clean = (str) => typeof str === 'string' ? str.trim() : str;

export const arGeo = Object.fromEntries(
  Object.entries(arGeoRaw).map(([k, v]) => [clean(k), v])
);

// ============================================================
// HELPERS INTERNOS (ubicación — sin cambios, no es parte del bug de rubro)
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

// ============================================================
// RUBRO — delega 100% a rubro-resolver.js
// ============================================================

// Envuelve resolveRubro() y devuelve siempre la forma completa
// { tipo, subcategoria, nombre, schema_org, tags }, con tags conservados
// del dato crudo (tags no vive en el árbol, es libre — lo preserva tal cual
// venía de Firestore/onboarding).
function _rubroCompleto(data) {
  const resuelto = resolveRubro({ rubro: data.rubro }, data);
  const tagsCrudos = data.rubro?.tags || [];

  // ⚠️ FIX: antes, si ni resuelto.nombre ni getTipo(tipo)?.nombre existían,
  // se devolvía resuelto.tipo crudo (ej. "GEN", "CON") como si fuera un
  // nombre legible. Eso terminaba filtrándose a <title>, meta description,
  // y JSON-LD en seo.builder.js — literalmente mostrando "GEN en Casilda"
  // como nombre de rubro público. Ahora, si no hay nombre humano real,
  // devolvemos null: los consumidores (toSeoContext, buildHtml) ya tienen
  // fallback correcto para rubro ausente (usan solo nombre + ciudad).
  const nombreHumano = resuelto.nombre || getTipo(resuelto.tipo)?.nombre || null;

  return {
    tipo:          resuelto.tipo,
    subcategoria:  resuelto.subcategoria,
    nombre:        nombreHumano,
    schema_org:    resuelto.schema_org,
    tags:          tagsCrudos,
    domain_confidence: resuelto.domain_confidence,
    requiere_completar_subcategoria: !!resuelto.requiere_completar_subcategoria,
    requiere_revision: !!resuelto.requiere_revision,
  };
}

// ============================================================
// EXPORTS ESPECIALIZADOS
// ============================================================

// ── Para entity.json (LLM que responde al usuario) ───────────
export function toEntityContext(data) {
  const ubi = _resolverUbicacion(data);
  const rub = _rubroCompleto(data);

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
export function toSeoContext(data) {
  const ubi = _resolverUbicacion(data);
  const rub = _rubroCompleto(data);

  return {
    pais:        ubi?.pais || 'Argentina',
    localidad:   ubi?.localidad?.nombre || '',
    provincia:   ubi?.provincia         || '',
    rubroNombre: rub.nombre             || '',
    // ⚠️ FIX unificación: antes seo.builder.js leía context.rubro.schema_org
    // directo del documento de Firestore — un valor snapshoteado al crear
    // la entidad, que puede quedar desactualizado si después se completa
    // o cambia la subcategoría (mismo bug que tenía domain_tag con el mind).
    // Ahora se resuelve en vivo, siempre desde la misma fuente única
    // (rubro-resolver.js), igual que domain-resolver.js.
    schemaOrg:   rub.schema_org         || 'LocalBusiness',
    paths: {
      ciudadPath:    ubi ? toPath(ubi.localidad.nombre) : '',
      provinciaPath: ubi ? toPath(ubi.provincia)        : '',
    }
  };
}

// ── Para index.builder (LLM crawler) ─────────────────────────
// FIX: ahora incluye subcategoria — antes se perdía acá, que era el punto
// de fuga real por el que card.compiler.js nunca la recibía.
export function toIndexContext(data) {
  const ubi = _resolverUbicacion(data);
  const rub = _rubroCompleto(data);

  const paths = ubi ? {
    ciudadPath:    toPath(ubi.localidad.nombre),
    provinciaPath: toPath(ubi.provincia),
    localidadId:   ubi.localidad.id || null,
  } : { ciudadPath: '', provinciaPath: '', localidadId: null };

  const geo     = paths.localidadId ? getGeoContext(paths.localidadId) : null;
  const vecinas = geo?.cercanas || [];

  return {
    pais:  ubi?.pais || 'Argentina',
    paths,
    rubro: {
      tipo:         rub.tipo,
      subcategoria: rub.subcategoria,  // ← el campo que faltaba
      tags:         rub.tags,
    },
    vecinas,
  };
}

// ── Validación ────────────────────────────────────────────────
export function validarUbicacion(data) {
  const ubi = _resolverUbicacion(data);
  return !!(ubi?.localidad?.id && ubi.provincia);
}

export function validarRubro(data) {
  const rub = _rubroCompleto(data);
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

// NOTA: rubroFromForm() se elimina como camino recomendado — mi-comercio.js
// ahora usa refs.rubroSelector.getValue() directo. Se mantiene acá como wrapper
// de compat porque mi-perfil.js (y potencialmente otros callers no auditados
// todavía) siguen importándola. Delega a resolveRubro() en vez de reimplementar
// matching — ya no hay una 5ta copia del vocabulario acá.
// TODO: migrar mi-perfil.js a rubro-selector cuando se audite esa página.
export function rubroFromForm(categories = []) {
  if (!Array.isArray(categories) || !categories.length) {
    return { tipo: 'GEN', tags: [] };
  }
  for (const cat of categories) {
    const resuelto = resolveRubro({ categorias: [cat] }, {});
    if (resuelto.tipo !== 'GEN') {
      return {
        tipo: resuelto.tipo,
        subcategoria: resuelto.subcategoria || null,
        tags: [cat]
      };
    }
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
