// src/pages/productos.js
// Onboarding · Paso 4 · Productos
// Versión canónica – SIN parches

// ==================== ESTILOS ====================
import '../styles/base.css';
import '../styles/layout.css';
import '../styles/components.css';
import '../styles/forms.css';
import '../styles/forms-premium.css';
import './productos.css';

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

    // 1. Layout global
    renderLayout();

    // 2. Usuario → comercio
    const userSnap = await getDoc(doc(db, 'usuarios', currentUser.uid));
    if (!userSnap.exists() || !userSnap.data().comercioId) {
      showToast('Error', 'Completá primero Mi Comercio', 'warning');
      window.location.href = '/mi-comercio.html';
      return;
    }

    currentComercioId = userSnap.data().comercioId;

    // 3. Datos base
    await loadComercio();
    await loadProductos();

    // 4. Header + navegación
    updateHeaderInfo(
      comercioData.nombreComercio || 'Mi comercio',
      PLANS[comercioData.plan || 'trial']
    );

    initNavigation();
    updateBanner();

    // 5. Render UI
    renderProductsTable();
    setupEvents();

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
  originalProductos = structuredClone(productos);
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

  if (counter) {
    counter.textContent = productos.length;
  }

  if (!tbody) return;

  if (productos.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7">Sin productos cargados</td></tr>`;
    return;
  }

  tbody.innerHTML = productos.map((p, i) => `
    ...
  `).join('');
}


// ==================== EVENTS ====================
function setupEvents() {
  window.toggleProduct = (i) => {
    productos[i].paused = !productos[i].paused;
    hasUnsavedChanges = true;
    renderProductsTable();
  };

  window.deleteProduct = (i) => {
    productos.splice(i, 1);
    hasUnsavedChanges = true;
    renderProductsTable();
  };

  document
    .getElementById('saveChangesBtnBottom')
    ?.addEventListener('click', saveAll);
}

// ==================== SAVE ====================
async function saveAll() {
  if (!hasUnsavedChanges) return;

  showLoading('Guardando...');

  const ref = collection(db, 'comercios', currentComercioId, 'productos');
  const existing = await getDocs(ref);

  const keep = new Set(productos.map(p => p.id).filter(Boolean));

  for (const d of existing.docs) {
    if (!keep.has(d.id)) {
      await deleteDoc(d.ref);
    }
  }

  for (const p of productos) {
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

  hideLoading();
  showToast('Guardado', 'Productos actualizados', 'success');

  hasUnsavedChanges = false;
  redirectAfterSave('ia-config');
}
