// src/pages/servicios.js
// ==================== SERVICIOS ====================
// Lógica de acumulación · sin campos vacíos · núcleo obligatorio

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
  writeBatch,
  doc
} from 'firebase/firestore';

// ==================== UTILS ====================
import { showToast, showLoading, hideLoading } from '../shared/utils.js';

// ==================== SKELETON ====================
import { runDataPage } from '../shared/dataPageSkeleton.js';

// ==================== ESTADO ====================
let currentComercioId = null;
let serviciosAcumulados = []; // Array temporal para acumular servicios antes de guardar
let draft = createEmptyDraft();

// ==================== DRAFT ====================
function createEmptyDraft() {
  return {};
}

// ==================== LOAD ====================
async function load({ currentComercioId: comercioId }) {
  currentComercioId = comercioId;
  serviciosAcumulados = [];
  draft = createEmptyDraft();
}

// ==================== RENDER ====================
function render() {
  renderServiciosAcumulados();
}

// ==================== VALIDACIÓN ====================

// Validar NÚCLEO obligatorio del draft actual
function isDraftValid() {
  return Boolean(
    draft.nombre &&
    draft.nombre.trim().length > 0 &&
    draft.modalidad &&
    draft.disponibilidad
  );
}

// Validar si hay servicios para guardar en DB
function isFormValid() {
  return serviciosAcumulados.length > 0;
}

// ==================== DATA ====================
function getCurrentData() {
  return { serviciosAcumulados: structuredClone(serviciosAcumulados) };
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
  delete draft.precio;
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
  if (!tipo || !['inmediata', 'a_coordinar'].includes(tipo)) {
    delete draft.disponibilidad;
    return;
  }

  draft.disponibilidad = tipo;
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

// ---- Variantes ----
function setVariantes(texto) {
  if (!texto || !texto.trim()) {
    delete draft.variantes;
    return;
  }

  // Split por saltos de línea y filtrar vacíos
  const lineas = texto
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0);

  if (lineas.length === 0) {
    delete draft.variantes;
    return;
  }

  draft.variantes = lineas;
}

// ---- Notas ----
function setNotas(value) {
  if (!value || !value.trim()) {
    delete draft.notas;
    return;
  }
  draft.notas = value.trim();
}

// ==================== AGREGAR SERVICIO ====================
function agregarServicio() {
  if (!isDraftValid()) {
    showToast(
      'Campos obligatorios',
      'Completá: Nombre, Modalidad y Disponibilidad',
      'warning'
    );
    return;
  }

  // Clonar draft y agregarlo al array
  serviciosAcumulados.push(structuredClone(draft));

  // Limpiar formulario
  draft = createEmptyDraft();
  limpiarFormulario();

  // Actualizar vista
  renderServiciosAcumulados();

  showToast('Listo', 'Servicio agregado. Podés crear otro o guardar.', 'success');
}

// ==================== ELIMINAR SERVICIO ====================
function eliminarServicio(index) {
  if (index < 0 || index >= serviciosAcumulados.length) return;

  serviciosAcumulados.splice(index, 1);
  renderServiciosAcumulados();

  showToast('Eliminado', 'Servicio eliminado de la lista', 'info');
}

// ==================== RENDER LISTA ====================
function renderServiciosAcumulados() {
  const container = document.getElementById('serviciosAcumuladosContainer');
  if (!container) return;

  if (serviciosAcumulados.length === 0) {
    container.innerHTML = '<p class="lista-vacia">No hay servicios agregados aún</p>';
    return;
  }

  const html = serviciosAcumulados
    .map((s, idx) => {
      const modalidad = s.modalidades
        ? s.modalidades.join(', ')
        : s.modalidad || '';

      const precio = s.precio
        ? `$${s.precio.valor}`
        : 'A consultar';

      return `
        <div class="servicio-item">
          <div class="servicio-info">
            <strong>${s.nombre}</strong>
            <span>${modalidad} · ${s.disponibilidad || ''}</span>
            <span>${precio}</span>
          </div>
          <button
            class="btn-eliminar"
            onclick="page.eliminarServicio(${idx})"
          >
            Eliminar
          </button>
        </div>
      `;
    })
    .join('');

  container.innerHTML = html;
}

// ==================== LIMPIAR FORMULARIO ====================
function limpiarFormulario() {
  // Inputs de texto
  document.querySelectorAll('input[type="text"], textarea, input[type="number"]').forEach(input => {
    input.value = '';
  });

  // Checkboxes (modalidad y disponibilidad)
  document.querySelectorAll('input[type="checkbox"]').forEach(cb => {
    cb.checked = false;
  });

  // Radios de precio
  const radioConsultar = document.querySelector('input[name="precio"][value="consultar"]');
  if (radioConsultar) radioConsultar.checked = true;

  const inputPrecioFijo = document.getElementById('precioFijoInput');
  if (inputPrecioFijo) {
    inputPrecioFijo.disabled = true;
    inputPrecioFijo.value = '';
  }
}

// ==================== SAVE ====================
async function save() {
  if (!currentComercioId) return;
  if (serviciosAcumulados.length === 0) {
    showToast('Error', 'Agregá al menos un servicio', 'warning');
    return;
  }

  showLoading('Guardando servicios...');

  try {
    const batch = writeBatch(db);

    serviciosAcumulados.forEach(servicio => {
      const docRef = doc(collection(db, 'comercios', currentComercioId, 'servicios'));
      batch.set(docRef, servicio);
    });

    await batch.commit();

    showToast('OK', `${serviciosAcumulados.length} servicio(s) guardado(s)`, 'success');
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
  setDuracion,
  setVariantes,
  setNotas,

  // acciones
  agregarServicio,
  eliminarServicio
});
