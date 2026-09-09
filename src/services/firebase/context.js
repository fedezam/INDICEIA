// src/services/firebase/context.js

import { auth, db } from './firebase.js';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

/**
 * Resuelve el contexto base del usuario autenticado.
 * NO navega
 * NO decide flujo
 * NO toca UI
 *
 * 09/09/2026 — Override de admin: si el usuario logueado tiene
 * role:'admin' Y la URL trae ?id={comercioId}, el contexto resuelve
 * ESA entidad en vez de la propia del usuario (userData.comercioId).
 * Esto es lo que le permite a super-admin-entity.js dejar de
 * reimplementar su propia UI de edición y en cambio redirigir a las
 * páginas reales (mi-comercio.html?id=X, horarios.html?id=X, etc.) —
 * una sola implementación de "editar una entidad", con permiso extra
 * para admin de apuntarla a una entidad que no es la suya.
 *
 * Esto NO reemplaza el chequeo de seguridad real: sigue siendo
 * isAdmin() en las Firestore rules quien decide si el read/write se
 * permite. Este override solo decide QUÉ id pedirle a Firestore —
 * si el usuario no es admin de verdad, las rules igual van a
 * rechazar el acceso a una entidad ajena.
 *
 * `isAdminViewing` se expone en el contexto para que las páginas
 * puedan mostrar un banner tipo "Estás viendo como admin: {entidad}"
 * y así nunca sea ambiguo para el propio admin qué está editando.
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

      // ── Override de admin: ?id= en la URL, solo tiene efecto si el
      // usuario logueado es admin. Para cualquier otro usuario, se
      // ignora en silencio y se usa su propio comercioId — mismo
      // criterio de "no revelar mecanismo a quien no corresponde" que
      // ya aplicamos en wa-redirect/[id].js con waDestino. ──
      const requestedId = new URLSearchParams(window.location.search).get('id');
      const isAdminViewing = userData.role === 'admin' && !!requestedId;

      const comercioId = isAdminViewing ? requestedId : (userData.comercioId || null);

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
        comercioData,
        isAdminViewing
      });
    } catch (err) {
      onError?.(err);
    }
  });
}
