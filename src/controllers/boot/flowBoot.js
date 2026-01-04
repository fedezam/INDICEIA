import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../../firebase.js";              // ✅ DOS NIVELES ARRIBA
import { runFlowController } from "../flowController.js";

export function bootFlow() {
  onAuthStateChanged(auth, (user) => {
    runFlowController(user?.uid);
  });
}
