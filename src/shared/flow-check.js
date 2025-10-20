// src/flow-check.js
import { auth, db } from "./firebase.js";
import { doc, getDoc, collection, getDocs } from "firebase/firestore";

/**
 * Verifica el estado del flujo de registro del usuario y redirige si es necesario.
 * @param {string} currentPage - Nombre de la página actual (por ejemplo: "usuario", "mi-comercio", etc.)
 */
export async function checkFlowStep(currentPage) {
  return new Promise((resolve, reject) => {
    const unsub = auth.onAuthStateChanged(async (user) => {
      unsub();
      if (!user) {
        window.location.href = "index.html"; // No autenticado
        return;
      }

      try {
        // 1️⃣ Obtener datos de usuario
        const userRef = doc(db, "usuarios", user.uid);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
          if (currentPage !== "usuario") window.location.href = "usuario.html";
          return resolve("usuario");
        }

        const userData = userSnap.data();
        const comercioId = userData.comercioId;

        // 2️⃣ Si no hay comercioId, debe completar mi-comercio
        if (!comercioId) {
          if (currentPage !== "mi-comercio") window.location.href = "mi-comercio.html";
          return resolve("mi-comercio");
        }

        // 3️⃣ Buscar datos del comercio
        const comercioRef = doc(db, "comercios", comercioId);
        const comercioSnap = await getDoc(comercioRef);

        if (!comercioSnap.exists()) {
          if (currentPage !== "mi-comercio") window.location.href = "mi-comercio.html";
          return resolve("mi-comercio");
        }

        const comercioData = comercioSnap.data();

        // Validaciones mínimas esperadas
        const faltaHorario = !comercioData.horarios || Object.keys(comercioData.horarios).length === 0;
        const faltaIA = !comercioData.iaConfig || Object.keys(comercioData.iaConfig).length === 0;

        // 4️⃣ Verificar productos
        const productosRef = collection(db, "comercios", comercioId, "productos");
        const productosSnap = await getDocs(productosRef);
        const tieneProductos = !productosSnap.empty;

        // 5️⃣ Determinar siguiente paso según datos faltantes
        if (!comercioData.nombre || !comercioData.direccion) {
          if (currentPage !== "mi-comercio") window.location.href = "mi-comercio.html";
          return resolve("mi-comercio");
        } else if (faltaHorario) {
          if (currentPage !== "horarios") window.location.href = "horarios.html";
          return resolve("horarios");
        } else if (!tieneProductos) {
          if (currentPage !== "productos") window.location.href = "productos.html";
          return resolve("productos");
        } else if (faltaIA) {
          if (currentPage !== "ia-config") window.location.href = "ia-config.html";
          return resolve("ia-config");
        }

        // 6️⃣ Si todo está completo
        if (currentPage !== "dashboard") window.location.href = "dashboard.html";
        return resolve("dashboard");
      } catch (err) {
        console.error("Error en checkFlowStep:", err);
        reject(err);
      }
    });
  });
}
