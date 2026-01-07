// src/shared/dataPageSkeleton.js

import { auth, db } from '../firebase.js';
import { doc, getDoc } from 'firebase/firestore';

import {
  renderLayout,
  updateHeaderInfo,
  updateSubscriptionBanner
} from './layout.js';

import { initNavigation } from './navigation.js';

import {
  PLANS,
  calcularEstadoPlan,
  getDiasRestantesTrial
} from './plans.js';

import {
  showToast,
  showLoading,
  hideLoading
} from './utils.js';

import { injectEditContextBar } from './editContextBar.js';

// ==================== SKELETON ====================
export async function runDataPage(pageModule) {
  let currentUser = null;
  let currentComercioId = null;
  let comercioData = {};

  let originalSnapshot = null;
  let hasUnsavedChanges = false;
  let isEditMode = false;

  // ---------- AUTH ----------
  auth.onAuthStateChanged(async (user) => {
    if (!user) return;
    currentUser = user;

    try {
      await user.getIdToken();
    } catch {
      await auth.signOut();
      return;
    }

    await init();
  });

  // ---------- INIT ----------
  async function init() {
    try {
      showLoading('Cargando...');

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

      const comercioSnap = await getDoc(doc(db, 'comercios', currentComercioId));
      comercioData = comercioSnap.exists()
        ? { id: currentComercioId, ...comercioSnap.data() }
        : { plan: 'trial' };

      updateHeaderInfo(
        comercioData.nombreComercio || 'Mi comercio',
        PLANS[comercioData.plan || 'trial']
      );

      initNavigation();
      updateBanner();

      // 🔌 PAGE HOOKS
      await pageModule.load({ currentComercioId, comercioData });
      pageModule.render();

      // 📸 SNAPSHOT INICIAL
      originalSnapshot = structuredClone(pageModule.getCurrentData());

      setupButtons();

      if (isEditMode) {
        injectEditContextBar({
          hasUnsavedChangesFn: () => hasUnsavedChanges,
          message: 'Estás editando información de tu comercio',
          onExit: () => {
            window.location.href = '/dashboard.html';
          }
        });
      }

      hideLoading();
    } catch (err) {
      console.error(err);
      hideLoading();
      showToast('Error', err.message, 'error');
    }
  }

  // ---------- BANNER ----------
  function updateBanner() {
    const estado = calcularEstadoPlan(comercioData);
    const plan = PLANS[comercioData.plan || 'trial'];

    let html = '';
    if (estado === 'trial') {
      html = `Trial activo · ${getDiasRestantesTrial(comercioData)} días restantes`;
    } else if (estado === 'activo') {
      html = `Plan ${plan.nombre} activo`;
    } else {
      html = 'Configurá tu comercio';
    }

    updateSubscriptionBanner(html, estado);
  }

  // ---------- DIRTY DETECTION ----------
  function reevaluateState() {
    const current = pageModule.getCurrentData();
    hasUnsavedChanges =
      JSON.stringify(current) !== JSON.stringify(originalSnapshot);

    updateSaveButtonState();
  }

  // ---------- BOTONES ----------
  function setupButtons() {
    const saveBtn = document.getElementById('saveChangesBtnBottom');
    if (!saveBtn) return;

    saveBtn.addEventListener('click', async () => {
      if (saveBtn.disabled) return;

      await pageModule.save({
        currentComercioId,
        isEditMode
      });

      originalSnapshot = structuredClone(pageModule.getCurrentData());
      hasUnsavedChanges = false;
      updateSaveButtonState();

      if (isEditMode) {
        window.location.href = '/dashboard.html';
      }
    });

    // 🔁 Observador simple (canónico)
    setInterval(reevaluateState, 300);
  }

  function updateSaveButtonState() {
    const saveBtn = document.getElementById('saveChangesBtnBottom');
    if (!saveBtn) return;

    if (isEditMode) {
      saveBtn.disabled = !hasUnsavedChanges;
    } else {
      saveBtn.disabled = !pageModule.isFormValid();
    }
  }
}
