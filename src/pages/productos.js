// src/pages/productos.js

// ==================== ESTILOS ====================
import '../styles/base.css';
import '../styles/layout.css';
import '../styles/components.css';
import '../styles/forms.css';
import '../styles/forms-premium.css';
import './productos.css';
import '../styles/progressOverlay.css';

// ==================== FIRESTORE ====================
import {
  collection,
  getDocs,
  updateDoc,
  addDoc,
  deleteDoc,
  doc
} from 'firebase/firestore';

// ==================== SHARED ====================
import { showToast } from '../shared/utils.js';
import {
  showProgressOverlay,
  updateProgress,
  finishProgressOverlay
} from '../shared/progressOverlay.js';

import { redirectAfterSave } from '../controllers/flowController.js';
import { createDataPage } from '../shared/dataPageSkeleton.js';

// ==================== ESTADO LOCAL ====================
let productos = [];
let originalProductos = [];
let comercioId = null;
let markDirtyFn = () => {};

// ==================== UI ====================
function renderProductsTable() {
  const tbody = document.getElementById('tableBody');
  const counter = document.getElementById('productCount');
  const empty = document.getElementById('emptyMessage');

  if (counter) counter.textContent = productos.length;
  if (!tbody) return;

  if (productos.length === 0) {
    tbody.innerHTML = '';
    if (empty) empty.style.display = 'block';
    return;
  }

  if (empty) empty.style.display = 'none';

  tbody.innerHTML = productos.map((p, i) => `
    <tr>
      <td style="text-align:center">
        <input type="checkbox">
      </td>
      <td>${p.codigo || '-'}</td>
      <td>${p.nombre || '(sin nombre)'}</td>
      <td>$${Number(p.precio_final || 0).toLocaleString('es-AR')}</td>
      <td>${p.stock ?? '-'}</td>
      <td>${p.categoria || '-'}</td>
      <td style="text-align:center">
        <button onclick="toggleProduct(${i})" class="btn-icon">
          <i class="fas fa-${p.paused ? 'play' : 'pause'}"></i>
        </button>
        <button onclick="deleteProduct(${i})" class="btn-icon btn-danger">
          <i class="fas fa-trash"></i>
        </button>
      </td>
    </tr>
  `).join('');
}

// ==================== EVENTS ====================
function setupEvents() {
  window.toggleProduct = (i) => {
    productos[i].paused = !productos[i].paused;
    markDirtyFn();
    renderProductsTable();
  };

  window.deleteProduct = (i) => {
    productos.splice(i, 1);
    markDirtyFn();
    renderProductsTable();
  };

  document
    .getElementById('saveChangesBtnBottom')
    ?.addEventListener('click', saveAll);
}

// ==================== SAVE ====================
async function saveAll() {
  showProgressOverlay(productos.length, {
    title: 'Guardando productos',
    initialMessage: 'Preparando catálogo'
  });

  const ref = collection(window.db, 'comercios', comercioId, 'productos');
  const existing = await getDocs(ref);
  const keep = new Set(productos.map(p => p.id).filter(Boolean));

  for (const d of existing.docs) {
    if (!keep.has(d.id)) await deleteDoc(d.ref);
  }

  for (const p of productos) {
    updateProgress(`Procesando "${p.nombre || 'producto'}"`);

    if (p.id) {
      await updateDoc(doc(ref, p.id), p);
    } else {
      const { id, ...data } = p;
      await addDoc(ref, data);
    }
  }

  finishProgressOverlay('Catálogo sincronizado');
  showToast('Guardado', 'Productos actualizados', 'success');

  window.location.href = '/dashboard.html';
}

// ==================== SKELETON ====================
createDataPage({
  loadingMessage: 'Cargando productos...',
  editMessage: 'Estás editando tu catálogo de productos',

  async load({ db, comercioId: cid, markAsDirty }) {
    window.db = db; // acceso simple
    comercioId = cid;
    markDirtyFn = markAsDirty;

    const ref = collection(db, 'comercios', comercioId, 'productos');
    const snap = await getDocs(ref);

    productos = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    originalProductos = JSON.parse(JSON.stringify(productos));

    renderProductsTable();
    setupEvents();
  },

  onExitEdit: () => {
    window.location.href = '/dashboard.html';
  }
});
