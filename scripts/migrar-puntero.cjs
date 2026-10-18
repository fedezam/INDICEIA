const admin = require('firebase-admin');
admin.initializeApp({ credential: admin.credential.cert(require('../serviceAccount.json')) });
const db = admin.firestore();
const APPLY = process.argv.includes('--apply');

(async () => {
  const snap = await db.collection('usuarios').get();
  let n = 0;
  for (const d of snap.docs) {
    const u = d.data();
    if (u.comercioId && u.entidadActivaId === undefined) {
      n++;
      console.log(`${APPLY ? '[escribe]' : '[dry]'} ${u.mail}: entidadActivaId = ${u.comercioId}`);
      if (APPLY) await d.ref.update({ entidadActivaId: u.comercioId });
    }
  }
  console.log(`\n${n} usuarios ${APPLY ? 'actualizados' : 'a actualizar (dry-run: no se escribió nada)'}`);
})();
