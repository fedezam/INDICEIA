import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase.js';
import { showToast } from '../shared/utils.js';

// ==================== STATE ====================
let state = {
  dias: {
    lunes:     { abierto: false, desde: '', hasta: '' },
    martes:    { abierto: false, desde: '', hasta: '' },
    miercoles: { abierto: false, desde: '', hasta: '' },
    jueves:    { abierto: false, desde: '', hasta: '' },
    viernes:   { abierto: false, desde: '', hasta: '' },
    sabado:    { abierto: false, desde: '', hasta: '' },
    domingo:   { abierto: false, desde: '', hasta: '' }
  }
};

let comercioId = null;

// ==================== API SKELETON ====================
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
  return true;
}

export async function save() {
  await updateDoc(doc(db, 'comercios', comercioId), {
    horarios: state.dias
  });

  showToast('Guardado', 'Horarios guardados', 'success');
}

// ==================== RENDER ====================
function renderHorarios() {
  const container = document.getElementById('pageContent');
  if (!container) {
    console.error('No existe #pageContent');
    return;
  }

  container.innerHTML = `
    <div id="horariosContainer"></div>

    <div style="margin-top:16px">
      <button id="copiarATodosBtn">Copiar lunes a todos</button>
      <button id="cerrarTodosBtn">Cerrar todos</button>
    </div>
  `;

  const horariosContainer = document.getElementById('horariosContainer');

  Object.entries(state.dias).forEach(([dia, data]) => {
    const row = document.createElement('div');
    row.style.display = 'flex';
    row.style.gap = '8px';
    row.style.marginBottom = '8px';

    row.innerHTML = `
      <label style="width:120px">
        <input type="checkbox" data-dia="${dia}" ${data.abierto ? 'checked' : ''}>
        ${capitalizar(dia)}
      </label>

      <input type="time" data-dia="${dia}" data-field="desde" value="${data.desde}">
      <input type="time" data-dia="${dia}" data-field="hasta" value="${data.hasta}">
    `;

    horariosContainer.appendChild(row);
  });
}

// ==================== LISTENERS ====================
function attachListeners() {
  const container = document.getElementById('horariosContainer');
  if (!container) return;

  container.addEventListener('change', (e) => {
    const dia = e.target.dataset.dia;
    if (!dia) return;

    if (e.target.type === 'checkbox') {
      state.dias[dia].abierto = e.target.checked;
    }

    if (e.target.type === 'time') {
      state.dias[dia][e.target.dataset.field] = e.target.value;
    }
  });

  document.getElementById('copiarATodosBtn')?.addEventListener('click', () => {
    const base = structuredClone(state.dias.lunes);
    Object.keys(state.dias).forEach(dia => {
      state.dias[dia] = structuredClone(base);
    });
    syncUI();
    showToast('Listo', 'Copiado', 'info');
  });

  document.getElementById('cerrarTodosBtn')?.addEventListener('click', () => {
    Object.keys(state.dias).forEach(dia => {
      state.dias[dia] = { abierto: false, desde: '', hasta: '' };
    });
    syncUI();
    showToast('Listo', 'Cerrados', 'info');
  });
}

// ==================== SYNC UI ====================
function syncUI() {
  Object.entries(state.dias).forEach(([dia, data]) => {
    const c = document.querySelector(`input[type="checkbox"][data-dia="${dia}"]`);
    const d = document.querySelector(`input[data-dia="${dia}"][data-field="desde"]`);
    const h = document.querySelector(`input[data-dia="${dia}"][data-field="hasta"]`);

    if (c) c.checked = data.abierto;
    if (d) d.value = data.desde;
    if (h) h.value = data.hasta;
  });
}

// ==================== UTILS ====================
function capitalizar(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
