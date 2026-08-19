// ============================================================
// src/pages/modelo-cierre.js
// ============================================================
//
// Define si el comercio cierra transacciones directo (pedido con
// items+cantidad+entrega, como gastronomía o retail) o si necesita
// que el cliente vea/pruebe el producto en persona antes de decidir
// (autos, maquinaria, industria pesada, inmobiliaria a futuro).
//
// Esto NO es una variante de "entrega" -- es un modelo transaccional
// distinto. En "showroom_lead" el bot no cierra nada: genera un lead
// calificado (interés + item puntual) para que un vendedor humano
// cierre en persona. Por eso, si el comercio elige esta opción, el
// step "entrega" se salta completo en el pipeline (ver
// flowController.js: calcularPipeline) -- no hay qué entregar.

import { runLifecycle }           from '/src/skeleton/lifecycle.js';
import { createFirebaseAdapter }  from '/src/skeleton/adapters/firebaseAdapter.js';
import { mountLayout }            from '/src/skeleton/layout/index.js';
import { runFlowController }      from '/src/controllers/flowController.js';
import { createCard }             from '/src/skeleton/components/card/index.js';
import { createOnboardingButton } from '/src/skeleton/components/onboarding-button/index.js';
import { showToast }              from '/src/skeleton/components/toast/index.js';
import './modelo-cierre.css';

const OPCIONES = [
  {
    key:   'directo',
    icon:  'fa-cart-shopping',
    label: 'El cliente pide y recibe',
    desc:  'Arma su pedido con vos por chat, elige cómo lo recibe (retiro, delivery, envío) y listo. Ideal para gastronomía, kioscos, indumentaria, retail en general.',
  },
  {
    key:   'showroom_lead',
    icon:  'fa-handshake',
    label: 'El cliente viene a ver / probar antes de decidir',
    desc:  'No hay "pedido" ni entrega -- el cliente se interesa en algo puntual y tu asistente le pasa el contacto directo a un vendedor para coordinar una visita. Ideal para autos, maquinaria, inmobiliaria, industria.',
  },
];

const adapter = (options) => createFirebaseAdapter(options);

runLifecycle({
  adapter,
  options: { loadingMessage: 'Cargando configuración...' },

  async onReady(ctx) {
    await runFlowController(ctx.user.uid);
    mountLayout(ctx);
    const state = await load(ctx);
    render(ctx, state);
  }
});

async function load(ctx) {
  // Default explícito: 'directo'. Comercios que ya pasaron onboarding
  // antes de que existiera este step no deben quedar en un estado
  // ambiguo -- ver nota de migración en el PR de este cambio.
  const modeloCierre = ctx.comercioData?.modeloCierre || 'directo';
  return { modeloCierre };
}

function render(ctx, state) {
  const page = document.getElementById('skeleton-page');
  page.innerHTML = '';

  const uiState = { modeloCierre: state.modeloCierre };
  const originalSnapshot = state.modeloCierre;

  const dirtyController = {
    hasUnsavedChanges: () => uiState.modeloCierre !== originalSnapshot,
    markSaved:         () => { /* originalSnapshot se recalcula en próximo load */ },
  };

  const header = document.createElement('div');
  header.className = 'page-header';
  header.innerHTML = `
    <h2><i class="fas fa-route"></i> Cómo cerrás tus ventas</h2>
    <p>Esto define cómo tu asistente maneja el interés de un cliente.</p>
  `;
  page.appendChild(header);

  page.appendChild(createCard({
    title:     '¡Tu IA se adapta a esto!',
    icon:      'fa-robot',
    variant:   'info',
    highlight: true,
    compact:   true,
    content:   'Si elegís "el cliente viene a ver / probar", tu asistente no va a intentar armar pedidos ni preguntar por delivery -- va a enfocarse en generar el interés y pasarlo a un vendedor.',
  }));

  const grid = document.createElement('div');
  grid.className = 'modelo-cierre-grid';

  OPCIONES.forEach(op => {
    grid.appendChild(createOpcionItem(op, uiState));
  });

  page.appendChild(grid);

  const btnContainer = document.createElement('div');
  btnContainer.style.marginTop = '30px';

  btnContainer.appendChild(createOnboardingButton({
    stepName: 'modelo-cierre',

    validate: () => !!uiState.modeloCierre,

    getData: () => ({
      modeloCierre: uiState.modeloCierre,
      comercioId:   ctx.comercioId,
    }),

    dirtyController,

    getLabel: () => {
      if (ctx.isEditMode && !dirtyController.hasUnsavedChanges()) return 'Volver al dashboard';
      return 'Guardar y continuar';
    },

    onSuccess: () => showToast('Guardado correctamente', 'success'),
    onError:   (err) => showToast('Error al guardar: ' + err.message, 'error'),
  }));

  page.appendChild(btnContainer);
}

function createOpcionItem(op, uiState) {
  const activa = uiState.modeloCierre === op.key;

  const wrapper = document.createElement('label');
  wrapper.className = `modelo-cierre-item ${activa ? 'activa' : ''}`;
  wrapper.dataset.key = op.key;

  const radio = document.createElement('input');
  radio.type    = 'radio';
  radio.name    = 'modelo_cierre';
  radio.checked = activa;

  const info = document.createElement('div');
  info.className = 'modelo-cierre-item-info';
  info.innerHTML = `
    <span class="modelo-cierre-item-label"><i class="fas ${op.icon}"></i> ${op.label}</span>
    <span class="modelo-cierre-item-desc">${op.desc}</span>
  `;

  wrapper.appendChild(radio);
  wrapper.appendChild(info);

  radio.addEventListener('change', () => {
    if (!radio.checked) return;
    uiState.modeloCierre = op.key;
    document.querySelectorAll('.modelo-cierre-item').forEach(el => el.classList.remove('activa'));
    wrapper.classList.add('activa');
    document.dispatchEvent(new Event('change'));
  });

  return wrapper;
}
