// src/pages/servicios.js
// ==================== VERSIÓN FULL PRODUCTION ====================
// Página: Servicios
// Declaración de servicios (no productos)
// Respeta contrato mínimo Bloque E v1

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
  deleteDoc,
  doc
} from 'firebase/firestore';

// ==================== UTILS ====================
import { showToast } from '../shared/utils.js';

// ==================== SKELETON ====================
import { runDataPage } from '../shared/dataPageSkeleton.js';

// =================================================
// ESTADO LOCAL
// =================================================

let currentComercioId = null;

// Servicios cargados desde DB
let servicios = [];

// Estado UI
let tarjetasVistas = new Set();

// =================================================
// HELPERS
// =================================================

function servicioVacio() {
  return {
    activo: true
    // el resto NO existe hasta que el usuario lo complete
  };
}

function limpiarObjeto(obj) {
  // elimina null, undefined, strings vacíos, arrays vacíos
  return Object.fromEntries(
    Object.entries(obj).filter(([_, v]) => {
      if (v === null || v === undefined) return false;
      if (typeof v === 'string' && v.trim() === '') return false;
      if (Array.isArray(v) && v.length === 0) return false;
      return true;
    })
  );
}

function esServicioValido(servicio) {
  return (
    servicio.activo !== undefined &&
    servicio.nombre &&
    servicio.modalidad &&
    servicio.acceso_precio &&
    servicio.disponibilidad
  );
}

// =================================================
// PAGE MODULE
// =================================================

const pageModule = {
  // ---------- LOAD ----------
  async load({ currentComercioId: comercioId }) {
    currentComercioId = comercioId;

    const snap = await getDocs(
      collection(db, 'comercios', currentComercioId, 'servicios')
    );

    servicios = snap.docs.map(docSnap => ({
      id: docSnap.id,
      ...docSnap.data()
    }));
  },

  // ---------- RENDER ----------
  render() {
    const container = document.getElementById('serviciosContainer');
    if (!container) return;

    container.innerHTML = '';

    if (servicios.length === 0) {
      servicios.push(servicioVacio());
    }

    servicios.forEach((servicio, index) => {
      const card = document.createElement('div');
      card.className = 'servicio-card';
      card.dataset.index = index;

      card.innerHTML = `
        <div class="servicio-header">
          <h3>Servicio ${index + 1}</h3>
        </div>

        <div class="servicio-body">
          <label>
            Nombre del servicio
            <input type="text" data-field="nombre" value="${servicio.nombre || ''}">
          </label>

          <label>
            Modalidad
            <select data-field="modalidad">
              <option value="">Seleccionar</option>
              <option value="presencial">Presencial</option>
              <option value="remoto">Remoto</option>
              <option value="domicilio">A domicilio</option>
              <option value="hibrido">Híbrido</option>
            </select>
          </label>

          <label>
            ¿Cómo se obtiene el precio?
            <select data-field="acceso_precio">
              <option value="">Seleccionar</option>
              <option value="precio_fijo">Precio fijo</option>
              <option value="desde">Desde un valor</option>
              <option value="presupuesto">Requiere presupuesto</option>
              <option value="consultar">Consultar</option>
              <option value="gratis">Gratis</option>
            </select>
          </label>

          <label>
            Disponibilidad
            <select data-field="disponibilidad">
              <option value="">Seleccionar</option>
              <option value="inmediata">Inmediata</option>
              <option value="turno">Según turno</option>
              <option value="reserva">Por reserva</option>
              <option value="consultar">Consultar</option>
              <option value="agotado">Agotado</option>
            </select>
          </label>

          <label>
            Duración aproximada (opcional)
            <input type="text" data-field="duracion_aprox" value="${servicio.duracion_aprox || ''}">
          </label>

          <label>
            Notas (opcional)
            <textarea data-field="notas">${servicio.notas || ''}</textarea>
          </label>
        </div>
      `;

      container.appendChild(card);

      // set selects
      ['modalidad', 'acceso_precio', 'disponibilidad'].forEach(field => {
        if (servicio[field]) {
          card.querySelector(`[data-field="${field}"]`).value = servicio[field];
        }
      });

      // listeners
      card.querySelectorAll('[data-field]').forEach(input => {
        input.addEventListener('change', () => {
          tarjetasVistas.add(index);
          actualizarServicioDesdeUI(index, card);
        });
      });
    });
  },

  // ---------- DATA ----------
  getCurrentData() {
    return servicios.map(s => limpiarObjeto(s));
  },

  isFormValid() {
    // todas las tarjetas vistas
    if (tarjetasVistas.size < servicios.length) return false;

    // todos los servicios activos deben ser válidos
    return servicios.every(s => !s.activo || esServicioValido(s));
  },

  // ---------- SAVE ----------
  async save() {
    const colRef = collection(db, 'comercios', currentComercioId, 'servicios');

    // borrar existentes
    const snap = await getDocs(colRef);
    for (const d of snap.docs) {
      await deleteDoc(doc(colRef, d.id));
    }

    // guardar nuevos
    for (const servicio of servicios) {
      if (!servicio.activo) continue;

      const limpio = limpiarObjeto(servicio);

      if (!esServicioValido(limpio)) {
        showToast(
          'Servicio incompleto',
          'Completá los campos obligatorios',
          'warning'
        );
        return;
      }

      await addDoc(colRef, limpio);
    }
  }
};

// =================================================
// UI → STATE
// =================================================

function actualizarServicioDesdeUI(index, card) {
  const servicio = servicios[index];

  card.querySelectorAll('[data-field]').forEach(el => {
    const field = el.dataset.field;
    const value = el.value;

    if (value === '') {
      delete servicio[field];
    } else {
      servicio[field] = value;
    }
  });
}

// =================================================
// INIT
// =================================================

runDataPage(pageModule);
