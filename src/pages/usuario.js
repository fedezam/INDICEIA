// ================================
// usuario.js — Onboarding Paso 1 (Datos personales ONLY)
// ================================

// CSS
import '../styles/base.css';
import '../styles/layout.css';
import '../styles/components.css';
import '../styles/forms.css';
import './usuario.css';

// Firebase
import { auth, db } from "../firebase.js";
import { doc, getDoc, setDoc } from "firebase/firestore";

// Compartidos
import { renderLayout, updateHeaderInfo } from "../shared/layout.js";
import { showToast, showLoading, hideLoading } from "../shared/utils.js";
import { fillProvinciaSelector } from "../shared/provincias.js";

// Flow
import { bootFlow } from "../controllers/boot/flowBoot.js";
import { redirectAfterSave } from "../controllers/flowController.js";

bootFlow();

// ==================== ELEMENTOS DEL DOM ====================
const nombre = document.getElementById("nombre");
const apellido = document.getElementById("apellido");
const mail = document.getElementById("mail");
const fechaNacimiento = document.getElementById("fechaNacimiento");
const telefono = document.getElementById("telefono");
const pais = document.getElementById("pais");
const provincia = document.getElementById("provincia");
const localidad = document.getElementById("localidad");
const barrio = document.getElementById("barrio");
const direccion = document.getElementById("direccion");
const btnGuardar = document.getElementById("saveUserData");

// ==================== FECHA ====================
function aplicarMascaraFecha(input) {
  input.addEventListener("input", (e) => {
    let value = e.target.value.replace(/\D/g, "");
    if (value.length >= 3 && value.length <= 4) {
      value = value.slice(0,2) + "/" + value.slice(2);
    } else if (value.length >= 5) {
      value = value.slice(0,2) + "/" + value.slice(2,4) + "/" + value.slice(4,8);
    }
    e.target.value = value.substring(0,10);
  });
}
if (fechaNacimiento) aplicarMascaraFecha(fechaNacimiento);

function fechaToISO(fechaDDMMYYYY) {
  if (!fechaDDMMYYYY || !fechaDDMMYYYY.includes("/")) return null;
  const [dd, mm, yyyy] = fechaDDMMYYYY.split("/");
  if (!dd || !mm || !yyyy || yyyy.length !== 4) return null;
  return `${yyyy}-${mm.padStart(2,'0')}-${dd.padStart(2,'0')}`;
}

function fechaFromISO(fechaISO) {
  if (!fechaISO) return "";
  const [yyyy, mm, dd] = fechaISO.split("-");
  return `${dd}/${mm}/${yyyy}`;
}

// ==================== VALIDACIÓN ====================
function validarFormulario() {
  const completo =
    fechaNacimiento.value.trim() &&
    telefono.value.trim() &&
    pais.value.trim() &&
    provincia.value.trim() &&
    localidad.value.trim() &&
    direccion.value.trim();
  
  btnGuardar.disabled = !completo;
}

// Listeners para validar campos editables
[fechaNacimiento, telefono, pais, provincia, localidad, direccion].forEach(el => {
  el.addEventListener("input", validarFormulario);
});

// ==================== CARGA DATOS ====================
async function cargarDatosUsuario(uid) {
  try {
    fillProvinciaSelector("Argentina", provincia);

    const ref = doc(db, "usuarios", uid);
    const snap = await getDoc(ref);

    let data = snap.exists() ? snap.data() : {};

    // Nombre / Apellido / Mail desde Auth si no existen en Firestore
    if (auth.currentUser) {
      nombre.value = data.nombre || auth.currentUser.displayName?.split(" ")[0] || "";
      apellido.value = data.apellido || auth.currentUser.displayName?.split(" ").slice(1).join(" ") || "";
      mail.value = data.mail || auth.currentUser.email || "";
    }

    nombre.disabled = true;
    apellido.disabled = true;
    mail.disabled = true;

    // Campos editables
    telefono.value = data.telefono || "";
    pais.value = data.pais || "Argentina";

    fillProvinciaSelector(pais.value, provincia);
    provincia.value = data.provincia || "";
    localidad.value = data.localidad || "";
    barrio.value = data.barrio || "";
    direccion.value = data.direccion || "";

    if (data.fechaNacimiento) {
      fechaNacimiento.value = fechaFromISO(data.fechaNacimiento);
    }

    validarFormulario();
  } catch (err) {
    console.error("Error cargando usuario:", err);
    showToast("Error al cargar datos", "error");
  }
}

// Cambio de país → actualizar provincias
if (pais && provincia) {
  pais.addEventListener("change", () => {
    fillProvinciaSelector(pais.value, provincia);
    validarFormulario();
  });
}

// ==================== GUARDAR ====================
btnGuardar.addEventListener("click", async () => {
  const uid = auth.currentUser?.uid;
  if (!uid) {
    showToast("Usuario no autenticado", "error");
    return;
  }

  const fechaISO = fechaToISO(fechaNacimiento.value);
  if (!fechaISO) {
    showToast("Fecha inválida (DD/MM/AAAA)", "error");
    return;
  }

  showLoading("Guardando datos...");
  btnGuardar.disabled = true;

  try {
    const ref = doc(db, "usuarios", uid);
    const snap = await getDoc(ref);
    const prevOnboarding = snap.exists() ? snap.data().onboarding || {} : {};

    await setDoc(ref, {
      // Solo actualizamos los campos editables
      fechaNacimiento: fechaISO,
      telefono: telefono.value.trim(),
      pais: pais.value.trim(),
      provincia: provincia.value.trim(),
      localidad: localidad.value.trim(),
      barrio: barrio.value.trim(),
      direccion: direccion.value.trim(),
      updatedAt: new Date().toISOString(),
      onboarding: {
        ...prevOnboarding,
        usuario: true
      }
    }, { merge: true });

    hideLoading();
    showToast("Datos guardados correctamente", "success");

    // Redirigir al pipeline de crear entidad
    redirectAfterSave("crear-entidad");
  } catch (err) {
    console.error("Error guardando datos:", err);
    hideLoading();
    showToast("Error al guardar datos", "error");
    btnGuardar.disabled = false;
  }
});

// ==================== RENDER LAYOUT ====================
renderLayout();

if (auth.currentUser) {
  updateHeaderInfo(auth.currentUser.displayName || "Usuario", { nombre: "Trial" });
  cargarDatosUsuario(auth.currentUser.uid);
}
