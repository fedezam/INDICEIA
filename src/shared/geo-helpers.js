// src/shared/geo-helpers.js

import vecinos from './vecinos.json';
import arGeo from './ar-geo-enriched.json';

function toPath(str) {
  return str
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

// mapa id → ciudad/provincia
const idToCiudad = {};
const idToProvincia = {};

for (const prov of Object.values(arGeo)) {
  for (const dep of Object.values(prov.departamentos)) {
    for (const loc of dep.localidades) {
      idToCiudad[loc.id] = toPath(loc.nombre);
      idToProvincia[loc.id] = toPath(prov.nombre);
    }
  }
}

export function getCiudadesCercanas(localidadId) {
  const cercanas = vecinos[localidadId] || [];

  return [
    {
      ciudad: idToCiudad[localidadId],
      provincia: idToProvincia[localidadId]
    },
    ...cercanas
      .slice(0, 3)
      .map(v => ({
        ciudad: idToCiudad[v.id],
        provincia: idToProvincia[v.id]
      }))
      // ✅ FIX: descarta vecinos cuyo id no existe en arGeo
      .filter(v => v.ciudad && v.provincia)
  ];
}
