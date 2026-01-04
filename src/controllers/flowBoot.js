import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../../firebase.js";              // ✅ CORRECTO
import { runFlowController } from "../flowController.js"; // ✅ CORRECTO

export function bootFlow() {
  onAuthStateChanged(auth, (user) => {
    runFlowController(user?.uid);
  });
}
