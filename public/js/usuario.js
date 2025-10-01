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
    if (!container) {
      console.error("Toast container no encontrado");
      return;
    }

    const toast = document.createElement("div");
    toast.className = `toast ${type} show`;
    
    const iconMap = {
      success: "fa-check-circle",
      error: "fa-times-circle",
      warning: "fa-exclamation-triangle",
      info: "fa-info-circle"
    };
    
    toast.innerHTML = `
      <i class="fas ${iconMap[type] || iconMap.info}"></i>
      <div class="toast-content">
        <div class="toast-message">${message}</div>
      </div>
      <button class="toast-close">✖</button>
    `;
    
    const closeBtn = toast.querySelector(".toast-close");
    closeBtn.addEventListener("click", () => toast.remove());
    
    container.appendChild(toast);
    setTimeout(() => {
      toast.classList.remove("show");
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }

  static validateForm() {
    let valid = true;
    const inputs = document.querySelectorAll("#usuarioForm input[required]");
    
    inputs.forEach(input => {
      if (!input.value.trim()) {
        input.classList.add("error");
        valid = false;
      } else {
        input.classList.remove("error");
      }
    });
    
    return valid;
  }

  static enableButtons() {
    const comercioBtn = document.getElementById("btnComercio");
    const servicioBtn = document.getElementById("btnServicio");
    
    if (comercioBtn) {
      comercioBtn.disabled = false;
      comercioBtn.style.background = "#667eea";
      comercioBtn.style.cursor = "pointer";
    }
    
    if (servicioBtn) {
      servicioBtn.disabled = false;
      servicioBtn.style.background = "#667eea";
      servicioBtn.style.cursor = "pointer";
    }
  }

  static disableButtons() {
    const comercioBtn = document.getElementById("btnComercio");
    const servicioBtn = document.getElementById("btnServicio");
    
    if (comercioBtn) {
      comercioBtn.disabled = true;
      comercioBtn.style.background = "#e0e0e0";
      comercioBtn.style.cursor = "not-allowed";
    }
    
    if (servicioBtn) {
      servicioBtn.disabled = true;
      servicioBtn.style.background = "#e0e0e0";
      servicioBtn.style.cursor = "not-allowed";
    }
  }
}

// ===============================
// 📌 Guardar datos de usuario
// ===============================
async function saveUserData(user) {
  const nombre = document.getElementById("nombre").value.trim();
  const apellido = document.getElementById("apellido").value.trim();
  const direccion = document.getElementById("direccion").value.trim();
  const pais = document.getElementById("pais").value.trim();
  const provincia = document.getElementById("provincia").value.trim();
  const localidad = document.getElementById("localidad").value.trim();
  const barrio = document.getElementById("barrio").value.trim();
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
      creado: new Date(),
      actualizado: new Date()
    }, { merge: true });

    Utils.showToast("✓ Datos guardados correctamente", "success");
    Utils.enableButtons();

  } catch (error) {
    console.error("Error al guardar datos:", error);
    Utils.showToast("Error al guardar los datos. Inténtalo de nuevo.", "error");
  }
}

// ===============================
// 📥 Cargar datos existentes
// ===============================
async function loadUserData(user) {
  try {
    const docSnap = await getDoc(doc(db, "usuarios", user.uid));
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      console.log("Datos cargados:", data);
      
      // Rellenar campos
      if (data.nombre) document.getElementById("nombre").value = data.nombre;
      if (data.apellido) document.getElementById("apellido").value = data.apellido;
      if (data.direccion) document.getElementById("direccion").value = data.direccion;
      if (data.pais) document.getElementById("pais").value = data.pais;
      if (data.provincia) document.getElementById("provincia").value = data.provincia;
      if (data.localidad) document.getElementById("localidad").value = data.localidad;
      if (data.barrio) document.getElementById("barrio").value = data.barrio;
      if (data.nacimiento) document.getElementById("nacimiento").value = data.nacimiento;
      
      // Habilitar botones si los datos están completos
      const camposCompletos = data.nombre && data.apellido && data.direccion && 
                              data.pais && data.provincia && data.localidad && data.nacimiento;
      
      if (camposCompletos) {
        Utils.enableButtons();
      }
    }
  } catch (error) {
    console.error("Error al cargar datos:", error);
  }
}

// ===============================
// 🟢 Eventos de botones
// ===============================
document.addEventListener("DOMContentLoaded", () => {
  const saveBtn = document.getElementById("btnGuardar");
  const comercioBtn = document.getElementById("btnComercio");
  const servicioBtn = document.getElementById("btnServicio");
  const logoutBtn = document.getElementById("logoutBtn");

  // Guardar datos
  if (saveBtn) {
    saveBtn.addEventListener("click", async () => {
      if (!Utils.validateForm()) {
        Utils.showToast("Por favor completa todos los campos obligatorios", "warning");
        return;
      }
      
      const user = auth.currentUser;
      if (user) {
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';
        
        await saveUserData(user);
        
        saveBtn.disabled = false;
        saveBtn.innerHTML = '<i class="fas fa-save"></i> Guardar Datos';
      } else {
        Utils.showToast("No hay sesión activa. Por favor inicia sesión.", "error");
      }
    });
  }

  // Ir a comercio
  if (comercioBtn) {
    comercioBtn.addEventListener("click", () => {
      if (!comercioBtn.disabled) {
        window.location.href = "mi-comercio.html";
      }
    });
  }

  // Ir a servicio
  if (servicioBtn) {
    servicioBtn.addEventListener("click", () => {
      if (!servicioBtn.disabled) {
        window.location.href = "mi-servicio.html";
      }
    });
  }

  // Logout
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      try {
        await signOut(auth);
        Utils.showToast("Sesión cerrada correctamente", "success");
        setTimeout(() => {
          window.location.href = "index.html";
        }, 1000);
      } catch (error) {
        console.error("Error al cerrar sesión:", error);
        Utils.showToast("Error al cerrar sesión", "error");
      }
    });
  }

  // Validación en tiempo real
  const inputs = document.querySelectorAll("#usuarioForm input[required]");
  inputs.forEach(input => {
    input.addEventListener("blur", () => {
      if (!input.value.trim()) {
        input.classList.add("error");
      } else {
        input.classList.remove("error");
      }
    });
    
    input.addEventListener("input", () => {
      if (input.classList.contains("error") && input.value.trim()) {
        input.classList.remove("error");
      }
    });
  });
});

// ===============================
// 🔄 Sesión activa
// ===============================
onAuthStateChanged(auth, async (user) => {
  if (user) {
    console.log("Usuario activo:", user.email);
    await loadUserData(user);
  } else {
    console.log("No hay sesión activa, redirigiendo...");
    window.location.href = "index.html";
  }
});
