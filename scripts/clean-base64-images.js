// scripts/clean-base64-images.js
// ⟦ROLE⟧ Limpia imágenes base64 y URLs inválidas de productos en Firestore.
// Reemplaza con null — el template ya maneja productos sin imagen.
// Ejecutar UNA sola vez desde el codespace.
//
// Uso:
//   node scripts/clean-base64-images.js
//

import admin from 'firebase-admin';
import { readFileSync } from 'fs';

// ── INIT ──────────────────────────────────────────────────────
const serviceAccount = JSON.parse(
  readFileSync('./service-account.json', 'utf8')
);

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

// ── VALIDADOR — misma lógica que visual.builder ───────────────
function isValidImageUrl(url) {
  if (!url || typeof url !== 'string') return false;
  if (url.startsWith('data:'))                  return false; // base64
  if (url.includes('google.com/imgres'))        return false; // búsqueda Google
  if (url.includes('unsplash.com/es/fotos'))    return false; // página Unsplash
  if (url.trim() === '')                         return false;
  return true;
}

// ── MAIN ──────────────────────────────────────────────────────
async function main() {
  console.log('🔍 Escaneando todas las entidades...\n');

  const entidadesSnap = await db.collection('entidades').get();
  console.log(`📦 ${entidadesSnap.size} entidades encontradas\n`);

  let totalProductos  = 0;
  let totalLimpiados  = 0;
  let totalEntidades  = 0;

  for (const entidadDoc of entidadesSnap.docs) {
    const comercioId    = entidadDoc.id;
    const nombreComercio = entidadDoc.data().nombreComercio || comercioId;

    const productosSnap = await db
      .collection('entidades')
      .doc(comercioId)
      .collection('productos')
      .get();

    if (productosSnap.empty) continue;

    const batch    = db.batch();
    let   changed  = 0;

    productosSnap.docs.forEach(doc => {
      const data   = doc.data();
      const imagen = data.imagen;

      totalProductos++;

      if (!isValidImageUrl(imagen)) {
        const tipo = !imagen
          ? 'sin imagen'
          : imagen.startsWith('data:')
            ? `base64 (${Math.round(imagen.length / 1024)}KB)`
            : 'URL inválida';

        console.log(`  ⚠️  ${nombreComercio} → "${data.nombre}" — ${tipo}`);

        batch.update(doc.ref, {
          imagen:            null,
          fechaActualizacion: admin.firestore.FieldValue.serverTimestamp(),
        });

        changed++;
        totalLimpiados++;
      }
    });

    if (changed > 0) {
      await batch.commit();
      console.log(`  ✅ ${nombreComercio} — ${changed} productos limpiados\n`);
      totalEntidades++;
    }
  }

  console.log('─────────────────────────────────────');
  console.log(`✅ Limpieza completada`);
  console.log(`   Entidades procesadas: ${entidadesSnap.size}`);
  console.log(`   Entidades modificadas: ${totalEntidades}`);
  console.log(`   Productos escaneados: ${totalProductos}`);
  console.log(`   Productos limpiados: ${totalLimpiados}`);
  console.log('─────────────────────────────────────');
}

main().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});