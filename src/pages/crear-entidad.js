// ============================================================
// src/pages/crear-entidad/crear-entidad.js
// ============================================================
// 🧠 CONTRATO ctx:
//   ctx.user.uid           → uid del usuario autenticado
//   ctx.userData           → doc /usuarios/{uid}
//   ctx.userData.offerType → { productos: bool, servicios: bool }
// ============================================================

// ==================== SKELETON CORE ====================
import { runLifecycle }          from '/src/skeleton/lifecycle.js';
import { createFirebaseAdapter } from '/src/skeleton/adapters/firebaseAdapter.js';
import { mountLayout }           from '/src/skeleton/layout/index.js';

// ==================== FIREBASE ====================
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db }                  from '/src/services/firebase/firebase.js';

// ==================== FLOW ====================
import { runFlowController } from '/src/controllers/flowController.js';
import { redirectAfterSave } from '/src/controllers/flowController.js';

// ==================== COMPONENTES ====================
import { createCard }   from '/src/skeleton/components/card/index.js';
import { createButton } from '/src/skeleton/components/button/index.js';
import { showToast }    from '/src/skeleton/components/toast/index.js';

import './crear-entidad.css';

// ==================== ADAPTER ====================
const adapter = (options) => createFirebaseAdapter(options);

// ==================== LIFECYCLE ====================
runLifecycle({
  adapter,
  options: {
    loadingMessage: 'Cargando...',
  },

  async onReady(ctx) {
    // 1️⃣ FLOW — verifica onboarding antes de renderizar
    await runFlowController(ctx.user.uid);

    // 2️⃣ LAYOUT
    mountLayout(ctx);

    // 3️⃣ LOAD
    const state = await load(ctx);

    // 4️⃣ RENDER
    render(ctx, state);
  }
});

// ============================================================
// LOAD — solo datos, sin tocar el DOM
// ============================================================
async function load(ctx) {
  const offerType = ctx.userData?.offerType || {};

  return {
    productos: offerType.productos === true,
    servicios: offerType.servicios === true,
  };
}

// ============================================================
// RENDER — solo DOM, sin lógica de negocio
// ============================================================
function render(ctx, state) {
  const page = document.getElementById('skeleton-page');
  page.innerHTML = '';

  // ==================== TÍTULO ====================
  const header = document.createElement('div');
  header.className = 'page-content';
  header.innerHTML = `
    <h1>¿Qué ofrece tu comercio?</h1>
    <p>Seleccioná una o ambas opciones para continuar.</p>
  `;
  page.appendChild(header);

  // ==================== CARDS ====================
  const cardsContainer = document.createElement('div');
  cardsContainer.className = 'cards-container';
  page.appendChild(cardsContainer);

  const cardProductos = createCard({
    title: 'Productos',
    content: 'Vendés artículos físicos o digitales.',
    icon: 'fa-box',
    variant: 'primary',
    selectable: true,
    selected: state.productos,
    clickable: true,
    onClick: () => {
      cardProductos.toggle();
      validar();
    }
  });

  const cardServicios = createCard({
    title: 'Servicios',
    content: 'Ofrecés servicios con turnos o por hora.',
    icon: 'fa-concierge-bell',
    variant: 'info',
    selectable: true,
    selected: state.servicios,
    clickable: true,
    onClick: () => {
      cardServicios.toggle();
      validar();
    }
  });

  cardsContainer.appendChild(cardProductos);
  cardsContainer.appendChild(cardServicios);

  // ==================== ERROR ====================
  const errorBox = document.createElement('p');
  errorBox.className = 'error-message';
  errorBox.style.display = 'none';
  page.appendChild(errorBox);

  // ==================== BOTÓN CONTINUAR ====================
  const continueButton = createButton({
    label: 'Continuar',
    variant: 'primary',
    icon: 'fa-arrow-right',
    disabled: !state.productos && !state.servicios,
    onClick: async () => {
      await guardar(ctx, {
        productos: cardProductos.isSelected(),
        servicios: cardServicios.isSelected(),
      }, continueButton, errorBox);
    }
  });
  page.appendChild(continueButton);

  // ==================== VALIDACIÓN LOCAL ====================
  function validar() {
    const alguno = cardProductos.isSelected() || cardServicios.isSelected();
    if (alguno) {
      continueButton.enable();
      errorBox.style.display = 'none';
    } else {
      continueButton.disable();
    }
  }
}

// ============================================================
// GUARDAR — lógica de negocio, separada del render
// ============================================================
async function guardar(ctx, { productos, servicios }, btn, errorBox) {
  if (!productos && !servicios) {
    errorBox.textContent = 'Seleccioná al menos una opción para continuar.';
    errorBox.style.display = 'block';
    return;
  }

  btn.setLoading(true);

  try {
    const ref = doc(db, 'usuarios', ctx.user.uid);
    const snap = await getDoc(ref);
    const prevSteps = snap.exists() ? snap.data().onboardingSteps || {} : {};

    await setDoc(ref, {
      offerType: { productos, servicios },
      onboardingSteps: {
        ...prevSteps,
        'crear-entidad': true,
      },
      updatedAt: new Date().toISOString(),
    }, { merge: true });

    showToast('Configuración guardada', 'success');

    // ⏳ Esperar propagación Firestore
    await new Promise(resolve => setTimeout(resolve, 500));

    redirectAfterSave();

  } catch (err) {
    console.error(err);
    showToast('Error al guardar la configuración', 'error');
  } finally {
    btn.setLoading(false);
  }
}
