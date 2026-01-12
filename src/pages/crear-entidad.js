import { auth } from "../firebase.js";
import { db } from "../firebase.js";
import { onAuthStateChanged } from "firebase/auth";
import { doc, updateDoc } from "firebase/firestore";

document.addEventListener("DOMContentLoaded", () => {

  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      window.location.href = "/login.html";
      return;
    }

    bindEntitySelection(user.uid);
  });

});

function bindEntitySelection(uid) {
  const cards = document.querySelectorAll(".entity-card");

  cards.forEach(card => {
    if (card.classList.contains("disabled")) return;

    card.addEventListener("click", async () => {
      const type = card.dataset.type;

      if (type === "comercio") {
        await selectComercioFlow(uid);
      }
    });
  });
}

async function selectComercioFlow(uid) {
  try {
    // Marcamos explícitamente el tipo de entidad elegida
    await updateDoc(doc(db, "usuarios", uid), {
      entityType: "comercio"
    });

    // El FlowController ya sabe qué hacer después
    window.location.href = "/usuario.html";

  } catch (err) {
    console.error("Error seleccionando entidad:", err);
    alert("No se pudo crear la entidad. Intentá nuevamente.");
  }
}
