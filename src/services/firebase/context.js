// src/services/firebase/context.js

import { auth, db } from './firebase.js';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

/**
 * Resuelve el contexto base del usuario autenticado.
 * NO navega
 * NO decide flujo
 * NO toca UI
 */
export function resolveFirebaseContext(onReady, onError) {
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      onError?.(new Error('No authenticated user'));
      return;
    }

    try {
      await user.getIdToken();

      const userSnap = await getDoc(doc(db, 'usuarios', user.uid));
      if (!userSnap.exists()) {
        onError?.(new Error('Usuario no encontrado'));
        return;
      }

      const userData = userSnap.data();
      const comercioId = userData.comercioId || null;

      let comercioData = null;

      if (comercioId) {
        const comercioSnap = await getDoc(
          doc(db, 'entidades', comercioId)
        );

        if (comercioSnap.exists()) {
          comercioData = {
            id: comercioId,
            ...comercioSnap.data()
          };
        }
      }

      onReady({
        user,
        userData,
        comercioId,
        comercioData
      });
    } catch (err) {
      onError?.(err);
    }
  });
}
