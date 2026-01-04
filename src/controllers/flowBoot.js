// src/controllers/boot/flowBoot.js
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../../firebase.js";              // ✅ sube a src/
import { runFlowController } from "../flowController.js"; // ✅ mismo nivel

export function bootFlow() {
  onAuthStateChanged(auth, (user) => {
    runFlowController(user?.uid);
  });
}

