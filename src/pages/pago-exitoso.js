import { auth, db } from "../firebase.js";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import './pago-exitoso.css';

const pendingPlan = localStorage.getItem("pendingPlan");

auth.onAuthStateChanged(async (user) => {
  if (!user) return;

  if (!pendingPlan) {
    console.warn("No hay plan pendiente");
    return;
  }

  try {
    await updateDoc(doc(db, "commercios", user.uid), {
      plan: pendingPlan,
      planStatus: "active",
      planActivatedAt: serverTimestamp(),
      planActivationMode: "auto"
    });

    localStorage.removeItem("pendingPlan");

    console.log("Plan activado:", pendingPlan);

  } catch (error) {
    console.error("Error activando el plan:", error);
  }
});
