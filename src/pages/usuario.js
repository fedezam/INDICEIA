
// ================================
// usuario.js — Onboarding Paso 1 (Simplificado)
// ================================

// CSS
import '../styles/base.css';
import '../styles/layout.css';
import '../styles/components.css';
import '../styles/forms.css';
import './usuario.css';

// Firebase
import { auth, db } from "../firebase.js";
import { doc, getDoc, setDoc, addDoc, collection, updateDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

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

// ==================== ESTADO ====================
let userId = null;
let tipoSeleccionado = null;

// ==================== UTIL: FORMATO FECHA ====================
function aplicarMascaraFecha(input) {
  input.addEventListener("input", (e) => {
    let value = e.target.value.replace(/\D/g, "");
    if (value.length >= 3 && value.length <= 4) {
      value = value.slice(0, 2) + "/" + value.slice(2);
    } else if (value.length >= 5) {
      value = value.slice(0, 2) + "/" + value.slice(2, 4) + "/" + value.slice(4, 8);
    }
    e.target.value = value.substring(0, 10);
  });
}

if (fechaNacimiento) {
  aplicarMascaraFecha(fechaNacimiento);
}

function fechaToISO(fechaDDMMYYYY) {
  if (!fechaDDMMYYYY || !fechaDDMMYYYY.includes("/")) return null;
  const [dd, mm, yyyy] = fechaDDMMYYYY.split("/");
  if (!dd || !mm || !yyyy || yyyy.length !== 4) return null;
  return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
}

function fechaFromISO(fechaISO) {
  if (!fechaISO) return "";
  const [yyyy, mm, dd] = fechaISO.split("-");
  return `${dd}/${mm}/${yyyy}`;
}

// ==================== VALIDACIÓN FORMULARIO ====================
function validarFormulario() {
  const obligatoriosCompletos =
    nombre?.value.trim() &&
    apellido?.value.trim() &&
    mail?.value.trim() &&
    fechaNacimiento?.value.trim() &&
    telefono?.value.trim() &&
    pais?.value.trim() &&
    provincia?.value.trim() &&
    localidad?.value.trim() &&
    direccion?.value.trim();

  const actividadOK = tipoSeleccionado !== null;

  if (btnGuardar) {
    btnGuardar.disabled = !(obligatoriosCompletos && actividadOK);
  }
}

// Listeners para validación
[nombre, apellido, mail, fechaNacimiento, telefono, pais, provincia, localidad, direccion]
  .filter(el => el)
  .forEach(el => el.addEventListener("input", validarFormulario));

if (provincia) {
  provincia.addEventListener("change", validarFormulario);
}

// ==================== HANDLERS ACTIVIDAD ====================
if (checkComercio) {
  checkComercio.addEventListener("change", () => {
    if (checkComercio.checked) {
      tipoSeleccionado = "comercio";
      if (checkServicio) checkServicio.checked = false;
    } else {
      tipoSeleccionado = null;
    }
    validarFormulario();
  });
}

if (checkServicio) {
  checkServicio.addEventListener("change", () => {
    if (checkServicio.checked) {
      tipoSeleccionado = "servicio";
      if (checkComercio) checkComercio.checked = false;
    } else {
      tipoSeleccionado = null;
    }
    validarFormulario();
  });
}

// ==================== CARGA INICIAL ====================
async function cargarDatosUsuario(uid) {
  try {
    console.log("🔄 Cargando datos del usuario:", uid);
    
    // Llenar select de provincias
    fillProvinciaSelector(pais.value, provincia);

    // Cargar datos de Firestore
    const ref = doc(db, "usuarios", uid);
    const snap = await getDoc(ref);
    
    if (!snap.exists()) {
      console.log("ℹ️ Usuario nuevo, sin datos previos");
      
      if (mail && auth.currentUser?.email) {
        mail.value = auth.currentUser.email;
      }
      
      validarFormulario();
      return;
    }

    const data = snap.data();
    console.log("✅ Datos cargados:", data);

    // Llenar formulario
    if (nombre) nombre.value = data.nombre || "";
    if (apellido) apellido.value = data.apellido || "";
    if (mail) mail.value = data.mail || auth.currentUser?.email || "";
    if (telefono) telefono.value = data.telefono || "";
    if (pais) pais.value = data.pais || "Argentina";

    // RE-LLENAR provincias tras asignar país
    fillProvinciaSelector(pais.value, provincia);
    if (provincia && data.provincia) {
      provincia.value = data.provincia;
    }

    if (localidad) localidad.value = data.localidad || "";
    if (barrio) barrio.value = data.barrio || "";
    if (direccion) direccion.value = data.direccion || "";

    if (fechaNacimiento && data.fechaNacimiento) {
      fechaNacimiento.value = fechaFromISO(data.fechaNacimiento);
    }

    if (data.tipoActividad) {
      const tipo = data.tipoActividad.toLowerCase();
      if (tipo === "comercio" && checkComercio) {
        checkComercio.checked = true;
        tipoSeleccionado = "comercio";
      } else if (tipo === "servicio" && checkServicio) {
        checkServicio.checked = true;
        tipoSeleccionado = "servicio";
      }
    }

    validarFormulario();

  } catch (error) {
    console.error("❌ Error al cargar datos:", error);
    alert("Error al cargar tus datos. Por favor, recarga la página.");
  }
}

// Actualizar provincias si se cambia el país
if (pais && provincia) {
  pais.addEventListener("change", () => {
    fillProvinciaSelector(pais.value, provincia);
    validarFormulario();
  });
}

// ==================== GUARDAR DATOS Y CREAR IA ====================
if (btnGuardar) {
  btnGuardar.addEventListener("click", async () => {
    if (!userId) {
      alert("Error: usuario no identificado. Por favor, inicia sesión nuevamente.");
      return;
    }

    // Validar fecha
    const fechaISO = fechaToISO(fechaNacimiento.value);
    if (!fechaISO) {
      alert("La fecha de nacimiento debe tener el formato DD/MM/AAAA");
      return;
    }

    try {
      // Activar animación de guardado
      btnGuardar.classList.add("saving");
      btnGuardar.disabled = true;

      const ref = doc(db, "usuarios", userId);
      const snapAnterior = await getDoc(ref);
      const prevSteps = snapAnterior.exists() ? (snapAnterior.data().onboardingSteps || {}) : {};

      // Guardar datos en Firestore
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

      // 🔹 Verificar si ya tiene comercioId (usuario editando)
      const userDoc = await getDoc(ref);
      const existingComercioId = userDoc.data()?.comercioId;

      // 🔹 Si NO tiene comercioId → CREAR comercio
      if (!existingComercioId) {
        const newComercioRef = await addDoc(collection(db, 'comercios'), {
          duenoId: userId,
          fechaCreacion: new Date(),
          tipo: tipoSeleccionado,
          plan: 'trial',
          pais: 'Argentina',
          onboardingSteps: {
            "mi-comercio": false,
            "horarios": false,
            "productos": false,
            "ia-config": false
          }
        });
        
        // Guardar comercioId en usuario
        await updateDoc(ref, {
          comercioId: newComercioRef.id
        });
        
        console.log("✅ Nuevo comercio creado:", newComercioRef.id);
      } else {
        console.log("✅ Comercio existente:", existingComercioId);
      }

      // Cambiar botón a estado guardado
      btnGuardar.classList.remove("saving");
      btnGuardar.classList.add("saved");

      // Mostrar toast de éxito
      const toastContainer = document.querySelector(".toast-container");
      if (toastContainer) {
        const toast = document.createElement("div");
        toast.className = "toast success show";
        toast.innerHTML = `
          <i class="fas fa-check-circle"></i>
          <div class="toast-content">
            <div class="toast-title">¡Datos guardados!</div>
            <div class="toast-message">Creando tu IA comercial...</div>
          </div>
        `;
        toastContainer.appendChild(toast);
        setTimeout(() => {
          toast.remove();
        }, 3500);
      }

      // Restaurar botón después de 2s
      setTimeout(() => {
        btnGuardar.classList.remove("saved");
        btnGuardar.disabled = false;
      }, 2000);

      // Ejecutar flow controller
      await runFlowController(userId);

    } catch (error) {
      console.error("❌ Error al guardar:", error);
      alert("Error al guardar los datos. Por favor, intenta nuevamente.");
      btnGuardar.classList.remove("saving");
      btnGuardar.disabled = false;
    }
  });
}

// ==================== AUTENTICACIÓN ====================
console.log("🔐 Esperando autenticación...");

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    console.warn("⚠️ No hay usuario autenticado");
    alert("Debes iniciar sesión para acceder a esta página");
    window.location.href = "/login.html";
    return;
  }

  console.log("✅ Usuario autenticado:", user.uid);
  userId = user.uid;
  
  // Guardar en localStorage para compatibilidad
  localStorage.setItem("userId", user.uid);

  // Cargar datos del usuario
  await cargarDatosUsuario(user.uid);
});
