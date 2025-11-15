// src/pages/dashboard.jsx
import { auth, db } from '../firebase.js';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';
import { showLoading, hideLoading, showToast } from '../shared/utils.js';
import { PLANS, calcularEstadoPlan, getDiasRestantesTrial } from '../shared/plans.js';

let currentUser = null;
let currentComercioId = null;
let comercioData = {};
let productos = [];

// ==================== VALIDACIÓN DE CONFIGURACIÓN COMPLETA ====================
async function validateCompleteSetup(comercioId) {
  try {
    const comercioRef = doc(db, 'comercios', comercioId);
    const comercioSnap = await getDoc(comercioRef);
    if (!comercioSnap.exists()) {
      return { isComplete: false, nextPage: 'mi-comercio.html', message: 'No se encontró el comercio' };
    }

    const data = comercioSnap.data();

    if (!data.nombreComercio || !data.ciudad || !data.telefono) {
      return { isComplete: false, nextPage: 'mi-comercio.html', message: 'Completa los datos de tu comercio' };
    }

    if (!data.horarios || Object.keys(data.horarios).length === 0) {
      return { isComplete: false, nextPage: 'horarios.html', message: 'Configura tus horarios de atención' };
    }

    const productosRef = collection(db, 'comercios', comercioId, 'productos');
    const productosSnap = await getDocs(productosRef);
    if (productosSnap.empty) {
      return { isComplete: false, nextPage: 'productos.html', message: 'Agrega al menos un producto' };
    }

    if (!data.aiConfig || !data.aiConfig.aiGenerated) {
      return { isComplete: false, nextPage: 'mi-ia.html', message: 'Configura tu asistente IA' };
    }

    return { isComplete: true };
  } catch (error) {
    console.error('Error validando configuración:', error);
    return { isComplete: false, nextPage: 'mi-comercio.html', message: 'Error al validar configuración' };
  }
}

// ==================== USUARIO ACTUAL ====================
function getCurrentUser() {
  return new Promise((resolve, reject) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();
      if (user) resolve(user);
      else reject(new Error('No hay usuario autenticado'));
    });
  });
}

// ==================== CARGAR DATOS ====================
async function loadComercioData() {
  try {
    const userRef = doc(db, 'usuarios', currentUser.uid);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) throw new Error('Usuario no encontrado');

    currentComercioId = userSnap.data().comercioId;
    if (!currentComercioId) throw new Error('Usuario sin comercio asignado');

    const comercioRef = doc(db, 'comercios', currentComercioId);
    const comercioSnap = await getDoc(comercioRef);
    if (!comercioSnap.exists()) throw new Error('Comercio no encontrado');

    comercioData = { id: currentComercioId, ...comercioSnap.data() };

    updateHeader();
    updateSubscriptionBanner();
  } catch (error) {
    console.error('Error cargando datos del comercio:', error);
    throw error;
  }
}

async function loadProductos() {
  try {
    const productosRef = collection(db, 'comercios', currentComercioId, 'productos');
    const productosSnap = await getDocs(productosRef);
    productos = productosSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error cargando productos:', error);
    productos = [];
  }
}

// ==================== HEADER ====================
function updateHeader() {
  const commerceNameEl = document.getElementById('commerceName');
  const planBadgeEl = document.getElementById('planBadge');

  if (commerceNameEl) commerceNameEl.textContent = comercioData.nombreComercio || 'Sin nombre';
  if (planBadgeEl) {
    const planName = PLANS[comercioData.plan || 'trial']?.nombre || 'Trial';
    planBadgeEl.textContent = planName;
  }
}

// ==================== SUSCRIPCIÓN ====================
function updateSubscriptionBanner() {
  const banner = document.getElementById('subscriptionBanner');
  const message = document.getElementById('subscriptionMessage');
  if (!banner || !message) return;

  const estado = calcularEstadoPlan(comercioData);
  const plan = PLANS[comercioData.plan || 'trial'];

  banner.className = 'subscription-banner';
  if (estado === 'trial') {
    const diasRestantes = getDiasRestantesTrial(comercioData);
    banner.classList.add('trial');
    message.innerHTML = `<strong>${plan.emoji} Plan ${plan.nombre}</strong> - Te quedan ${diasRestantes} días de prueba gratuita`;
  } else if (estado === 'expirado') {
    banner.classList.add('expired');
    message.innerHTML = `<strong>Plan expirado</strong> - Renueva tu suscripción para seguir usando el servicio`;
  } else if (estado === 'activo') {
    banner.classList.add('active');
    message.innerHTML = `<strong>${plan.emoji} Plan ${plan.nombre}</strong> - Suscripción activa`;
  } else {
    banner.classList.add('trial');
    message.textContent = 'Estado de suscripción desconocido';
  }
}

// ==================== GENERAR ASISTENTE (NUEVA VERSIÓN) ====================
async function generarAsistenteAutonomo() {
  const btn = document.getElementById('btn-generar-bot');
  const statusEl = document.getElementById('botStatus');
  if (!btn || !statusEl) return;

  btn.disabled = true;
  btn.innerHTML = `<svg class="animate-spin h-6 w-6" viewBox="0 0 24 24">
    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
  </svg> Generando...`;

  try {
    // LLAMADA A CLOUD FUNCTION (Vercel)
    const response = await fetch(`/api/generar-bot?id=${currentComercioId}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!response.ok) throw new Error('Error del servidor');

    const { url } = await response.json();
    await navigator.clipboard.writeText(url);

    statusEl.innerHTML = `
      <div class="bg-green-50 border border-green-200 text-green-800 px-6 py-4 rounded-xl text-center font-medium">
        <div class="flex items-center justify-center gap-2 mb-2">
          <svg class="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
          </svg>
          <strong>¡ASISTENTE GENERADO!</strong>
        </div>
        <p class="text-sm">URL copiada al portapapeles</p>
        <a href="${url}" target="_blank" class="text-xs underline block mt-1">Abrir JSON público →</a>
      </div>`;

    showToast('¡Éxito!', 'Tu asistente autónomo está listo', 'success');
  } catch (error) {
    console.error('Error generando asistente:', error);
    statusEl.innerHTML = `
      <div class="bg-red-50 border border-red-200 text-red-800 px-6 py-4 rounded-xl text-center">
        <strong>Error:</strong> ${error.message}
      </div>`;
    showToast('Error', error.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
        <path d="M2 17l10 5 10-5"></path>
        <path d="M2 12l10 5 10-5"></path>
      </svg>
      GENERAR ASISTENTE AUTÓNOMO`;
  }
}

// ==================== ASISTENTE VIRTUAL ====================
function renderAsistenteSection() {
  const container = document.getElementById('aiStatusSection');
  if (!container) return;

  const isAIConfigured = comercioData.aiConfig && comercioData.aiConfig.aiGenerated;

  if (!isAIConfigured) {
    container.innerHTML = `
      <div class="ai-status-card">
        <div class="ai-status-header">
          <i class="fas fa-exclamation-triangle"></i>
          <h3>Asistente no configurado</h3>
        </div>
        <p>Primero debes configurar tu asistente IA para poder compartirlo.</p>
        <button class="btn-config" onclick="window.location.href='./mi-ia.html'">
          <i class="fas fa-robot"></i> Configurar ahora
        </button>
      </div>`;
    return;
  }

  const aiConfig = comercioData.aiConfig;

  container.innerHTML = `
    <div class="ai-status-card">
      <div class="ai-status-header">
        <i class="fas fa-check-circle"></i>
        <h3>Tu Asistente Virtual está ACTIVO</h3>
      </div>
      <div class="ai-info">
        <span><i class="fas fa-robot"></i> ${aiConfig.aiName || 'Asistente'}</span>
        <span><i class="fas fa-comment-dots"></i> ${aiConfig.aiPersonality || 'Amigable'}</span>
        <span><i class="fas fa-globe"></i> Español (Argentina)</span>
      </div>
      <div class="ai-link-container">
        <h4><i class="fas fa-brain"></i> Asistente Autónomo</h4>
        <div id="botStatus" class="link-display mb-4">
          <div class="flex items-center gap-3">
            <div class="w-3 h-3 bg-gray-400 rounded-full animate-pulse"></div>
            <span class="text-gray-600">Listo para generar tu asistente...</span>
          </div>
        </div>
        <div class="text-center">
          <button id="btn-generar-bot" class="btn-primary bg-amber-600 hover:bg-amber-700 text-white font-bold py-4 px-8 rounded-xl text-lg shadow-lg transform hover:scale-105 transition-all flex items-center gap-3 mx-auto">
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
              <path d="M2 17l10 5 10-5"></path>
              <path d="M2 12l10 5 10-5"></path>
            </svg>
            GENERAR ASISTENTE AUTÓNOMO
          </button>
        </div>
      </div>
      <button class="btn-config mt-4" onclick="window.location.href='./mi-ia.html'">
        <i class="fas fa-cog"></i> Configurar asistente
      </button>
    </div>`;

  // Setup del botón
  document.getElementById('btn-generar-bot')?.addEventListener('click', generarAsistenteAutonomo);
}

// ==================== RESUMEN ====================
function renderSummaryCards() {
  const container = document.getElementById('summaryGrid');
  if (!container) return;

  const contactos = [
    comercioData.whatsapp ? 'WhatsApp' : 'WhatsApp',
    comercioData.instagram ? 'Instagram' : 'Instagram',
    comercioData.facebook ? 'Facebook' : 'Facebook',
    comercioData.website ? 'Sitio web' : 'Sitio web'
  ].filter(Boolean);

  container.innerHTML = `
    <div class="summary-card">
      <div class="summary-card-header">
        <div class="summary-card-title">
          <i class="fas fa-store"></i>
          <h4>Mi Comercio</h4>
        </div>
      </div>
      <div class="summary-data">
        <div class="summary-data-item">
          <i class="fas fa-check-circle"></i>
          <span><strong>Nombre:</strong> ${comercioData.nombreComercio || 'Sin nombre'}</span>
        </div>
        <div class="summary-data-item">
          <i class="fas fa-map-marker-alt"></i>
          <span><strong>Ubicación:</strong> ${comercioData.ciudad || 'Sin ciudad'}, ${comercioData.provincia || ''}</span>
        </div>
        <div class="summary-data-item">
          <i class="fas fa-phone"></i>
          <span><strong>Contactos:</strong><br>${contactos.length ? contactos.join('<br>') : 'Ninguno'}</span>
        </div>
      </div>
      <button class="btn-edit" onclick="window.location.href='./mi-comercio.html'">
        <i class="fas fa-edit"></i> Editar
      </button>
    </div>`;
}

// ==================== LOGOUT ====================
function setupLogout() {
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      try {
        await signOut(auth);
        window.location.href = '/';
      } catch (error) {
        console.error('Error al cerrar sesión:', error);
        showToast('Error', 'No se pudo cerrar sesión', 'error');
      }
    });
  }
}

// ==================== INICIALIZACIÓN ====================
async function initializePage() {
  showLoading('Cargando dashboard...');
  try {
    currentUser = await getCurrentUser();
    await loadComercioData();

    const validation = await validateCompleteSetup(currentComercioId);
    if (!validation.isComplete) {
      showToast('Configuración incompleta', validation.message, 'warning');
      setTimeout(() => window.location.href = `./${validation.nextPage}`, 2000);
      return;
    }

    await loadProductos();
    renderAsistenteSection();
    renderSummaryCards();
    setupLogout();
    console.log('Dashboard operativo - JSON generado por Cloud Function');
  } catch (error) {
    console.error('Error inicializando dashboard:', error);
    showToast('Error', 'No se pudo cargar el dashboard', 'error');
    setTimeout(() => window.location.href = './mi-comercio.html', 2000);
  } finally {
    hideLoading();
  }
}

document.addEventListener('DOMContentLoaded', () => initializePage());
