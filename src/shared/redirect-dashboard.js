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
        
        const comercioId = userDoc.data().comercioId;
        if (!comercioId) {
          window.location.href = "/src/pages/usuario.html";
          return resolve(false);
        }
        
        // --- Obtener comercio ---
        const comercioRef = doc(db, "entidades", comercioId);
        const comercioSnap = await getDoc(comercioRef);
        
        if (!comercioSnap.exists()) {
          window.location.href = "/src/pages/mi-comercio.html";
          return resolve(false);
        }
        
        const comercioData = comercioSnap.data();
        
        // --- Obtener productos ---
        const productosRef = collection(db, "entidades", comercioId, "productos");
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
            (comercioData.nombre || comercioData.nombreComercio) &&
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
