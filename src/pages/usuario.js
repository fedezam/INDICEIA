//src/pages/usuario.js
// =========================
// 📦 IMPORTS
// =========================
import { auth, db } from '../firebase.js';
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { fillProvinciaSelector } from "../shared/provincias.js";

// =========================
// 🔧 Utils
// =========================
class Utils {
  static generateReferralId() {
    return Math.random().toString(36).substring(2, 10).toUpperCase();
  }

  static showMessage(msg) {
    alert(msg);
  }

  static enableIAButtons() {
    const comercioBtn = document.getElementById("btnComercio");
    const servicioBtn = document.getElementById("btnServicio");

    [comercioBtn, servicioBtn].forEach((btn) => {
      if (btn) {
        btn.disabled = false;
        btn.style.background = "#667eea";
        btn.style.color = "#fff";
        btn.style.cursor = "pointer";
      }
    });
  }

  static disableIAButtons() {
    const comercioBtn = document.getElementById("btnComercio");
    const servicioBtn = document.getElementById("btnServicio");

    [comercioBtn, servicioBtn].forEach((btn) => {
      if (btn) {
        btn.disabled = true;
        btn.style.background = "#ccc";
        btn.style.color = "#666";
        btn.style.cursor = "not-allowed";
      }
    });
  }

  // ✅ Verificar que TODOS los campos obligatorios estén completos
  static isProfileComplete(data) {
    return !!(
      data.nombre &&
      data.apellido &&
      data.mail &&
      data.direccion &&
      data.pais &&
      data.provincia &&
      data.localidad &&
      data.fechaNacimiento &&
      data.telefono
    );
  }

  static fillForm(data) {
    const setValueSafe = (id, value) => {
      const el = document.getElementById(id);
      if (el) el.value = value || "";
    };

    setValueSafe("nombre", data.nombre);
    setValueSafe("apellido", data.apellido);
    setValueSafe("mail", data.mail);  // ✅ Agregar mail
    setValueSafe("direccion", data.direccion);
    setValueSafe("pais", data.pais);
    setValueSafe("provincia", data.provincia);
    setValueSafe("localidad", data.localidad);
    setValueSafe("barrio", data.barrio);
    setValueSafe("fechaNacimiento", data.fechaNacimiento);
    setValueSafe("telefono", data.telefono);
  }
}

// =========================
// 👤 Sesión
// =========================
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "/";
    return;
  }

  console.log("Usuario autenticado:", user.uid);

  const userRef = doc(db, "usuarios", user.uid);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) {
    console.log("Creando documento base para nuevo usuario...");
    await setDoc(userRef, {
      email: user.email,
      uid: user.uid,
      referralId: Utils.generateReferralId(),
      fechaRegistro: new Date()
    });
    // ✅ Usuario nuevo = botones deshabilitados
    Utils.disableIAButtons();
  } else {
    const userData = userSnap.data();
    
    // Autocompletar datos existentes
    Utils.fillForm(userData);
    
    // ✅ SOLO habilitar botones si el perfil está COMPLETO
    if (Utils.isProfileComplete(userData)) {
      console.log("✅ Perfil completo - Habilitando botones IA");
      Utils.enableIAButtons();
    } else {
      console.log("⚠️ Perfil incompleto - Botones deshabilitados");
      Utils.disableIAButtons();
    }
  }

  const emailEl = document.getElementById("userEmail");
  if (emailEl) emailEl.innerText = user.email;

  // Cargar provincias al cambiar país
  const paisEl = document.getElementById("pais");
  if (paisEl) {
    paisEl.addEventListener('change', (e) => {
      loadProvinciasForCountry(e.target.value);
    });
    // Cargar provincias iniciales para Argentina
    const initialCountry = paisEl.value || 'Argentina';
    loadProvinciasForCountry(initialCountry);
  }
});

// =========================
// 💾 Guardar datos personales
// =========================
const guardarBtn = document.getElementById("saveUserData");
if (guardarBtn) {
  guardarBtn.addEventListener("click", async () => {
    const user = auth.currentUser;
    if (!user) return Utils.showMessage("No hay sesión activa.");

    const nombre = document.getElementById("nombre").value.trim();
    const apellido = document.getElementById("apellido").value.trim();
    const mail = document.getElementById("mail").value.trim();
    const direccion = document.getElementById("direccion").value.trim();
    const pais = document.getElementById("pais").value.trim();
    const provincia = document.getElementById("provincia").value.trim();
    const localidad = document.getElementById("localidad").value.trim();
    const barrio = document.getElementById("barrio").value.trim();
    const fechaNacimiento = document.getElementById("fechaNacimiento").value;
    const telefono = document.getElementById("telefono")?.value.trim();

    if (!nombre || !apellido || !mail || !direccion || !pais || !provincia || !localidad || !fechaNacimiento || !telefono) {
      return Utils.showMessage("Por favor, completa todos los campos obligatorios (incluyendo teléfono).");
    }

    const userRef = doc(db, "usuarios", user.uid);

    try {
      await setDoc(
        userRef,
        {
          nombre,
          apellido,
          mail,  // ✅ Guardar el mail también
          direccion,
          pais,
          provincia,
          localidad,
          barrio: barrio || null,
          fechaNacimiento,
          telefono,  // ✅ Ahora es obligatorio
          actualizado: new Date()
        },
        { merge: true }
      );

      Utils.showMessage("Datos guardados correctamente ✅");
      
      // ✅ Ahora SÍ habilitar los botones después de guardar
      Utils.enableIAButtons();
    } catch (error) {
      console.error("Error al guardar datos:", error);
      Utils.showMessage("Ocurrió un error al guardar los datos.");
    }
  });
}

// =========================
// ⚡ Botones de creación de IA
// =========================
const comercioBtn = document.getElementById("btnComercio");
if (comercioBtn) {
  comercioBtn.addEventListener("click", () => {
    window.location.href = "../pages/mi-comercio.html";
  });
}

const servicioBtn = document.getElementById("btnServicio");
if (servicioBtn) {
  servicioBtn.addEventListener("click", () => {
    window.location.href = "../pages/servicio.html";
  });
}

// =========================
// 🚪 Cerrar sesión
// =========================
// Usar la función global de main.js via onclick en HTML
// Si prefieres manejarla aquí, descomenta:
/*
const logoutBtn = document.getElementById("logoutBtn");
if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    try {
      await signOut(auth);
      window.location.href = "../../index.html";
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
    }
  });
}
*/

// =========================
// 🌎 Función para cargar provincias
// =========================
function loadProvinciasForCountry(country) {
  const provinciaEl = document.getElementById("provincia");
  if (!provinciaEl) return;

  // Limpiar opciones actuales
  provinciaEl.innerHTML = '<option value="">Selecciona una provincia</option>';

  // Llamar a la función importada para llenar el selector
  fillProvinciaSelector(country, provinciaEl);
}
