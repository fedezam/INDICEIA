// src/shared/geo-helpers.js

import vecinos from './vecinos.json'        with { type: 'json' };
import arGeo   from './ar-geo-enriched.json' with { type: 'json' };

function toPath(str) {
  return str
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

// mapas internos
const idToCiudad = {};
const idToProvincia = {};
const idToObj = {};

for (const prov of Object.values(arGeo)) {
  for (const dep of Object.values(prov.departamentos)) {
    for (const loc of dep.localidades) {
      idToCiudad[loc.id]    = toPath(loc.nombre);
      idToProvincia[loc.id] = toPath(prov.nombre);
      idToObj[loc.id]       = { ...loc, provincia: prov.nombre };
    }
  }
}

// ── PARA ÍNDICES / URLS ───────────────────────────────────────
// Devuelve paths slug: { ciudad: 'los-molinos', provincia: 'santa-fe' }

export function getCiudadesCercanas(localidadId) {
  const cercanas = vecinos[localidadId] || [];

  return [
    {
      ciudad:    idToCiudad[localidadId],
      provincia: idToProvincia[localidadId]
    },
    ...cercanas
      .slice(0, 3)
      .map(v => ({
        ciudad:    idToCiudad[v.id],
        provincia: idToProvincia[v.id]
      }))
      .filter(v => v.ciudad && v.provincia)
  ];
}

// ── PARA EL LLM ───────────────────────────────────────────────
// Devuelve nombres legibles + distancia para que el LLM entienda
// qué localidades están cerca y a cuántos km

export function getGeoContext(localidadId) {
  const cercanas = vecinos[localidadId] || [];

  return {
    localidad: idToObj[localidadId] || null,
    cercanas: cercanas
      .slice(0, 5)
      .map(v => ({
        id:        v.id,
        nombre:    v.nombre,
        provincia: idToObj[v.id]?.provincia,
        dist_km:   Math.round(v.dist)
      }))
      .filter(v => v.provincia)
  };
}