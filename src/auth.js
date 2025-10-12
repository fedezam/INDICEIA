import { auth, db, provider } from './firebase.js';
import { signInWithPopup, onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";

// ==========================
// 🔧 Utils
// ==========================
class Utils {
  static generateReferral() {
    return Math.random().toString(36).substring(2,8).toUpperCase();
  }
  static showToast(msg) {
    alert(msg);
  }
}

// ==========================
// 🔑 Login con Google
// ==========================
const googleBtn = document.getElementById("googleLogin");
if (googleBtn) {
  googleBtn.addEventListener("click", async () => {
    try {
      console.log("🟢 Iniciando login con Google...");
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // --------------------------
      // 📛 Procesar nombre y apellido
      // --------------------------
      const fullNameRaw = (user.displayName || "").trim().replace(/\s+/g, " ");
      let nombre = "SinNombre";
      let apellido = "SinApellido";

      if (fullNameRaw) {
        const parts = fullNameRaw.split(" ");
        nombre = parts[0];
        apellido = parts.slice(1).join(" ") || "SinApellido";
      }

      const email = user.email || (user.providerData[0]?.email ?? "sin-email@desconocido.com");

      // --------------------------
      // 🔍 Verificar si usuario ya existe
      // --------------------------
      const userRef = doc(db, "usuarios", user.uid);
      const existingDoc = await getDoc(userRef);
      const alreadyExists = existingDoc.exists();

      const referralId = alreadyExists
        ? existingDoc.data().referralId
        : Utils.generateReferral();

      // --------------------------
      // 💾 Preparar datos a guardar
      // --------------------------
      const dataToSave = {
        uid: user.uid,
        email,
        nombre,
        apellido,
        displayName: fullNameRaw || `${nombre} ${apellido}`,
        photoURL: user.photoURL || "",
        fechaRegistro: alreadyExists ? existingDoc.data().fechaRegistro : serverTimestamp(),
        referralId
      };

      console.log("📦 Datos a guardar en Firestore:", dataToSave);

      // --------------------------
      // 💾 Guardar / actualizar con merge
      // --------------------------
      await setDoc(userRef, dataToSave, { merge: true });

      // --------------------------
      // 🔎 Verificar inmediatamente
      // --------------------------
      const verifyDoc = await getDoc(userRef);
      console.log("🔎 Documento verificado en Firestore:", verifyDoc.exists() ? verifyDoc.data() : "NO EXISTE");

      Utils.showToast(`Bienvenido ${nombre} 👋 Tu cuenta fue sincronizada.`);

      // --------------------------
      // 🔁 Redirección
      // --------------------------
      setTimeout(() => {
        window.location.href = "/src/pages/usuario.html";
      }, 800);

    } catch (error) {
      console.error("🔥 Error en login con Google:", error);
      Utils.showToast("Error al iniciar sesión con Google: " + error.message);
    }
  });
}

// ==========================
// 🔄 Detectar sesión activa (solo logs)
// ==========================
onAuthStateChanged(auth, user => {
  if (user) console.log("🔒 Usuario logueado:", user.email);
  else console.log("🕳️ No hay usuario logueado");
});
