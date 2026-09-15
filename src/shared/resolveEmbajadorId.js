// src/shared/resolveEmbajadorId.js
// ⟦ROLE⟧ Resuelve qué embajador debe supervisar una entidad NUEVA,
// en el momento de su creación (mi-comercio.js / mi-perfil.js /
// mi-perfil-profesional.js — los tres puntos donde se crea el
// primer doc de una entidad).
//
// REGLA (definida 09/09/2026): embajadorId se hereda a lo largo de
// la cadena de referidos, no solo se asigna a quien refirió directo:
//
//   1. Si quien refirió (referredBy → su referralCode) tiene
//      role === 'embajador' → esa entidad queda a cargo de ese
//      embajador.
//   2. Si no es embajador, pero SU PROPIA entidad ya tiene un
//      embajadorId asignado (o sea, esa persona fue captada por un
//      embajador en algún punto anterior de la cadena) → se hereda
//      el mismo embajadorId.
//   3. Si ninguna de las dos → null (soporte a cargo de super admin).
//
// Esto permite que un embajador conserve la "red" que crece a partir
// de sus referidos directos, no solo la captación inicial — un
// comercio que el embajador trajo, y que a su vez trae a otro
// comercio, hace que ese segundo también quede bajo el mismo
// embajador.
//
// Costo: hasta 2 reads adicionales de Firestore, UNA sola vez, en el
// momento de creación de la entidad — no en cada request.
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { db } from '/src/services/firebase/firebase.js';

export async function resolveEmbajadorId(referredByCode) {
  if (!referredByCode) return null;

  try {
    const q = query(
      collection(db, 'usuarios'),
      where('referralCode', '==', referredByCode)
    );
    const snap = await getDocs(q);
    if (snap.empty) return null;

    const referrerDoc = snap.docs[0];
    const referrer     = referrerDoc.data();
    const referrerUid  = referrerDoc.id;

    // Caso 1: el referente ES embajador → asignación directa.
    if (referrer.role === 'embajador') {
      return referrerUid;
    }

    // Caso 2: el referente no es embajador, pero su propia entidad
    // ya tiene un embajador asignado → se hereda.
    if (referrer.comercioId) {
      const entSnap = await getDoc(doc(db, 'entidades', referrer.comercioId));
      if (entSnap.exists()) {
        return entSnap.data().embajadorId || null;
      }
    }

    // Caso 3: ninguna de las dos → sin embajador, soporte de super admin.
    return null;
  } catch (err) {
    console.error('[resolveEmbajadorId] Error resolviendo embajador:', err);
    // Ante error, no bloquea la creación de la entidad — simplemente
    // queda sin embajador asignado (recuperable a mano después).
    return null;
  }
}
