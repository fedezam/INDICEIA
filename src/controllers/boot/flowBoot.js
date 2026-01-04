// src/boot/flowBoot.js
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebase.js";
import { runFlowController } from "../controllers/flowController.js";

export function bootFlow() {
  onAuthStateChanged(auth, (user) => {
    runFlowController(user?.uid);
  });
}
