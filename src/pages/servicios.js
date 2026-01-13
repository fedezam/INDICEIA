import { auth } from "../firebase.js";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { db } from "../firebase.js";
import { runFlowController, redirectAfterSave } from "../controllers/flowController.js";

let uid;
let comercioId;
let servicios = [];
let editIndex = null;

const listEl = document.getElementById("services-list");
const form = document.getElementById("serviceForm");
const precioWrapper = document.getElementById("precioWrapper");

onAuthStateChanged(auth, async (user) => {
  if (!user) return;
  uid = user.uid;

  await runFlowController(uid);

  const userSnap = await getDoc(doc(db, "usuarios", uid));
  comercioId = userSnap.data().comercioId;

  const comercioRef = doc(db, "comercios", comercioId);
  const comercioSnap = await getDoc(comercioRef);

  servicios = comercioSnap.data()?.servicios?.items || [];
  render();
});

/* ---------------- UI ---------------- */

document.getElementById("accesoPrecio").addEventListener("change", (e) => {
  const val = e.target.value;
  precioWrapper.classList.toggle(
    "hidden",
    !(val === "fijo" || val === "desde")
  );
});

form.addEventListener("submit", (e) => {
  e.preventDefault();

  const nombre = document.getElementById("nombre").value.trim();
  const modalidad = [...form.querySelectorAll("fieldset input:checked")].map(
    (i) => i.value
  );
  const accesoPrecio = document.getElementById("accesoPrecio").value;
  const precioValor = document.getElementById("precioValor").value;
  const disponibilidad = document.getElementById("disponibilidad").value;
  const duracion = document.getElementById("duracion").value;
  const notas = document.getElementById("notas").value;

  if (!nombre || modalidad.length === 0 || !accesoPrecio || !disponibilidad) {
    alert("Completá todos los campos obligatorios.");
    return;
  }

  const servicio = {
    id: nombre.toLowerCase().replace(/\s+/g, "_"),
    nombre,
    activo: true,
    modalidad,
    acceso_precio: accesoPrecio,
    precio_referencia:
      accesoPrecio === "fijo" || accesoPrecio === "desde"
        ? { valor: Number(precioValor) || null, moneda: "ARS" }
        : null,
    disponibilidad,
    duracion_aprox: duracion || null,
    notas: notas ? notas.split("\n") : []
  };

  if (editIndex !== null) {
    servicios[editIndex] = servicio;
    editIndex = null;
  } else {
    servicios.push(servicio);
  }

  form.reset();
  precioWrapper.classList.add("hidden");
  render();
});

/* ---------------- Render ---------------- */

function render() {
  listEl.innerHTML = "";

  if (servicios.length === 0) {
    listEl.innerHTML = "<p>No hay servicios cargados.</p>";
    return;
  }

  servicios.forEach((s, idx) => {
    const card = document.createElement("div");
    card.className = "service-card";

    card.innerHTML = `
      <strong>${s.nombre}</strong>
      <p>Modalidad: ${s.modalidad.join(", ")}</p>
      <p>Disponibilidad: ${s.disponibilidad}</p>
      <button class="btn btn-secondary btn-sm">Editar</button>
    `;

    card.querySelector("button").onclick = () => loadForEdit(idx);
    listEl.appendChild(card);
  });
}

function loadForEdit(index) {
  const s = servicios[index];
  editIndex = index;

  document.getElementById("nombre").value = s.nombre;
  document.getElementById("accesoPrecio").value = s.acceso_precio;
  document.getElementById("disponibilidad").value = s.disponibilidad;
  document.getElementById("duracion").value = s.duracion_aprox || "";
  document.getElementById("notas").value = (s.notas || []).join("\n");

  precioWrapper.classList.toggle(
    "hidden",
    !(s.acceso_precio === "fijo" || s.acceso_precio === "desde")
  );
}

/* ---------------- Save & Continue ---------------- */

document.getElementById("saveAndContinue").addEventListener("click", async () => {
  const comercioRef = doc(db, "comercios", comercioId);

  await setDoc(
    comercioRef,
    {
      servicios: {
        habilitado: true,
        items: servicios
      },
      onboardingSteps: {
        servicios: true
      }
    },
    { merge: true }
  );

  redirectAfterSave();
});
