// src/shared/redirect-dashboard.js
import { db, auth } from "../firebase.js";
import { doc, getDoc, collection, getDocs } from "firebase/firestore";

console.log("redirect-dashboard.js cargado ✅");

/**
 * Sistema de redirección inteligente del flujo de onboarding
 * Controla: usuario → mi-comercio → horarios → productos → mi-ia → dashboard
 */
export async function redirectToNextStep() {
  const user = auth.currentUser;
  if (!user) return;

  try {
    // 1) Obtener datos del usuario
    const userRef = doc(db, "usuarios", user.uid);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) return;
    const userData = userSnap.data();

    // 2) Obtener datos del comercio si existe
    const comercioId = userData.comercioId;
    let comercioData = {};
    
    if (comercioId) {
      const comercioRef = doc(db, "comercios", comercioId);
      const comercioSnap = await getDoc(comercioRef);
      if (comercioSnap.exists()) {
        comercioData = comercioSnap.data();
      }
    }

    // 3) Validar completitud de cada paso
    const checks = {
      // Usuario: datos personales básicos
      usuario: !!(
        userData.nombre && 
        userData.apellido && 
        userData.mail &&
        userData.telefono &&
        userData.direccion
      ),
      
      // Comercio: información básica del negocio
      comercio: !!(
        comercioId &&
        comercioData.nombreComercio &&
        comercioData.plan &&
        comercioData.direccion &&
        comercioData.telefono &&
        (comercioData.categories && comercioData.categories.length > 0) &&
        (comercioData.paymentMethods && comercioData.paymentMethods.length > 0)
      ),
      
      // Horarios: al menos un día configurado
      horarios: !!(
        comercioData.horarios && 
        Object.keys(comercioData.horarios).length > 0 &&
        Object.values(comercioData.horarios).some(day => !day.closed)
      ),
      
      // Productos: al menos un producto cargado
      productos: false,
      
      // IA: configuración completada
      ia: !!(
        comercioData.aiConfig && 
        comercioData.aiGenerated === true
      )
    };

    // Verificar productos (subcolección)
    if (comercioId) {
      const productosRef = collection(db, "comercios", comercioId, "productos");
      const productosSnap = await getDocs(productosRef);
      checks.productos = !productosSnap.empty;
    }

    // 4) Determinar página actual
    const currentPath = window.location.pathname;
    const currentPage = currentPath.split("/").pop();

    // 5) Función auxiliar para redirigir
    const redirectTo = (page) => {
      if (currentPage !== page) {
        console.log(`➡️ Redirigiendo de ${currentPage} a ${page}`);
        window.location.href = `/src/pages/${page}`;
      }
    };

    // 6) Lógica de flujo secuencial
    
    // Si falta usuario → ir a usuario.html (nunca saltar desde aquí)
    if (!checks.usuario) {
      return redirectTo("usuario.html");
    }
    
    // Usuario completo pero falta comercio → ir a mi-comercio
    if (checks.usuario && !checks.comercio) {
      return redirectTo("mi-comercio.html");
    }
    
    // Comercio completo pero faltan horarios → ir a horarios
    if (checks.comercio && !checks.horarios) {
      return redirectTo("horarios.html");
    }
    
    // Horarios completos pero faltan productos → ir a productos
    if (checks.horarios && !checks.productos) {
      return redirectTo("productos.html");
    }
    
    // Productos completos pero falta IA → ir a ia-config
    if (checks.productos && !checks.ia) {
      return redirectTo("ia-config.html");
    }
    
    // Todo completo → dashboard
    if (checks.usuario && checks.comercio && checks.horarios && checks.productos && checks.ia) {
      // Solo redirigir a dashboard si NO estamos ya en una página de configuración
      // (para permitir ediciones desde el dashboard)
      const pagesWithEdit = ["usuario.html", "mi-comercio.html", "horarios.html", "productos.html", "ia-config.html"];
      
      if (pagesWithEdit.includes(currentPage)) {
        // Estamos en una página de configuración y todo está completo
        // Permitir quedarse aquí para editar
        console.log("✅ Flujo completo - Permitiendo edición en", currentPage);
      } else if (currentPage === "dashboard.html") {
        // Ya estamos en dashboard, todo ok
        console.log("✅ En dashboard con flujo completo");
      } else {
        // Cualquier otra página → dashboard
        return redirectTo("dashboard.html");
      }
    }

    // Si llegamos aquí, estamos en la página correcta del flujo
    console.log("🎯 Página actual correcta según flujo:", {
      currentPage,
      checks
    });

  } catch (error) {
    console.error("❌ Error en redirect-dashboard:", error);
  }
}

/**
 * Inicializar redirección automática al cargar cualquier página
 * Llamar esto al inicio de cada página del flujo
 */
export async function initAutoRedirect() {
  // Esperar a que auth esté listo
  return new Promise((resolve) => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      unsubscribe();
      if (user) {
        await redirectToNextStep();
      }
      resolve();
    });
  });
}
