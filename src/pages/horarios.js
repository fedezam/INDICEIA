import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase.js';
import { showToast } from '../shared/utils.js';

// ==================== STATE ====================
let state = {
  dias: {
    lunes:    { abierto: false, desde: '', hasta: '' },
    martes:   { abierto: false, desde: '', hasta: '' },
    miercoles:{ abierto: false, desde: '', hasta: '' },
    jueves:   { abierto: false, desde: '', hasta: '' },
    viernes:  { abierto: false, desde: '', hasta: '' },
    sabado:   { abierto: false, desde: '', hasta: '' },
    domingo:  { abierto: false, desde: '', hasta: '' }
  }
};

let comercioId = null;

// ==================== API DEL SKELETON ====================
export async function load({ currentComercioId, comercioData }) {
  comercioId = currentComercioId;

  if (comercioData?.horarios) {
    state.dias = structuredClone(comercioData.horarios);
  }
}

export function render() {
  renderHorarios();
  attachListeners();
}

export function getCurrentData() {
  return structuredClone(state);
}

export function isFormValid() {
  return true; // horarios no bloquea onboarding
}

export async function save() {
  await updateDoc(doc(db, 'comercios', comercioId), {
    horarios: state.dias
  });

  showToast('Guardado', 'Horarios guardados correctamente', 'success');
}

// ==================== RENDER (UNA SOLA VEZ) ====================
function renderHorarios() {
  const container = document.getElementById('horariosContainer');
  container.innerHTML = '';

  Object.entries(state.dias).forEach(([dia, data]) => {
    const row = document.createElement('div');
    row.className = 'dia-row';

    row.innerHTML = `
      <label>
        <input type="checkbox" data-dia="${dia}" ${data.abierto ? 'checked' : ''}>
        ${capitalizar(dia)}
      </label>

      <input type="time" data-dia="${dia}" data-field="desde" value="${data.desde}">
      <input type="time" data-dia="${dia}" data-field="hasta" value="${data.hasta}">
    `;

    container.appendChild(row);
  });
}

// ==================== LISTENERS (SIN RE-RENDER) ====================
function attachListeners() {
  document
    .getElementById('horariosContainer')
    .addEventListener('change', (e) => {
      const dia = e.target.dataset.dia;
      if (!dia) return;

      if (e.target.type === 'checkbox') {
        state.dias[dia].abierto = e.target.checked;
      }

      if (e.target.type === 'time') {
        const field = e.target.dataset.field;
        state.dias[dia][field] = e.target.value;
      }
    });

  // COPIAR A TODOS
  document
    .getElementById('copiarATodosBtn')
    ?.addEventListener('click', () => {
      const base = state.dias.lunes;
      Object.keys(state.dias).forEach((dia) => {
        state.dias[dia] = structuredClone(base);
      });
      syncUI();
      showToast('Listo', 'Horarios copiados', 'info');
    });

  // CERRAR TODOS
  document
    .getElementById('cerrarTodosBtn')
    ?.addEventListener('click', () => {
      Object.keys(state.dias).forEach((dia) => {
        state.dias[dia] = { abierto: false, desde: '', hasta: '' };
      });
      syncUI();
      showToast('Listo', 'Todos cerrados', 'info');
    });
}

// ==================== SYNC UI (NO RE-RENDER) ====================
function syncUI() {
  Object.entries(state.dias).forEach(([dia, data]) => {
    const checkbox = document.querySelector(`input[type="checkbox"][data-dia="${dia}"]`);
    const desde = document.querySelector(`input[data-dia="${dia}"][data-field="desde"]`);
    const hasta = document.querySelector(`input[data-dia="${dia}"][data-field="hasta"]`);

    if (checkbox) checkbox.checked = data.abierto;
    if (desde) desde.value = data.desde;
    if (hasta) hasta.value = data.hasta;
  });
}

// ==================== UTILS ====================
function capitalizar(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
