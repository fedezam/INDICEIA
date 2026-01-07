// src/pages/productos.js
// Onboarding · Paso 4 · Productos
// Versión CANÓNICA – detección de cambios correcta

// ==================== ESTILOS ====================
import '../styles/base.css';
import '../styles/layout.css';
import '../styles/components.css';
import '../styles/forms.css';
import '../styles/forms-premium.css';
import './productos.css';
import '../styles/progressOverlay.css';

// ==================== FIREBASE ====================
import { auth, db } from '../firebase.js';
import {
  doc,
  getDoc,
  updateDoc,
  collection,
  getDocs,
  addDoc,
  deleteDoc
} from 'firebase/firestore';

// ==================== LAYOUT & SISTEMA ====================
import {
  renderLayout,
  updateHeaderInfo,
  updateSubscriptionBanner
} from '../shared/layout.js';

import { initNavigation } from '../shared/navigation.js';

import {
  PLANS,
  calcularEstadoPlan,
  getDiasRestantesTrial
} from '../shared/plans.js';

import {
  showToast,
  showLoading,
  hideLoading
} from '../shared/utils.js';

import {
  showProgressOverlay,
  updateProgress,
  finishProgressOverlay
} from '../shared/progressOverlay.js';

import { injectEditContextBar } from '../shared/editContextBar.js';
import '../styles/editContextBar.css';

// ==================== FLOW ====================
import { bootFlow } from '../controllers/boot/flowBoot.js';
import { redirectAfterSave } from '../controllers/flowController.js';

// ==================== BOOT GLOBAL ====================
bootFlow();

// ==================== ESTADO ====================
let currentUser = null;
let currentComercioId = null;
let comercioData = {};

let productos = [];
let originalProductos = [];

let hasUnsavedChanges = false;
let isEditMode = false;

// ==================== DIRTY STATE (CANÓNICO) ====================
function markAsDirty() {
  if (hasUnsavedChanges) return;
  hasUnsavedChanges = true;
  updateExitButtonState();
  updateSaveButtonState();
}

// ==================== AUTH ====================
auth.onAuthStateChanged(async (user) => {
  if (!user) return;
  currentUser = user;

  try {
    await user.getIdToken();
  } catch {
    await auth.signOut();
    return;
  }

  await initializePage();
});

// ==================== INIT ====================
async function initializePage() {
  try {
    showLoading('Cargando productos...');

    const urlParams = new URLSearchParams(window.location.search);
    isEditMode = urlParams.get('edit') === 'true';

    renderLayout();

    const userSnap = await getDoc(doc(db, 'usuarios', currentUser.uid));
    if (!userSnap.exists() || !userSnap.data().comercioId) {
      showToast('Error', 'Completá primero Mi Comercio', 'warning');
      window.location.href = '/mi-comercio.html';
      return;
    }

    currentComercioId = userSnap.data().comercioId;

    await loadComercio();
    await loadProductos();

    updateHeaderInfo(
      comercioData.nombreComercio || 'Mi comercio',
      PLANS[comercioData.plan || 'trial']
    );

    initNavigation();
    updateBanner();

    renderProductsTable();
    setupEvents();

    if (isEditMode) {
      injectEditContextBar({
        hasUnsavedChangesFn: () => hasUnsavedChanges,
        message: 'Estás editando tu catálogo de productos',
        onExit: () => {
          window.location.href = '/dashboard.html';
        }
      });
    }

    updateExitButtonState();
    updateSaveButtonState();

    document.getElementById('initialLoading')?.remove();
    hideLoading();
  } catch (err) {
    console.error(err);
    hideLoading();
    showToast('Error', err.message, 'error');
  }
}

// ==================== DATA ====================
async function loadComercio() {
  const snap = await getDoc(doc(db, 'comercios', currentComercioId));
  comercioData = snap.exists()
    ? { id: currentComercioId, ...snap.data() }
    : { plan: 'trial' };
}

async function loadProductos() {
  const ref = collection(db, 'comercios', currentComercioId, 'productos');
  const snap = await getDocs(ref);

  productos = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  originalProductos = JSON.parse(JSON.stringify(productos));
}

// ==================== HEADER BANNER ====================
function updateBanner() {
  const estado = calcularEstadoPlan(comercioData);
  const plan = PLANS[comercioData.plan || 'trial'];

  let html = '';
  if (estado === 'trial') {
    html = `Trial activo · ${getDiasRestantesTrial(comercioData)} días restantes`;
  } else if (estado === 'activo') {
    html = `Plan ${plan.nombre} activo`;
  } else {
    html = 'Elegí un plan para continuar';
  }

  updateSubscriptionBanner(html, estado);
}

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
        <button onclick="toggleProduct(${i})" class="btn-icon" title="${p.paused ? 'Activar' : 'Pausar'}">
          <i class="fas fa-${p.paused ? 'play' : 'pause'}"></i>
        </button>
        <button onclick="deleteProduct(${i})" class="btn-icon btn-danger" title="Eliminar">
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
    markAsDirty();
    renderProductsTable();
  };

  window.deleteProduct = (i) => {
    productos.splice(i, 1);
    markAsDirty();
    renderProductsTable();
  };

  document
    .getElementById('saveChangesBtnBottom')
    ?.addEventListener('click', saveAll);
}

// ==================== BOTONES CONTEXTO ====================
function updateExitButtonState() {
  const exitBtn = document.querySelector('.edit-context-bar .btn-back');
  if (!exitBtn) return;

  exitBtn.disabled = hasUnsavedChanges;
  exitBtn.title = hasUnsavedChanges
    ? 'Guardá los cambios antes de salir'
    : 'Volver al Dashboard';
}

function updateSaveButtonState() {
  const saveBtn = document.getElementById('saveChangesBtnBottom');
  if (!saveBtn) return;

  saveBtn.disabled = !hasUnsavedChanges;
  saveBtn.classList.toggle('disabled', !hasUnsavedChanges);
}

// ==================== SAVE ====================
async function saveAll() {
  if (!hasUnsavedChanges) return;

  showProgressOverlay(productos.length, {
    title: 'Guardando productos',
    initialMessage: 'Preparando catálogo'
  });

  const ref = collection(db, 'comercios', currentComercioId, 'productos');
  const existing = await getDocs(ref);
  const keep = new Set(productos.map(p => p.id).filter(Boolean));

  for (const d of existing.docs) {
    if (!keep.has(d.id)) {
      await deleteDoc(d.ref);
    }
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

  await updateDoc(doc(db, 'comercios', currentComercioId), {
    'onboardingSteps.productos': true,
    cantidadProductos: productos.length
  });

  finishProgressOverlay('Catálogo sincronizado');
  showToast('Guardado', 'Productos actualizados', 'success');

  hasUnsavedChanges = false;
  updateExitButtonState();
  updateSaveButtonState();

  if (isEditMode) {
   // Volver al dashboard luego de guardar cambios
   window.location.href = '/dashboard.html';
  } else {
   redirectAfterSave('ia-config');
  }
}

