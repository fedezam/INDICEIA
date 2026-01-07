// src/shared/dataPageSkeleton.js
// Runtime canónico para páginas de carga de datos (onboarding + edición)

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

import { bootFlow } from '../controllers/boot/flowBoot.js';

/**
 * Skeleton principal
 * pageConfig define lo único que cambia por página
 */
export function createDataPage(pageConfig) {
  bootFlow();

  let currentUser = null;
  let comercioId = null;
  let comercioData = {};
  let hasUnsavedChanges = false;
  let isEditMode = false;

  const markAsDirty = () => {
    if (hasUnsavedChanges) return;
    hasUnsavedChanges = true;
    pageConfig.onDirtyChange?.(true);
  };

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

  async function init() {
    try {
      showLoading(pageConfig.loadingMessage || 'Cargando...');

      const urlParams = new URLSearchParams(window.location.search);
      isEditMode = urlParams.get('edit') === 'true';

      renderLayout();

      const userSnap = await getDoc(doc(db, 'usuarios', currentUser.uid));
      if (!userSnap.exists() || !userSnap.data().comercioId) {
        showToast('Error', 'Completá primero Mi Comercio', 'warning');
        pageConfig.onMissingComercio?.();
        return;
      }

      comercioId = userSnap.data().comercioId;

      const comercioSnap = await getDoc(doc(db, 'comercios', comercioId));
      comercioData = comercioSnap.exists()
        ? { id: comercioId, ...comercioSnap.data() }
        : { plan: 'trial' };

      // Header + navegación
      updateHeaderInfo(
        comercioData.nombreComercio || 'Mi comercio',
        PLANS[comercioData.plan || 'trial']
      );

      initNavigation();
      updateBanner();

      // 🔽 Hook de página
      await pageConfig.load({
        db,
        comercioId,
        comercioData,
        markAsDirty
      });

      if (isEditMode) {
        injectEditContextBar({
          hasUnsavedChangesFn: () => hasUnsavedChanges,
          message: pageConfig.editMessage,
          onExit: pageConfig.onExitEdit
        });
      }

      hideLoading();
    } catch (err) {
      console.error(err);
      hideLoading();
      showToast('Error', err.message, 'error');
    }
  }

  function updateBanner() {
    const estado = calcularEstadoPlan(comercioData);
    const plan = PLANS[comercioData.plan || 'trial'];

    let html = '';
    if (estado === 'trial') {
      html = `Trial activo · ${getDiasRestantesTrial(comercioData)} días restantes`;
    } else if (estado === 'activo') {
      html = `Plan ${plan.nombre} activo`;
    } else {
      html = 'Configurá tu información';
    }

    updateSubscriptionBanner(html, estado);
  }

  return {
    get comercioId() {
      return comercioId;
    },
    get comercioData() {
      return comercioData;
    }
  };
}
