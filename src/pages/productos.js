// src/pages/productos.js
import '../styles/base.css';
import '../styles/layout.css';
import '../styles/components.css';
import '../styles/forms.css';
import '../styles/forms-premium.css';
import './productos.css';
import '../styles/progressOverlay.css';

import { collection, getDocs, updateDoc, addDoc, deleteDoc, doc } from 'firebase/firestore';

import {
  showToast
} from '../shared/utils.js';

import {
  showProgressOverlay,
  updateProgress,
  finishProgressOverlay
} from '../shared/progressOverlay.js';

import { redirectAfterSave } from '../controllers/flowController.js';

import { createDataPage } from '../shared/dataPageSkeleton.js';

let productos = [];
let originalProductos = [];
let comercioId = null;
let dirty = false;

// 🔌 Conexión al skeleton
createDataPage({
  loadingMessage: 'Cargando productos...',
  editMessage: 'Estás editando tu catálogo de productos',

  async load({ db, comercioId: cid, markAsDirty }) {
    comercioId = cid;

    const ref = collection(db, 'comercios', comercioId, 'productos');
    const snap = await getDocs(ref);

    productos = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    originalProductos = JSON.parse(JSON.stringify(productos));

    renderProductsTable();
    setupEvents(markAsDirty);
  },

  onExitEdit: () => {
    window.location.href = '/dashboard.html';
  }
});
