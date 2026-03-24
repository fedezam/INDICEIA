// scripts/fetch-georef.js
// Correr UNA vez en codespace: node scripts/fetch-georef.js
// Genera: src/shared/ar-geo.json

import fs from 'fs';
import path from 'path';

const BASE = 'https://apis.datos.gob.ar/georef/api';
const OUT  = path.resolve('src/shared/ar-geo.json');
const MAX  = 1000;

async function fetchAll(endpoint) {
  console.log(`📡 Descargando ${endpoint}...`);
  let offset  = 0;
  let results = [];

  while (true) {
    const url = `${BASE}/${endpoint}?max=${MAX}&inicio=${offset}`;
    const res  = await fetch(url);
    const data = await res.json();
    const key  = Object.keys(data).find(k => Array.isArray(data[k]));
    const page = data[key];

    results = results.concat(page);
    console.log(`   página offset=${offset} → ${page.length} registros (total: ${results.length})`);

    if (page.length < MAX) break;
    offset += MAX;
  }

  console.log(`   ✅ Total ${endpoint}: ${results.length}`);
  return results;
}

async function main() {
  const provincias    = await fetchAll('provincias');
  const departamentos = await fetchAll('departamentos');
  const localidades   = await fetchAll('localidades');

  const geo = {};

  for (const p of provincias) {
    geo[p.id] = {
      nombre:        p.nombre,
      departamentos: {}
    };
  }

  for (const d of departamentos) {
    const provId = d.provincia?.id;
    if (!geo[provId]) continue;
    geo[provId].departamentos[d.id] = {
      nombre:      d.nombre,
      localidades: []
    };
  }

  for (const l of localidades) {
    const provId = l.provincia?.id;
    const deptId = l.departamento?.id;
    if (!geo[provId]?.departamentos[deptId]) continue;
    geo[provId].departamentos[deptId].localidades.push(l.nombre);
  }

  for (const prov of Object.values(geo)) {
    for (const dept of Object.values(prov.departamentos)) {
      dept.localidades.sort((a, b) => a.localeCompare(b, 'es'));
    }
  }

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(geo, null, 2), 'utf-8');

  console.log('\n🗺️  ar-geo.json generado:');
  console.log(`   Provincias:    ${provincias.length}`);
  console.log(`   Departamentos: ${departamentos.length}`);
  console.log(`   Localidades:   ${localidades.length}`);
  console.log(`   Guardado en:   ${OUT}`);
}

main().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});