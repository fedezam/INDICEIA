// CSS imports (mantenelos como los tenías)
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

/* =========================================================
   DOM
   ========================================================= */

const nombre           = document.getElementById("nombre");
const apellido         = document.getElementById("apellido");
const mail             = document.getElementById("mail");
const fechaNacimiento  = document.getElementById("fechaNacimiento");
const telefono         = document.getElementById("telefono");
const pais             = document.getElementById("pais");
const provincia        = document.getElementById("provincia");
const localidad        = document.getElementById("localidad");
const barrio           = document.getElementById("barrio");
const direccion        = document.getElementById("direccion");
const btnGuardar       = document.getElementById("saveUserData");

/* =========================================================
   HELPERS
   ========================================================= */

// Máscara fecha DD/MM/YYYY
function aplicarMascaraFecha(input) {
  input.addEventListener("input", (e) => {
    let v = e.target.value.replace(/\D/g, "");
    if (v.length >= 3 && v.length <= 4) v = v.slice(0, 2) + "/" + v.slice(2);
    if (v.length >= 5)
      v = v.slice(0, 2) + "/" + v.slice(2, 4) + "/" + v.slice(4, 8);
    e.target.value = v.substring(0, 10);
  });
}
if (fechaNacimiento) aplicarMascaraFecha(fechaNacimiento);

function fechaToISO(s) {
  if (!s || !s.includes("/")) return null;
  const [d, m, y] = s.split("/");
  if (!d || !m || !y || y.length !== 4) return null;
  return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
}

function fechaFromISO(s) {
  if (!s) return "";
  const [y, m, d] = s.split("-");
  return `${d.padStart(2, "0")}/${m.padStart(2, "0")}/${y}`;
}

/* =========================================================
   VALIDACIÓN
   ========================================================= */

const obligatorios = [
  nombre,
  apellido,
  mail,
  fechaNacimiento,
  telefono,
  pais,
  provincia,
  localidad,
  direccion
];

function validarFormulario() {
  const completo = obligatorios.every(el => el?.value?.trim());
  btnGuardar.disabled = !completo;
}

[
  fechaNacimiento,
  telefono,
  provincia,
  localidad,
  direccion,
  barrio
].forEach(el => el?.addEventListener("input", validarFormulario));

/* =========================================================
   CARGA DATOS
   ========================================================= */

async function cargarDatosUsuario(uid) {
  try {
    const ref = doc(db, "usuarios", uid);
    const snap = await getDoc(ref);
    const data = snap.exists() ? snap.data() : {};

    // Datos reales 
    nombre.disabled = false;    // ← Agregar esto
    apellido.disabled = false;  // ← Agregar esto 
    mail.value     = data.mail     || auth.currentUser?.email || "";

    // Solo deshabilitar email
    mail.disabled = true;


    // País fijo
    pais.value = "Argentina";
    pais.disabled = true;

    // Provincias
    if (provincia?.tagName === "SELECT") {
      provincia.innerHTML = '<option value="">Seleccioná una provincia</option>';
      fillProvinciaSelector("Argentina", provincia);
    }

    // Resto
    fechaNacimiento.value = data.fechaNacimiento
      ? fechaFromISO(data.fechaNacimiento)
      : "";

    telefono.value   = data.telefono   || "";
    provincia.value  = data.provincia  || "";
    localidad.value  = data.localidad  || "";
    barrio.value     = data.barrio     || "";
    direccion.value  = data.direccion  || "";

    validarFormulario();

  } catch (err) {
    console.error(err);
    showToast("Error al cargar datos", "error");
  }
}

/* =========================================================
   GUARDAR
   ========================================================= */

btnGuardar.addEventListener("click", async () => {
  const uid = auth.currentUser?.uid;
  if (!uid) return showToast("No autenticado", "error");

  const fechaISO = fechaToISO(fechaNacimiento.value);
  if (!fechaISO) return showToast("Fecha inválida", "error");

  showLoading("Guardando...");
  btnGuardar.disabled = true;

  try {
    const ref = doc(db, "usuarios", uid);
    const snap = await getDoc(ref);

    const prevSteps = snap.exists()
      ? snap.data().onboardingSteps || {}
      : {};

    await setDoc(
      ref,
      {
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

        // 🔑 CLAVE PARA EL FLOW
        onboardingSteps: {
          ...prevSteps,
          usuario: true
        }
      },
      { merge: true }
    );

    hideLoading();
    showToast("Datos guardados correctamente", "success");
    redirectAfterSave("crear-entidad");

  } catch (err) {
    console.error(err);
    hideLoading();
    showToast("Error al guardar", "error");
    btnGuardar.disabled = false;
  }
});

/* =========================================================
   INIT
   ========================================================= */

renderLayout();

auth.onAuthStateChanged((user) => {
  if (user) {
    updateHeaderInfo(user.displayName || "Usuario", { nombre: "Trial" });
    setTimeout(() => cargarDatosUsuario(user.uid), 100);
  }
});
