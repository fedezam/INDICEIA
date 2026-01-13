// src/pages/servicios.js
// ==================== SERVICIOS ====================
// Lógica completa · sin inferencias · sin campos vacíos

// ==================== ESTILOS ====================
import '../styles/base.css';
import '../styles/layout.css';
import '../styles/components.css';
import '../styles/forms.css';
import '../styles/forms-premium.css';
import './servicios.css';

// ==================== FIREBASE ====================
import { db } from '../firebase.js';
import {
  collection,
  getDocs,
  addDoc,
  deleteDoc
} from 'firebase/firestore';

// ==================== UTILS ====================
import { showToast, showLoading, hideLoading } from '../shared/utils.js';

// ==================== SKELETON ====================
import { runDataPage } from '../shared/dataPageSkeleton.js';

// ==================== ESTADO ====================
let currentComercioId = null;
let servicios = [];
let draft = createEmptyDraft();

// ==================== DRAFT ====================
function createEmptyDraft() {
  return {};
}

// ==================== LOAD ====================
async function load({ currentComercioId: comercioId }) {
  currentComercioId = comercioId;

  if (!currentComercioId) return;

  const snap = await getDocs(
    collection(db, 'comercios', currentComercioId, 'servicios')
  );

  servicios = snap.docs.map(d => ({
    id: d.id,
    ...d.data()
  }));
}

// ==================== RENDER ====================
function render() {
  // HTML se enchufa después
}

// ==================== VALIDACIÓN ====================
function isFormValid() {
  return Boolean(draft.nombre && draft.nombre.trim().length > 0);
}

// ==================== DATA ====================
function getCurrentData() {
  return structuredClone(draft);
}

// ==================== MUTADORES (REGLAS) ====================

// ---- Nombre ----
function setNombre(value) {
  if (!value || !value.trim()) {
    delete draft.nombre;
    return;
  }
  draft.nombre = value.trim();
}

// ---- Descripción ----
function setDescripcion(value) {
  if (!value || !value.trim()) {
    delete draft.descripcion;
    return;
  }
  draft.descripcion = value.trim();
}

// ---- Modalidad ----
function setModalidadesSeleccionadas(values) {
  if (!Array.isArray(values) || values.length === 0) {
    delete draft.modalidad;
    delete draft.modalidades;
    return;
  }

  if (values.length === 1) {
    draft.modalidad = values[0];
    delete draft.modalidades;
    return;
  }

  draft.modalidad = 'mixto';
  draft.modalidades = values;
}

// ---- Precio ----
function setPrecioConsultar() {
  draft.precio = { tipo: 'consultar' };
}

function setPrecioFijo(valor) {
  const num = Number(valor);
  if (!num || num <= 0) {
    delete draft.precio;
    return;
  }

  draft.precio = {
    tipo: 'fijo',
    valor: num
  };
}

// ---- Disponibilidad ----
function setDisponibilidad(tipo) {
  if (!['turno', 'reserva', 'consultar'].includes(tipo)) {
    delete draft.disponibilidad;
    return;
  }

  draft.disponibilidad = { tipo };
}

// ---- Duración ----
function setDuracion(minutos) {
  const num = Number(minutos);
  if (!num || num <= 0) {
    delete draft.duracion_minutos;
    return;
  }

  draft.duracion_minutos = num;
}

// ==================== SAVE ====================
async function save() {
  if (!currentComercioId) return;
  if (!isFormValid()) {
    showToast('Error', 'El servicio debe tener un nombre', 'warning');
    return;
  }

  showLoading('Guardando servicio...');

  try {
    await addDoc(
      collection(db, 'comercios', currentComercioId, 'servicios'),
      draft
    );

    draft = createEmptyDraft();
    showToast('OK', 'Servicio guardado', 'success');
  } catch (err) {
    console.error(err);
    showToast('Error', err.message, 'error');
  } finally {
    hideLoading();
  }
}

// ==================== EXPORT ====================
runDataPage({
  load,
  render,
  save,
  isFormValid,
  getCurrentData,

  // mutadores expuestos para el HTML
  setNombre,
  setDescripcion,
  setModalidadesSeleccionadas,
  setPrecioConsultar,
  setPrecioFijo,
  setDisponibilidad,
  setDuracion
});
