// ================================
// usuario.jsx — Onboarding Paso 1 (Producción)
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

// Lógica interna
import { runFlowController } from "../controllers/flowController.js";
import { fillProvinciaSelector } from "../shared/provincias.js";

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

const checkComercio = document.getElementById("checkComercio");
const checkServicio = document.getElementById("checkServicio");

const btnGuardar = document.getElementById("saveUserData");
const btnCrearIA = document.getElementById("btnCrearIA");

// ==================== ESTADO ====================
let userId = null;
let tipoSeleccionado = null;

// ==================== UTIL: FORMATO FECHA ====================
function aplicarMascaraFecha(input) {
input.addEventListener("input", (e) => {
let value = e.target.value.replace(/\D/g, "");
if (value.length >= 3 && value.length <= 4) value = value.slice(0, 2) + "/" + value.slice(2);
else if (value.length >= 5) value = value.slice(0, 2) + "/" + value.slice(2, 4) + "/" + value.slice(4, 8);
e.target.value = value.substring(0, 10);
});
}
aplicarMascaraFecha(fechaNacimiento);

function fechaToISO(fechaDDMMYYYY) {
if (!fechaDDMMYYYY.includes("/")) return null;
const [dd, mm, yyyy] = fechaDDMMYYYY.split("/");
if (!dd || !mm || !yyyy) return null;
return `${yyyy}-${mm}-${dd}`;
}

// ==================== VALIDACIÓN FORMULARIO ====================
function validarFormulario() {
const obligatoriosCompletos =
nombre.value.trim() &&
apellido.value.trim() &&
mail.value.trim() &&
fechaNacimiento.value.trim() &&
telefono.value.trim() &&
pais.value.trim() &&
provincia.value.trim() &&
localidad.value.trim() &&
direccion.value.trim();

const actividadOK = tipoSeleccionado !== null;

btnGuardar.disabled = !(obligatoriosCompletos && actividadOK);
}

[nombre, apellido, mail, fechaNacimiento, telefono, pais, provincia, localidad, direccion].forEach(el => el.addEventListener("input", validarFormulario));
provincia.addEventListener("change", validarFormulario);

// ==================== HANDLERS ACTIVIDAD ====================
function actualizarBotonIA() {
if (!tipoSeleccionado) {
btnCrearIA.disabled = true;
btnCrearIA.textContent = "Crear IA";
return;
}
btnCrearIA.disabled = false;
btnCrearIA.textContent = tipoSeleccionado === "comercio" ? "Crear IA para Comercio" : "Crear IA para Servicio";
}

checkComercio.addEventListener("change", () => {
tipoSeleccionado = checkComercio.checked ? "comercio" : null;
if (checkComercio.checked) checkServicio.checked = false;
actualizarBotonIA();
validarFormulario();
});

checkServicio.addEventListener("change", () => {
tipoSeleccionado = checkServicio.checked ? "servicio" : null;
if (checkServicio.checked) checkComercio.checked = false;
actualizarBotonIA();
validarFormulario();
});

// ==================== CARGA INICIAL ====================
async function cargarDatosUsuario() {
const storedId = localStorage.getItem("userId");
if (!storedId) return;
userId = storedId;

// Llenar select de provincias
await fillProvinciaSelector();

const ref = doc(db, "usuarios", userId);
const snap = await getDoc(ref);
if (!snap.exists()) return;
const data = snap.data();

nombre.value = data.nombre || "";
apellido.value = data.apellido || "";
mail.value = data.mail || "";
telefono.value = data.telefono || "";
pais.value = data.pais || "Argentina";
provincia.value = data.provincia || "";
localidad.value = data.localidad || "";
barrio.value = data.barrio || "";
direccion.value = data.direccion || "";

if (data.fechaNacimiento) {
const [y, m, d] = data.fechaNacimiento.split("-");
fechaNacimiento.value = `${d}/${m}/${y}`;
}

if (data.tipoActividad?.toLowerCase() === "comercio") {
checkComercio.checked = true;
tipoSeleccionado = "comercio";
} else if (data.tipoActividad?.toLowerCase() === "servicio") {
checkServicio.checked = true;
tipoSeleccionado = "servicio";
}

actualizarBotonIA();
validarFormulario();
}

cargarDatosUsuario();

// ==================== GUARDAR DATOS ====================
btnGuardar.addEventListener("click", async () => {
if (!userId) return alert("Error: usuario no encontrado.");

const fechaISO = fechaToISO(fechaNacimiento.value);
if (!fechaISO) return alert("La fecha de nacimiento no tiene un formato válido (DD/MM/AAAA).");

const ref = doc(db, "usuarios", userId);

// Guardar datos + marcador onboardingSteps
const snapAnterior = await getDoc(ref);
const prevSteps = snapAnterior.exists() ? snapAnterior.data().onboardingSteps || {} : {};

await setDoc(ref, {
nombre: nombre.value.trim(),
apellido: apellido.value.trim(),
mail: mail.value.trim(),
fechaNacimiento: fechaISO,
telefono: telefono.value.trim(),
pais: pais.value,
provincia: provincia.value,
localidad: localidad.value.trim(),
barrio: barrio.value.trim() || "",
direccion: direccion.value.trim(),
tipoActividad: tipoSeleccionado,
updatedAt: new Date().toISOString(),
onboardingSteps: { ...prevSteps, usuario: true }
}, { merge: true });

alert("Datos guardados correctamente.");
btnCrearIA.disabled = false;

// FlowController decide navegación, la página no redirige directamente
runFlowController(userId);
});

// ==================== BOTÓN CREAR IA ====================
btnCrearIA.addEventListener("click", () => {
if (!tipoSeleccionado) return;
// Solo habilita el botón; la navegación la controla FlowController
});

