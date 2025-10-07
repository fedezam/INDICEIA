// usuario.js
import { auth, db } from "./firebase.js";
import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";

import {
  doc,
  getDoc,
  setDoc
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

// =========================
// ⚙️ Utils
// =========================
class Utils {
  static generateReferralId() {
    return Math.random().toString(36).substring(2, 10).toUpperCase();
  }

  static showMessage(msg) {
    alert(msg);
  }

  static fillInput(id, value) {
    const input = document.getElementById(id);
    if (input) input.value = value || "";
  }
}

// =========================
// 👤 Sesión y carga inicial
// =========================
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "index.html";
    return;
  }

  console.log("✅ Usuario autenticado:", user.email);

  const userRef = doc(db, "usuarios", user.uid);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) {
    console.log("🆕 Creando documento base para nuevo usuario...");
    await setDoc(userRef, {
      email: user.email,
      uid: user.uid,
      referralId: Utils.generateReferralId(),
      fechaRegistro: new Date(),
      plan: "basic",
      estado: "trial"
    });
  } else {
    console.log("📄 Documento encontrado:", userSnap.data());
  }

  // Mostrar email arriba
  const emailSpan = document.getElementById("userEmail");
  if (emailSpan) emailSpan.innerText = user.email;

  // Cargar los datos guardados
  await loadUserData(user.uid);
});

// =========================
// 📥 Cargar datos de Firestore
// =========================
async function loadUserData(uid) {
  const userRef = doc(db, "usuarios", uid);
  const userSnap = await getDoc(userRef);

  if (userSnap.exists()) {
    const data = userSnap.data();

    Utils.fillInput("nombre", data.nombre);
    Utils.fillInput("apellido", data.apellido);
    Utils.fillInput("direccion", data.direccion);
    Utils.fillInput("pais", data.pais);
    Utils.fillInput("provincia", data.provincia);
    Utils.fillInput("localidad", data.localidad);
    Utils.fillInput("barrio", data.barrio);
    Utils.fillInput("fechaNacimiento", data.fechaNacimiento);

    // También mostramos el plan y estado si querés
    if (document.getElementById("plan"))
      document.getElementById("plan").innerText = data.plan || "basic";
    if (document.getElementById("estado"))
      document.getElementById("estado").innerText = data.estado || "trial";
  } else {
    console.warn("⚠️ No se encontraron datos en Firestore para este usuario.");
  }
}

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

    Utils.showMessage("✅ Datos guardados correctamente.");
  } catch (error) {
    console.error("Error al guardar datos:", error);
    Utils.showMessage("❌ Ocurrió un error al guardar los datos.");
  }
});

// =========================
// 🚪 Cerrar sesión
// =========================
document.getElementById("logoutBtn").addEventListener("click", async () => {
  await signOut(auth);
  window.location.href = "index.html";
});
