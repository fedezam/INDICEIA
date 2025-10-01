// app.js
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

let isRegisterMode = false;
let redirectHandled = false; // Flag para evitar doble redirección

// ==========================
// ⚙️ Utils
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
    if (!password || (isRegisterMode && !Utils.validatePassword(password))) {
      passwordField.classList.add("error");
      if (passwordError) {
        passwordError.textContent = isRegisterMode 
          ? "Mínimo 8 caracteres, una mayúscula, un número y un símbolo"
          : "La contraseña es obligatoria";
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

// ==========================
// 🔄 Toggle Login/Registro
// ==========================
function updateUIMode() {
  const subtitle = document.getElementById("loginSubtitle");
  const btnText = document.getElementById("loginBtnText");
  const btnIcon = document.getElementById("btnIcon");
  const forgotPassword = document.getElementById("forgotPassword");
  const registerLink = document.getElementById("registerLink");
  const toggleLink = document.getElementById("toggleMode");
  const passwordRules = document.getElementById("passwordRules");

  if (isRegisterMode) {
    // MODO REGISTRO
    subtitle.textContent = "Crea tu cuenta y empieza gratis";
    btnText.textContent = "Crear Cuenta";
    btnIcon.className = "fas fa-user-plus";
    forgotPassword.style.display = "none";
    registerLink.innerHTML = '¿Ya tienes cuenta? <a href="#" id="toggleMode">Inicia sesión aquí</a>';
    passwordRules.style.display = "block";
  } else {
    // MODO LOGIN
    subtitle.textContent = "Tu vendedor IA personalizado";
    btnText.textContent = "Iniciar Sesión";
    btnIcon.className = "fas fa-sign-in-alt";
    forgotPassword.style.display = "block";
    registerLink.innerHTML = '¿No tienes cuenta? <a href="#" id="toggleMode">Regístrate aquí</a>';
    passwordRules.style.display = "none";
  }

  // Re-attach event listener al nuevo link
  document.getElementById("toggleMode").addEventListener("click", (e) => {
    e.preventDefault();
    isRegisterMode = !isRegisterMode;
    updateUIMode();
  });
}

// Inicializar modo al cargar
document.addEventListener("DOMContentLoaded", () => {
  updateUIMode();
});

// ==========================
// 🔒 Toggle password
// ==========================
document.getElementById("togglePassword")?.addEventListener("click", function () {
  const passwordField = document.getElementById("password");
  if (!passwordField) return;

  const type = passwordField.getAttribute("type") === "password" ? "text" : "password";
  passwordField.setAttribute("type", type);
  this.classList.toggle("fa-eye");
  this.classList.toggle("fa-eye-slash");
});

// ==========================
// 🔑 Redirección inteligente según usuario
// ==========================
async function redirectAfterLogin(user) {
  console.log("=== redirectAfterLogin llamado ===");
  console.log("Usuario:", user.email, "UID:", user.uid);

  try {
    const userDocRef = doc(db, "usuarios", user.uid);
    const userDoc = await getDoc(userDocRef);
    
    console.log("Documento existe?:", userDoc.exists());

    if (!userDoc.exists()) {
      console.log("→ Redirigiendo a usuario.html (no existe doc)");
      window.location.href = "usuario.html";
      return;
    }

    const data = userDoc.data();
    console.log("Datos del usuario:", data);

    // Verificar si completó datos personales
    const hasBasicData = data.nombre && data.apellido && data.direccion;
    console.log("Tiene datos básicos?:", hasBasicData);
    
    if (!hasBasicData) {
      console.log("→ Redirigiendo a usuario.html (faltan datos básicos)");
      window.location.href = "usuario.html";
      return;
    }

    // Verificar si eligió tipo de usuario
    if (!data.tipoUsuario) {
      console.log("→ Redirigiendo a usuario.html (falta tipoUsuario)");
      window.location.href = "usuario.html";
      return;
    }

    // Redirigir según tipo de usuario
    if (data.tipoUsuario === "servicio") {
      console.log("→ Redirigiendo a mi-servicio.html");
      window.location.href = "mi-servicio.html";
    } else {
      console.log("→ Redirigiendo a mi-comercio.html");
      window.location.href = "mi-comercio.html";
    }
  } catch (error) {
    console.error("Error en redirectAfterLogin:", error);
    window.location.href = "usuario.html";
  }
}

// ==========================
// 🔑 Login/Registro con email/password
// ==========================
document.getElementById("emailLogin")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!Utils.validateForm()) {
    Utils.showToast("Campos incompletos", "Por favor corrige los errores en el formulario", "error");
    return;
  }

  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  Utils.showLoading(isRegisterMode ? "Creando cuenta..." : "Iniciando sesión...");

  try {
    if (isRegisterMode) {
      console.log("=== REGISTRO con email ===");
      // CREAR CUENTA
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      console.log("Usuario creado:", user.email, "UID:", user.uid);
      
      // Crear documento básico en Firestore
      const userData = {
        email: user.email,
        uid: user.uid,
        referralId: Utils.generateReferralId(),
        fechaRegistro: new Date(),
        plan: "basic",
        estado: "trial",
      };

      console.log("Intentando crear documento en Firestore...");
      try {
        await setDoc(doc(db, "usuarios", user.uid), userData);
        console.log("✅ Documento creado exitosamente");
      } catch (dbError) {
        console.error("❌ ERROR al crear documento:", dbError);
        console.error("Código:", dbError.code);
        console.error("Mensaje:", dbError.message);
      }

      Utils.hideLoading();
      Utils.showToast("¡Cuenta creada!", "Ahora completa tus datos personales", "success");
      setTimeout(() => {
        window.location.href = "usuario.html";
      }, 1000);
    } else {
      console.log("=== LOGIN con email ===");
      // LOGIN
      await signInWithEmailAndPassword(auth, email, password);
      console.log("Login exitoso");
      Utils.hideLoading();
      Utils.showToast("¡Bienvenido!", "Has iniciado sesión correctamente", "success");
      redirectHandled = true;
      await redirectAfterLogin(auth.currentUser);
    }
  } catch (error) {
    Utils.hideLoading();
    console.error("Error en login/registro:", error);
    let errorMessage = "Error al procesar la solicitud";
    switch (error.code) {
      case "auth/user-not-found": 
        errorMessage = "No existe una cuenta con este email"; 
        break;
      case "auth/wrong-password": 
        errorMessage = "Contraseña incorrecta"; 
        break;
      case "auth/email-already-in-use": 
        errorMessage = "Este email ya está registrado. ¿Quieres iniciar sesión?"; 
        break;
      case "auth/weak-password": 
        errorMessage = "La contraseña debe tener al menos 6 caracteres"; 
        break;
      case "auth/too-many-requests": 
        errorMessage = "Demasiados intentos. Intenta más tarde"; 
        break;
      default: 
        errorMessage = error.message;
    }
    Utils.showToast("Error", errorMessage, "error");
  }
});

// ==========================
// 🔑 Google login usando Redirect
// ==========================
window.addEventListener("load", async () => {
  console.log("=== Window load - Verificando redirect de Google ===");
  Utils.showLoading("Verificando sesión...");
  
  try {
    const result = await getRedirectResult(auth);
    console.log("getRedirectResult:", result ? "Usuario detectado" : "Sin resultado");
    
    if (result && result.user) {
      const user = result.user;
      console.log("Usuario de Google:", user.email, "UID:", user.uid);
      
      const userDocRef = doc(db, "usuarios", user.uid);
      const userDoc = await getDoc(userDocRef);
      console.log("Documento existe en Firestore?:", userDoc.exists());
      
      if (!userDoc.exists()) {
        console.log("Creando documento para usuario de Google...");
        
        // Dividir nombre completo en nombre y apellido
        const fullName = user.displayName || "";
        const nameParts = fullName.split(" ");
        const nombre = nameParts[0] || "";
        const apellido = nameParts.slice(1).join(" ") || "";

        // Crear doc usuario básico (sin campos vacíos)
        const userData = {
          email: user.email,
          uid: user.uid,
          referralId: Utils.generateReferralId(),
          fechaRegistro: new Date(),
          plan: "basic",
          estado: "trial",
        };

        // Solo agregar nombre/apellido si existen
        if (nombre) userData.nombre = nombre;
        if (apellido) userData.apellido = apellido;

        console.log("Datos a guardar:", userData);

        try {
          await setDoc(userDocRef, userData);
          console.log("✅ Documento creado exitosamente en Firestore");
        } catch (dbError) {
          console.error("❌ ERROR al crear documento:", dbError);
          console.error("Código:", dbError.code);
          console.error("Mensaje:", dbError.message);
        }
      }
      
      Utils.hideLoading();
      Utils.showToast("¡Bienvenido!", "Has iniciado sesión con Google", "success");
      redirectHandled = true;
      await redirectAfterLogin(user);
    } else {
      console.log("No hay resultado de redirect");
      Utils.hideLoading();
    }
  } catch (error) {
    Utils.hideLoading();
    console.error("❌ Error en getRedirectResult:", error);
    console.error("Código:", error.code);
    console.error("Mensaje:", error.message);
    Utils.showToast("Error", "No se pudo iniciar sesión con Google", "error");
  }
});

document.getElementById("googleLogin")?.addEventListener("click", async () => {
  console.log("=== Iniciando login con Google ===");
  try {
    Utils.showLoading("Conectando con Google...");
    await signInWithRedirect(auth, provider);
  } catch (error) {
    Utils.hideLoading();
    console.error("Error al iniciar redirect:", error);
    Utils.showToast("Error", "No se pudo iniciar sesión con Google", "error");
  }
});

// ==========================
// 🔑 Password reset
// ==========================
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

// ==========================
// 🔄 Detectar sesión activa
// ==========================
onAuthStateChanged(auth, async (user) => {
  console.log("=== onAuthStateChanged disparado ===");
  console.log("Usuario:", user ? user.email : "null");
  console.log("redirectHandled:", redirectHandled);
  
  const loadingOverlay = document.getElementById("loadingOverlay");
  
  if (user && !redirectHandled) {
    console.log("Hay usuario y no se manejó redirect aún");
    await redirectAfterLogin(user);
  } else if (!user) {
    console.log("No hay usuario autenticado");
    if (loadingOverlay) loadingOverlay.classList.remove("show");
  } else {
    console.log("Usuario ya fue redirigido");
  }
});
