// usuario.js
import { auth, db } from "./firebase.js";
import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";

import {
  doc,
  getDoc,
  setDoc,
  updateDoc
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";


// =========================
// ✅ Utilidad simple
// =========================
class Utils {
  static generateReferralId() {
    return Math.random().toString(36).substring(2, 10).toUpperCase();
  }

  static showMessage(msg) {
    alert(msg);
  }
}


// =========================
// 👤 Manejo de sesión
// =========================
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    // No hay sesión → redirigir
    window.location.href = "index.html";
    return;
  }

  console.log("Usuario autenticado:", user.uid);

  // Validar / crear documento base si no existe
  const userRef = doc(db, "usuarios", user.uid);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) {
    console.log("Creando documento base para nuevo usuario...");
    await setDoc(userRef, {
      email: user.email,
      uid: user.uid,
      referralId: Utils.generateReferralId(),
      fechaRegistro: new Date(),
      plan: "basic",
      estado: "trial"
    });
  }

  // Mostrar email en pantalla
  document.getElementById("userEmail").innerText = user.email;
});


// =========================
// 💾 Guardar datos personales
// =========================
document.getElementById("saveUserData").addEventListener("click", async () => {
  const user = auth.currentUser;
  if (!user) return Utils.showMessage("No hay sesión activa.");

  const nombre = document.getElementById("nombre").value.trim();
  const apellido = document.getElementById("apellido").value.trim();
  const direccion = document.getElementById("direccion").value.trim();
  const pais = document.getElementById("pais").value.trim();
  const provincia = document.getElementById("provincia").value.trim();
  const localidad = document.getElementById("localidad").value.trim();
  const barrio = document.getElementById("barrio").value.trim();
  const fechaNacimiento = document.getElementById("fechaNacimiento").value;

  if (!nombre || !apellido) {
    return Utils.showMessage("Por favor, completa al menos nombre y apellido.");
  }

  const userRef = doc(db, "usuarios", user.uid);

  try {
    await setDoc(
      userRef,
      {
        nombre,
        apellido,
        direccion,
        pais,
        provincia,
        localidad,
        barrio,
        fechaNacimiento,
        actualizado: new Date()
      },
      { merge: true }
    );

    Utils.showMessage("Datos guardados correctamente ✅");
  } catch (error) {
    console.error("Error al guardar datos:", error);
    Utils.showMessage("Ocurrió un error al guardar los datos.");
  }
});


// =========================
// 🚪 Cerrar sesión
// =========================
document.getElementById("logoutBtn").addEventListener("click", async () => {
  await signOut(auth);
  window.location.href = "index.html";
});
