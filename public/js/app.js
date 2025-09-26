// app.js
import { auth, db, provider } from "./firebase.js";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithRedirect,
  getRedirectResult
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";
import { doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

let isRegisterMode = false;

// ⚙️ Utils
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
      setTimeout(() => container.removeChild(toast), 300);
    }, 5000);

    toast.querySelector(".toast-close").addEventListener("click", () => {
      toast.classList.remove("show");
      setTimeout(() => container.removeChild(toast), 300);
    });
  }

  static validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  }

  static validatePassword(password) {
    const re = /^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    return re.test(password);
  }

  static validateForm() {
    const emailField = document.getElementById("email");
    const passwordField = document.getElementById("password");
    if (!emailField || !passwordField) return false;

    let isValid = true;

    const email = emailField.value;
    const emailError = emailField.parentElement.parentElement.querySelector(".error-message");
    if (!email || !Utils.validateEmail(email)) {
      emailField.classList.add("error");
      emailError?.classList.add("show");
      isValid = false;
    } else {
      emailField.classList.remove("error");
      emailError?.classList.remove("show");
    }

    const password = passwordField.value;
    const passwordError = passwordField.parentElement.parentElement.querySelector(".error-message");
    if (!password || !Utils.validatePassword(password)) {
      passwordField.classList.add("error");
      if (passwordError) {
        passwordError.textContent = "Mínimo 8 caracteres, una mayúscula, un número y un símbolo";
        passwordError.classList.add("show");
      }
      isValid = false;
    } else {
      passwordField.classList.remove("error");
      passwordError?.classList.remove("show");
    }

    return isValid;
  }

  static generateReferralId() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  }
}

// ✅ Toggle password
document.getElementById("togglePassword")?.addEventListener("click", function () {
  const passwordField = document.getElementById("password");
  if (!passwordField) return;

  const type = passwordField.getAttribute("type") === "password" ? "text" : "password";
  passwordField.setAttribute("type", type);
  this.classList.toggle("fa-eye");
  this.classList.toggle("fa-eye-slash");
});

// ✅ Login form
document.getElementById("emailLogin")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!Utils.validateForm()) {
    Utils.showToast("Campos incompletos", "Por favor corrige los errores en el formulario", "error");
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
      setTimeout(() => window.location.href = "dashboard.html", 1000);
    } catch (error) {
      Utils.hideLoading();
      let errorMessage = "Error al iniciar sesión";
      switch (error.code) {
        case "auth/user-not-found": errorMessage = "No existe una cuenta con este email"; break;
        case "auth/wrong-password": errorMessage = "Contraseña incorrecta"; break;
        case "auth/too-many-requests": errorMessage = "Demasiados intentos. Intenta más tarde"; break;
        case "auth/invalid-credential": errorMessage = "Credenciales inválidas"; break;
        default: errorMessage = error.message;
      }
      Utils.showToast("Error", errorMessage, "error");
    }
  }
});

// ✅ Inicializar el resultado del redirect al cargar la página
window.addEventListener("load", async () => {
  try {
    const result = await getRedirectResult(auth);
    if (result && result.user) {
      const user = result.user;

      const userDoc = await getDoc(doc(db, "usuarios", user.uid));
      if (!userDoc.exists()) {
        await setDoc(doc(db, "usuarios", user.uid), {
          email: user.email,
          nombre: user.displayName || "",
          nombreComercio: "",
          telefono: "",
          referralId: Utils.generateReferralId(),
          fechaRegistro: new Date(),
          plan: "basic",
          estado: "trial",
        });
      }

      Utils.showToast("¡Bienvenido!", "Has iniciado sesión con Google", "success");
      setTimeout(() => window.location.href = "dashboard.html", 1000);
    }
  } catch (error) {
    Utils.hideLoading();
    Utils.showToast("Error", "No se pudo iniciar sesión con Google", "error");
    console.error("Redirect error:", error);
  }
});

// ✅ Google login botón
document.getElementById("googleLogin")?.addEventListener("click", async () => {
  try {
    Utils.showLoading("Redirigiendo a Google...");
    await signInWithRedirect(auth, provider);
  } catch (error) {
    Utils.hideLoading();
    Utils.showToast("Error", "No se pudo iniciar sesión con Google", "error");
    console.error("Redirect initiation error:", error);
  }
});

// ✅ Password reset
document.getElementById("forgotPassword")?.addEventListener("click", async (e) => {
  e.preventDefault();
  const email = document.getElementById("email")?.value;
  if (!email || !Utils.validateEmail(email)) {
    Utils.showToast("Error", "Ingresa un email válido primero", "error");
    return;
  }

  try {
    await sendPasswordResetEmail(auth, email);
    Utils.showToast("Éxito", "Te enviamos un correo para restablecer tu contraseña", "success");
  } catch (error) {
    Utils.showToast("Error", error.message, "error");
  }
});

// ✅ Registro
function showRegistrationForm(email, password) {
  const loginContainer = document.getElementById("loginContainer");
  if (!loginContainer) return;

  loginContainer.innerHTML = `
    <!-- HTML de registro aquí, igual que tu código actual -->
  `;

  const newForm = document.getElementById("completeRegistration");
  if (!newForm) return;

  const inputs = newForm.querySelectorAll("input[required]");
  inputs.forEach((input) => {
    input.addEventListener("blur", validateRegistrationField);
    input.addEventListener("input", () => {
      if (input.classList.contains("error")) validateRegistrationField.call(input);
    });
  });

  newForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!validateRegistrationForm()) {
      Utils.showToast("Campos incompletos", "Por favor completa todos los campos", "error");
      return;
    }

    const formData = new FormData(e.target);
    const userData = Object.fromEntries(formData);

    if (!Utils.validatePassword(password)) {
      Utils.showToast("Contraseña débil", "Debe tener al menos 8 caracteres, una mayúscula, un número y un símbolo", "error");
      return;
    }

    Utils.showLoading("Creando tu cuenta...");
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
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
      Utils.showToast("¡Cuenta creada!", "¡Bienvenido a INDICEIA! Redirigiendo...", "success");
      setTimeout(() => window.location.href = "dashboard.html", 1500);
    } catch (error) {
      Utils.hideLoading();
      let errorMessage = "Error al crear la cuenta";
      switch (error.code) {
        case "auth/email-already-in-use": errorMessage = "Este email ya está registrado"; break;
        case "auth/invalid-email": errorMessage = "El email ingresado no es válido"; break;
        case "auth/weak-password": errorMessage = "La contraseña es demasiado débil"; break;
        default: errorMessage = error.message;
      }
      Utils.showToast("Error", errorMessage, "error");
    }
  });
}

function validateRegistrationField() {
  const field = this;
  const errorMsg = field.parentElement.parentElement.querySelector(".error-message");
  if (!field.value.trim()) {
    field.classList.add("error");
    errorMsg?.classList.add("show");
    return false;
  } else {
    field.classList.remove("error");
    errorMsg?.classList.remove("show");
    return true;
  }
}

function validateRegistrationForm() {
  const inputs = document.querySelectorAll("#completeRegistration input[required]");
  return Array.from(inputs).every((input) => validateRegistrationField.call
