// ============================================================
// src/pages/modelo-negocio.js
// ============================================================

import { runLifecycle }          from '/src/skeleton/lifecycle.js';
import { createFirebaseAdapter } from '/src/skeleton/adapters/firebaseAdapter.js';
import { mountLayout }           from '/src/skeleton/layout/index.js';

import { runFlowController }      from '/src/controllers/flowController.js';
import { createOnboardingButton } from '/src/skeleton/components/onboarding-button/index.js';
import { createCard }             from '/src/skeleton/components/card/index.js';
import { showToast }              from '/src/skeleton/components/toast/index.js';

import './modelo-negocio.css';

const adapter = (options) => createFirebaseAdapter(options);

runLifecycle({
  adapter,
  options: { loadingMessage: 'Cargando...' },

  async onReady(ctx) {
    await runFlowController(ctx.user.uid);
    mountLayout(ctx);
    const state = await load(ctx);
    render(ctx, state);
  }
});

async function load(ctx) {
  const offerType = ctx.userData?.offerType || {};
  return {
    productos: offerType.productos === true,
    servicios: offerType.servicios === true,
  };
}

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
  });

  const cardServicios = createCard({
    title: 'Servicios',
    content: 'Ofrecés servicios con turnos o por hora.',
    icon: 'fa-concierge-bell',
    variant: 'info',
    selectable: true,
    selected: state.servicios,
  });

  cardsContainer.appendChild(cardProductos);
  cardsContainer.appendChild(cardServicios);

  // card-select bubbles → dispara change → onboardingButton reevalúa validate()
  cardsContainer.addEventListener('card-select', () => {
    cardsContainer.dispatchEvent(new Event('change', { bubbles: true }));
  });

  // ==================== BOTÓN ONBOARDING ====================
  const btn = createOnboardingButton({
    stepName: 'modelo-negocio',

    validate: () => cardProductos.isSelected() || cardServicios.isSelected(),

    getData: () => ({
      offerType: {
        productos: cardProductos.isSelected(),
        servicios: cardServicios.isSelected(),
      }
    }),

    onError: () => showToast('Error al guardar la configuración', 'error'),
  });

  page.appendChild(btn);
}
