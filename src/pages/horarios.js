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
import { renderLayout, updateHeaderInfo, updateSubscriptionBanner } from '../shared/layout.js';
import { initNavigation } from '../shared/navigation.js';
import { fillProvinciaSelector } from '../shared/provincias.js';
import { PLANS, calcularEstadoPlan, getDiasRestantesTrial } from '../shared/plans.js';
import { showToast, showLoading, hideLoading } from '../shared/utils.js';
import { runFlowController } from '../controllers/flowController.js';

// ==================== DATOS ESTÁTICOS ====================
const CATEGORIAS_COMUNES = [
  "Panadería", "Carnicería", "Verdulería", "Kiosco", "Supermercado", "Restaurante",
  "Cafetería", "Pizzería", "Heladería", "Bar", "Ropa", "Zapatería", "Belleza",
  "Peluquería", "Gimnasio", "Farmacia", "Ferretería", "Librería", "Juguetería",
  "Electrónica", "Mascotas", "Óptica", "Limpieza", "Regalería", "Tienda de deportes"
];

// ==================== VARIABLES GLOBALES ====================
let currentUser = null;
let currentComercioId = null;
let comercioData = {};
let originalData = {};
let selectedCategories = [];
let hasUnsavedChanges = false;

// ==================== INICIALIZACIÓN ====================
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "/login.html";
    return;
  }

  currentUser = user;

  try {
    await user.getIdToken();
  } catch (err) {
    console.warn("Sesión expirada, cerrando...");
    signOut(auth);
    window.location.href = "/login.html";
    return;
  }

  await initializePage();
  runFlowController(user.uid);
});

// ==================== CARGA INICIAL ====================
async function initializePage() {
  try {
    showLoading('Cargando tu comercio...');

    renderLayout();

    const userRef = doc(db, 'usuarios', currentUser.uid);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists() && userSnap.data().comercioId) {
      currentComercioId = userSnap.data().comercioId;
    } else {
      const nuevo = await addDoc(collection(db, 'comercios'), {
        dueñoId: currentUser.uid,
        fechaCreacion: new Date(),
        plan: 'trial',
        pais: 'Argentina',
        fechaInicioTrial: new Date(),
        onboardingSteps: {
          usuario: true,
          'mi-comercio': false,
          horarios: false,
          productos: false,
          'ia-config': false
        }
      });
      currentComercioId = nuevo.id;
      await updateDoc(userRef, { comercioId: currentComercioId });
    }

    await loadComercioData();
    initNavigation();

    updateHeaderInfo(comercioData.nombreComercio, PLANS[comercioData.plan || 'trial']);
    updateSubscription OSA();
    renderPlans();
    renderCategoriesSection();
    renderPaymentMethods();

    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    fillForm();

    const provinciaEl = document.getElementById('provincia');
    if (provinciaEl) fillProvinciaSelector(provinciaEl, comercioData.provincia);

    createTopSaveButton();
    setupEventListeners();
    insertAIHelperCard();
    checkFormValidity();

    hideLoading();
  } catch (err) {
    console.error(err);
    hideLoading();
    showToast('Error', 'No se pudo cargar la página', 'error');
  }
}

// ==================== CARGAR DATOS EXISTENTES ====================
async function loadComercioData() {
  const comercioRef = doc(db, 'comercios', currentComercioId);
  const snap = await getDoc(comercioRef);
  if (snap.exists()) {
    comercioData = { id: currentComercioId, ...snap.data() };
    originalData = structuredClone(comercioData);
    selectedCategories = comercioData.categories || [];
  }
}

// ==================== FUNCIÓN PARA MARCAR CAMBIOS (única) ====================
function markAsChanged() {
  hasUnsavedChanges = true;
  checkFormValidity();
}

// ==================== BOTÓN SUPERIOR DE GUARDAR ====================
function createTopSaveButton() {
  if (document.getElementById('saveChangesBtn')) return;
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.id = 'saveChangesBtn';
  btn.className = 'btn-save';
  btn.innerHTML = '<i class="fas fa-save"></i> <span>Guardar Cambios</span>';
  btn.disabled = true;
  btn.onclick = () => saveFormData();
  document.querySelector('.section-title').after(btn);
}

// ==================== VALIDACIÓN EN TIEMPO REAL ====================
function checkFormValidity() {
  const btnTop = document.getElementById('saveChangesBtn');
  const btnBottom = document.getElementById('saveChangesBtnBottom');
  const valid = validateForm();
  [btnTop, btnBottom].forEach(b => {
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

// ==================== GUARDAR DATOS ====================
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
      b.className = 'btn-save';
      b.innerHTML = b.id === 'saveChangesBtn' ? '<i class="fas fa-save"></i> <span>Guardar Cambios</span>' : 'Guardar Cambios';
    }), 2500);

    showToast('Éxito', 'Datos guardados correctamente', 'success');
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

// ==================== VALIDACIÓN BÁSICA ====================
function validateForm() {
  const required = ['nombreComercio', 'ciudad', 'direccion', 'descripcion', 'telefono', 'email'];
  for (const field of required) {
    if (!document.getElementById(field)?.value.trim()) {
      showToast('Faltan datos', `Completa el campo ${field}`, 'warning');
      return false;
    }
  }
  if (selectedCategories.length === 0) {
    showToast('Categorías', 'Selecciona al menos una categoría', 'warning');
    return false;
  }
  if (!document.querySelector('.plan-card.selected')) {
    showToast('Plan', 'Selecciona un plan', 'warning');
    return false;
  }
  return true;
}

// ==================== Resto de funciones (renderPlans, renderCategoriesSection, etc.) ====================
// (todas las que ya tenías siguen igual, solo se eliminó la segunda declaración de markAsChanged)

insertAIHelperCard();
window.validateCurrentPageData = () => hasUnsavedChanges ? (showToast('Cambios sin guardar', 'Guardá primero', 'warning'), false) : true;
