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
// 👤 ÚNICO onAuthStateChanged
// =========================
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "/login.html";
    return;
  }

  const userRef = doc(db, "usuarios", user.uid);
  let userSnap = await getDoc(userRef);

  // ======================
  // Nuevo usuario → crear base
  // ======================
  if (!userSnap.exists()) {
    await setDoc(userRef, {
      email: user.email,
      uid: user.uid,
      referralId: Utils.generateReferralId(),
      fechaRegistro: new Date(),
      onboardingSteps: { usuario: false }
    });
    userSnap = await getDoc(userRef);
  }

  const userData = userSnap.data();
  const comercioId = userData?.comercioId || null;

  const emailEl = document.getElementById("mail");
  if (emailEl) emailEl.value = user.email;

  // ======================
  // Provincias
  // ======================
  const paisEl = document.getElementById("pais");
  if (paisEl) {
    paisEl.addEventListener("change", (e) => loadProvinciasForCountry(e.target.value));
    loadProvinciasForCountry(paisEl.value || "Argentina");
  }

  await new Promise((res) => setTimeout(res, 50));

  // ======================
  // Cargar datos del usuario
  // ======================
  Utils.fillForm(userData);

  if (Utils.isProfileComplete(userData)) {
    Utils.enableIAButtons();
  } else {
    Utils.disableIAButtons();
  }

  // ======================
  // AHORA SÍ → FlowController con comercioId cargado
  // ======================
  await runFlowController(user.uid);
});

// =========================
// 💾 Guardar datos personales
// =========================
const guardarBtn = document.getElementById("saveUserData");
if (guardarBtn) {
  guardarBtn.addEventListener("click", async () => {
    const user = auth.currentUser;
    if (!user) return Utils.showMessage("No hay sesión activa.");

    const fields = [
      "nombre", "apellido", "mail", "direccion",
      "pais", "provincia", "localidad",
      "fechaNacimiento", "telefono"
    ];

    const data = {};
    for (const f of fields) {
      const el = document.getElementById(f);
      if (!el || !el.value.trim()) return Utils.showMessage("Completa todos los campos.");
      data[f] = el.value.trim();
    }

    const barrio = document.getElementById("barrio")?.value.trim() || null;

    const userRef = doc(db, "usuarios", user.uid);

    try {
      await setDoc(userRef, { ...data, barrio, actualizado: new Date() }, { merge: true });

      await setDoc(
        userRef,
        { onboardingSteps: { usuario: true } },
        { merge: true }
      );

      const newSnap = await getDoc(userRef);
      const comercioId = newSnap.data()?.comercioId;

      // ===========================
      // Actualizar paso en comercio
      // ===========================
      if (comercioId) {
        const comercioRef = doc(db, "comercios", comercioId);
        await setDoc(
          comercioRef,
          { onboardingSteps: { usuario: true } },
          { merge: true }
        );
      }

      Utils.showMessage("Datos guardados correctamente");
      Utils.enableIAButtons();

      await runFlowController(user.uid);

    } catch (err) {
      console.error(err);
      Utils.showMessage("Error al guardar.");
    }
  });
}

// =========================
// ⚡ Botones IA
// =========================
document.getElementById("btnComercio")?.addEventListener("click", () => {
  window.location.href = "../mi-comercio.html";
});

document.getElementById("btnServicio")?.addEventListener("click", () => {
  window.location.href = "../servicio.html";
});

// =========================
// 🌎 Provincias
// =========================
function loadProvinciasForCountry(country) {
  const provinciaEl = document.getElementById("provincia");
  if (!provinciaEl) return;

  provinciaEl.innerHTML = '<option value="">Selecciona una provincia</option>';
  fillProvinciaSelector(country, provinciaEl);
}
