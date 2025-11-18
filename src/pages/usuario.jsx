//src/pages/usuario.jsx
// =========================
// 📦 IMPORTS
// =========================
import { auth, db } from '../firebase.js';
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { fillProvinciaSelector } from "../shared/provincias.js";
import { runFlowController } from '../controllers/flowController.js';

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

  // ✅ Verificar que TODOS los campos obligatorios estén completos EN FIRESTORE
  static isProfileComplete(data) {
    const required = [
      data.nombre,
      data.apellido,
      data.mail,
      data.direccion,
      data.pais,
      data.provincia,
      data.localidad,
      data.fechaNacimiento,
      data.telefono
    ];
    
    const allFilled = required.every(field => field && String(field).trim() !== "");
    
    console.log("🔍 Verificando perfil:", {
      completo: allFilled,
      provincia: data.provincia || "❌ FALTA",
      campos: {
        nombre: !!data.nombre,
        apellido: !!data.apellido,
        mail: !!data.mail,
        direccion: !!data.direccion,
        pais: !!data.pais,
        provincia: !!data.provincia,
        localidad: !!data.localidad,
        fechaNacimiento: !!data.fechaNacimiento,
        telefono: !!data.telefono
      }
    });
    
    return allFilled;
  }

  static fillForm(data) {
    const setValueSafe = (id, value) => {
      const el = document.getElementById(id);
      if (el) el.value = value || "";
    };

    setValueSafe("nombre", data.nombre);
    setValueSafe("apellido", data.apellido);
    setValueSafe("mail", data.mail);
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
    
    // 1️⃣ PRIMERO: Cargar las provincias del país correcto
    const paisEl = document.getElementById("pais");
    const initialCountry = userData.pais || paisEl?.value || "Argentina";
    loadProvinciasForCountry(initialCountry);
    
    // 2️⃣ SEGUNDO: Esperar a que el DOM se actualice ANTES de llenar el form
    requestAnimationFrame(() => {
      // Ahora sí llenar el formulario (provincia ya tiene opciones disponibles)
      Utils.fillForm(userData);
      
      // 3️⃣ TERCERO: Verificar perfil con los datos de FIRESTORE, no del DOM
      if (Utils.isProfileComplete(userData)) {
        console.log("✅ Perfil completo (según Firestore) - Habilitando botones IA");
        Utils.enableIAButtons();
      } else {
        console.log("⚠️ Perfil incompleto - Botones deshabilitados");
        Utils.disableIAButtons();
      }
    });
  }

  const emailEl = document.getElementById("userEmail");
  if (emailEl) emailEl.innerText = user.email;

  // Listener para cambio de país
  const paisEl = document.getElementById("pais");
  if (paisEl) {
    paisEl.addEventListener('change', (e) => {
      loadProvinciasForCountry(e.target.value);
    });
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
      // Obtener el comercioId si existe
      const userSnap = await getDoc(userRef);
      const comercioId = userSnap.exists() ? userSnap.data().comercioId : null;

      // Guardar datos del usuario
      await setDoc(
        userRef,
        {
          nombre,
          apellido,
          mail,
          direccion,
          pais,
          provincia,
          localidad,
          barrio: barrio || null,
          fechaNacimiento,
          telefono,
          actualizado: new Date()
        },
        { merge: true }
      );

      // Si tiene comercio, marcar el paso como completado
      if (comercioId) {
        const comercioRef = doc(db, "comercios", comercioId);
        await setDoc(
          comercioRef,
          {
            'onboardingSteps.usuario': true
          },
          { merge: true }
        );
        console.log("✅ Paso 'usuario' marcado como completado");
      }

      Utils.showMessage("Datos guardados correctamente ✅");

      // ✅ Habilitar los botones después de guardar
      Utils.enableIAButtons();

      // Ejecutar flow controller después de 1 segundo
      setTimeout(() => {
        runFlowController(user.uid);
      }, 1000);
      
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
