import { doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase.js";
import { auth } from "../auth.js";

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("crear-entidad-form");
  const errorBox = document.getElementById("error");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const productos = document.getElementById("opt-productos").checked;
    const servicios = document.getElementById("opt-servicios").checked;

    if (!productos && !servicios) {
      errorBox.textContent = "Seleccioná al menos una opción para continuar.";
      errorBox.style.display = "block";
      return;
    }

    try {
      const user = auth.currentUser;
      if (!user) throw new Error("Usuario no autenticado");

      const userRef = doc(db, "usuarios", user.uid);

      await updateDoc(userRef, {
        entityCapabilities: {
          productos,
          servicios
        },
        onboardingStep: "capabilities_defined"
      });

      // Routing inteligente
      if (productos) {
        window.location.href = "/mi-comercio.html";
      } else if (servicios) {
        window.location.href = "/mis-servicios.html";
      }

    } catch (err) {
      console.error(err);
      errorBox.textContent = "Error al guardar la configuración.";
      errorBox.style.display = "block";
    }
  });
});
