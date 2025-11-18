// =========================
// 📦 IMPORTS
// =========================
import { auth, db } from "../firebase.js";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { fillProvinciaSelector } from "../shared/provincias.js";
import { runFlowController } from "../controllers/flowController.js";

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

  const emailEl = document.getElementById("userEmail");
  if (emailEl) emailEl.innerText = user.email;

  const paisEl = document.getElementById("pais");

  // ===========================
  // 1️⃣ Primero cargamos provincias
  // ===========================
  if (paisEl) {
    paisEl.addEventListener("change", (e) => {
      loadProvinciasForCountry(e.target.value);
    });

    loadProvinciasForCountry(paisEl.value || "Argentina");
  }

  // Esperar un tick para que las provincias carguen
  await new Promise((res) => setTimeout(res, 50));

  // ===========================
  // 2️⃣ Recién ahora cargamos datos del usuario
  // ===========================
  if (!userSnap.exists()) {
    console.log("Creando documento base para nuevo usuario...");
    await setDoc(userRef, {
      email: user.email,
      uid: user.uid,
      referralId: Utils.generateReferralId(),
      fechaRegistro: new Date(),
      onboardingSteps: {
        usuario: false,
      },
    });
    Utils.disableIAButtons();
  } else {
    const userData = userSnap.data();

    Utils.fillForm(userData);

    if (Utils.isProfileComplete(userData)) {
      console.log("✅ Perfil completo - Habilitando IA");
      Utils.enableIAButtons();
    } else {
      console.log("⚠️ Perfil incompleto - Deshabilitando IA");
      Utils.disableIAButtons();
    }
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
      return Utils.showMessage("Por favor, completa todos los campos obligatorios.");
    }

    const userRef = doc(db, "usuarios", user.uid);

    try {
      // 1️⃣ Guardar datos personales
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
          actualizado: new Date(),
        },
        { merge: true }
      );

      console.log("✅ Datos de usuario guardados");

      // 2️⃣ Marcar paso "usuario" en el usuario
      await setDoc(
        userRef,
        {
          onboardingSteps: {
            usuario: true,
          },
        },
        { merge: true }
      );

      console.log("✅ Paso 'usuario' marcado en usuario");

      // 3️⃣ Marcar paso en comercio (si existe)
      const newSnap = await getDoc(userRef);
      const comercioId = newSnap.data()?.comercioId;

      if (comercioId) {
        const comercioRef = doc(db, "comercios", comercioId);

        await setDoc(
          comercioRef,
          {
            "onboardingSteps.usuario": true,
          },
          { merge: true }
        );

        console.log("✅ Paso 'usuario' marcado también en comercio:", comercioId);
      }

      Utils.showMessage("Datos guardados correctamente ✅");
      Utils.enableIAButtons();

      // Ejecutar Flow Controller después de un segundo
      setTimeout(() => {
        runFlowController(user.uid);
      }, 1000);

    } catch (error) {
      console.error("❌ Error al guardar datos:", error);
      Utils.showMessage("Ocurrió un error al guardar los datos.");
    }
  });
}

// =========================
// ⚡ Botones IA
// =========================
const comercioBtn = document.getElementById("btnComercio");
if (comercioBtn) {
  comercioBtn.addEventListener("click", () => {
    window.location.href = "../mi-comercio.html";
  });
}

const servicioBtn = document.getElementById("btnServicio");
if (servicioBtn) {
  servicioBtn.addEventListener("click", () => {
    window.location.href = "../servicio.html";
  });
}

// =========================
// 🌎 Provincias
// =========================
function loadProvinciasForCountry(country) {
  const provinciaEl = document.getElementById("provincia");
  if (!provinciaEl) return;

  provinciaEl.innerHTML = '<option value="">Selecciona una provincia</option>';
  fillProvinciaSelector(country, provinciaEl);
}
