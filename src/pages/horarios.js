// ========================================
// ARCHIVO: src/pages/horarios.js
// ========================================

// ==================== ESTILOS ====================
import '../styles/base.css';
import '../styles/layout.css';
import '../styles/components.css';
import '../styles/forms.css';
import '../styles/forms-premium.css';
import './horarios.css';
import '../styles/editContextBar.css';

// ==================== FIREBASE ====================
import { auth, db } from '../firebase.js';
import { signOut } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

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

import { injectEditContextBar } from '../shared/editContextBar.js';

// ==================== FLOW ====================
import { bootFlow } from '../controllers/boot/flowBoot.js';
import { redirectAfterSave } from '../controllers/flowController.js';

bootFlow();

// ==================== CONSTANTES ====================
const DAYS = ["lunes", "martes", "miercoles", "jueves", "viernes", "sabado", "domingo"];
const DAYS_LABELS = {
  lunes: "Lunes",
  martes: "Martes",
  miercoles: "Miércoles",
  jueves: "Jueves",
  viernes: "Viernes",
  sabado: "Sábado",
  domingo: "Domingo"
};

// ==================== ESTADO ====================
let currentComercioId = null;
let comercioData = {};
let originalHorarios = {};
let hasUnsavedChanges = false;
let isEditMode = false;

// ==================== INIT ====================
async function initializePage() {
  try {
    showLoading('Cargando horarios...');

    // 🔑 Detectar modo edición
    const urlParams = new URLSearchParams(window.location.search);
    isEditMode = urlParams.get('edit') === 'true';

    renderLayout();

    const userId = auth.currentUser.uid;

    const userSnap = await getDoc(doc(db, 'usuarios', userId));
    if (!userSnap.exists() || !userSnap.data().comercioId) {
      showToast('Error', 'Completá primero "Mi comercio"', 'warning');
      hideLoading();
      return;
    }

    currentComercioId = userSnap.data().comercioId;

    await loadComercioData();

    updateHeaderInfo(
      comercioData.nombreComercio,
      PLANS[comercioData.plan || 'trial']
    );

    initNavigation();
    updateBanner();

    renderHorariosModule();
    createSaveButton();
    setupEventListeners();
    insertAIHelperCard();
    checkFormValidity();

    // 🧠 Context bar solo en edición
    if (isEditMode) {
      injectEditContextBar({
        hasUnsavedChangesFn: () => hasUnsavedChanges,
        message: 'Estás editando los horarios de tu comercio'
      });
    }

    hideLoading();
  } catch (err) {
    console.error(err);
    hideLoading();
    showToast('Error', err.message, 'error');
  }
}

// ==================== DATA ====================
async function loadComercioData() {
  const snap = await getDoc(doc(db, 'comercios', currentComercioId));

  if (snap.exists()) {
    comercioData = { id: currentComercioId, ...snap.data() };
  } else {
    comercioData = { plan: 'trial', horarios: {} };
  }

  if (!comercioData.horarios) comercioData.horarios = {};

  DAYS.forEach(day => {
    comercioData.horarios[day] ??= {
      closed: false,
      continuous: true,
      open: "09:00",
      close: "18:00",
      morning: { enabled: false, open: "08:00", close: "13:00" },
      afternoon: { enabled: false, open: "16:00", close: "21:00" }
    };
  });

  originalHorarios = structuredClone(comercioData.horarios);
}

// ==================== BANNER ====================
function updateBanner() {
  const estado = calcularEstadoPlan(comercioData);
  const plan = PLANS[comercioData.plan || 'trial'];

  let html = '';
  if (estado === 'trial') {
    html = `Trial activo · ${getDiasRestantesTrial(comercioData)} días restantes`;
  } else if (estado === 'activo') {
    html = `Plan ${plan.nombre} activo`;
  } else {
    html = 'Configurá tus horarios';
  }

  updateSubscriptionBanner(html, estado);
}

// ==================== CAMBIOS ====================
function markAsChanged() {
  hasUnsavedChanges = true;
  checkFormValidity();
}

// ==================== SAVE ====================
async function saveFormData() {
  if (!hasUnsavedChanges) return;

  try {
    await updateDoc(doc(db, 'comercios', currentComercioId), {
      horarios: comercioData.horarios,
      'onboardingSteps.horarios': true,
      fechaActualizacion: new Date()
    });

    hasUnsavedChanges = false;
    originalHorarios = structuredClone(comercioData.horarios);

    showToast('Guardado', 'Horarios actualizados', 'success');
    updateBanner();

    // 🔁 REDIRECCIÓN CANÓNICA
    if (isEditMode) {
      window.location.href = '/dashboard.html';
    } else {
      redirectAfterSave('productos');
    }

  } catch (err) {
    console.error(err);
    showToast('Error', err.message, 'error');
  }
}

// ==================== RESTO (UI / listeners)
// ⛔ TODO lo demás queda IGUAL
// (renderHorariosModule, attachDayCardListeners, etc.)
// ====================

// (NO TOCADO A PROPÓSITO)

// ==================== INIT FINAL ====================
initializePage();
