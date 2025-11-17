// src/controllers/flowController.js
import { auth, db } from "../firebase.js";
import { doc, getDoc } from "firebase/firestore";

/**
 * FLOW CONTROLLER – Solo lectura
 *
 * Flow solo decide dónde debe estar el usuario.
 * No escribe, no crea documentos, no marca secciones.
 */

export async function handleEntryFlow() {
  return new Promise(resolve => {
    auth.onAuthStateChanged(async user => {
      if (!user) {
        window.location.href = "/index.html";
        return resolve();
      }

      const ref = doc(db, "users", user.uid);
      const snap = await getDoc(ref);

      // Si NO existe documento → usuario nuevo → arrancar por usuario.html
      if (!snap.exists()) {
        window.location.href = "/src/pages/usuario.html";
        return resolve();
      }

      const data = snap.data();

      const completed = {
        usuario: data.usuario_completed || false,
        comercio: data.comercio_completed || false,
        horarios: data.horarios_completed || false,
        productos: data.productos_completed || false,
        ia: data.ia_completed || false
      };

      // Mostrar dashboard si ya completó TODO
      const allCompleted =
        completed.usuario &&
        completed.comercio &&
        completed.horarios &&
        completed.productos &&
        completed.ia;

      if (allCompleted) {
        window.location.href = "/src/pages/dashboard.html";
        return resolve();
      }

      // Flujo de onboarding → enviar a la primera incompleta
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
