// ========================================
// PLANES.JS - Selección de Planes y Pagos
// ========================================

import { auth, db } from './firebase.js';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { renderLayout, updateHeaderInfo } from './shared/layout.js';
import { PLANS, calcularEstadoPlan, getDiasRestantesTrial, getPlanData, normalizePlanId } from './shared/plans.js';
import { showToast, showLoading, hideLoading } from './shared/utils.js';

let currentUser = null;
let currentComercioId = null;
let comercioData = {};

// ==================== CONFIGURACIÓN DE MERCADO PAGO ====================
// ⚠️ IMPORTANTE: Reemplazar estos links con los REALES de tu cuenta de Mercado Pago
const MERCADOPAGO_LINKS = {
  basic: 'https://mpago.la/2VxFHkY',      // Reemplazar con tu link real
  medium: 'https://mpago.la/2VxFHkY',     // Reemplazar con tu link real
  medium_live: 'https://mpago.la/2VxFHkY', // Reemplazar con tu link real
  pro: 'https://mpago.la/2VxFHkY'         // Reemplazar con tu link real
};

// ==================== INICIALIZACIÓN ====================
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = '/login.html';
    return;
  }

  currentUser = user;
  await initializePage();
});

async function initializePage() {
  try {
    showLoading('Cargando planes...');
    renderLayout();

    const userRef = doc(db, 'usuarios', currentUser.uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      throw new Error('Usuario no encontrado');
    }

    const userData = userSnap.data();
    currentComercioId = userData.comercioId;

    await loadComercioData();

    const planActual = getPlanData(comercioData.plan);
    updateHeaderInfo(
      comercioData.nombreComercio || 'Mi Comercio',
      planActual
    );

    renderPlanesPage();
    hideLoading();
  } catch (error) {
    console.error('Error inicializando página:', error);
    hideLoading();
    showToast('Error al cargar la página', 'error');
  }
}

async function loadComercioData() {
  try {
    const ref = doc(db, 'comercios', currentComercioId);
    const snap = await getDoc(ref);
    
    if (snap.exists()) {
      comercioData = { id: currentComercioId, ...snap.data() };
    } else {
      comercioData = {
        id: currentComercioId,
        plan: 'trial',
        nombreComercio: 'Mi Comercio',
        stats: { productosCount: 0 },
        liveEnabled: false
      };
    }
    
    // Normalizar plan si es necesario
    comercioData.plan = normalizePlanId(comercioData.plan);
  } catch (error) {
    console.error('Error cargando comercio:', error);
    throw error;
  }
}

// ==================== RENDERIZADO PRINCIPAL ====================
function renderPlanesPage() {
  const container = document.getElementById('planesContainer');
  const currentPlanId = comercioData.plan || 'trial';
  const estado = calcularEstadoPlan(comercioData);
  const diasRestantes = getDiasRestantesTrial(comercioData);

  let html = `
    <div class="planes-header">
      <h1>Elegí tu Plan</h1>
      <p>Seleccioná el plan que mejor se adapte a tu negocio</p>
      ${renderCurrentPlanBadge(currentPlanId)}
    </div>

    ${renderTrialAlert(estado, diasRestantes)}

    <div class="plans-container">
      <div class="plans-grid">
        ${renderPlanCard('trial', currentPlanId)}
        ${renderPlanCard('basic', currentPlanId)}
        ${renderPlanCard('medium', currentPlanId)}
        ${renderPlanCard('pro', currentPlanId)}
      </div>

      ${renderHighValueSection(currentPlanId)}
      ${renderComparisonSection()}
    </div>
  `;

  container.innerHTML = html;
  setupEventListeners();
}

function renderCurrentPlanBadge(planId) {
  const plan = getPlanData(planId);
  return `
    <div class="current-plan-badge">
      <span>${plan.emoji}</span>
      <span>Plan actual: <strong>${plan.nombre}</strong></span>
    </div>
  `;
}

function renderTrialAlert(estado, diasRestantes) {
  if (estado === 'expirado') {
    return `
      <div class="trial-alert danger">
        <div class="trial-alert-icon">⏰</div>
        <div class="trial-alert-content">
          <h3>¡Tu trial ha expirado!</h3>
          <p>Elegí un plan ahora para seguir usando el servicio sin interrupciones</p>
        </div>
      </div>
    `;
  }
  
  if (estado === 'trial' && diasRestantes <= 2) {
    return `
      <div class="trial-alert warning">
        <div class="trial-alert-icon">⚠️</div>
        <div class="trial-alert-content">
          <h3>Tu trial expira en ${diasRestantes} día${diasRestantes !== 1 ? 's' : ''}</h3>
          <p>Elegí tu plan ahora para no perder acceso a todas las funcionalidades</p>
        </div>
      </div>
    `;
  }
  
  return '';
}

function renderPlanCard(planId, currentPlanId) {
  const plan = PLANS[planId];
  const isCurrent = planId === currentPlanId;
  const isFeatured = planId === 'pro';
  
  let priceHTML = '';
  if (plan.precio === 0) {
    priceHTML = `
      <div class="plan-price">
        <span class="price-free">GRATIS</span>
        <p class="price-note">Por ${plan.duracion} días</p>
      </div>
    `;
  } else {
    priceHTML = `
      <div class="plan-price">
        <span class="price-amount">
          <span class="price-currency">$</span>${plan.precio}
        </span>
        <span class="price-period">/mes</span>
      </div>
    `;
  }

  // Toggle de Live para Medium
  let liveToggleHTML = '';
  if (planId === 'medium') {
    liveToggleHTML = `
      <div class="live-toggle-section">
        <div class="live-toggle-header">
          <h4>⚡ Interacción Continua</h4>
          <label class="toggle-switch">
            <input type="checkbox" id="mediumLiveToggle">
            <span class="toggle-slider"></span>
          </label>
        </div>
        <p class="live-toggle-description">
          Mantené conversaciones fluidas y contextuales con tus clientes
        </p>
        <p class="live-toggle-price">+$10/mes adicionales</p>
      </div>
    `;
  }

  return `
    <div class="plan-card ${planId} ${isFeatured ? 'featured' : ''}" data-plan="${planId}">
      ${isCurrent ? '<div class="current-badge"><i class="fas fa-check-circle"></i> Tu plan actual</div>' : ''}
      ${isFeatured && !isCurrent ? '<div class="featured-badge">⭐ Más popular</div>' : ''}
      
      <div class="plan-header">
        <span class="plan-emoji">${plan.emoji}</span>
        <h3 class="plan-name">${plan.nombre}</h3>
        <p class="plan-description">${plan.descripcion}</p>
      </div>

      ${priceHTML}

      <ul class="plan-features">
        ${plan.features.map(f => `<li><i class="fas fa-check-circle"></i> ${f}</li>`).join('')}
      </ul>

      ${liveToggleHTML}

      <div class="plan-actions">
        ${renderPlanButton(planId, currentPlanId, isCurrent)}
      </div>
    </div>
  `;
}

function renderPlanButton(planId, currentPlanId, isCurrent) {
  if (isCurrent) {
    return `
      <button class="btn-select-plan disabled">
        <span>Plan Actual</span>
      </button>
    `;
  }

  if (planId === 'trial') {
    return `
      <button class="btn-select-plan secondary" disabled>
        <span>No disponible</span>
      </button>
    `;
  }

  return `
    <button class="btn-select-plan primary" onclick="selectPlan('${planId}')">
      <span>Seleccionar Plan</span>
    </button>
  `;
}

function renderHighValueSection(currentPlanId) {
  const isCurrentHighValue = currentPlanId === 'highvalue';

  if (isCurrentHighValue) {
    return `
      <div class="highvalue-card">
        <div class="highvalue-content">
          <div class="highvalue-header">
            <span style="font-size: 4rem; display: block; margin-bottom: 1rem;">💼</span>
            <h2>Plan High Value Activo</h2>
            <p class="subtitle">Tu plan actual con comisión por ventas</p>
          </div>
          
          <div class="highvalue-grid">
            <div class="highvalue-feature">
              <h4>✅ Productos Ilimitados</h4>
              <p>Sin límites en tu catálogo</p>
            </div>
            <div class="highvalue-feature">
              <h4>⚡ Interacción Continua</h4>
              <p>Incluida sin costo adicional</p>
            </div>
            <div class="highvalue-feature">
              <h4>💰 Comisión 5%</h4>
              <p>Solo por ventas comprobadas</p>
            </div>
          </div>

          <div class="highvalue-actions">
            <button class="btn-highvalue secondary" onclick="window.location.href='/dashboard.html'">
              Volver al Dashboard
            </button>
          </div>
        </div>
      </div>
    `;
  }

  return `
    <div class="highvalue-card">
      <div class="highvalue-content">
        <div class="highvalue-header">
          <h2>💼 Plan High Value</h2>
          <p class="subtitle">Ideal para productos de alto valor</p>
        </div>
        
        <div class="highvalue-grid">
          <div class="highvalue-feature">
            <h4>🏭 Para Qué Negocios</h4>
            <p>Concesionarias, inmobiliarias, maquinaria, industria</p>
          </div>
          <div class="highvalue-feature">
            <h4>💸 Sin Costo Mensual</h4>
            <p>Completamente gratis, pagas solo por resultados</p>
          </div>
          <div class="highvalue-feature">
            <h4>♾️ Productos Ilimitados</h4>
            <p>Agregá todos los productos que necesites</p>
          </div>
          <div class="highvalue-feature">
            <h4>⚡ Live Incluido</h4>
            <p>Interacción continua sin cargo adicional</p>
          </div>
          <div class="highvalue-feature">
            <h4>💰 Comisión Justa</h4>
            <p>Solo 5% por ventas comprobadas mediante el sistema</p>
          </div>
          <div class="highvalue-feature">
            <h4>📊 Transparencia Total</h4>
            <p>Todas las ventas son verificables y auditables</p>
          </div>
        </div>

        <div class="highvalue-actions">
          <button class="btn-highvalue primary" onclick="openHighValueModal()">
            Activar High Value
          </button>
          <button class="btn-highvalue secondary" onclick="document.getElementById('comparisonSection').scrollIntoView({behavior: 'smooth'})">
            Ver Comparación
          </button>
        </div>
      </div>
    </div>
  `;
}

function renderComparisonSection() {
  return `
    <div class="comparison-section" id="comparisonSection">
      <h2>¿Qué plan necesito?</h2>
      <div class="comparison-cards">
        <div class="comparison-card">
          <h3>🧁 Basic</h3>
          <span class="range">Hasta 30 productos</span>
          <p>Ideal para cafeterías, kioscos, food trucks y pequeños negocios que necesitan presencia digital básica.</p>
        </div>
        <div class="comparison-card">
          <h3>🏪 Medium</h3>
          <span class="range">Hasta 100 productos</span>
          <p>Perfecto para restaurantes, tiendas de barrio y comercios en crecimiento que requieren más capacidad.</p>
        </div>
        <div class="comparison-card">
          <h3>💼 Pro</h3>
          <span class="range">Hasta 500 productos</span>
          <p>Para supermercados, cadenas, franquicias y negocios que necesitan todas las funcionalidades premium.</p>
        </div>
        <div class="comparison-card">
          <h3>💼 High Value</h3>
          <span class="range">Productos ilimitados</span>
          <p>Exclusivo para ventas de alto ticket: concesionarias, inmobiliarias, maquinaria industrial y equipamiento.</p>
        </div>
      </div>
    </div>
  `;
}

// ==================== SELECCIÓN DE PLAN ====================
window.selectPlan = async function(planId) {
  const plan = PLANS[planId];
  const currentPlanId = comercioData.plan;

  // Verificar si es Medium y si tiene Live activado
  let withLive = false;
  let finalPrice = plan.precio;
  
  if (planId === 'medium') {
    const liveToggle = document.getElementById('mediumLiveToggle');
    withLive = liveToggle ? liveToggle.checked : false;
    finalPrice = withLive ? plan.precioLive : plan.precio;
  }

  // Determinar tipo de cambio
  const isUpgrade = getPlanLevel(planId) > getPlanLevel(currentPlanId);
  const isDowngrade = getPlanLevel(planId) < getPlanLevel(currentPlanId);

  if (isDowngrade) {
    showDowngradeWarning(planId, currentPlanId, finalPrice, withLive);
  } else {
    showPaymentModal(planId, finalPrice, withLive, isUpgrade);
  }
};

function getPlanLevel(planId) {
  const levels = { trial: 0, basic: 1, medium: 2, pro: 3, highvalue: 3 };
  return levels[planId] || 0;
}

function showPaymentModal(planId, price, withLive, isUpgrade) {
  const plan = PLANS[planId];
  const modal = document.getElementById('paymentModal');
  const modalBody = document.getElementById('modalBody');

  const changeType = isUpgrade ? 'Upgrade' : 'Cambio';
  
  modalBody.innerHTML = `
    <div class="modal-header">
      <span class="modal-icon">${plan.emoji}</span>
      <h2>Confirmar ${changeType} de Plan</h2>
      <p>Estás por contratar el plan ${plan.nombre}</p>
    </div>

    <div class="plan-summary">
      <div class="plan-summary-row">
        <span>Plan:</span>
        <strong>${plan.nombre}</strong>
      </div>
      ${withLive ? `
        <div class="plan-summary-row">
          <span>Interacción Continua:</span>
          <strong>Incluida</strong>
        </div>
      ` : ''}
      <div class="plan-summary-row">
        <span>Productos:</span>
        <strong>${plan.productos ? `Hasta ${plan.productos}` : 'Ilimitados'}</strong>
      </div>
      <div class="plan-summary-row total">
        <span>Total mensual:</span>
        <strong>$${price}</strong>
      </div>
    </div>

    <div class="payment-info">
      <p><strong>📋 Cómo funciona:</strong></p>
      <p>1️⃣ Al hacer clic en "Ir a pagar", serás redirigido a Mercado Pago</p>
      <p>2️⃣ Completá el pago de forma segura en su plataforma</p>
      <p>3️⃣ Una vez confirmado el pago, tu plan se activará automáticamente</p>
      <p>4️⃣ Recibirás un email de confirmación con los detalles</p>
    </div>

    <div class="payment-info" style="background: #fff3cd; border-color: #ffc107;">
      <p style="color: #856404;"><strong>⚠️ Importante:</strong></p>
      <p style="color: #856404;">Este es un pago único mensual. Deberás renovar manualmente cada mes. En el futuro implementaremos renovación automática.</p>
    </div>

    <div class="modal-actions">
      <button class="btn-modal-cancel" onclick="closePaymentModal()">
        Cancelar
      </button>
      <button class="btn-modal-confirm" onclick="proceedToPayment('${planId}', ${withLive})">
        Ir a Pagar
      </button>
    </div>
  `;

  modal.style.display = 'flex';
}

function showDowngradeWarning(planId, currentPlanId, price, withLive) {
  const plan = PLANS[planId];
  const currentPlan = PLANS[currentPlanId];
  const modal = document.getElementById('paymentModal');
  const modalBody = document.getElementById('modalBody');

  const productCount = comercioData.stats?.productosCount || 0;
  const willExceedLimit = plan.productos && productCount > plan.productos;

  modalBody.innerHTML = `
    <div class="modal-header">
      <span class="modal-icon">⚠️</span>
      <h2>Advertencia: Downgrade de Plan</h2>
      <p>Estás por cambiar a un plan con menos funcionalidades</p>
    </div>

    <div class="plan-summary">
      <div class="plan-summary-row">
        <span>Plan actual:</span>
        <strong>${currentPlan.emoji} ${currentPlan.nombre}</strong>
      </div>
      <div class="plan-summary-row">
        <span>Nuevo plan:</span>
        <strong>${plan.emoji} ${plan.nombre}</strong>
      </div>
    </div>

    ${willExceedLimit ? `
      <div class="warning-box">
        <strong>⚠️ Límite de productos</strong>
        <p>Actualmente tenés ${productCount} productos, pero el plan ${plan.nombre} solo permite ${plan.productos}.</p>
        <p><strong>Necesitarás eliminar ${productCount - plan.productos} productos antes de cambiar de plan.</strong></p>
      </div>
    ` : ''}

    <div class="warning-box">
      <strong>❌ Funcionalidades que perderás:</strong>
      <p>Revisá cuidadosamente qué funcionalidades ya no estarán disponibles con el plan ${plan.nombre}.</p>
    </div>

    <div class="modal-actions">
      <button class="btn-modal-cancel" onclick="closePaymentModal()">
        Cancelar
      </button>
      ${!willExceedLimit ? `
        <button class="btn-modal-confirm" onclick="showPaymentModal('${planId}', ${price}, ${withLive}, false)">
          Entiendo, continuar
        </button>
      ` : `
        <button class="btn-modal-confirm" onclick="window.location.href='/productos.html'">
          Ir a gestionar productos
        </button>
      `}
    </div>
  `;

  modal.style.display = 'flex';
}

window.proceedToPayment = async function(planId, withLive) {
  try {
    // Guardar intención de pago en Firestore
    await updateDoc(doc(db, 'comercios', currentComercioId), {
      planIntention: planId,
      planIntentionWithLive: withLive,
      planIntentionDate: new Date(),
      planIntentionStatus: 'pending'
    });

    // Construir link de Mercado Pago con metadata
    let paymentLink = MERCADOPAGO_LINKS[planId];
    
    if (planId === 'medium' && withLive) {
      paymentLink = MERCADOPAGO_LINKS.medium_live;
    }

    // Agregar parámetros
    const params = new URLSearchParams({
      external_reference: currentComercioId,
      // Estos parámetros los verás en el webhook de MP
      source: 'planes_page',
      plan: planId,
      live: withLive ? '1' : '0'
    });

    const fullLink = `${paymentLink}?${params.toString()}`;

    // Abrir en nueva pestaña
    window.open(fullLink, '_blank');

    // Cerrar modal
    closePaymentModal();

    // Mostrar mensaje informativo
    showToast('Redirigiendo a Mercado Pago...', 'info');
    
    // Mostrar instrucciones
    setTimeout(() => {
      showToast('Una vez completado el pago, tu plan se activará automáticamente', 'info');
    }, 2000);

  } catch (error) {
    console.error('Error al procesar pago:', error);
    showToast('Error al procesar el pago. Por favor intenta nuevamente.', 'error');
  }
};

// ==================== HIGH VALUE MODAL ====================
window.openHighValueModal = function() {
  const modal = document.getElementById('highValueModal');
  const modalBody = document.getElementById('highValueModalBody');

  modalBody.innerHTML = `
    <div class="modal-header">
      <h2>💼 Activar Plan High Value</h2>
      <p>Plan gratuito con comisión por ventas comprobadas</p>
    </div>

    <div class="terms-content">
      <h3 style="margin-bottom: 1.5rem; font-family: var(--font-display); font-weight: 700;">
        ¿Para qué negocios?
      </h3>
      <ul class="terms-list">
        <li>
          <i class="fas fa-car"></i>
          <div>
            <strong>Concesionarias</strong>
            <p style="margin: 0.25rem 0 0; color: #64748b;">Autos, motos, vehículos de alto valor</p>
          </div>
        </li>
        <li>
          <i class="fas fa-home"></i>
          <div>
            <strong>Inmobiliarias</strong>
            <p style="margin: 0.25rem 0 0; color: #64748b;">Casas, departamentos, terrenos, locales</p>
          </div>
        </li>
        <li>
          <i class="fas fa-industry"></i>
          <div>
            <strong>Maquinaria Industrial</strong>
            <p style="margin: 0.25rem 0 0; color: #64748b;">Equipamiento, maquinaria pesada</p>
          </div>
        </li>
      </ul>

      <h3 style="margin: 2rem 0 1.5rem; font-family: var(--font-display); font-weight: 700;">
        ✅ Beneficios incluidos
      </h3>
      <ul class="terms-list">
        <li>
          <i class="fas fa-infinity"></i>
          <div>
            <strong>Productos Ilimitados</strong>
            <p style="margin: 0.25rem 0 0; color: #64748b;">Sin restricciones en tu catálogo</p>
          </div>
        </li>
        <li>
          <i class="fas fa-bolt"></i>
          <div>
            <strong>Interacción Continua Incluida</strong>
            <p style="margin: 0.25rem 0 0; color: #64748b;">Sin cargo adicional mensual</p>
          </div>
        </li>
        <li>
          <i class="fas fa-dollar-sign"></i>
          <div>
            <strong>Sin Costo Mensual</strong>
            <p style="margin: 0.25rem 0 0; color: #64748b;">Solo pagas comisión por ventas</p>
          </div>
        </li>
        <li>
          <i class="fas fa-chart-line"></i>
          <div>
            <strong>Comisión del 5%</strong>
            <p style="margin: 0.25rem 0 0; color: #64748b;">Solo sobre ventas comprobadas en el sistema</p>
          </div>
        </li>
      </ul>

      <div class="warning-box">
        <strong>⚠️ Términos Importantes</strong>
        <p>• El ocultamiento deliberado de ventas comprobadas mediante el sistema resultará en la <strong>desactivación permanente</strong> del servicio.</p>
        <p>• Todas las ventas son verificables y auditables.</p>
        <p>• La comisión se cobra únicamente sobre ventas que el sistema puede confirmar.</p>
      </div>

      <div class="terms-checkbox" onclick="this.querySelector('input').click()">
        <input type="checkbox" id="acceptHighValueTerms" onclick="event.stopPropagation(); toggleHighValueButton()">
        <label for="acceptHighValueTerms">
          Acepto los términos y condiciones del Plan High Value. Entiendo que este plan es gratuito con una comisión del 5% sobre ventas comprobadas, y que el ocultamiento de ventas resultará en desactivación del servicio.
        </label>
      </div>
    </div>

    <div class="modal-actions">
      <button class="btn-modal-cancel" onclick="closeHighValueModal()">
        Cancelar
      </button>
      <button class="btn-modal-confirm" id="btnConfirmHighValue" disabled onclick="activateHighValue()">
        Activar Plan High Value
      </button>
    </div>
  `;

  modal.style.display = 'flex';
};

window.toggleHighValueButton = function() {
  const checkbox = document.getElementById('acceptHighValueTerms');
  const button = document.getElementById('btnConfirmHighValue');
  button.disabled = !checkbox.checked;
};

window.activateHighValue = async function() {
  try {
    showLoading('Activando plan...');

    await updateDoc(doc(db, 'comercios', currentComercioId), {
      plan: 'highvalue',
      liveEnabled: true,
      commissionEnabled: true,
      terms: {
        highValueAccepted: true,
        acceptedAt: new Date(),
        acceptedBy: currentUser.uid
      },
      planActivatedAt: new Date()
    });

    hideLoading();
    closeHighValueModal();
    showToast('¡Plan High Value activado con éxito!', 'success');

    setTimeout(() => {
      window.location.href = '/dashboard.html';
    }, 2000);

  } catch (error) {
    console.error('Error activando High Value:', error);
    hideLoading();
    showToast('Error al activar el plan. Intenta nuevamente.', 'error');
  }
};

// ==================== MODAL UTILITIES ====================
window.closePaymentModal = function() {
  document.getElementById('paymentModal').style.display = 'none';
};

window.closeHighValueModal = function() {
  document.getElementById('highValueModal').style.display = 'none';
};

// Cerrar modal al hacer clic fuera
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal-overlay')) {
    e.target.style.display = 'none';
  }
});

// ==================== EVENT LISTENERS ====================
function setupEventListeners() {
  // Toggle de Live para Medium
  const liveToggle = document.getElementById('mediumLiveToggle');
  if (liveToggle) {
    liveToggle.addEventListener('change', updateMediumPrice);
  }
}

function updateMediumPrice() {
  const liveToggle = document.getElementById('mediumLiveToggle');
  const priceElement = document.querySelector('.plan-card.medium .price-amount');
  
  if (liveToggle && priceElement) {
    const withLive = liveToggle.checked;
    const price = withLive ? PLANS.medium.precioLive : PLANS.medium.precio;
    priceElement.innerHTML = `<span class="price-currency">$</span>${price}`;
  }
}

// Validación de datos al cargar
window.validateCurrentPageData = async () => true;
