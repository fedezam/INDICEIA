// ========================================
// 📅 HORARIOS.JS - Página completa
// Reutiliza toda la lógica de mi-comercio.js
// ========================================

import '../styles/base.css';
import '../styles/layout.css';
import '../styles/components.css';
import '../styles/forms.css';
import '../styles/forms-premium.css';
import './horarios.css';

import { auth, db } from '../firebase.js';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { renderLayout, updateHeaderInfo, updateSubscriptionBanner } from '../shared/layout.js';
import { initNavigation } from '../shared/navigation.js';
import { PLANS, calcularEstadoPlan, getDiasRestantesTrial } from '../shared/plans.js';
import { showToast, showLoading, hideLoading } from '../shared/utils.js';
import { runFlowController } from '../controllers/flowController.js';
import { initScheduleModule, getScheduleData, validateSchedule, saveSchedule } from '../modules/scheduleModule.js';

// ==================== VARIABLES GLOBALES ====================
let currentUser = null;
let currentComercioId = null;
let comercioData = {};
let originalData = {};
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
    showLoading('Cargando horarios...');

    // 🆕 Renderizar layout primero
    renderLayout();

    // Obtener comercioId del usuario
    const userRef = doc(db, 'usuarios', currentUser.uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists() || !userSnap.data().comercioId) {
      showToast('Error', 'Primero completa tu comercio', 'warning');
      setTimeout(() => window.location.href = '/mi-comercio.html', 1500);
      return;
    }

    currentComercioId = userSnap.data().comercioId;
    await loadComercioData();

    // Inicializar navigation (barra de progreso)
    initNavigation();

    // Actualizar header y banner
    updateHeaderInfo(comercioData.nombreComercio, PLANS[comercioData.plan || 'trial']);
    updateBanner();

    // 📅 Inicializar módulo de horarios
    await initScheduleModule(currentComercioId);

    createSaveButton();
    setupEventListeners();
    insertAIHelperCard();

    // Estado inicial de botones
    checkFormValidity();

    hideLoading();
  } catch (err) {
    console.error(err);
    hideLoading();
    showToast('Error', 'No se pudo cargar: ' + err.message, 'error');
  }
}

async function loadComercioData() {
  const ref = doc(db, 'comercios', currentComercioId);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    comercioData = { id: currentComercioId, ...snap.data() };
  } else {
    comercioData = { plan: 'trial', pais: 'Argentina' };
  }
  originalData = structuredClone(comercioData);
}

// ==================== BANNER ====================
function updateBanner() {
  const estado = calcularEstadoPlan(comercioData);
  const plan = PLANS[comercioData.plan || 'trial'];
  let html = '';

  switch (estado) {
    case 'trial':
      const dias = getDiasRestantesTrial(comercioData);
      html = `<strong>Trial activo</strong> – Te quedan <strong>${dias} días</strong> gratis`;
      break;
    case 'activo':
      html = `<strong>Plan ${plan.nombre} activo</strong> – Todo funcionando`;
      break;
    case 'expirado':
      html = `Trial expirado – Elegí un plan para continuar`;
      break;
    default:
      html = `Completá tu comercio para activar tu IA`;
  }

  updateSubscriptionBanner(html, estado);
}

// ==================== VALIDACIÓN Y BOTONES ====================
function markAsChanged() {
  hasUnsavedChanges = true;
  checkFormValidity();
}

function checkFormValidity() {
  const horarios = getScheduleData();
  const isValid = validateSchedule(horarios);

  const btnTop = document.getElementById('saveChangesBtn');
  const btnBottom = document.getElementById('saveChangesBtnBottom');
  const buttons = [btnTop, btnBottom].filter(Boolean);

  if (!isValid || !hasUnsavedChanges) {
    buttons.forEach(b => {
      b.disabled = true;
      b.classList.remove('ready', 'saving', 'saved');
      b.classList.add('btn-save');
      if (b.id === 'saveChangesBtn') b.innerHTML = '<i class="fas fa-save"></i> <span>Guardar Cambios</span>';
      if (b.id === 'saveChangesBtnBottom') b.innerHTML = 'Guardar Cambios';
    });
  } else {
    buttons.forEach(b => {
      b.disabled = false;
      b.classList.add('ready');
      if (!b.classList.contains('saving') && !b.classList.contains('saved')) {
        if (b.id === 'saveChangesBtn') b.innerHTML = '<i class="fas fa-save"></i> <span>Guardar Cambios</span>';
        if (b.id === 'saveChangesBtnBottom') b.innerHTML = 'Guardar Cambios';
      }
    });
  }
}

// ==================== BOTONES ====================
function createSaveButton() {
  if (document.getElementById('saveChangesBtn')) return;

  const userInfo = document.querySelector('.header .user-info');
  const logoutBtn = document.getElementById('logoutBtn');

  if (!userInfo || !logoutBtn) {
    console.warn('⚠️ No se pudo crear botón de guardar');
    return;
  }

  const btn = document.createElement('button');
  btn.id = 'saveChangesBtn';
  btn.className = 'btn-save';
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-save"></i> <span>Guardar Cambios</span>';

  userInfo.insertBefore(btn, logoutBtn);
  btn.addEventListener('click', saveFormData);
}

function setupEventListeners() {
  const grid = document.getElementById('scheduleGrid');
  if (grid) {
    grid.addEventListener('change', markAsChanged);
  }

  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      if (confirm('¿Cerrar sesión?')) signOut(auth);
    });
  }

  const btnBottom = document.getElementById('saveChangesBtnBottom');
  if (btnBottom) {
    btnBottom.addEventListener('click', saveFormData);
  }
}

// ==================== GUARDAR ====================
async function saveFormData() {
  const btn = document.getElementById('saveChangesBtn');
  const btnBottom = document.getElementById('saveChangesBtnBottom');

  const horarios = getScheduleData();

  if (!validateSchedule(horarios)) {
    showToast('Horarios incompletos', 'Configurá al menos un horario válido', 'warning');
    return;
  }

  try {
    [btn, btnBottom].forEach(b => {
      if (b) {
        b.classList.add('saving');
        b.classList.remove('saved', 'ready');
        if (b.id === 'saveChangesBtn') b.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';
        if (b.id === 'saveChangesBtnBottom') b.innerHTML = 'Guardando...';
      }
    });

    const success = await saveSchedule(currentComercioId);

    if (success) {
      comercioData.horarios = horarios;
      comercioData['onboardingSteps.horarios'] = true;
      originalData = structuredClone(comercioData);
      hasUnsavedChanges = false;

      [btn, btnBottom].forEach(b => {
        if (b) {
          b.classList.remove('saving');
          b.classList.add('saved');
          if (b.id === 'saveChangesBtn') b.innerHTML = '<i class="fas fa-check"></i> ¡Guardado!';
          if (b.id === 'saveChangesBtnBottom') b.innerHTML = '¡Guardado!';
        }
      });

      setTimeout(() => {
        [btn, btnBottom].forEach(b => {
          if (b) {
            b.disabled = true;
            b.className = 'btn-save';
            if (b.id === 'saveChangesBtn') b.innerHTML = '<i class="fas fa-save"></i> <span>Guardar Cambios</span>';
            if (b.id === 'saveChangesBtnBottom') b.innerHTML = 'Guardar Cambios';
          }
        });
      }, 2500);

      showToast('Éxito', 'Horarios guardados correctamente', 'success');
      updateBanner();

      try {
        runFlowController(currentUser.uid);
      } catch (e) {
        console.warn('runFlowController falló tras guardar:', e);
      }
    }

  } catch (err) {
    console.error(err);

    [btn, btnBottom].forEach(b => {
      if (b) {
        b.className = 'btn-save';
        if (b.id === 'saveChangesBtn') b.innerHTML = '<i class="fas fa-save"></i> Error';
        if (b.id === 'saveChangesBtnBottom') b.innerHTML = 'Error';
      }
    });

    showToast('Error', 'No se pudo guardar: ' + err.message, 'error');
  } finally {
    checkFormValidity();
  }
}

function insertAIHelperCard() {
  const container = document.querySelector('main .container');
  if (!container || document.querySelector('.ai-helper-card')) return;

  const card = document.createElement('div');
  card.className = 'ai-helper-card';
  card.innerHTML = `
    <div class="ai-helper-icon">📅</div>
    <div class="ai-helper-content">
      <h4>¡Configurá tus horarios!</h4>
      <p>Tu IA usará esta información para responder automáticamente cuando estés abierto o cerrado, y gestionar consultas fuera de horario.</p>
      <small>Los horarios se mostrarán en tu perfil público</small>
    </div>
  `;
  container.insertBefore(card, container.firstChild);
}

window.validateCurrentPageData = async () => {
  if (hasUnsavedChanges) {
    showToast('Cambios sin guardar', 'Guardá antes de continuar', 'warning');
    return false;
  }
  return true;
};
