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
 * Esto NO reemplaza el chequeo de seguridad real: sigue siendo
 * isAdmin() en las Firestore rules quien decide si el read/write se
 * permite. Este override solo decide QUÉ id pedirle a Firestore —
 * si el usuario no es admin de verdad, las rules igual van a
 * rechazar el acceso a una entidad ajena.
 *
 * 30/09/2026 — Override de embajador: mismo mecanismo que admin,
 * pero acotado a SU cartera (entidad.embajadorId === uid). A
 * diferencia de admin, acá el chequeo de scope se hace también en
 * el cliente (no solo confiando en las rules) para poder devolver
 * un error claro ("no está en tu cartera") en vez de un
 * permission-denied genérico si el embajador toca una URL ajena.
 *
 * `isAdminViewing` / `isEmbajadorViewing` se exponen en el contexto
 * para que las páginas muestren el banner correspondiente y nunca
 * sea ambiguo qué se está editando ni con qué permiso.
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
      const requestedId = new URLSearchParams(window.location.search).get('id');

      // ── Override de admin: sin restricción de scope en el cliente,
      // las rules (isAdmin()) son la única fuente de verdad. ──
      const isAdminViewing = userData.role === 'admin' && !!requestedId;

      let isEmbajadorViewing = false;
      let comercioId = isAdminViewing ? requestedId : (userData.comercioId || null);
      let comercioData = null;

      // ── Override de embajador: requiere validar en el cliente que
      // la entidad pedida es parte de su cartera (embajadorId === uid)
      // antes de tratarla como "resuelta" — evita depender solo del
      // rechazo de las rules para dar feedback claro. ──
      if (userData.role === 'embajador' && requestedId) {
        const targetSnap = await getDoc(doc(db, 'entidades', requestedId));
        if (targetSnap.exists() && targetSnap.data().embajadorId === user.uid) {
          isEmbajadorViewing = true;
          comercioId = requestedId;
          comercioData = { id: requestedId, ...targetSnap.data() };
        } else {
          onError?.(new Error('No autorizado: esta entidad no está en tu cartera'));
          return;
        }
      }

      if (comercioId && !comercioData) {
        const comercioSnap = await getDoc(doc(db, 'entidades', comercioId));
        if (comercioSnap.exists()) {
          comercioData = { id: comercioId, ...comercioSnap.data() };
        }
      }

      onReady({
        user,
        userData,
        comercioId,
        comercioData,
        isAdminViewing,
        isEmbajadorViewing
      });
    } catch (err) {
      onError?.(err);
    }
  });
}
