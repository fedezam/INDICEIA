// =======================================================
// crear-entidad.js — Definición de capacidades de la entidad
// =======================================================

// CSS
import '../styles/base.css';
import '../styles/layout.css';
import '../styles/components.css';
import '../styles/forms.css';
import './crear-entidad.css';

// Firebase
import { auth, db } from "../firebase.js";
import { doc, getDoc, setDoc } from "firebase/firestore";

// Layout / Utils
import { renderLayout, updateHeaderInfo } from "../shared/layout.js";
import { showToast, showLoading, hideLoading } from "../shared/utils.js";

// Flow
import { bootFlow } from "../controllers/boot/flowBoot.js";
import { redirectAfterSave } from "../controllers/flowController.js";

bootFlow();

/* =======================================================
   DOM
   ======================================================= */

const chkProductos = document.getElementById("opt-productos");
const chkServicios = document.getElementById("opt-servicios");
const btnContinuar = document.getElementById("btnContinuar");
const errorBox = document.getElementById("errorBox");

/* =======================================================
   VALIDACIÓN
   ======================================================= */

function validarSeleccion() {
  const valido = chkProductos.checked || chkServicios.checked;
  btnContinuar.disabled = !valido;

  if (valido && errorBox) {
    errorBox.style.display = "none";
  }
}

chkProductos.addEventListener("change", validarSeleccion);
chkServicios.addEventListener("change", validarSeleccion);

/* =======================================================
   CARGA ESTADO PREVIO (refresh / edit)
   ======================================================= */

async function cargarEstadoPrevio(uid) {
  try {
    const ref = doc(db, "usuarios", uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) return;

    const data = snap.data();
    const offerType = data.offerType || {};

    chkProductos.checked = offerType.productos === true;
    chkServicios.checked = offerType.servicios === true;

    validarSeleccion();
  } catch (err) {
    console.error("❌ Error cargando crear-entidad:", err);
  }
}

/* =======================================================
   GUARDAR
   ======================================================= */

async function guardarConfiguracion(uid) {
  const productos = chkProductos.checked;
  const servicios = chkServicios.checked;

  if (!productos && !servicios) {
    if (errorBox) {
      errorBox.textContent = "Seleccioná al menos una opción para continuar.";
      errorBox.style.display = "block";
    }
    return;
  }

  showLoading("Guardando configuración...");
  btnContinuar.disabled = true;

  try {
    const ref = doc(db, "usuarios", uid);
    const snap = await getDoc(ref);

    const prevSteps = snap.exists()
      ? snap.data().onboardingSteps || {}
      : {};

    await setDoc(
      ref,
      {
        offerType: {
          productos,
          servicios
        },
        onboardingSteps: {
          ...prevSteps,
          "crear-entidad": true
        },
        updatedAt: new Date().toISOString()
      },
      { merge: true }
    );

    hideLoading();
    showToast("Configuración guardada", "success");

    // 🔑 NO decidimos acá el próximo paso
    // El flowController se encarga
    redirectAfterSave();

  } catch (err) {
    console.error("❌ Error guardando crear-entidad:", err);
    hideLoading();
    showToast("Error al guardar la configuración", "error");
    btnContinuar.disabled = false;
  }
}

btnContinuar.addEventListener("click", () => {
  const user = auth.currentUser;
  if (!user) {
    showToast("Usuario no autenticado", "error");
    return;
  }
  guardarConfiguracion(user.uid);
});

/* =======================================================
   INIT
   ======================================================= */

renderLayout();

auth.onAuthStateChanged((user) => {
  if (!user) return;

  updateHeaderInfo(user.displayName || "Usuario", {
    nombre: "Trial"
  });

  cargarEstadoPrevio(user.uid);
});

