// ================================
// usuario.jsx — Onboarding Paso 1 (VERSIÓN PRODUCCIÓN)
// ================================

// CSS
import '../styles/base.css';
import '../styles/layout.css';
import '../styles/components.css';
import '../styles/forms.css';
import './usuario.css';

// Firebase
import { auth } from "../firebase.js";
import { db } from "../firebase.js";
import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";

// Lógica interna
import { runFlowController } from "../controllers/flowController.js";
import { fillProvinciaSelector } from "../shared/provincias.js";


// -----------------------------
// ELEMENTOS DEL DOM
// -----------------------------
const inputNombre        = document.getElementById("nombre");
const inputApellido      = document.getElementById("apellido");
const inputEmail         = document.getElementById("mail");
const inputFechaNacimiento = document.getElementById("fechaNacimiento");
const inputTelefono      = document.getElementById("telefono");
const selectPais         = document.getElementById("pais");
const selectProvincia    = document.getElementById("provincia");
const inputLocalidad     = document.getElementById("localidad");
const inputBarrio        = document.getElementById("barrio");
const inputDireccion     = document.getElementById("direccion");

const chkComercio        = document.getElementById("checkComercio");
const chkServicio        = document.getElementById("checkServicio");

const btnGuardar         = document.getElementById("saveUserData");
const btnComercio        = document.getElementById("btnComercio");
const btnServicio        = document.getElementById("btnServicio");


// ========================================================
// ESTADO LOCAL
// ========================================================
let uid = null;
let comercioId = null;
let dataOriginal = {};
let tipoSeleccionado = null;


// ========================================================
// HABILITA/DESHABILITA BOTONES DE IA
// ========================================================
function actualizarBotonesIA() {
  const completo =
    inputNombre.value.trim() &&
    inputApellido.value.trim() &&
    inputLocalidad.value.trim() &&
    inputDireccion.value.trim() &&
    tipoSeleccionado !== null;

  if (completo) {
    btnComercio.disabled = false;
    btnServicio.disabled = false;

    btnComercio.style.background = "";
    btnServicio.style.background = "";
    btnComercio.style.cursor = "pointer";
    btnServicio.style.cursor = "pointer";
  }
}


// ========================================================
// DETECTAR CAMBIOS + HABILITAR BOTÓN GUARDAR
// ========================================================
function detectarCambios() {
  if (!dataOriginal) return;

  const hayCambios =
    inputNombre.value !== dataOriginal.nombre ||
    inputApellido.value !== dataOriginal.apellido ||
    inputTelefono.value !== dataOriginal.telefono ||
    inputLocalidad.value !== dataOriginal.localidad ||
    selectProvincia.value !== dataOriginal.provincia ||
    inputDireccion.value !== dataOriginal.direccion ||
    inputBarrio.value !== dataOriginal.barrio ||
    tipoSeleccionado !== dataOriginal.tipo;

  btnGuardar.disabled = !hayCambios;

  actualizarBotonesIA();
}


// ========================================================
// SELECCIÓN EXCLUSIVA (comercio / servicio)
// ========================================================
function seleccionarTipo(tipo) {
  tipoSeleccionado = tipo;

  chkComercio.checked = tipo === "comercio";
  chkServicio.checked = tipo === "servicio";

  detectarCambios();
}

chkComercio.addEventListener("change", () => seleccionarTipo("comercio"));
chkServicio.addEventListener("change", () => seleccionarTipo("servicio"));


// ========================================================
// CARGAR USUARIO DESDE FIRESTORE
// ========================================================
async function cargarUsuario(uid) {
  const ref = doc(db, "usuarios", uid);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    console.log("➡️ Usuario nuevo");
    inputEmail.value = auth.currentUser?.email || "";
    return;
  }

  const data = snap.data();

  dataOriginal = {
    nombre: data.nombre || "",
    apellido: data.apellido || "",
    telefono: data.telefono || "",
    provincia: data.provincia || "",
    localidad: data.localidad || "",
    direccion: data.direccion || "",
    barrio: data.barrio || "",
    tipo: data.tipo || null,
  };

  comercioId = data.comercioId || null;

  // Cargar valores en el DOM
  inputNombre.value = dataOriginal.nombre;
  inputApellido.value = dataOriginal.apellido;
  inputTelefono.value = dataOriginal.telefono;
  selectProvincia.value = dataOriginal.provincia;
  inputLocalidad.value = dataOriginal.localidad;
  inputDireccion.value = dataOriginal.direccion;
  inputBarrio.value = dataOriginal.barrio;

  inputEmail.value = auth.currentUser?.email || data.email || "";

  if (dataOriginal.tipo) seleccionarTipo(dataOriginal.tipo);

  detectarCambios();
}


// ========================================================
// CREAR COMERCIO SI NO EXISTE
// ========================================================
async function crearComercio(uid) {
  const nuevoId = crypto.randomUUID();

  await setDoc(doc(db, "comercios", nuevoId), {
    owner: uid,
    tipo: tipoSeleccionado,
    fechaRegistro: serverTimestamp(),
    onboardingSteps: {
      usuario: true,
    }
  });

  return nuevoId;
}


// ========================================================
// GUARDAR DATOS DE USUARIO
// ========================================================
async function guardarDatos() {
  if (!uid) return;

  let nuevoComercioId = comercioId;

  if (!nuevoComercioId) {
    nuevoComercioId = await crearComercio(uid);
    comercioId = nuevoComercioId;
  }

  await updateDoc(doc(db, "usuarios", uid), {
    nombre: inputNombre.value.trim(),
    apellido: inputApellido.value.trim(),
    telefono: inputTelefono.value.trim(),
    provincia: selectProvincia.value,
    localidad: inputLocalidad.value.trim(),
    direccion: inputDireccion.value.trim(),
    barrio: inputBarrio.value.trim(),
    email: inputEmail.value.trim(),
    tipo: tipoSeleccionado,
    comercioId: nuevoComercioId,
    fechaActualizacion: serverTimestamp()
  });

  console.log("💾 Datos guardados");

  // Cache local
  dataOriginal = {
    nombre: inputNombre.value.trim(),
    apellido: inputApellido.value.trim(),
    telefono: inputTelefono.value.trim(),
    provincia: selectProvincia.value,
    localidad: inputLocalidad.value.trim(),
    direccion: inputDireccion.value.trim(),
    barrio: inputBarrio.value.trim(),
    tipo: tipoSeleccionado
  };

  btnGuardar.disabled = true;
  actualizarBotonesIA();
}


// ========================================================
// EVENTOS
// ========================================================
[
  inputNombre,
  inputApellido,
  inputTelefono,
  inputLocalidad,
  inputDireccion,
  inputBarrio,
  selectProvincia
].forEach(el => el?.addEventListener("input", detectarCambios));

btnGuardar.addEventListener("click", guardarDatos);


// ========================================================
// ACCIONES DE IA
// ========================================================
btnComercio.addEventListener("click", () => {
  window.location.href = "/ia-config.html?tipo=comercio";
});

btnServicio.addEventListener("click", () => {
  window.location.href = "/ia-config.html?tipo=servicio";
});


// ========================================================
// AUTENTICACIÓN + FLUJO
// ========================================================
auth.onAuthStateChanged(async (user) => {
  if (!user) return;

  uid = user.uid;

  await cargarUsuario(uid);

  // 🔥 cargar provincias AHORA SÍ
  fillProvinciaSelector("Argentina", selectProvincia);

  // Ejecutar Flow Controller
  runFlowController(uid);
});
