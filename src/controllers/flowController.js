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

  const ref = doc(db, "onboarding", uid);
  const snap = await getDoc(ref);

  const data = snap.exists() ? snap.data() : {};

  // Buscar el primer paso que está incompleto
  for (const step of FLOW_STEPS) {
    if (!data[step]) {
      window.location.href = `${step}.html`;
      return;
    }
  }

  // Si TODOS están en true → dashboard
  window.location.href = "dashboard.html";
}
