// ========================================
// DASHBOARD – VERSIÓN FINAL CON PLANES, .LIVE Y HIGH VALUE
// ========================================
import '../styles/base.css';
import '../styles/layout.css';
import '../styles/components.css';
import '../styles/forms-premium-final.css';
import './dashboard.css';

import { auth, db } from '../firebase.js';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

import { renderLayout, updateHeaderInfo, updateSubscriptionBanner } from '../shared/layout.js';
import { PLANS, calcularEstadoPlan, getDiasRestantesTrial, hasLiveAccess, isHighValuePlan } from '../shared/plans.js';
import { showToast, showLoading, hideLoading } from '../shared/utils.js';
import { runFlowController } from '../controllers/flowController.js';

let currentUser = null;
let currentComercioId = null;
let comercioData = {};

// ==================== AUTENTICACIÓN ====================
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    console.warn('No hay usuario autenticado');
    return;
  }

  currentUser = user;
  await initializePage();
  runFlowController(user.uid);
});

// ==================== CARGA INICIAL ====================
async function initializePage() {
  console.log('🚀 INICIANDO initializePage');

  try {
    showLoading('Cargando dashboard...');
    renderLayout();

    const userRef = doc(db, 'usuarios', currentUser.uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      console.error('❌ Usuario no existe');
      hideLoading();
      return;
    }

    const userData = userSnap.data();
    currentComercioId = userData.comercioId;
    console.log('✅ ComercioId:', currentComercioId);

    await loadComercioData();

    updateHeaderInfo(
      comercioData.nombreComercio || 'Mi Comercio',
      PLANS[comercioData.plan || 'trial']
    );

    updateBanner();

    renderDashboard();
    setupEvents();

    hideLoading();
    console.log('✅ InitializePage COMPLETO');
  } catch (err) {
    console.error('❌ ERROR en initializePage:', err);
    hideLoading();
    renderDashboard();
    setupEvents();
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
        stats: { productosCount: 0, horariosConfigurados: false },
        liveEnabled: true,
        commissionEnabled: false,
        terms: { highValueAccepted: false }
      };
    }
  } catch (error) {
    console.error('❌ Error cargando comercio:', error);
    comercioData = {
      id: currentComercioId,
      plan: 'trial',
      nombreComercio: 'Mi Comercio',
      stats: { productosCount: 0, horariosConfigurados: false },
      liveEnabled: true,
      commissionEnabled: false,
      terms: { highValueAccepted: false }
    };
  }
}

function updateBanner() {
  try {
    const estado = calcularEstadoPlan(comercioData);
    let html = '';
    const planActual = PLANS[comercioData.plan || 'trial'];

    if (estado === 'trial') {
      const dias = getDiasRestantesTrial(comercioData);
      html = `<strong>Trial activo</strong> – Te quedan <strong>${dias} días</strong> de acceso completo`;
    } else if (estado === 'activo') {
      if (isHighValuePlan(comercioData.plan)) {
        html = `<strong>Plan High Value activo</strong> – Gratis con comisión por ventas`;
      } else {
        html = `<strong>Plan ${planActual.nombre} activo</strong> – Todo funcionando`;
      }
    } else if (estado === 'expirado') {
      html = `Trial expirado – Elegí un plan para continuar`;
    } else {
      html = `Bienvenido`;
    }

    updateSubscriptionBanner(html, estado);
  } catch (error) {
    console.error('Error actualizando banner:', error);
  }
}

function renderDashboard() {
  console.log('═══════════════════════════════════════════');
  console.log('🎨 RENDER DASHBOARD - INICIO');
  console.log('═══════════════════════════════════════════');

  const cont = document.getElementById('dashboardContainer');
  if (!cont) {
    console.error('❌ CRÍTICO: No existe #dashboardContainer');
    return;
  }

  const productCount = comercioData.stats?.productosCount ?? 0;
  const horarios = comercioData.stats?.horariosConfigurados === true;
  const plan = comercioData.plan || 'trial';

  cont.innerHTML = `
    <div class="page-header">
      <h1><i class="fas fa-chart-line"></i> Dashboard</h1>
      <p>Resumen general y accesos rápidos a todas las secciones</p>
    </div>

    <!-- PLAN ACTUAL -->
    <section class="dashboard-grid">
      <div class="dash-card highlight">
        <div class="dash-icon"><i class="fas fa-crown"></i></div>
        <div class="dash-content">
          <h3>Tu Plan Actual</h3>
          <p><strong>${planActual.nombre}</strong></p>
          <p>${planActual.descripcion}</p>
          ${getLiveStatus(plan, comercioData.liveEnabled)}
          ${getHighValueSection(plan, comercioData.terms?.highValueAccepted || false)}
        </div>
        <a href="planes.html" class="btn btn-primary btn-sm">
          <i class="fas fa-arrow-right"></i> Ver planes
        </a>
      </div>
    </section>

    <!-- RESTO DE CARDS -->
    <section class="dashboard-grid">
      <div class="dash-card">
        <div class="dash-icon"><i class="fas fa-user"></i></div>
        <div class="dash-content">
          <h3>Usuario</h3>
          <p>${currentUser?.email || 'No disponible'}</p>
        </div>
        <a href="usuario.html?edit=true" class="btn btn-secondary btn-sm">
          <i class="fas fa-edit"></i> Editar
        </a>
      </div>

      <div class="dash-card">
        <div class="dash-icon"><i class="fas fa-store"></i></div>
        <div class="dash-content">
          <h3>Mi Comercio</h3>
          <p>${comercioData.nombreComercio || 'Sin nombre'}</p>
        </div>
        <a href="mi-comercio.html?edit=true" class="btn btn-secondary btn-sm">
          <i class="fas fa-edit"></i> Editar
        </a>
      </div>

      <div class="dash-card">
        <div class="dash-icon"><i class="fas fa-clock"></i></div>
        <div class="dash-content">
          <h3>Horarios</h3>
          <p>${horarios ? 'Configurados ✓' : 'No configurados'}</p>
        </div>
        <a href="horarios.html?edit=true" class="btn btn-secondary btn-sm">
          <i class="fas fa-edit"></i> Editar
        </a>
      </div>

      <div class="dash-card">
        <div class="dash-icon"><i class="fas fa-box"></i></div>
        <div class="dash-content">
          <h3>Productos</h3>
          <p>${productCount} producto${productCount !== 1 ? 's' : ''}</p>
        </div>
        <a href="productos.html?edit=true" class="btn btn-secondary btn-sm">
          <i class="fas fa-edit"></i> Editar
        </a>
      </div>

      <div class="dash-card">
        <div class="dash-icon"><i class="fas fa-robot"></i></div>
        <div class="dash-content">
          <h3>Configuración IA</h3>
          <p>Estado mental y capacidades</p>
        </div>
        <a href="ia-config.html?edit=true" class="btn btn-secondary btn-sm">
          <i class="fas fa-edit"></i> Editar
        </a>
      </div>

      <div class="dash-card highlight">
        <div class="dash-icon"><i class="fas fa-palette"></i></div>
        <div class="dash-content">
          <h3>Visual Builder <span class="badge-optional">Opcional</span></h3>
          <p>Personaliza la apariencia de tu IA</p>
        </div>
        <a href="visual.html" class="btn btn-primary btn-sm">
          <i class="fas fa-arrow-right"></i> Acceder
        </a>
      </div>

      <div class="dash-card highlight">
        <div class="dash-icon"><i class="fas fa-chart-bar"></i></div>
        <div class="dash-content">
          <h3>Estadísticas</h3>
          <p>Visitas y conversiones de tu landing</p>
        </div>
        <a href="stats.html" class="btn btn-primary btn-sm">
          <i class="fas fa-arrow-right"></i> Ver
        </a>
      </div>

      <div class="dash-card highlight">
        <div class="dash-icon"><i class="fas fa-cogs"></i></div>
        <div class="dash-content">
          <h3>Generar Entidad</h3>
          <p>Publica tu menú, horarios y configuración IA al instante</p>
        </div>
        <button id="btnGenerateEntity" class="btn btn-primary btn-sm">
          <i class="fas fa-magic"></i> Generar
        </button>
      </div>

      <div class="dash-card highlight">
        <div class="dash-icon"><i class="fas fa-link"></i></div>
        <div class="dash-content">
          <h3>Mi Link Público</h3>
          <p>URL permanente y QR personalizado para compartir con clientes</p>
        </div>
        <a href="link-publico.html" class="btn btn-primary btn-sm">
          <i class="fas fa-qrcode"></i> Ver link y QR
        </a>
      </div>
    </section>
  `;

  console.log('✅ Dashboard renderizado correctamente');
}

// ====================== HELPERS PLANES ======================
function getLiveStatus(plan, liveEnabled) {
  if (hasLiveAccess(plan, liveEnabled)) {
    return '<p><strong>Interacción continua:</strong> Activada ✓</p>';
  }
  return '<p><strong>Interacción continua:</strong> No disponible</p>';
}

function getHighValueSection(plan, accepted) {
  if (isHighValuePlan(plan)) {
    return '<p style="color:#28a745;font-weight:bold;">Plan High Value activo · Comisión por ventas comprobadas</p>';
  }

  return `
    <div style="margin-top:24px;padding:16px;background:#f0f8ff;border-left:4px solid #0070f3;border-radius:8px;">
      <h4 style="margin:0 0 8px;">💼 Plan High Value (Gratis)</h4>
      <p style="font-size:14px;margin:0 0 12px;">
        Para autos, inmuebles, maquinaria, industria.<br>
        Productos ilimitados · Interacción continua incluida · Comisión 5% solo por ventas comprobadas
      </p>
      <button id="activateHighValue" class="btn btn-outline-primary btn-sm">
        Activar High Value
      </button>
    </div>
  `;
}

// ====================== EVENTOS ======================
function setupEvents() {
  // Generar entidad (existente)
  const btnGenerate = document.getElementById('btnGenerateEntity');
  if (btnGenerate) {
    btnGenerate.addEventListener('click', async () => {
      if (btnGenerate.disabled) return;

      btnGenerate.disabled = true;
      const originalText = btnGenerate.innerHTML;
      btnGenerate.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generando...';

      try {
        const response = await fetch('/api/generate-and-upload-entity', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ comercioId: currentComercioId }),
        });

        const data = await response.json();

        if (data.ok) {
          showToast('¡Entidad generada y publicada con éxito!', 'success');
        } else {
          throw new Error(data.error || 'Error desconocido del servidor');
        }
      } catch (err) {
        console.error('Error al generar entidad:', err);
        showToast('Error: ' + (err.message || 'No se pudo completar la operación'), 'error');
      } finally {
        btnGenerate.disabled = false;
        btnGenerate.innerHTML = originalText;
      }
    });
  }

  // Activación High Value
  const activateBtn = document.getElementById('activateHighValue');
  if (activateBtn) {
    activateBtn.addEventListener('click', () => openHighValueModal());
  }
}

function openHighValueModal() {
  const modal = document.createElement('div');
  modal.innerHTML = `
    <div style="position:fixed;inset:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:1000;">
      <div style="background:white;border-radius:12px;padding:32px;max-width:500px;width:90%;box-shadow:0 10px 40px rgba(0,0,0,0.2);">
        <h3 style="margin-top:0;">Activar Plan High Value (Gratis)</h3>
        <p>Ideal para ventas de alto valor: autos, inmuebles, maquinaria, industria.</p>
        <ul style="text-align:left;font-size:14px;line-height:1.5;">
          <li>Productos ilimitados</li>
          <li>Interacción continua incluida</li>
          <li>Sin costo mensual</li>
          <li>Comisión del 5% solo sobre ventas comprobadas mediante el sistema</li>
        </ul>
        <p style="font-size:14px;"><strong>Importante:</strong> El ocultamiento deliberado de ventas comprobadas resultará en la desactivación permanente del servicio.</p>
        <label style="display:block;margin:24px 0 16px;">
          <input type="checkbox" id="acceptHVTerms">
          Acepto los términos del plan High Value
        </label>
        <div style="text-align:right;">
          <button id="cancelHV" class="btn btn-secondary btn-sm" style="margin-right:8px;">Cancelar</button>
          <button id="confirmHV" class="btn btn-primary btn-sm" disabled>Activar</button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  const checkbox = modal.querySelector('#acceptHVTerms');
  const confirmBtn = modal.querySelector('#confirmHV');
  const cancelBtn = modal.querySelector('#cancelHV');

  checkbox.addEventListener('change', () => {
    confirmBtn.disabled = !checkbox.checked;
  });

  confirmBtn.addEventListener('click', async () => {
    try {
      await updateDoc(doc(db, 'comercios', currentComercioId), {
        plan: 'highvalue',
        liveEnabled: true,
        commissionEnabled: true,
        terms: {
          highValueAccepted: true,
          acceptedAt: new Date()
        }
      });
      showToast('Plan High Value activado con éxito', 'success');
      modal.remove();
      location.reload();
    } catch (err) {
      showToast('Error al activar el plan', 'error');
    }
  });

  cancelBtn.addEventListener('click', () => modal.remove());
  modal.addEventListener('click', (e) => {
    if (e.target === modal.firstElementChild.parentElement) modal.remove();
  });
}

window.validateCurrentPageData = async () => true;