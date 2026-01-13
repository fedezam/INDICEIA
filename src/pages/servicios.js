// src/pages/servicios.js
// ==================== SERVICIOS ====================
// Página par de productos, pero para servicios declarativos

// ==================== ESTILOS ====================
import '../styles/base.css';
import '../styles/layout.css';
import '../styles/components.css';
import '../styles/forms.css';
import '../styles/forms-premium.css';
import './servicios.css';

// ==================== FIREBASE ====================
import { db } from '../firebase.js';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

// ==================== UTILS ====================
import { showToast } from '../shared/utils.js';

// ==================== SKELETON ====================
import { runDataPage } from '../shared/dataPageSkeleton.js';

// ==================================================
// ESTADO LOCAL
// ==================================================

let servicios = [];
let serviciosVistos = new Set();

const containerId = 'serviciosContainer';

// ==================================================
// HELPERS
// ==================================================

function limpiarObjeto(obj) {
  const limpio = {};
  Object.entries(obj).forEach(([k, v]) => {
    if (
      v === null ||
      v === undefined ||
      v === '' ||
      (Array.isArray(v) && v.length === 0)
    ) {
      return;
    }
    limpio[k] = v;
  });
  return limpio;
}

function servicioValido(servicio) {
  return Boolean(
    servicio.nombre &&
    servicio.modalidad &&
    servicio.acceso_precio &&
    servicio.disponibilidad &&
    servicio.activo !== undefined
  );
}

// ==================================================
// RENDER
// ==================================================

function renderServicios() {
  const container = document.getElementById(containerId);
  container.innerHTML = '';

  servicios.forEach((servicio, index) => {
    const card = document.createElement('div');
    card.className = 'servicio-card';
    card.dataset.index = index;

    card.innerHTML = `
      <div class="servicio-card-header">
        <input
          type="text"
          placeholder="Nombre del servicio"
          value="${servicio.nombre || ''}"
          data-field="nombre"
        />
        <label class="servicio-card-status">
          <input
            type="checkbox"
            data-field="activo"
            ${servicio.activo ? 'checked' : ''}
          />
          Activo
        </label>
      </div>

      <div class="servicio-card-body">

        <!-- MODALIDAD -->
        <div class="servicio-field-group">
          <label>¿Cómo se presta?</label>
          <select data-field="modalidad">
            <option value="">Seleccionar</option>
            <option value="presencial">Presencial</option>
            <option value="remoto">Remoto</option>
            <option value="domicilio">A domicilio</option>
            <option value="hibrido">Híbrido</option>
          </select>
        </div>

        <!-- PRECIO -->
        <div class="servicio-field-group">
          <label>¿Cómo se obtiene el precio?</label>
          <select data-field="acceso_precio">
            <option value="">Seleccionar</option>
            <option value="fijo">Precio fijo</option>
            <option value="desde">Desde un valor</option>
            <option value="presupuesto">Requiere presupuesto</option>
            <option value="consultar">Consultar</option>
            <option value="gratis">Gratis</option>
          </select>
        </div>

        <div class="servicio-field-group servicio-precio-valor">
          <input
            type="number"
            placeholder="Valor de referencia"
            data-field="precio_referencia"
          />
        </div>

        <!-- DISPONIBILIDAD -->
        <div class="servicio-field-group">
          <label>Disponibilidad</label>
          <select data-field="disponibilidad">
            <option value="">Seleccionar</option>
            <option value="inmediata">Inmediata</option>
            <option value="turno">Según turno</option>
            <option value="reserva">Por reserva</option>
            <option value="consultar">Consultar</option>
            <option value="agotado">Agotado</option>
          </select>
        </div>

        <!-- OPCIONALES -->
        <div class="servicio-field-group">
          <label>Duración aproximada (opcional)</label>
          <input
            type="text"
            placeholder="Ej: 1 hora"
            data-field="duracion_aprox"
          />
        </div>

        <div class="servicio-field-group servicio-notas">
          <label>Notas (opcional)</label>
          <textarea
            placeholder="Información adicional"
            data-field="notas"
          ></textarea>
        </div>

      </div>
    `;

    // Setear valores de selects
    card.querySelectorAll('select, input, textarea').forEach((el) => {
      const field = el.dataset.field;
      if (!field) return;

      if (el.type === 'checkbox') return;
      if (servicio[field] !== undefined) {
        el.value = servicio[field];
      }
    });

    // Eventos
    card.addEventListener('focusin', () => {
      serviciosVistos.add(index);
    });

    card.querySelectorAll('[data-field]').forEach((el) => {
      el.addEventListener('change', () => {
        const field = el.dataset.field;
        let value;

        if (el.type === 'checkbox') {
          value = el.checked;
        } else {
          value = el.value;
        }

        servicios[index][field] = value;
      });
    });

    container.appendChild(card);
  });
}

// ==================================================
// PAGE MODULE (SKELETON CONTRACT)
// ==================================================

const pageModule = {
  async load({ currentComercioId }) {
    if (!currentComercioId) return;

    const snap = await getDoc(doc(db, 'comercios', currentComercioId));
    if (snap.exists()) {
      servicios = snap.data().servicios || [];
    }

    if (servicios.length === 0) {
      servicios.push({
        nombre: '',
        modalidad: '',
        acceso_precio: '',
        disponibilidad: '',
        activo: true
      });
    }
  },

  render() {
    renderServicios();
  },

  getCurrentData() {
    return servicios;
  },

  isFormValid() {
    if (serviciosVistos.size === 0) return false;
    return servicios.every((s) => servicioValido(s));
  },

  async save({ currentComercioId }) {
    const serviciosLimpios = servicios
      .filter(servicioValido)
      .map((s) => limpiarObjeto(s));

    await updateDoc(doc(db, 'comercios', currentComercioId), {
      servicios: serviciosLimpios
    });

    showToast('Servicios guardados', 'La información fue actualizada', 'success');
  }
};

// ==================================================
// INIT
// ==================================================

runDataPage(pageModule);
