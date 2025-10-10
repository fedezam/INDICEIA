// src/auth.js
import { auth, db, provider } from "./firebase.js";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  onAuthStateChanged
} from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";

// ==========================
// ⚙️ Utils
// ==========================
class Utils {
  static validateEmail(email) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email); }
  static validatePassword(password) { return password.length >= 6; }
  static showToast(msg) { alert(msg); }
  static generateReferral() { return Math.random().toString(36).substring(2,8).toUpperCase(); }
}

// ==========================
// 🔄 Toggle login / registro
// ==========================
const emailLoginForm = document.getElementById("emailLogin");
const toggleLink = document.getElementById("toggleModeLink");
const repeatPasswordGroup = document.getElementById("repeatPasswordGroup");
const btnText = document.getElementById("btnText");
const loginSubtitle = document.getElementById("loginSubtitle");

toggleLink.addEventListener("click", e => {
  e.preventDefault();
  const isRegister = emailLoginForm.dataset.register === "true";
  emailLoginForm.dataset.register = (!isRegister).toString();

  if (!isRegister) {
    // Cambiar a registro
    repeatPasswordGroup.style.display = "block";
    btnText.textContent = "Crear Cuenta";
    loginSubtitle.textContent = "Crea tu cuenta y empieza gratis";
    toggleLink.innerHTML = '¿Ya tienes cuenta? <a href="#">Inicia sesión aquí</a>';
  } else {
    // Cambiar a login
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
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      user = cred.user;
      await setDoc(doc(db, "usuarios", user.uid), {
        email: user.email,
        uid: user.uid,
        fechaRegistro: new Date(),
        referralId: Utils.generateReferral()
      });
    } else {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      user = cred.user;
    }
    window.location.href = "usuario.html";
  } catch (error) {
    Utils.showToast(error.message);
  }
});

// ==========================
// 🔑 Login Google
// ==========================
document.getElementById("googleLogin")?.addEventListener("click", async () => {
  try {
    const result = await signInWithPopup(auth, provider);
    const user = result.user;
    
    // Verificar si es nuevo usuario y crear documento
    const userRef = doc(db, "usuarios", user.uid);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      await setDoc(userRef, {
        email: user.email,
        uid: user.uid,
        fechaRegistro: new Date(),
        referralId: Utils.generateReferral()
      });
    }
    
    // Redirigir
    window.location.href = "usuario.html";
  } catch(e) { 
    console.error("Error en login Google:", e);
    Utils.showToast("Error al iniciar sesión con Google: " + e.message); 
  }
});

// ==========================
// 🔄 Detectar sesión activa
// ==========================
onAuthStateChanged(auth, user => {
  if (user) console.log("Usuario logueado:", user.email);
});
