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
  doc,
  getDocs
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

  if (!currentComercioId) {
    serviciosAcumulados = [];
    draft = createEmptyDraft();
    return;
  }

  // Cargar servicios existentes de la DB
  try {
    const snap = await getDocs(
      collection(db, 'comercios', currentComercioId, 'servicios')
    );

    serviciosAcumulados = snap.docs.map(d => ({
      id: d.id,
      ...d.data()
    }));
  } catch (err) {
    // Si es error de permisos, probablemente no hay servicios aún (colección vacía)
    // Esto es normal en la primera carga
    if (err.code === 'permission-denied') {
      console.log('No hay servicios previos o permisos insuficientes. Iniciando con lista vacía.');
      serviciosAcumulados = [];
    } else {
      console.error('Error cargando servicios:', err);
      serviciosAcumulados = [];
    }
  }

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

  // Agregar campo activo si no existe (por default true)
  if (draft.activo === undefined) {
    draft.activo = true;
  }

  // Clonar draft y agregarlo al array
  serviciosAcumulados.push(structuredClone(draft));

  // Limpiar formulario
  draft = createEmptyDraft();
  limpiarFormulario();

  // Actualizar vista
  renderServiciosAcumulados();

  showToast(
    '✅ Servicio agregado',
    'Podés crear otro servicio o guardar cuando termines.',
    'success'
  );
}

// ==================== ELIMINAR SERVICIO ====================
function eliminarServicio(index) {
  if (index < 0 || index >= serviciosAcumulados.length) return;

  serviciosAcumulados.splice(index, 1);
  renderServiciosAcumulados();

  showToast('Eliminado', 'Servicio eliminado de la lista', 'info');
}

// ==================== EDITAR SERVICIO ====================
function editarServicio(index) {
  if (index < 0 || index >= serviciosAcumulados.length) return;

  const servicio = serviciosAcumulados[index];

  // Cargar datos en el draft
  draft = structuredClone(servicio);

  // Llenar el formulario
  cargarServicioEnFormulario(servicio);

  // Eliminar de la lista (se volverá a agregar al guardar)
  serviciosAcumulados.splice(index, 1);
  renderServiciosAcumulados();

  // Scroll al formulario
  window.scrollTo({ top: 0, behavior: 'smooth' });

  showToast('Edición', 'Modificá los campos y agregá el servicio nuevamente', 'info');
}

// ==================== TOGGLE ACTIVAR/PAUSAR ====================
function toggleActivarServicio(index) {
  if (index < 0 || index >= serviciosAcumulados.length) return;

  const servicio = serviciosAcumulados[index];
  servicio.activo = !servicio.activo;

  renderServiciosAcumulados();

  const estado = servicio.activo ? 'activado' : 'pausado';
  showToast('Estado actualizado', `Servicio ${estado}`, 'success');
}

// ==================== CARGAR SERVICIO EN FORMULARIO ====================
function cargarServicioEnFormulario(servicio) {
  // Nombre
  const inputNombre = document.querySelector('input[placeholder*="Masaje"]');
  if (inputNombre) inputNombre.value = servicio.nombre || '';

  // Descripción
  const textareaDesc = document.querySelector('textarea[placeholder*="Explicá"]');
  if (textareaDesc) textareaDesc.value = servicio.descripcion || '';

  // Modalidades (checkboxes)
  document.querySelectorAll('input[value="presencial"], input[value="a_domicilio"], input[value="remoto"]').forEach(cb => {
    cb.checked = false;
  });
  
  if (servicio.modalidades && Array.isArray(servicio.modalidades)) {
    servicio.modalidades.forEach(m => {
      const cb = document.querySelector(`input[value="${m}"]`);
      if (cb) cb.checked = true;
    });
  } else if (servicio.modalidad) {
    const cb = document.querySelector(`input[value="${servicio.modalidad}"]`);
    if (cb) cb.checked = true;
  }

  // Precio
  if (servicio.precio && servicio.precio.tipo === 'fijo') {
    const radioFijo = document.querySelector('input[name="precio"][value="fijo"]');
    if (radioFijo) {
      radioFijo.checked = true;
      const inputPrecio = document.getElementById('precioFijoInput');
      if (inputPrecio) {
        inputPrecio.disabled = false;
        inputPrecio.value = servicio.precio.valor || '';
      }
    }
  } else {
    const radioConsultar = document.querySelector('input[name="precio"][value="consultar"]');
    if (radioConsultar) radioConsultar.checked = true;
  }

  // Disponibilidad
  document.querySelectorAll('input[name="disponibilidad"]').forEach(cb => {
    cb.checked = false;
  });
  if (servicio.disponibilidad) {
    const cbDisp = document.querySelector(`input[name="disponibilidad"][value="${servicio.disponibilidad}"]`);
    if (cbDisp) cbDisp.checked = true;
  }

  // Duración
  const inputDuracion = document.querySelector('input[placeholder*="60 (minutos)"]');
  if (inputDuracion) inputDuracion.value = servicio.duracion_minutos || '';

  // Variantes
  const textareaVariantes = document.querySelector('textarea[placeholder*="Básico 30min"]');
  if (textareaVariantes && servicio.variantes) {
    textareaVariantes.value = servicio.variantes.join('\n');
  }

  // Notas
  const textareaNotas = document.querySelector('textarea[placeholder*="información importante"]');
  if (textareaNotas) textareaNotas.value = servicio.notas || '';
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
      // Modalidad
      let modalidadTexto = '';
      if (s.modalidades && s.modalidades.length > 0) {
        modalidadTexto = s.modalidades.join(' + ');
      } else if (s.modalidad) {
        modalidadTexto = s.modalidad;
      }

      // Disponibilidad
      const disponibilidadTexto = s.disponibilidad === 'inmediata' 
        ? 'Inmediata (sin turno)' 
        : 'A coordinar (con turno)';

      // Precio
      const precioTexto = s.precio
        ? `$${s.precio.valor}`
        : 'A consultar';

      // Duración
      const duracionTexto = s.duracion_minutos
        ? `${s.duracion_minutos} minutos`
        : null;

      // Descripción
      const descripcionTexto = s.descripcion || null;

      // Estado (activo/pausado)
      const activo = s.activo !== false; // Por default true si no existe
      const estadoClass = activo ? 'estado-activo' : 'estado-pausado';
      const estadoTexto = activo ? '🟢 Activo' : '🔴 Pausado';
      const botonActivarTexto = activo ? '⏸️ Pausar' : '▶️ Activar';

      // Variantes
      const variantesHtml = s.variantes && s.variantes.length > 0
        ? `<div class="servicio-variantes">
             <strong>Variantes:</strong>
             <ul>
               ${s.variantes.map(v => `<li>${v}</li>`).join('')}
             </ul>
           </div>`
        : '';

      // Notas
      const notasHtml = s.notas
        ? `<div class="servicio-notas">
             <strong>Notas:</strong>
             <p>${s.notas}</p>
           </div>`
        : '';

      return `
        <div class="servicio-item ${activo ? '' : 'servicio-pausado'}">
          <div class="servicio-header">
            <div class="servicio-titulo-estado">
              <h3>${s.nombre}</h3>
              <span class="badge-estado ${estadoClass}">${estadoTexto}</span>
            </div>
            <div class="servicio-acciones">
              <button
                class="btn-editar"
                onclick="page.editarServicio(${idx})"
              >
                ✏️ Editar
              </button>
              <button
                class="btn-toggle-activo"
                onclick="page.toggleActivarServicio(${idx})"
              >
                ${botonActivarTexto}
              </button>
              <button
                class="btn-eliminar"
                onclick="page.eliminarServicio(${idx})"
              >
                🗑️ Eliminar
              </button>
            </div>
          </div>
          
          ${descripcionTexto ? `<p class="servicio-descripcion">${descripcionTexto}</p>` : ''}
          
          <div class="servicio-detalles">
            <div class="detalle-item">
              <span class="detalle-label">Modalidad:</span>
              <span class="detalle-valor">${modalidadTexto}</span>
            </div>
            <div class="detalle-item">
              <span class="detalle-label">Disponibilidad:</span>
              <span class="detalle-valor">${disponibilidadTexto}</span>
            </div>
            <div class="detalle-item">
              <span class="detalle-label">Precio:</span>
              <span class="detalle-valor">${precioTexto}</span>
            </div>
            ${duracionTexto ? `
              <div class="detalle-item">
                <span class="detalle-label">Duración:</span>
                <span class="detalle-valor">${duracionTexto}</span>
              </div>
            ` : ''}
          </div>
          
          ${variantesHtml}
          ${notasHtml}
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
    // 1. Obtener todos los servicios actuales de la DB
    const snap = await getDocs(
      collection(db, 'comercios', currentComercioId, 'servicios')
    );

    const batch = writeBatch(db);

    // 2. Borrar todos los servicios viejos
    snap.docs.forEach(docSnap => {
      batch.delete(docSnap.ref);
    });

    // 3. Escribir todos los servicios del array (nuevos y editados)
    serviciosAcumulados.forEach(servicio => {
      // Remover el id temporal si existe (Firebase genera uno nuevo)
      const { id, ...servicioData } = servicio;
      
      const docRef = doc(collection(db, 'comercios', currentComercioId, 'servicios'));
      batch.set(docRef, servicioData);
    });

    // 4. Marcar onboardingStep como completado
    const comercioRef = doc(db, 'comercios', currentComercioId);
    batch.update(comercioRef, {
      'onboardingSteps.servicios': true
    });

    await batch.commit();

    hideLoading();
    
    showToast(
      '💾 Servicios guardados',
      `Se guardaron ${serviciosAcumulados.length} servicio(s) correctamente.`,
      'success'
    );

    // Esperar 1.5 segundos para que el usuario vea el toast antes de redirigir
    setTimeout(() => {
      // El skeleton se encarga del redirect automáticamente
    }, 1500);
    
  } catch (err) {
    console.error(err);
    hideLoading();
    showToast('Error', err.message, 'error');
  }
}

// ==================== EXPORT ====================
export {
  // Funciones del ciclo de vida
  load,
  render,
  save,
  isFormValid,
  getCurrentData,
  
  // Mutadores expuestos para el HTML
  setNombre,
  setDescripcion,
  setModalidadesSeleccionadas,
  setPrecioConsultar,
  setPrecioFijo,
  setDisponibilidad,
  setDuracion,
  setVariantes,
  setNotas,
  
  // Acciones
  agregarServicio,
  eliminarServicio,
  editarServicio,
  toggleActivarServicio
};

runDataPage({
  // ciclo de vida
  load,
  render,
  save,
  isFormValid,
  getCurrentData,

  // mutadores
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
  eliminarServicio,
  editarServicio,
  toggleActivarServicio
});

