/**
 * Redirección automática según progreso del comercio
 * Limpio + actualizado para flujo Firebase-only
 */

import { auth, db } from "../firebase.js";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, collection, getDocs } from "firebase/firestore";

async function checkRedirect() {
  return new Promise((resolve) => {
    onAuthStateChanged(auth, async (user) => {
      if (!user) {
        window.location.href = "/src/pages/login.html";
        return resolve(false);
      }

      try {
        // --- Obtener usuario ---
        const userRef = doc(db, "usuarios", user.uid);
        const userDoc = await getDoc(userRef);
        if (!userDoc.exists()) {
          window.location.href = "/src/pages/usuario.html";
          return resolve(false);
        }

        const comercioId = userDoc.data().comercioId;
        if (!comercioId) {
          window.location.href = "/src/pages/usuario.html";
          return resolve(false);
        }

        // --- Obtener comercio ---
        const comercioRef = doc(db, "comercios", comercioId);
        const comercioSnap = await getDoc(comercioRef);

        if (!comercioSnap.exists()) {
          window.location.href = "/src/pages/mi-comercio.html";
          return resolve(false);
        }

        const comercioData = comercioSnap.data();

        // --- Obtener productos ---
        const productosRef = collection(db, "comercios", comercioId, "productos");
        const productosSnap = await getDocs(productosRef);
        const productos = productosSnap.docs.map((d) => d.data());

        // --- Validaciones ---
        const estado = {
          usuario: !!(
            userDoc.data().nombre &&
            userDoc.data().email &&
            userDoc.data().telefono &&
            userDoc.data().provincia &&
            userDoc.data().ciudad &&
            userDoc.data().direccion
          ),

          comercio: !!(
            comercioData.nombreComercio &&
            comercioData.rubro &&
            comercioData.descripcion &&
            comercioData.direccion
          ),

          horarios: !!(
            comercioData.horarios &&
            Object.values(comercioData.horarios).every((h) => h && h.apertura && h.cierre)
          ),

          productos: productos.length > 0,

          ia: !!(
            comercioData.aiConfig &&
            comercioData.aiConfig.aiName &&
            comercioData.aiConfig.aiPersonality &&
            comercioData.aiConfig.aiTone &&
            comercioData.aiConfig.aiLanguage &&
            comercioData.aiConfig.aiGreeting &&
            comercioData.aiConfig.sinPrecio &&
            comercioData.aiConfig.sinStock &&
            comercioData.aiConfig.localCerrado &&
            comercioData.aiConfig.proactividad &&
            comercioData.aiConfig.formatoRespuestas
          ),
        };

        // --- Redirecciones ---
        if (!estado.usuario) return redirect("/src/pages/usuario.html", resolve);
        if (!estado.comercio) return redirect("/src/pages/mi-comercio.html", resolve);
        if (!estado.horarios) return redirect("/src/pages/horarios.html", resolve);
        if (!estado.productos) return redirect("/src/pages/productos.html", resolve);
        if (!estado.ia) return redirect("/src/pages/ia-config.html", resolve);

        // Todo completo → dashboard
        resolve(true);
      } catch (e) {
        console.error("Redirect error:", e);
        resolve(false);
      }
    });
  });
}

function redirect(url, resolve) {
  window.location.href = url;
  return resolve(false);
}

export default checkRedirect;
