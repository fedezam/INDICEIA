// src/shared/geo.js
import arGeo from './ar-geo-enriched.json' assert { type: 'json' };

export function getLocalidades(provincia) {
  if (!provincia) return [];

  const entry = Object.values(arGeo).find(p => p.nombre === provincia);
  if (!entry) return [];

  const map = new Map();

  Object.values(entry.departamentos).forEach(dep => {
    dep.localidades.forEach(l => {
      map.set(l.id, l); // evita duplicados
    });
  });

  return Array.from(map.values()).sort((a, b) =>
    a.nombre.localeCompare(b.nombre, 'es')
  );
}
