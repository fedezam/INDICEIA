// ========================================
// DASHBOARD – VERSIÓN NORMALIZADA Y LIMPIA
// ========================================
import '../styles/base.css';
import '../styles/layout.css';
import '../styles/components.css';
import '../styles/forms-premium-final.css';
import './dashboard.css';

import { auth, db } from '../firebase.js';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

import { renderLayout, updateHeaderInfo, updateSubscriptionBanner } from '../shared/layout.js';
import { PLANS, calcularEstadoPlan, getDiasRestantesTrial } from '../shared/plans.js';
import { showToast, showLoading, hideLoading } from '../shared/utils.js';
import { runFlowController } from '../controllers/flowController.js';

let currentUser = null;
let currentComercioId = null;
let comercioData = {};

// ==================== AUTENTICACIÓN ====================
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    console.warn("No hay usuario autenticado");
    return;  // ← NO redirigir aquí → flowController o guard global lo maneja
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
    renderLayout();  // ← Header con logout global automático

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

    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));

    renderDashboard();
    setupEvents();  // ← Solo botón generar entidad

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
        stats: { productosCount: 0, horariosConfigurados: false }
      };
    }
  } catch (error) {
    console.error('❌ Error cargando comercio:', error);
    comercioData = {
      id: currentComercioId,
      plan: 'trial',
      nombreComercio: 'Mi Comercio',
      stats: { productosCount: 0, horariosConfigurados: false }
    };
  }
}

function updateBanner() {
  try {
    const estado = calcularEstadoPlan(comercioData);
    const plan = PLANS[comercioData.plan || 'trial'];
    let html = "";
    switch (estado) {
      case "trial":
        const dias = getDiasRestantesTrial(comercioData);
        html = `<strong>Trial activo</strong> – Te quedan <strong>${dias} días</strong>`;
        break;
      case "activo":
        html = `<strong>Plan ${plan.nombre} activo</strong> – Todo funcionando`;
        break;
      case "expirado":
        html = `Trial expirado – Elegí un plan para continuar`;
        break;
      default:
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

  const cont = document.getElementById("dashboardContainer");
  if (!cont) {
    console.error('❌ CRÍTICO: No existe #dashboardContainer');
    return;
  }

  const productCount = comercioData.stats?.productosCount ?? 0;
  const horarios = comercioData.stats?.horariosConfigurados === true;

  cont.innerHTML = `
    <div class="page-header">
      <h1><i class="fas fa-chart-line"></i> Dashboard</h1>
      <p>Resumen general y accesos rápidos a todas las secciones</p>
    </div>
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
          <p>${comercioData.nombreComercio || "Sin nombre"}</p>
        </div>
        <a href="mi-comercio.html?edit=true" class="btn btn-secondary btn-sm">
          <i class="fas fa-edit"></i> Editar
        </a>
      </div>
      <div class="dash-card">
        <div class="dash-icon"><i class="fas fa-clock"></i></div>
        <div class="dash-content">
          <h3>Horarios</h3>
          <p>${horarios ? "Configurados ✓" : "No configurados"}</p>
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
      <!-- Generar Entidad -->
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
      <!-- Generar Link -->
      <div class="dash-card highlight">
        <div class="dash-icon"><i class="fas fa-link"></i></div>
        <div class="dash-content">
          <h3>Obtener Link Público</h3>
          <p>URL y QR para compartir con tus clientes</p>
        </div>
        <a href="/api/link-builder?action=generate&comercio_id=${currentComercioId || 'SIN_ID'}" target="_blank" class="btn btn-primary btn-sm">
          <i class="fas fa-arrow-right"></i> Generar
        </a>
      </div>
    </section>
  `;

  console.log('✅ Dashboard renderizado correctamente');
}

function setupEvents() {
  // ===============================
  // GENERAR ENTIDAD - Frontend TONTO
  // ===============================
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
          body: JSON.stringify({ comercioId: currentComercioId })
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

  // ← NO hay código de logout aquí → lo maneja shared/logout.js + renderLayout()
}

window.validateCurrentPageData = async () => true;
