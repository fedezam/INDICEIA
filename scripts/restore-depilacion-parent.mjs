// scripts/restore-depilacion-parent.mjs
// Recrea el servicio padre "Depilacion Definitiva" a partir de sus
// hijos huérfanos (docs con parent_id que apunta a un doc inexistente).
//
// Uso:
//   node scripts/restore-depilacion-parent.mjs ./service-account.json            (simulacro)
//   node scripts/restore-depilacion-parent.mjs ./service-account.json --apply    (escribe)
//   agregar --parent-id=XXXX si hay más de un grupo de huérfanos
import fs from 'fs';
import admin from 'firebase-admin';

const ENTIDAD_ID = 'xedhJqrX9wtOK4CbalhD';
const APPLY      = process.argv.includes('--apply');
const forcedId   = process.argv.find(a => a.startsWith('--parent-id='))?.split('=')[1];
const keyPath    = process.argv.find(a => a.endsWith('.json'));

if (!keyPath) {
  console.error('Falta el path al JSON de la service account.');
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(JSON.parse(fs.readFileSync(keyPath, 'utf8'))),
});
const db = admin.firestore();

const PADRE = {
  nombre: 'Depilacion Definitiva',
  descripcion:
    'Tratamiento estético con láser para reducir progresivamente el crecimiento del vello. ' +
    'Requiere múltiples sesiones y el valor varía según la zona a tratar, el tamaño del área ' +
    'y el tiempo de trabajo requerido.',
  disponibilidad: 'a_coordinar',
  semantic_notes: [
    'depilacion',
    'Evitar exposicion solar durante 72hs',
    'no puede aplicarse sobre tatuajes',
    'requerido: la zona a tratar debe estar rasurada para poder iniciar la sesión',
    'no tiene efecto en vello muy claro o canas',
    'se realiza en jornadas puntuales, el prestador informa la próxima fecha disponible',
  ],
  activo: true,
};

const col  = db.collection('entidades').doc(ENTIDAD_ID).collection('servicios');
const snap = await col.get();
const ids  = new Set(snap.docs.map(d => d.id));

// Huérfanos agrupados por parent_id inexistente
const orphans = new Map();
for (const d of snap.docs) {
  const p = d.data().parent_id;
  if (p && !ids.has(p)) {
    if (!orphans.has(p)) orphans.set(p, []);
    orphans.get(p).push(d.data().nombre);
  }
}

if (!orphans.size) {
  console.log('No hay huérfanos. Revisá si el padre existe con activo:false.');
  process.exit(0);
}

console.log('Grupos de huérfanos:');
for (const [pid, nombres] of orphans) {
  console.log(`  ${pid} → ${nombres.length} hijos: ${nombres.slice(0, 6).join(', ')}...`);
}

// Campos que usa un padre agrupador existente (para comparar con PADRE)
const parentIds = new Set(snap.docs.map(d => d.data().parent_id).filter(Boolean));
const muestra = snap.docs.find(d => parentIds.has(d.id));
if (muestra) console.log('\nCampos de un agrupador existente:', Object.keys(muestra.data()).join(', '));

const parentId = forcedId || (orphans.size === 1 ? [...orphans.keys()][0] : null);
if (!parentId || !orphans.has(parentId)) {
  console.error('\nHay más de un grupo (o el id no coincide). Repetí con --parent-id=<id>.');
  process.exit(1);
}

const nombres = orphans.get(parentId);
if (!nombres.includes('Axila') || !nombres.includes('Pierna Entera')) {
  console.error('\nEse grupo no parece ser depilación (faltan Axila / Pierna Entera). Corto por seguridad.');
  process.exit(1);
}

console.log(`\nPadre a crear con id ${parentId}:`);
console.log(JSON.stringify(PADRE, null, 2));

if (!APPLY) {
  console.log('\nSimulacro: no se escribió nada. Repetí con --apply.');
  process.exit(0);
}

await col.doc(parentId).create(PADRE); // falla si ya existe: nunca pisa
console.log(`\nListo: creado ${parentId}.`);
