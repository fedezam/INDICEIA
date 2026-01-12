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
const nombre      = document.getElementById("nombre");
const apellido    = document.getElementById("apellido");
const mail        = document.getElementById("mail");
const fechaNacimiento = document.getElementById("fechaNacimiento");
const telefono    = document.getElementById("telefono");
const pais        = document.getElementById("pais");
const provincia   = document.getElementById("provincia");
const localidad   = document.getElementById("localidad");
const barrio      = document.getElementById("barrio");
const direccion   = document.getElementById("direccion");
const btnGuardar  = document.getElementById("saveUserData");

// ==================== MASCARA FECHA ====================
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
  return `${dd.padStart(2,'0')}/${mm.padStart(2,'0')}/${yyyy}`;
}

// ==================== VALIDACIÓN ====================
const camposObligatorios = [
  nombre, apellido, mail,
  fechaNacimiento, telefono,
  pais, provincia, localidad, direccion
];

function validarFormulario() {
  const todosCompletos = camposObligatorios.every(campo => 
    campo?.value?.trim?.() !== "" && 
    campo?.value?.trim?.() !== undefined
  );

  btnGuardar.disabled = !todosCompletos;
}

// Listener de validación en tiempo real (solo campos editables)
[
  fechaNacimiento, telefono, provincia, localidad, direccion, barrio
].forEach(el => {
  if (el) el.addEventListener("input", validarFormulario);
});

// ==================== CARGA DATOS ====================
async function cargarDatosUsuario(uid) {
  try {
    const ref = doc(db, "usuarios", uid);
    const snap = await getDoc(ref);
    const data = snap.exists() ? snap.data() : {};

    // Campos de autenticación Google - SIEMPRE bloqueados
    nombre.value = data.nombre || auth.currentUser?.displayName?.split(" ")[0] || "";
    apellido.value = data.apellido || auth.currentUser?.displayName?.split(" ").slice(1).join(" ") || "";
    mail.value = data.mail || auth.currentUser?.email || "";

    nombre.disabled = true;
    apellido.disabled = true;
    mail.disabled = true;

    // País FIJO y BLOQUEADO
    pais.value = "Argentina";
    pais.disabled = true;

    // Provincias (siempre Argentina)
    fillProvinciaSelector("Argentina", provincia);

    // Resto de campos
    fechaNacimiento.value = data.fechaNacimiento ? fechaFromISO(data.fechaNacimiento) : "";
    telefono.value = data.telefono || "";
    provincia.value = data.provincia || "";
    localidad.value = data.localidad || "";
    barrio.value = data.barrio || "";
    direccion.value = data.direccion || "";

    // Validar al cargar
    validarFormulario();

  } catch (err) {
    console.error("Error cargando usuario:", err);
    showToast("Error al cargar datos", "error");
  }
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
    showToast("Fecha de nacimiento inválida (DD/MM/AAAA)", "error");
    return;
  }

  showLoading("Guardando datos...");
  btnGuardar.disabled = true;

  try {
    const ref = doc(db, "usuarios", uid);
    const snap = await getDoc(ref);
    const prevOnboarding = snap.exists() ? snap.data().onboarding || {} : {};

    await setDoc(ref, {
      nombre: nombre.value.trim(),
      apellido: apellido.value.trim(),
      mail: mail.value.trim(),
      fechaNacimiento: fechaISO,
      telefono: telefono.value.trim(),
      pais: "Argentina",
      provincia: provincia.value.trim(),
      localidad: localidad.value.trim(),
      barrio: barrio.value.trim() || null,
      direccion: direccion.value.trim(),
      updatedAt: new Date().toISOString(),
      onboarding: {
        ...prevOnboarding,
        usuario: true
      }
    }, { merge: true });

    hideLoading();
    showToast("Datos guardados correctamente", "success");
    
    redirectAfterSave("crear-entidad");

  } catch (err) {
    console.error("Error guardando datos:", err);
    hideLoading();
    showToast("Error al guardar datos", "error");
    btnGuardar.disabled = false;
  }
});

// ==================== INICIO ====================
renderLayout();

if (auth.currentUser) {
  updateHeaderInfo(auth.currentUser.displayName || "Usuario", { nombre: "Trial" });
  cargarDatosUsuario(auth.currentUser.uid);
} else {
  // Por si acaso, aunque bootFlow debería haberlo manejado
  showToast("Debes iniciar sesión primero", "error");
}
