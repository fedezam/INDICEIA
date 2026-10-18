const admin = require('firebase-admin');
admin.initializeApp({ credential: admin.credential.cert(require('../serviceAccount.json')) });
const db = admin.firestore();
const APPLY = process.argv.includes('--apply');

(async () => {
  const users = await db.collection('usuarios').get();
  let n = 0;
  for (const u of users.docs) {
    const d = u.data();
    const entidadId = d.entidadActivaId ?? d.comercioId;
    if (!entidadId) continue;
    const ref = db.collection('entidades').doc(entidadId);
    const snap = await ref.get();
    if (!snap.exists) { console.log(`[aviso] ${d.mail} apunta a ${entidadId}, que no existe`); continue; }
    const e = snap.data();
    if (e.duenoId !== u.id) {
      n++;
      console.log(`${APPLY ? '[escribe]' : '[dry]'} ${e.nombre} (${entidadId}): duenoId ${e.duenoId} -> ${u.id} (${d.mail})`);
      if (APPLY) await ref.update({ duenoId: u.id });
    }
  }
  console.log(`\n${n} entidades ${APPLY ? 'corregidas' : 'a corregir (dry-run: no se escribió nada)'}`);
})();
