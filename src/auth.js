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
import { doc, setDoc, getDoc } from "firebase/firestore";

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
    console.log("🌐 Abriendo popup Google...");
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      console.log("✅ Login Google OK:", user.email);
      
      // 🔍 DEBUG: Ver qué datos trae Google
      console.log("📋 Datos completos del usuario:", {
        displayName: user.displayName,
        email: user.email,
        photoURL: user.photoURL,
        uid: user.uid
      });

      // Crear doc si es nuevo
      const userRef = doc(db, "usuarios", user.uid);
      const userDoc = await getDoc(userRef);
      if (!userDoc.exists()) {
        console.log("🆕 Usuario nuevo, creando doc...");
        
        // Extraer nombre y apellido del displayName
        const displayName = user.displayName || "";
        const nameParts = displayName.trim().split(" ");
        const nombre = nameParts[0] || "";
        const apellido = nameParts.slice(1).join(" ") || "";
        
        console.log("📝 Guardando:", { nombre, apellido, displayName });
        
        await setDoc(userRef, {
          email: user.email,
          uid: user.uid,
          nombre: nombre,
          apellido: apellido,
          displayName: user.displayName,
          photoURL: user.photoURL || null,
          fechaRegistro: new Date(),
          referralId: Utils.generateReferral()
        });
        
        console.log("✅ Documento guardado con nombre y apellido");
      } else {
        console.log("📂 Usuario ya existe en Firestore");
      }

      window.location.href = "/src/pages/usuario.html";
    } catch(e) { 
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
