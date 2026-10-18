/**
 * Redirección automática según progreso del comercio
 * Limpio + actualizado para flujo Firebase-only
 */
import { auth, db } from "../firebase.js";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, collection, getDocs } from "firebase/firestore";

export async function redirectToNextStep() {
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
        
        const entidadId = userDoc.data().entidadActivaId ?? userDoc.data().comercioId;
        if (!entidadId) {
          window.location.href = "/src/pages/usuario.html";
          return resolve(false);
        }
        
        // --- Obtener comercio ---
        const comercioRef = doc(db, "entidades", entidadId);
        const comercioSnap = await getDoc(comercioRef);
        
        if (!comercioSnap.exists()) {
          window.location.href = "/src/pages/mi-comercio.html";
          return resolve(false);
        }
        
        const entidadData = comercioSnap.data();
        
        // --- Obtener productos ---
        const productosRef = collection(db, "entidades", entidadId, "productos");
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
            (entidadData.nombre || entidadData.nombreComercio) &&
            entidadData.rubro &&
            entidadData.descripcion &&
            entidadData.direccion
          ),
          horarios: !!(
            entidadData.horarios &&
            Object.values(entidadData.horarios).every((h) => h && h.apertura && h.cierre)
          ),
          productos: productos.length > 0,
          ia: !!(
            entidadData.aiConfig &&
            entidadData.aiConfig.aiName &&
            entidadData.aiConfig.aiPersonality &&
            entidadData.aiConfig.aiTone &&
            entidadData.aiConfig.aiLanguage &&
            entidadData.aiConfig.aiGreeting &&
            entidadData.aiConfig.sinPrecio &&
            entidadData.aiConfig.sinStock &&
            entidadData.aiConfig.localCerrado &&
            entidadData.aiConfig.proactividad &&
            entidadData.aiConfig.formatoRespuestas
          ),
        };
        
        // --- Redirecciones ---
        if (!estado.usuario) {
          window.location.href = "/src/pages/usuario.html";
          return resolve(false);
        }
        if (!estado.comercio) {
          window.location.href = "/src/pages/mi-comercio.html";
          return resolve(false);
        }
        if (!estado.horarios) {
          window.location.href = "/src/pages/horarios.html";
          return resolve(false);
        }
        if (!estado.productos) {
          window.location.href = "/src/pages/productos.html";
          return resolve(false);
        }
        if (!estado.ia) {
          window.location.href = "/src/pages/ia-config.html";
          return resolve(false);
        }
        
        // Todo completo → dashboard
        window.location.href = "/src/pages/dashboard.html";
        resolve(true);
        
      } catch (e) {
        console.error("Redirect error:", e);
        resolve(false);
      }
    });
  });
}

// Alias por compatibilidad
export const checkRedirect = redirectToNextStep;

export default redirectToNextStep;
