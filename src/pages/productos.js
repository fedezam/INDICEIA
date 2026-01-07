import '../styles/base.css';
import '../styles/layout.css';
import '../styles/components.css';
import '../styles/forms.css';
import '../styles/forms-premium.css';
import './productos.css';
import '../styles/progressOverlay.css';

import {
  collection,
  getDocs,
  updateDoc,
  addDoc,
  deleteDoc,
  doc
} from 'firebase/firestore';

import { db } from '../firebase.js';

import {
  showProgressOverlay,
  updateProgress,
  finishProgressOverlay
} from '../shared/progressOverlay.js';

import { showToast } from '../shared/utils.js';
import { runDataPage } from '../shared/dataPageSkeleton.js';

let currentComercioId;
let productos = [];

// ---------- PAGE MODULE ----------
const page = {
  async load(ctx) {
    currentComercioId = ctx.currentComercioId;
    const ref = collection(db, 'comercios', currentComercioId, 'productos');
    const snap = await getDocs(ref);
    productos = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },

  render() {
    renderProductsTable();
  },

  getCurrentData() {
    return productos;
  },

  isFormValid() {
    return productos.length > 0;
  },

  async save({ currentComercioId }) {
    showProgressOverlay(productos.length, {
      title: 'Guardando productos'
    });

    const ref = collection(db, 'comercios', currentComercioId, 'productos');
    const existing = await getDocs(ref);
    const keep = new Set(productos.map(p => p.id).filter(Boolean));

    for (const d of existing.docs) {
      if (!keep.has(d.id)) await deleteDoc(d.ref);
    }

    for (const p of productos) {
      updateProgress(p.nombre || 'Producto');
      if (p.id) {
        await updateDoc(doc(ref, p.id), p);
      } else {
        const { id, ...data } = p;
        await addDoc(ref, data);
      }
    }

    finishProgressOverlay('Catálogo sincronizado');
    showToast('Guardado', 'Productos actualizados', 'success');
  }
};

// ---------- UI ----------
function renderProductsTable() {
  const tbody = document.getElementById('tableBody');
  if (!tbody) return;

  tbody.innerHTML = productos.map((p, i) => `
    <tr>
      <td>${p.nombre || '(sin nombre)'}</td>
      <td>$${p.precio_final || 0}</td>
      <td>
        <button onclick="toggleProduct(${i})">⏸</button>
        <button onclick="deleteProduct(${i})">🗑</button>
      </td>
    </tr>
  `).join('');
}

window.toggleProduct = (i) => {
  productos[i].paused = !productos[i].paused;
  renderProductsTable();
};

window.deleteProduct = (i) => {
  productos.splice(i, 1);
  renderProductsTable();
};

// ---------- BOOT ----------
runDataPage(page);
