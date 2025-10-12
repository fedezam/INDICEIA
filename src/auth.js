// ==========================
// 📦 IMPORTS
// ==========================
import { auth, db, provider } from "./firebase.js";
import {
  signInWithPopup,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import {
  doc,
  getDoc,
  setDoc
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

// ==========================
// 🧠 UTILS
// ==========================
const Utils = {
  generateReferral() {
    return Math.random().toString(36).substring(2, 10).toUpperCase();
  },
  showToast(msg) {
    alert(msg);
  },
};

// ==========================
// 🔐 LOGIN CON GOOGLE
// ==========================
const googleBtn = document.getElementById("googleLogin");

if (googleBtn) {
  googleBtn.addEventListener("click", async () => {
    console.log("🌐 Iniciando login con Google...");
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      console.log("✅ Login exitoso:", user.email);

      // Referencia a Firestore
      const userRef = doc(db, "usuarios", user.uid);
      const userDoc = await getDoc(userRef);

      // Nuevo usuario → crear documento
      if (!userDoc.exists()) {
        console.log("🆕 Usuario nuevo, creando documento...");

        // Separar nombre y apellido
        let nombre = "";
        let apellido = "";
        if (user.displayName) {
          const parts = user.displayName.trim().split(" ");
          nombre = parts[0] || "";
          apellido = parts.slice(1).join(" ") || "";
        }

        await setDoc(userRef, {
          uid: user.uid,
          email: user.email,
          nombre,
          apellido,
          fechaRegistro: new Date(),
          referralId: Utils.generateReferral(),
        });

        console.log("📄 Documento Firestore creado correctamente");
      } else {
        console.log("📂 Usuario existente en Firestore");
      }

      // Señal para usuario.html (sin perder sesión)
      sessionStorage.setItem("loggedIn", "true");

      // Redirigir
      window.location.href = "/src/pages/usuario.html";
    } catch (error) {
      console.error("⚠️ Error en login con Google:", error);
      Utils.showToast("Error: " + error.message);
    }
  });
} else {
  console.warn("⚠️ Botón Google no encontrado en esta página");
}

// ==========================
// 🚪 LOGOUT
// ==========================
window.logout = async function () {
  try {
    await signOut(auth);
    sessionStorage.removeItem("loggedIn");
    console.log("👋 Sesión cerrada correctamente");
    window.location.href = "/";
  } catch (e) {
    console.error("❌ Error al cerrar sesión:", e);
    Utils.showToast("Error al cerrar sesión: " + e.message);
  }
};

// ==========================
// 👀 VERIFICAR SESIÓN ACTIVA
// ==========================
onAuthStateChanged(auth, (user) => {
  if (user) {
    console.log("👤 Sesión activa:", user.email);
  } else {
    console.log("🚫 No hay sesión activa");
  }
});
