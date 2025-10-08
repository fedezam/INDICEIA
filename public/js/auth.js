// auth.js
import { auth, db, provider } from "./firebase.js";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithRedirect,
  getRedirectResult,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";
import { doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

// ==========================
// 🔧 Utils
// ==========================
class Utils {
  static showLoading(text = "Cargando...") {
    const overlay = document.getElementById("loadingOverlay");
    const loadingText = document.getElementById("loadingText");
    if (overlay && loadingText) {
      loadingText.textContent = text;
      overlay.classList.add("show");
    }
  }

  static hideLoading() {
    const overlay = document.getElementById("loadingOverlay");
    if (overlay) overlay.classList.remove("show");
  }

  static showToast(title, message, type = "success") {
    const container = document.getElementById("toastContainer");
    if (!container) return;

    const toast = document.createElement("div");
    const icons = {
      success: "fas fa-check-circle",
      error: "fas fa-exclamation-circle",
      warning: "fas fa-exclamation-triangle",
      info: "fas fa-info-circle",
    };

    toast.className = `toast ${type}`;
    toast.innerHTML = `
      <i class="${icons[type]}"></i>
      <div class="toast-content">
        <div class="toast-title">${title}</div>
        <div class="toast-message">${message}</div>
      </div>
      <button class="toast-close"><i class="fas fa-times"></i></button>
    `;
    container.appendChild(toast);

    setTimeout(() => toast.classList.add("show"), 100);
    setTimeout(() => {
      toast.classList.remove("show");
      setTimeout(() => {
        if (toast.parentNode) container.removeChild(toast);
      }, 300);
    }, 5000);

    toast.querySelector(".toast-close").addEventListener("click", () => {
      toast.classList.remove("show");
      setTimeout(() => {
        if (toast.parentNode) container.removeChild(toast);
      }, 300);
    });
  }

  static validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  }

  static validatePassword(password) {
    // Mínimo 8 caracteres, 1 mayúscula, 1 número, 1 símbolo
    const re = /^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    return re.test(password);
  }

  static validateForm(isRegister) {
    const email = document.getElementById("email")?.value.trim();
    const password = document.getElementById("password")?.value.trim();
    const repeat = document.getElementById("repeatPassword")?.value.trim();

    if (!email || !this.validateEmail(email)) {
      this.showToast("Error", "Ingresa un email válido", "error");
      return false;
    }

    if (!password || (isRegister && !this.validatePassword(password))) {
      this.showToast(
        "Error",
        isRegister
          ? "Contraseña mínima 8 caracteres, 1 mayúscula, 1 número y 1 símbolo"
          : "Contraseña requerida",
        "error"
      );
      return false;
    }

    if (isRegister && password !== repeat) {
      this.showToast("Error", "Las contraseñas no coinciden", "error");
      return false;
    }

    return true;
  }

  static generateReferralId() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  }
}

// ==========================
// 🔄 Login / Registro
// ==========================
let isRegisterMode = false;

function toggleMode() {
  isRegisterMode = !isRegisterMode;
  document.getElementById("toggleModeText").textContent = isRegisterMode
    ? "¿Ya tienes cuenta? Inicia sesión"
    : "¿No tienes cuenta? Regístrate";
  document.getElementById("repeatPasswordField").style.display = isRegisterMode ? "block" : "none";
}

document.getElementById("toggleModeText")?.addEventListener("click", toggleMode);

document.getElementById("authForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!Utils.validateForm(isRegisterMode)) return;

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();

  Utils.showLoading(isRegisterMode ? "Creando cuenta..." : "Iniciando sesión...");

  try {
    if (isRegisterMode) {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Crear documento usuario en Firestore
      const userDoc = {
        email: user.email,
        uid: user.uid,
        referralId: Utils.generateReferralId(),
        fechaRegistro: new Date(),
      };

      await setDoc(doc(db, "usuarios", user.uid), userDoc);

      Utils.hideLoading();
      Utils.showToast("¡Cuenta creada!", "Ahora completa tus datos personales", "success");
      setTimeout(() => (window.location.href = "usuarios.html"), 800);
    } else {
      await signInWithEmailAndPassword(auth, email, password);
      Utils.hideLoading();
      Utils.showToast("¡Bienvenido!", "Has iniciado sesión correctamente", "success");
      redirectAfterLogin(auth.currentUser);
    }
  } catch (error) {
    Utils.hideLoading();
    console.error(error);
    Utils.showToast("Error", error.message, "error");
  }
});

// ==========================
// 🔑 Google login
// ==========================
document.getElementById("googleLogin")?.addEventListener("click", async () => {
  try {
    Utils.showLoading("Conectando con Google...");
    await signInWithRedirect(auth, provider);
  } catch (error) {
    Utils.hideLoading();
    Utils.showToast("Error", "No se pudo iniciar sesión con Google", "error");
  }
});

window.addEventListener("load", async () => {
  Utils.showLoading("Verificando sesión...");
  try {
    const result = await getRedirectResult(auth);
    if (result && result.user) {
      const user = result.user;
      const userRef = doc(db, "usuarios", user.uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        // Dividir nombre completo
        const fullName = user.displayName || "";
        const [nombre, ...apellidoParts] = fullName.split(" ");
        const apellido = apellidoParts.join(" ") || "";

        const userDoc = {
          email: user.email,
          uid: user.uid,
          referralId: Utils.generateReferralId(),
          fechaRegistro: new Date(),
        };
        if (nombre) userDoc.nombre = nombre;
        if (apellido) userDoc.apellido = apellido;

        await setDoc(userRef, userDoc);
      }

      redirectAfterLogin(user);
    }
  } catch (error) {
    console.error(error);
  } finally {
    Utils.hideLoading();
  }
});

// ==========================
// 🔄 Redirigir según perfil
// ==========================
async function redirectAfterLogin(user) {
  if (!user) return;
  const userRef = doc(db, "usuarios", user.uid);
  const userSnap = await getDoc(userRef);
  if (!userSnap.exists()) {
    window.location.href = "usuarios.html";
    return;
  }
  const data = userSnap.data();
  // Si no tiene datos básicos
  if (!data.nombre || !data.apellido || !data.direccion) {
    window.location.href = "usuarios.html";
    return;
  }
  // Redirigir según tipoUsuario si existe
  if (!data.tipoUsuario) {
    window.location.href = "usuarios.html";
  } else if (data.tipoUsuario === "servicio") {
    window.location.href = "mi-servicio.html";
  } else {
    window.location.href = "mi-comercio.html";
  }
}

// ==========================
// 🔄 Detectar sesión activa
// ==========================
onAuthStateChanged(auth, async (user) => {
  if (user) {
    redirectAfterLogin(user);
  }
});
