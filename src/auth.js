// src/auth.js
import { auth, db, provider } from "./firebase.js";
import {
  signInWithPopup,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword
} from "firebase/auth";
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp
} from "firebase/firestore";

console.log("auth.js cargado ✅");

const googleBtn = document.getElementById("googleLogin");
const form = document.getElementById("emailLogin");
const toggleLink = document.getElementById("toggleModeLink");

let isRegisterMode = false;

// ===== LOGIN / REGISTER EMAIL =====
if (form) {
  form.addEventListener("submit", async e => {
    e.preventDefault();
    const email = form.querySelector("#email").value.trim();
    const password = form.querySelector("#password").value.trim();
    const repeat = form.querySelector("#repeatPassword")?.value.trim();

    try {
      if (isRegisterMode) {
        if (password !== repeat) throw new Error("Las contraseñas no coinciden");
        const res = await createUserWithEmailAndPassword(auth, email, password);
        const user = res.user;
        await setDoc(doc(db, "usuarios", user.uid), {
          uid: user.uid,
          mail: email,
          nombre: email.split("@")[0],
          apellido: "",
          referralId: Math.random().toString(36).substring(2, 10).toUpperCase(),
          fechaRegistro: serverTimestamp()
        });
        console.log("✅ Usuario registrado:", email);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        console.log("✅ Sesión iniciada:", email);
      }
      // main.js detecta el login y redirige a usuario.html
    } catch (err) {
      console.error("⚠️ Error en auth:", err);
      alert(err.message);
    }
  });
}

// ===== LOGIN GOOGLE =====
if (googleBtn) {
  googleBtn.addEventListener("click", async () => {
    console.log("🌐 Login con Google iniciado...");
    try {
      await signInWithPopup(auth, provider);
      console.log("✅ Login con Google exitoso");
      // main.js detecta el login vía onAuthStateChanged y redirige a usuario.html
    } catch (err) {
      console.error("⚠️ Error en login con Google:", err);
      alert("Error al iniciar sesión con Google: " + err.message);
    }
  });
}

// ===== CAMBIO DE MODO LOGIN / REGISTER =====
if (toggleLink) {
  toggleLink.addEventListener("click", e => {
    e.preventDefault();
    isRegisterMode = !isRegisterMode;

    const repeatGroup = document.getElementById("repeatPasswordGroup");
    const btnText = document.getElementById("btnText");
    const subtitle = document.getElementById("loginSubtitle");

    if (isRegisterMode) {
      repeatGroup.style.display = "block";
      btnText.textContent = "Registrarme";
      subtitle.textContent = "Crea tu cuenta IA personalizada";
      toggleLink.innerHTML = '¿Ya tienes cuenta? <a href="#">Inicia sesión aquí</a>';
    } else {
      repeatGroup.style.display = "none";
      btnText.textContent = "Iniciar Sesión";
      subtitle.textContent = "Tu vendedor IA personalizado";
      toggleLink.innerHTML = '¿No tienes cuenta? <a href="#">Regístrate aquí</a>';
    }
  });
}
