// ==========================
// 📦 IMPORTS
// ==========================
import { auth, db, provider } from './firebase.js';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  onAuthStateChanged
} from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";

// ==========================
// ⚙️ UTILS
// ==========================
class Utils {
  static validateEmail(email) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email); }
  static validatePassword(password) { return password.length >= 6; }
  static showToast(msg) { alert(msg); }
  static generateReferral() { return Math.random().toString(36).substring(2,8).toUpperCase(); }
}

// ==========================
// 🚀 VERSION CHECK
// ==========================
console.log("🔥 VERSION TEST 1012B");

// ==========================
// 🔄 DOMContentLoaded
// ==========================
document.addEventListener("DOMContentLoaded", () => {
  console.log("📄 DOM cargado, inicializando auth...");

  const emailLoginForm = document.getElementById("emailLogin");
  const toggleLink = document.getElementById("toggleModeLink");
  const repeatPasswordGroup = document.getElementById("repeatPasswordGroup");
  const btnText = document.getElementById("btnText");
  const loginSubtitle = document.getElementById("loginSubtitle");
  const googleBtn = document.getElementById("googleLogin");

  // ==========================
  // 🔄 Toggle login / registro
  // ==========================
  toggleLink.addEventListener("click", e => {
    e.preventDefault();
    const isRegister = emailLoginForm.dataset.register === "true";
    emailLoginForm.dataset.register = (!isRegister).toString();

    if (!isRegister) {
      repeatPasswordGroup.style.display = "block";
      btnText.textContent = "Crear Cuenta";
      loginSubtitle.textContent = "Crea tu cuenta y empieza gratis";
      toggleLink.innerHTML = '¿Ya tienes cuenta? <a href="#">Inicia sesión aquí</a>';
    } else {
      repeatPasswordGroup.style.display = "none";
      btnText.textContent = "Iniciar Sesión";
      loginSubtitle.textContent = "Tu vendedor IA personalizado";
      toggleLink.innerHTML = '¿No tienes cuenta? <a href="#">Regístrate aquí</a>';
    }
  });

  // ==========================
  // 🔑 Login / Registro Email
  // ==========================
  emailLoginForm.addEventListener("submit", async e => {
    e.preventDefault();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;
    const isRegister = emailLoginForm.dataset.register === "true";

    console.log("💻 Form submit:", { email, isRegister });

    if (!Utils.validateEmail(email) || !Utils.validatePassword(password)) {
      Utils.showToast("Email o contraseña inválidos");
      return;
    }

    if (isRegister) {
      const repeatPass = document.getElementById("repeatPassword").value;
      if (password !== repeatPass) {
        Utils.showToast("Las contraseñas no coinciden");
        return;
      }
    }

    try {
      let user;
      if (isRegister) {
        console.log("🟢 Registrando usuario...");
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        user = cred.user;
        console.log("✅ Usuario creado:", user.uid);
        await setDoc(doc(db, "usuarios", user.uid), {
          email: user.email,
          uid: user.uid,
          fechaRegistro: new Date(),
          referralId: Utils.generateReferral()
        });
      } else {
        console.log("🔑 Logueando usuario...");
        const cred = await signInWithEmailAndPassword(auth, email, password);
        user = cred.user;
        console.log("✅ Usuario logueado:", user.uid);
      }
      window.location.href = "/src/pages/usuario.html";
    } catch (error) {
      console.error("🔥 Error email login/register:", error);
      Utils.showToast(error.message);
    }
  });

  // ==========================
  // 🔑 Login Google
  // ==========================
  if (googleBtn) {
    googleBtn.addEventListener("click", async () => {
      try {
        const result = await signInWithPopup(auth, provider);
        const user = result.user;

        // DEBUG: Ver datos recibidos de Google
        console.log("🧩 RESULT:", result);
        console.log("📇 user:", user);
        console.log("🪪 providerData:", user.providerData);

        // Extraer nombre y apellido
        const fullName = user.displayName || "";
        const parts = fullName.split(" ");
        const nombre = parts[0] || "";
        const apellido = parts.slice(1).join(" ") || "";

        const userRef = doc(db, "usuarios", user.uid);

        // Guardar datos en Firestore con merge
        await setDoc(userRef, {
          email: user.email,
          nombre,
          apellido,
          displayName: user.displayName,
          photoURL: user.photoURL,
          fechaRegistro: new Date(),
          referralId: Utils.generateReferral()
        }, { merge: true });

        alert(`DisplayName: ${user.displayName || "NO HAY NOMBRE"}`);
        window.location.href = "/src/pages/usuario.html";
      } catch (e) {
        console.error("⚠️ Error en login Google:", e);
        Utils.showToast("Error al iniciar sesión con Google: " + e.message);
      }
    });
  }

  // ==========================
  // 🔄 Detectar sesión activa (solo logs)
  // ==========================
  onAuthStateChanged(auth, user => {
    if (user) {
      console.log("🔒 Usuario logueado:", user.email);
    } else {
      console.log("🕳️ No hay usuario logueado");
    }
  });

}); // Fin DOMContentLoaded
