// ================================
// usuario.js — Onboarding Paso 1
// ================================

import { auth } from "../firebase.js";
import { db } from "../firebase.js";
import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";

import { runFlowController } from "../controllers/flowController.js";


// -----------------------------
// ELEMENTOS DEL DOM
// -----------------------------
const inputNombre = document.getElementById("nombre");
const inputLocalidad = document.getElementById("localidad");
const inputPais = document.getElementById("pais");
const inputEmail = document.getElementById("email");

const chkComercio = document.getElementById("tipoComercio");
const chkServicio = document.getElementById("tipoServicio");

const btnGuardar = document.getElementById("btnGuardar");
const btnSiguiente = document.getElementById("btnSiguiente");


// ========================================================
// ESTADO LOCAL
// ========================================================
let uid = null;
let comercioId = null;
let dataOriginal = {};     // Para detectar ediciones
let tipoSeleccionado = null; // "comercio" | "servicio"


// ========================================================
// HABILITA/DESHABILITA BOTONES
// ========================================================
function actualizarBotones() {
  const completo = (
    inputNombre.value.trim() !== "" &&
    inputLocalidad.value.trim() !== "" &&
    inputPais.value.trim() !== "" &&
    tipoSeleccionado !== null
  );

  // Detectar si hubo cambios
  const hayCambios =
    inputNombre.value !== dataOriginal.nombre ||
    inputLocalidad.value !== dataOriginal.localidad ||
    inputPais.value !== dataOriginal.pais ||
    tipoSeleccionado !== dataOriginal.tipo;

  // -----------------------
  // BOTÓN GUARDAR
  // -----------------------
  if (completo && hayCambios) {
    btnGuardar.disabled = false;
  } else {
    btnGuardar.disabled = true;
  }

  // -----------------------
  // BOTÓN SIGUIENTE
  // -----------------------
  if (completo && !hayCambios && comercioId) {
    btnSiguiente.disabled = false;
  } else {
    btnSiguiente.disabled = true;
  }
}



// ========================================================
// SELECCIÓN EXCLUSIVA (comercio / servicio)
// ========================================================
function seleccionarTipo(tipo) {
  if (tipo === "comercio") {
    chkComercio.checked = true;
    chkServicio.checked = false;
  } else {
    chkComercio.checked = false;
    chkServicio.checked = true;
  }
  tipoSeleccionado = tipo;
  actualizarBotones();
}

chkComercio.addEventListener("change", () => seleccionarTipo("comercio"));
chkServicio.addEventListener("change", () => seleccionarTipo("servicio"));


// ========================================================
// CARGAR DATOS DEL USUARIO
// ========================================================
async function cargarUsuario(uid) {
  const ref = doc(db, "usuarios", uid);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    console.log("➡️ Usuario nuevo, esperando ingreso de datos.");
    return;
  }

  const data = snap.data();
  dataOriginal = {
    nombre: data.nombre || "",
    localidad: data.localidad || "",
    pais: data.pais || "",
    tipo: data.tipo || null,
  };

  comercioId = data.comercioId || null;

  // Llenar form
  inputNombre.value = dataOriginal.nombre;
  inputLocalidad.value = dataOriginal.localidad;
  inputPais.value = dataOriginal.pais;
  inputEmail.value = auth.currentUser?.email || data.email || "";

  if (dataOriginal.tipo) seleccionarTipo(dataOriginal.tipo);

  actualizarBotones();
}


// ========================================================
// CREAR COMERCIO (si no existe)
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
// GUARDAR CAMBIOS EN USUARIO
// ========================================================
async function guardarDatos() {
  if (!uid) return;

  let nuevoComercioId = comercioId;

  // Crear comercio si no existe
  if (!comercioId) {
    nuevoComercioId = await crearComercio(uid);
    comercioId = nuevoComercioId; // actualizar el estado local
  }

  await updateDoc(doc(db, "usuarios", uid), {
    nombre: inputNombre.value.trim(),
    localidad: inputLocalidad.value.trim(),
    pais: inputPais.value.trim(),
    email: inputEmail.value.trim(),
    tipo: tipoSeleccionado,
    comercioId: nuevoComercioId,
    fechaActualizacion: serverTimestamp()
  });

  console.log("💾 Datos guardados");

  // Actualizar copia local para detectar cambios
  dataOriginal = {
    nombre: inputNombre.value.trim(),
    localidad: inputLocalidad.value.trim(),
    pais: inputPais.value.trim(),
    tipo: tipoSeleccionado
  };

  actualizarBotones();
}


// ========================================================
// MANEJO DE EVENTOS
// ========================================================
btnGuardar.addEventListener("click", guardarDatos);

btnSiguiente.addEventListener("click", () => {
  window.location.href = "/mi-comercio.html";
});

inputNombre.addEventListener("input", actualizarBotones);
inputLocalidad.addEventListener("input", actualizarBotones);
inputPais.addEventListener("input", actualizarBotones);


// ========================================================
// AUTENTICACIÓN
// ========================================================
auth.onAuthStateChanged(async (user) => {
  if (!user) {
    console.warn("⚠️ No hay usuario autenticado");
    return;
  }

  uid = user.uid;

  await cargarUsuario(uid);

  // Ejecutar Flow Controller DESPUÉS de cargar los datos
  runFlowController(uid);
});
