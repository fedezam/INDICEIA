// src/skeleton/flow/runtime.js
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../../firebase.js";
import { flowEngine } from "./engine.js";

function getCurrentPage() {
  const file = window.location.pathname.split("/").pop();
  return file?.replace(".html", "") || "index";
}

function isEditMode() {
  return new URLSearchParams(window.location.search).get("edit") === "true";
}

export async function runFlowRuntime() {
  const user = auth.currentUser;
  if (!user) return;

  const currentPage = getCurrentPage();
  const editMode = isEditMode();

  const userSnap = await getDoc(doc(db, "usuarios", user.uid));
  if (!userSnap.exists()) {
    window.location.href = "/login.html";
    return;
  }

  const userData = userSnap.data();

  let comercioData = {};
  let comercioExiste = false;

  if (userData.comercioId) {
    const comercioSnap = await getDoc(
      doc(db, "entidades", userData.comercioId)
    );
    if (comercioSnap.exists()) {
      comercioExiste = true;
      comercioData = comercioSnap.data();
    }
  }

  const decision = flowEngine({
    currentPage,
    onboardingSteps: userData.onboardingSteps,
    comercioSteps: comercioData.onboardingSteps,
    offerType: userData.offerType,
    comercioExiste,
    editMode
  });

  if (decision.action === "REDIRECT") {
    window.location.href = `/${decision.target}.html`;
  }
}
