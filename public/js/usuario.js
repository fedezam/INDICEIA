import { auth, db } from "./firebase.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";
import { fillProvinciaSelector } from "./provincias.js";

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
        btn.style.background = "#e2e8f0";
        btn.style.color = "#94a3b8";
        btn.style.cursor = "not-allowed";
      }
    });
  }

  static fillForm(data) {
    const setValueSafe = (id, value) => {
      const el = document.getElementById(id);
      if (el) el.value = value || "";
    };

    setValueSafe("nombre", data.nombre);
    setValueSafe("apellido", data.apellido);
    setValueSafe("telefono", data.telefono);
    setValueSafe("direccion", data.direccion);
    setValueSafe("pais", data.pais);
    setValueSafe("provincia", data.provincia);
    setValueSafe("localidad", data.localidad);
    setValueSafe("barrio", data.barrio);
    setValueSafe("fechaNacimiento", data.fechaNacimiento);
  }
}

// =========================
// 👤 Sesión
// =========================
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "index.html";
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
  } else {
    const userData = userSnap.data();
    Utils.fillForm(userData);
  }

  Utils.disableIAButtons(); // Bloquear botones hasta guardar

  const emailEl = document.getElementById("userEmail");
  if (emailEl) emailEl.innerText = user.email;

  // Cargar provincias al cambiar país
  const paisEl = document.getElementById("pais");
  if (paisEl) {
    paisEl.addEventListener('change', (e) => loadProvinciasForCountry(e.target.value));
    loadProvinciasForCountry(paisEl.value);
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
    const telefono = document.getElementById("telefono").value.trim();
    const direccion = document.getElementById("direccion").value.trim();
    const pais = document.getElementById("pais").value.trim();
    const provincia = document.getElementById("provincia").value.trim();
    const localidad = document.getElementById("localidad").value.trim();
    const barrio = document.getElementById("barrio").value.trim();
    const fechaNacimiento = document.getElementById("fechaNacimiento").value;

    if (!nombre || !apellido || !telefono || !direccion || !pais || !provincia || !localidad || !fechaNacimiento) {
      return Utils.showMessage("Por favor, completa todos los campos obligatorios.");
    }

    const userRef = doc(db, "usuarios", user.uid);

    try {
      await setDoc(
        userRef,
        {
          nombre,
          apellido,
          telefono,
          direccion,
          pais,
          provincia,
          localidad,
          barrio: barrio || null,
          fechaNacimiento,
          actualizado: new Date()
        },
        { merge: true }
      );

      Utils.showMessage("Datos guardados correctamente ✅");
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
    if (comercioBtn.disabled) return Utils.showMessage("Debes completar y guardar tus datos antes de continuar.");
    window.location.href = "mi-comercio.html";
  });
}

const servicioBtn = document.getElementById("btnServicio");
if (servicioBtn) {
  servicioBtn.addEventListener("click", () => {
    if (servicioBtn.disabled) return Utils.showMessage("Debes completar y guardar tus datos antes de continuar.");
    window.location.href = "servicio.html";
  });
}

// =========================
// 🚪 Cerrar sesión
// =========================
const logoutBtn = document.getElementById("logoutBtn");
if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    await signOut(auth);
    window.location.href = "index.html";
  });
}

// =========================
// 🌎 Función para cargar provincias
// =========================
function loadProvinciasForCountry(country) {
  const provinciaEl = document.getElementById("provincia");
  if (!provinciaEl) return;
  provinciaEl.innerHTML = '<option value="">Selecciona una provincia</option>';
  fillProvinciaSelector(country, provinciaEl);
}
