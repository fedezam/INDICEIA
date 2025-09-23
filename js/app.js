import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

// 🔥 Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyC7Ny3pE6zaaQbfvEJqRMcZ98W6LSfJTgo",
  authDomain: "indiceia-e2d42.firebaseapp.com",
  projectId: "indiceia-e2d42",
  storageBucket: "indiceia-e2d42.firebasestorage.app",
  messagingSenderId: "630890658793",
  appId: "1:630890658793:web:98b9a9084c308f80926978",
  measurementId: "G-NTG5LD5YNP",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

let isRegisterMode = false;

// ⚙️ Utils
class Utils {
  static showLoading(text = "Cargando...") {
    const overlay = document.getElementById("loadingOverlay");
    const loadingText = document.getElementById("loadingText");
    loadingText.textContent = text;
    overlay.classList.add("show");
  }

  static hideLoading() {
    document.getElementById("loadingOverlay").classList.remove("show");
  }

  static showToast(title, message, type = "success") {
    const container = document.getElementById("toastContainer");
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
      <button class="toast-close">
          <i class="fas fa-times"></i>
      </button>
    `;

    container.appendChild(toast);

    setTimeout(() => toast.classList.add("show"), 100);

    setTimeout(() => {
      toast.classList.remove("show");
      setTimeout(() => container.removeChild(toast), 300);
    }, 5000);

    toast
      .querySelector(".toast-close")
      .addEventListener("click", () => {
        toast.classList.remove("show");
        setTimeout(() => container.removeChild(toast), 300);
      });
  }

  static validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  }

  static validateForm() {
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    let isValid = true;

    // Email
    const emailField = document.getElementById("email");
    const emailError =
      emailField.parentElement.parentElement.querySelector(".error-message");
    if (!email || !Utils.validateEmail(email)) {
      emailField.classList.add("error");
      emailError.classList.add("show");
      isValid = false;
    } else {
      emailField.classList.remove("error");
      emailError.classList.remove("show");
    }

    // Password
    const passwordField = document.getElementById("password");
    const passwordError =
      passwordField.parentElement.parentElement.querySelector(".error-message");
    if (!password) {
      passwordField.classList.add("error");
      passwordError.classList.add("show");
      isValid = false;
    } else {
      passwordField.classList.remove("error");
      passwordError.classList.remove("show");
    }

    return isValid;
  }

  static generateReferralId() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  }
}

// 👁 toggle password
document
  .getElementById("togglePassword")
  .addEventListener("click", function () {
    const passwordField = document.getElementById("password");
    const type =
      passwordField.getAttribute("type") === "password"
        ? "text"
        : "password";
    passwordField.setAttribute("type", type);

    this.classList.toggle("fa-eye");
    this.classList.toggle("fa-eye-slash");
  });

// 📩 Email login
document
  .getElementById("emailLogin")
  .addEventListener("submit", async (e) => {
    e.preventDefault();

    if (!Utils.validateForm()) {
      Utils.showToast(
        "Campos incompletos",
        "Por favor corrige los errores en el formulario",
        "error"
      );
      return;
    }

    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    if (isRegisterMode) {
      showRegistrationForm(email, password);
    } else {
      Utils.showLoading("Iniciando sesión...");
      try {
        await signInWithEmailAndPassword(auth, email, password);
        Utils.showToast("¡Bienvenido!", "Has iniciado sesión correctamente", "success");
        setTimeout(() => {
          window.location.href = "dashboard.html";
        }, 1000);
      } catch (error) {
        Utils.hideLoading();
        let errorMessage = "Error al iniciar sesión";

        switch (error.code) {
          case "auth/user-not-found":
            errorMessage = "No existe una cuenta con este email";
            break;
          case "auth/wrong-password":
            errorMessage = "Contraseña incorrecta";
            break;
          case "auth/too-many-requests":
            errorMessage = "Demasiados intentos. Intenta más tarde";
            break;
          case "auth/invalid-credential":
            errorMessage = "Credenciales inválidas";
            break;
          default:
            errorMessage = error.message;
        }
        Utils.showToast("Error", errorMessage, "error");
      }
    }
  });

// 📝 Registro
function showRegistrationForm(email, password) {
  const loginContainer = document.getElementById("loginContainer");
  loginContainer.innerHTML = `
    <div class="logo">
      <div class="logo-icon"><i class="fas fa-user-plus"></i></div>
      <h1>INDICEIA</h1>
      <p>Completa tu registro</p>
    </div>

    <form class="login-form" id="completeRegistration">
      <div class="input-group">
        <label>Email</label>
        <input type="email" value="${email}" disabled style="background: var(--gray-50); color: var(--gray-600);">
      </div>

      <div class="input-group">
        <label for="nombre">Tu Nombre <span class="required">*</span></label>
        <div class="input-wrapper">
          <input type="text" id="nombre" name="nombre" required placeholder="Juan Pérez">
          <i class="fas fa-user input-icon"></i>
        </div>
        <div class="error-message">El nombre es obligatorio</div>
      </div>

      <div class="input-group">
        <label for="nombreComercio">Nombre de tu Comercio <span class="required">*</span></label>
        <div class="input-wrapper">
          <input type="text" id="nombreComercio" name="nombreComercio" required placeholder="Mi Tienda">
          <i class="fas fa-store input-icon"></i>
        </div>
        <div class="error-message">El nombre del comercio es obligatorio</div>
      </div>

      <div class="input-group">
        <label for="telefono">WhatsApp/Teléfono <span class="required">*</span></label>
        <div class="input-wrapper">
          <input type="tel" id="telefono" name="telefono" placeholder="+54 9 341 123-4567" required>
          <i class="fab fa-whatsapp input-icon"></i>
        </div>
        <div class="error-message">El teléfono es obligatorio</div>
      </div>

      <button type="submit" class="btn btn-primary">
        <i class="fas fa-rocket"></i> Crear Cuenta
      </button>
    </form>

    <div class="register-link">
      <a href="#" class="back-link" onclick="location.reload()">
        <i class="fas fa-arrow-left"></i> Volver al login
      </a>
    </div>
  `;

  // Validaciones de registro
  const newForm = document.getElementById("completeRegistration");
  const inputs = newForm.querySelectorAll("input[required]");

  inputs.forEach((input) => {
    input.addEventListener("blur", validateRegistrationField);
    input.addEventListener("input", () => {
      if (input.classList.contains("error")) {
        validateRegistrationField.call(input);
      }
    });
  });

  // Submit registro
  newForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    if (!validateRegistrationForm()) {
      Utils.showToast(
        "Campos incompletos",
        "Por favor completa todos los campos",
        "error"
      );
      return;
    }

    const formData = new FormData(e.target);
    const userData = Object.fromEntries(formData);

    Utils.showLoading("Creando tu cuenta...");

    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );

      await setDoc(doc(db, "usuarios", userCredential.user.uid), {
        email: email,
        nombre: userData.nombre,
        nombreComercio: userData.nombreComercio,
        telefono: userData.telefono,
        referralId: Utils.generateReferralId(),
        fechaRegistro: new Date(),
        plan: "basic",
        estado: "trial",
      });

      Utils.showToast(
        "¡Cuenta creada!",
        "¡Bienvenido a INDICEIA! Redirigiendo...",
        "success"
      );
      setTimeout(() => {
        window.location.href = "dashboard.html";
      }, 1500);
    } catch (error) {
      Utils.hideLoading();
      let errorMessage = "Error al crear la cuenta";

      switch (error.code) {
        case "auth/email-already-in-use":
          errorMessage = "Este email ya está registrado";
          break;
        case "auth/invalid-email":
          errorMessage = "El email ingresado no es válido";
          break;
        case "auth/weak-password":
          errorMessage = "La contraseña es demasiado débil";
          break;
