import { auth, db } from "../firebase.js";
import { doc, updateDoc, setDoc, collection, addDoc } from "firebase/firestore";
import { bootFlow } from "../controllers/boot/flowBoot.js";

bootFlow();

const btnComercio = document.getElementById("btnComercio");
const btnServicio = document.getElementById("btnServicio");

async function elegirEntidad(tipo) {
  const user = auth.currentUser;
  if (!user) return;

  const userRef = doc(db, "usuarios", user.uid);

  if (tipo === "comercio") {
    const comercioRef = await addDoc(collection(db, "comercios"), {
      duenoId: user.uid,
      tipo: "comercio",
      plan: "trial",
      pais: "Argentina",
      fechaCreacion: new Date(),
      onboardingSteps: {
        "mi-comercio": false,
        "horarios": false,
        "productos": false,
        "ia-config": false
      }
    });

    await updateDoc(userRef, {
      entityType: "comercio",
      comercioId: comercioRef.id
    });

    window.location.href = "/mi-comercio.html";
    return;
  }

  if (tipo === "servicio") {
    await updateDoc(userRef, {
      entityType: "servicio"
    });

    // pipeline futuro
    window.location.href = "/dashboard.html";
  }
}

btnComercio?.addEventListener("click", () => elegirEntidad("comercio"));
btnServicio?.addEventListener("click", () => elegirEntidad("servicio"));

