// src/pages/mi-comercio.js

import '../styles/base.css';
import '../styles/layout.css';
import '../styles/components.css';
import '../styles/forms.css';
import '../styles/forms-premium.css';
import './mi-comercio.css';

import { auth, db } from '../firebase.js';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, updateDoc, addDoc, collection } from 'firebase/firestore';
import { renderLayout, updateHeaderInfo } from '../shared/layout.js';
import { initNavigation } from '../shared/navigation.js';
import { fillProvinciaSelector } from '../shared/provincias.js';
import { PLANS, calcularEstadoPlan, getDiasRestantesTrial } from '../shared/plans.js';
import { showToast, showLoading, hideLoading } from '../shared/utils.js';
import { runFlowController } from '../controllers/flowController.js';

let currentUser = null;
let currentComercioId = null;
let comercioData = {};
let originalData = {};
let selectedCategories = [];
let hasUnsavedChanges = false;

// ==================== INICIALIZACIÓN ====================
onAuthStateChanged(auth, async (user) => {
  if (!user) return location.href = "/login.html";
  currentUser = user;
  await initializePage();
  runFlowController(user.uid);
});

// ==================== CARGA INICIAL ====================
async function initializePage() {
  showLoading('Cargando tu comercio...');
  renderLayout();

  const userRef = doc(db, 'usuarios', currentUser.uid);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists() || !userSnap.data().comercioId) {
    const nuevo = await addDoc(collection(db, 'comercios'), {
      dueñoId: currentUser.uid,
      fechaCreacion: new Date(),
      plan: 'trial',
      pais: 'Argentina',
      fechaInicioTrial: new Date(),
      onboardingSteps: { usuario: true }
    });
    currentComercioId = nuevo.id;
    await updateDoc(userRef, { comercioId: currentComercioId });
  } else {
    currentComercioId = userSnap.data().comercioId;
  }

  await loadComercioData();
  initNavigation();
  updateHeaderInfo(comercioData.nombreComercio || 'Mi Comercio', PLANS[comercioData.plan || 'trial']);
  renderPlans();
  renderCategoriesSection();
  renderPaymentMethods();
  fillForm();
  fillProvinciaSelector(document.getElementById('provincia'), comercioData.provincia);
  createTopSaveButton();
  setupEventListeners();
  insertAIHelperCard();
  checkFormValidity();
  hideLoading();
}

// ==================== CARGAR DATOS ====================
async function loadComercioData() {
  const snap = await getDoc(doc(db, 'comercios', currentComercioId));
  if (snap.exists()) {
    comercioData = { id: currentComercioId, ...snap.data() };
    originalData = structuredClone(comercioData);
    selectedCategories = comercioData.categories || [];
  }
}

// ==================== MARCAR CAMBIOS (ÚNICA FUNCIÓN) ====================
function markAsChanged() {
  hasUnsavedChanges = true;
  checkFormValidity();
}

// ==================== BOTÓN SUPERIOR ====================
function createTopSaveButton() {
  if (document.getElementById('saveChangesBtn')) return;
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.id = 'saveChangesBtn';
  btn.className = 'btn-save';
  btn.innerHTML = '<i class="fas fa-save"></i> <span>Guardar Cambios</span>';
  btn.disabled = true;
  btn.onclick = saveFormData;
  document.querySelector('.section-title').after(btn);
}

// ==================== VALIDACIÓN EN TIEMPO REAL ====================
function checkFormValidity() {
  const top = document.getElementById('saveChangesBtn');
  const bottom = document.getElementById('saveChangesBtnBottom');
  const valid = validateForm();
  [top, bottom].forEach(b => {
    if (b) {
      b.disabled = !(hasUnsavedChanges && valid);
      b.classList.toggle('ready', hasUnsavedChanges && valid);
    }
  });
}

// ==================== EVENT LISTENERS ====================
function setupEventListeners() {
  document.getElementById('miComercioForm').addEventListener('input', markAsChanged);
  document.getElementById('miComercioForm').addEventListener('change', markAsChanged);
  document.querySelectorAll('#planSelector .plan-card').forEach(card => {
    card.addEventListener('click', () => {
      document.querySelectorAll('.plan-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      markAsChanged();
    });
  });
}

// ==================== GUARDAR ====================
async function saveFormData() {
  if (!validateForm()) return;

  const buttons = [document.getElementById('saveChangesBtn'), document.getElementById('saveChangesBtnBottom')].filter(Boolean);
  buttons.forEach(b => {
    b.classList.add('saving');
    b.disabled = true;
    b.innerHTML = b.id === 'saveChangesBtn' ? '<i class="fas fa-spinner fa-spin"></i> Guardando...' : 'Guardando...';
  });

  try {
    const formData = new FormData(document.getElementById('miComercioForm'));
    const updates = {};
    for (let [k, v] of formData) updates[k] = v.trim();

    updates.categories = selectedCategories;
    updates.paymentMethods = Array.from(document.querySelectorAll('input[name="metodos_pago"]:checked')).map(i => i.value);
    updates.plan = document.querySelector('.plan-card.selected')?.dataset.plan || 'trial';
    updates['onboardingSteps.mi-comercio'] = true;
    updates.fechaActualizacion = new Date();

    await updateDoc(doc(db, 'comercios', currentComercioId), updates);

    comercioData = { ...comercioData, ...updates };
    originalData = structuredClone(comercioData);
    hasUnsavedChanges = false;

    buttons.forEach(b => {
      b.classList.remove('saving');
      b.classList.add('saved');
      b.innerHTML = b.id === 'saveChangesBtn' ? '<i class="fas fa-check"></i> ¡Guardado!' : '¡Guardado!';
    });

    setTimeout(() => buttons.forEach(b => {
      b.disabled = true;
      b.className = b.id === 'saveChangesBtn' ? 'btn-save' : '';
      b.innerHTML = b.id === 'saveChangesBtn' ? '<i class="fas fa-save"></i> <span>Guardar Cambios</span>' : 'Guardar Cambios';
    }), 2500);

    showToast('Éxito', 'Datos guardados', 'success');
    updateHeaderInfo(comercioData.nombreComercio, PLANS[comercioData.plan]);
    setTimeout(() => runFlowController(currentUser.uid), 1000);

  } catch (err) {
    console.error(err);
    buttons.forEach(b => {
      b.classList.remove('saving');
      b.disabled = false;
      b.textContent = 'Error';
    });
    showToast('Error', 'No se pudo guardar', 'error');
  }
  checkFormValidity();
}

// ==================== VALIDACIÓN ====================
function validateForm() {
  const required = ['nombreComercio', 'ciudad', 'direccion', 'descripcion', 'telefono', 'email'];
  for (const f of required) {
    if (!document.getElementById(f)?.value.trim()) {
      showToast('Faltan datos', 'Completa todos los campos obligatorios', 'warning');
      return false;
    }
  }
  if (selectedCategories.length === 0) {
    showToast('Categoría', 'Selecciona al menos una categoría', 'warning');
    return false;
  }
  if (!document.querySelector('.plan-card.selected')) {
    showToast('Plan', 'Selecciona un plan', 'warning');
    return false;
  }
  return true;
}

// ==================== CARD AYUDA IA ====================
function insertAIHelperCard() {
  if (document.querySelector('.ai-helper-card')) return;
  const card = document.createElement('div');
  card.className = 'ai-helper-card';
  card.innerHTML = `
    <div class="ai-helper-icon">AI</div>
    <div class="ai-helper-content">
      <h4>¡Tu comercio cobra vida!</h4>
      <p>Con esta información tu IA podrá atender a tus clientes 24/7 como si fueras vos.</p>
    </div>`;
  document.querySelector('.container').insertBefore(card, document.querySelector('.form-section'));
}

window.validateCurrentPageData = () => hasUnsavedChanges ? (showToast('Cambios sin guardar', 'Guardá antes de continuar', 'warning'), false) : true;
