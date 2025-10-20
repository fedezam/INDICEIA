// src/redirect-dashboard.js
import { auth, db } from "./firebase.js";
import { doc, getDoc } from "firebase/firestore";

/**
 * Redirige a dashboard.html si el usuario ya completó todo el flujo.
 * @param {Function} callback - Función opcional que se ejecuta antes de redirigir
 */
export async function redirectToDashboardIfComplete(callback) {
  const user = auth.currentUser;
  if (!user) return; // No logueado

  try {
    const userRef = doc(db, "usuarios", user.uid);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) return;

    const userData = userSnap.data();
    const comercioId = userData.comercioId;
    if (!comercioId) return;

    const comercioRef = doc(db, "comercios", comercioId);
    const comercioSnap = await getDoc(comercioRef);
    if (!comercioSnap.exists()) return;

    const comercioData = comercioSnap.data();
    const flujoCompleto =
      comercioData.nombre &&
      comercioData.direccion &&
      comercioData.horarios &&
      comercioData.iaConfig;

    if (flujoCompleto) {
      if (typeof callback === "function") await callback();
      window.location.href = "dashboard.html";
    }
  } catch (err) {
    console.error("Error en redirectToDashboardIfComplete:", err);
  }
}
