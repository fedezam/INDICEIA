// src/services/firebase/admin-context.js
// Runtime exclusivo del super admin.
// No toca resolveFirebaseContext ni lógica de comercio.

import { auth, db } from './firebase.js';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

export function resolveAdminContext(onReady, onError) {
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      onError?.(new Error('No autenticado'));
      return;
    }

    try {
      const userSnap = await getDoc(doc(db, 'usuarios', user.uid));
      if (!userSnap.exists()) {
        onError?.(new Error('Usuario no encontrado'));
        return;
      }

      const userData = userSnap.data();

      // gate: solo pasa si tiene role == 'admin'
      if (userData.role !== 'admin') {
        onError?.(new Error('Acceso denegado'));
        return;
      }

      onReady({ user, userData });

    } catch (err) {
      onError?.(err);
    }
  });
}