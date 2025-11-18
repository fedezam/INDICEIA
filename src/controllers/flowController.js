// src/controllers/flowController.js
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase.js"; 

// ---------------------------------------------------------
// 🔥 FIX GLOBAL PARA PRODUCCIÓN (Vercel + Vite)
// Limpia rutas fantasmas "/pages/*" que aparecen en el build
// ---------------------------------------------------------
if (typeof window !== "undefined") {
  const path = window.location.pathname;
  if (path.startsWith("/pages/")) {
    const clean = path.replace("/pages/", "/");
    console.warn("🔧 Corrigiendo ruta fantasma:", path, "→", clean);
    window.location.replace(clean);
  }
}

// ---------------------------------------------------------
// ORDEN ESTRICTO DEL ONBOARDING
// Debe coincidir EXACTAMENTE con:
// 1. nombre del archivo HTML (sin .html)
// 2. la clave en Firestore onboardingSteps.[nombre]
// ---------------------------------------------------------
const FLOW_STEPS = [
  "usuario",
  "mi-comercio",
  "horarios",
  "productos",
  "ia-config",
];

// ---------------------------------------------------------
// ✅ HELPER: Obtiene la página actual sin .html
// ---------------------------------------------------------
function getCurrentPage() {
  if (typeof window === 'undefined') return null;
  
  const path = window.location.pathname;
  const fileName = path.split('/').pop(); // "usuario.html"
  return fileName.replace('.html', ''); // "usuario"
}

// ---------------------------------------------------------
// Ejecuta el flujo y redirige al siguiente paso o dashboard
// ---------------------------------------------------------
export async function runFlowController(uid) {
  // Evita ejecución en SSR o build
  if (typeof window === 'undefined') return;
  
  if (!uid) {
    console.warn("runFlowController: uid no proporcionado");
    return;
  }

  const currentPage = getCurrentPage();
  console.log("🔍 Página actual:", currentPage);

  try {
    // 1. Obtener datos del usuario
    const userRef = doc(db, "usuarios", uid);
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists()) {
      console.error("Usuario no encontrado en Firestore");
      return;
    }

    const userData = userSnap.data();
    const comercioId = userData?.comercioId;

    // ============================================================
    // 🔹 CASO ESPECIAL: usuario.html sin comercioId
    // ============================================================
    if (currentPage === "usuario" && !comercioId) {
      console.log("⏸️ En usuario.html sin comercioId, esperando selección de IA");
      return; // 👈 Quedarse hasta que elija tipo de IA
    }

    // ============================================================
    // 🔹 Si no hay comercioId y NO estás en usuario.html
    // ============================================================
    if (!comercioId) {
      if (currentPage !== "usuario") {
        console.log("➡️ Sin comercioId, redirigiendo a usuario.html");
        window.location.href = "/usuario.html";
      }
      return;
    }

    // ============================================================
    // 2. Leer pasos completados del comercio
    // ============================================================
    const comercioRef = doc(db, "comercios", comercioId);
    const comercioSnap = await getDoc(comercioRef);
    
    if (!comercioSnap.exists()) {
      console.error("Comercio no encontrado");
      return;
    }

    const steps = comercioSnap.data()?.onboardingSteps || {};
    console.log("📊 Pasos completados:", steps);

    // ============================================================
    // 3. Buscar el PRIMER paso incompleto
    // ============================================================
    let firstIncompleteStep = null;

    for (const step of FLOW_STEPS) {
      if (!steps[step]) {
        firstIncompleteStep = step;
        break; // 👈 Encontrar solo el PRIMERO incompleto
      }
    }

    // ============================================================
    // 4. LÓGICA DE REDIRECCIÓN
    // ============================================================
    
    // ✅ Caso A: HAY un paso incompleto
    if (firstIncompleteStep) {
      console.log(`🎯 Primer paso incompleto: ${firstIncompleteStep}`);
      
      // Solo redirigir si NO estás ya en ese paso
      if (currentPage !== firstIncompleteStep) {
        const target = `/${firstIncompleteStep}.html`;
        console.log("➡️ Redirigiendo a:", target);
        window.location.href = target;
      } else {
        console.log(`⏸️ Ya estás en ${firstIncompleteStep}.html, quedarse aquí`);
      }
      return;
    }

    // ✅ Caso B: TODOS los pasos completos
    console.log("✅ Todos los pasos completados");
    
    // Si NO estás en dashboard, ir allá
    if (currentPage !== "dashboard") {
      console.log("➡️ Redirigiendo a dashboard");
      window.location.href = "/dashboard.html";
    } else {
      console.log("⏸️ Ya estás en dashboard");
    }

  } catch (error) {
    console.error("❌ Error en runFlowController:", error);
  }
}
