// src/controllers/flowController.js
import { auth, db } from "../firebase.js";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";

/**
 * Maneja el flujo principal de acceso:
 * - Usuario nuevo → usuario.html
 * - Usuario a medias → lo envía a la primera incompleta
 * - Usuario completo → dashboard.html
 */
export async function handleEntryFlow() {
  return new Promise(resolve => {
    auth.onAuthStateChanged(async user => {
      if (!user) {
        // LOGIN ESTÁ EN LA RAÍZ
        window.location.href = "/index.html";
        return resolve();
      }

      // Referencia en Firestore
      const ref = doc(db, "users", user.uid);
      let snap = await getDoc(ref);

      // Si el usuario NO existe → crear estructura inicial
      if (!snap.exists()) {
        await setDoc(ref, {
          completed: {
            usuario: false,
            comercio: false,
            horarios: false,
            productos: false,
            ia: false
          }
        });

        window.location.href = "/src/pages/usuario.html";
        return resolve();
      }

      const completed = snap.data().completed || {};

      /* -------------------------
         ORDEN LÓGICO DEL FLUJO
      -------------------------- */

      if (
        completed.usuario &&
        completed.comercio &&
        completed.horarios &&
        completed.productos &&
        completed.ia
      ) {
        window.location.href = "/src/pages/dashboard.html";
        return resolve();
      }

      if (!completed.usuario) {
        window.location.href = "/src/pages/usuario.html";
        return resolve();
      }

      if (!completed.comercio) {
        window.location.href = "/src/pages/mi-comercio.html";
        return resolve();
      }

      if (!completed.horarios) {
        window.location.href = "/src/pages/horarios.html";
        return resolve();
      }

      if (!completed.productos) {
        window.location.href = "/src/pages/productos.html";
        return resolve();
      }

      if (!completed.ia) {
        window.location.href = "/src/pages/ia-config.html";
        return resolve();
      }

      resolve();
    });
  });
}

/**
 * Marca una sección como completada en Firestore
 * Uso: markSectionCompleted("productos")
 */
export async function markSectionCompleted(section) {
  const user = auth.currentUser;
  if (!user) return;

  const ref = doc(db, "users", user.uid);
  await updateDoc(ref, {
    [`completed.${section}`]: true
  });
}

