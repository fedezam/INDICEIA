// ==================== SKELETON CORE ====================
import { runLifecycle }          from '/src/skeleton/lifecycle.js';
import { createFirebaseAdapter } from '/src/skeleton/adapters/firebaseAdapter.js';
import { mountLayout }           from '/src/skeleton/layout/index.js';

// ==================== COMPONENTES SKELETON ====================
import { createButton } from '/src/skeleton/components/button/index.js';
import { showToast }    from '/src/skeleton/components/toast/index.js';

// ==================== NEGOCIO ====================
import { getAllPlans } from '../../shared/pricing/plans.service.js';

import './plans.css';

const adapter = (options) => createFirebaseAdapter(options);

runLifecycle({
  adapter,
  options: { loadingMessage: 'Cargando planes...' },

  async onReady(ctx) {
    mountLayout(ctx);
    const state = load();
    render(ctx, state);
  }
});

function load() {
  return { plans: getAllPlans() };
}

function render(ctx, state) {
  const page = document.getElementById('skeleton-page');
  page.innerHTML = '';

  const header = document.createElement('div');
  header.className = 'page-header';
  header.innerHTML = `
    <h2><i class="fas fa-layer-group"></i> Elegí tu plan</h2>
    <p>Todos los planes incluyen IA entrenada con los datos reales de tu comercio.</p>
  `;
  page.appendChild(header);

  const grid = document.createElement('section');
  grid.className = 'plans-grid';
  state.plans.forEach(plan => grid.appendChild(crearPlanCard(ctx, plan)));
  page.appendChild(grid);
}

function crearPlanCard(ctx, plan) {
  const card = document.createElement('article');
  card.className = `plan-card ${plan.recommended ? 'featured' : ''}`;
  card.innerHTML = `
    ${plan.recommended ? `<div class="badge">RECOMENDADO</div>` : ''}
    <h3 class="plan-name">Plan ${plan.name}</h3>
    <p class="plan-desc">${plan.descriptionShort}</p>
    <div class="plan-price">
      <span class="price-amount">$${plan.price.toLocaleString('es-AR')}</span>
      <span class="price-period">/mes</span>
    </div>
    <ul class="plan-features">
      <li><i class="fas fa-check"></i> Hasta ${plan.productos} productos</li>
      <li><i class="fas fa-check"></i> ${plan.live ? 'Interacción continua 24/7' : 'Respuestas bajo demanda'}</li>
      <li><i class="fas fa-check"></i> IA entrenada con tus datos</li>
      <li><i class="fas fa-check"></i> Link público + QR</li>
    </ul>
  `;

  const btnWrap = document.createElement('div');
  const btn = createButton({
    label: 'Elegir plan',
    variant: plan.recommended ? 'primary' : 'secondary',
    onClick: () => handlePlanClick(ctx, plan, btn),
  });
  btnWrap.appendChild(btn);
  card.appendChild(btnWrap);
  return card;
}

async function handlePlanClick(ctx, plan, btn) {
  if (!ctx.comercioId) {
    showToast('No se encontró tu comercio. Volvé a iniciar sesión.', 'error');
    return;
  }
  btn.disabled = true;
  const original = btn.textContent;
  btn.textContent = 'Redirigiendo...';
  try {
    const res = await fetch('/api/generate-and-upload-entity', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'create_payment_preference',
        comercioId: ctx.comercioId,
        planType: plan.id,
      }),
    });
    const data = await res.json();
    if (!res.ok || data.error) throw new Error(data.error || 'Error creando el pago');
    window.open(data.initPoint, '_blank', 'noopener');
  } catch (err) {
    console.error('Error al iniciar pago:', err);
    showToast('No se pudo iniciar el pago. Probá de nuevo en un momento.', 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = original;
  }
}
