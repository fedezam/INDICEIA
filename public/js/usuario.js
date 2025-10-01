// usuario.js
import { auth, db, provider } from "./firebase.js";
import { 
  onAuthStateChanged, 
  signOut 
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";
import { 
  doc, 
  setDoc, 
  getDoc 
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

// ===============================
// ⚙️ Utils
// ===============================
class Utils {
  static showToast(message, type = "success") {
    const container = document.getElementById("toastContainer");
    if (!container) return;

    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.innerHTML = `
      <span>${message}</span>
      <button onclick="this.parentElement.remove()">✖</button>
    `;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
  }

  static validateForm() {
    let valid = true;
    document.querySelectorAll("input[required]").forEach(input => {
      if (!input.value.trim()) {
        input.classList.add("error");
        valid = false;
      } else {
        input.classList.remove("error");
      }
    });
    return valid;
  }
}

// ===============================
// 📌 Guardar datos de usuario
// ===============================
async function saveUserData(user) {
  const nombre = document.getElementById("nombre").value;
  const apellido = document.getElementById("apellido").value;
  const direccion = document.getElementById("direccion").value;
  const pais = document.getElementById("pais").value;
  const provincia = document.getElementById("provincia").value;
  const localidad = document.getElementById("localidad").value;
  const barrio = document.getElementById("barrio").value;
  const nacimiento = document.getElementById("nacimiento").value;

  try {
    await setDoc(doc(db, "usuarios", user.uid), {
      uid: user.uid,
      email: user.email,
      nombre,
      apellido,
      direccion,
      pais,
      provincia,
      localidad,
      barrio,
      nacimiento,
      creado: new Date()
    }, { merge: true });

    Utils.showToast("Datos guardados correctamente", "success");
    document.getElementById("btnComercio").disabled = false;
    document.getElementById("btnServicio").disabled = false;

  } catch (error) {
    console.error("Error al guardar datos:", error);
    Utils.showToast("No se pudieron guardar los datos", "error");
  }
}

// ===============================
// 🟢 Eventos de botones
// ===============================
document.addEventListener("DOMContentLoaded", () => {
  const saveBtn = document.getElementById("btnGuardar");
  const comercioBtn = document.getElementById("btnComercio");
  const servicioBtn = document.getElementById("btnServicio");

  if (saveBtn) {
    saveBtn.addEventListener("click", async () => {
      if (!Utils.validateForm()) {
        Utils.showToast("Completa todos los campos obligatorios", "error");
        return;
      }
      const user = auth.currentUser;
      if (user) {
        await saveUserData(user);
      } else {
        Utils.showToast("No hay sesión activa", "error");
      }
    });
  }

  if (comercioBtn) {
    comercioBtn.addEventListener("click", () => {
      window.location.href = "mi-comercio.html";
    });
  }

  if (servicioBtn) {
    servicioBtn.addEventListener("click", () => {
      window.location.href = "mi-servicio.html";
    });
  }
});

// ===============================
// 🔄 Sesión activa
// ===============================
onAuthStateChanged(auth, async (user) => {
  if (user) {
    console.log("Usuario activo:", user.email);
    const docSnap = await getDoc(doc(db, "usuarios", user.uid));
    if (docSnap.exists()) {
      console.log("Datos de usuario:", docSnap.data());
    }
  } else {
    console.log("No hay sesión, redirigiendo...");
    window.location.href = "index.html";
  }
});

// ===============================
// 🚪 Logout (opcional)
// ===============================
document.getElementById("logoutBtn")?.addEventListener("click", async () => {
  await signOut(auth);
  window.location.href = "index.html";
});
