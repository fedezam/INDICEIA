// flowController.js
import { doc, getDoc } from "firebase/firestore";
import { db } from "./firebase.js";

// Orden estricto del onboarding
const FLOW_STEPS = [
  "usuario",
  "comercio",
  "horarios",
  "productos",
  "ia-config",
];

// ---------------------------------------------------------
// Ejecuta el flujo y redirige a donde corresponde
// ---------------------------------------------------------
export async function runFlowController(uid) {
  if (!uid) return;
  
  // 1. Obtener el comercioId del usuario
  const userRef = doc(db, "usuarios", uid);
  const userSnap = await getDoc(userRef);
  
  if (!userSnap.exists()) {
    console.error("Usuario no encontrado");
    return;
  }
  
  const comercioId = userSnap.data().comercioId;
  if (!comercioId) {
    console.error("Usuario sin comercioId");
    return;
  }
  
  // 2. Leer los pasos completados del comercio
  const comercioRef = doc(db, "comercios", comercioId);
  const comercioSnap = await getDoc(comercioRef);
  
  if (!comercioSnap.exists()) {
    console.error("Comercio no encontrado");
    return;
  }
  
  const data = comercioSnap.data();
  const steps = data.onboardingSteps || {};
  
  // 3. Buscar el primer paso incompleto
  for (const step of FLOW_STEPS) {
    if (!steps[step]) {
      window.location.href = `${step}.html`;
      return;
    }
  }
  
  // 4. Si TODOS están en true → dashboard
  window.location.href = "dashboard.html";
}
