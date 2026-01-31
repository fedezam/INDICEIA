// src/shared/layout.js
// Renderiza el header + banner + barra de progreso (común a todas las páginas del onboarding)
// Renderiza el header + banner + barra de progreso (común a todas las páginas)

import { setupLogout } from './logout.js';  // ← NUEVO: Import global del logout

/**
 * Renderiza la estructura base del layout (header + banner + progress container)
 * Esta función solo genera el HTML vacío con placeholders
 * Cada página debe llamar a las funciones update* para rellenar con datos reales
 */
export function renderLayout() {
  const body = document.querySelector('body');
  

  // Verificar que no esté ya renderizado
  if (document.querySelector('.header')) {
    console.warn('⚠️ Layout ya renderizado');
    return;
  }

  const layoutHTML = `
    <!-- HEADER PRINCIPAL -->
    <header class="header">
      <div class="container">
        <div class="logo">
          <div class="logo-icon"><i class="fas fa-robot"></i></div>
          <h1>INDICEIA</h1>
        </div>
        <div class="user-info">
          <div class="user-details">
            <span class="user-name" id="commerceName">Cargando...</span>
            <span class="plan-badge" id="planBadge">...</span>
          </div>
          <button id="logoutBtn" class="btn-logout" title="Cerrar sesión">
            <i class="fas fa-sign-out-alt"></i>
          </button>
        </div>
      </div>
    </header>

    <!-- BANNER DE ESTADO (sutil, debajo del header) -->
    <div id="subscriptionBanner" class="subscription-banner trial">
      <i class="fas fa-info-circle"></i>
      <span id="subscriptionMessage">Cargando información del plan...</span>
    </div>

    <!-- BARRA DE PROGRESO COMPACTA -->
    <div id="progressContainer"></div>
  `;

  // ✅ CORREGIDO: Usar insertAdjacentHTML para mantener el orden correcto
  // Insertar al inicio del body
  body.insertAdjacentHTML('afterbegin', layoutHTML);
  

  console.log('✅ Layout renderizado');
  
  // Configurar evento de logout
  setupLogoutButton();
}

/**
 * Configura el botón de cerrar sesión
 */
function setupLogoutButton() {
  const logoutBtn = document.getElementById('logoutBtn');
  if (!logoutBtn) return;
  
  logoutBtn.addEventListener('click', async () => {
    if (confirm('¿Seguro que deseas cerrar sesión?')) {
      try {
        // Aquí iría la lógica de logout con Firebase
        // await firebase.auth().signOut();
        localStorage.removeItem('userId');
        window.location.href = '/login.html';
      } catch (error) {
        console.error('Error al cerrar sesión:', error);
        alert('Error al cerrar sesión');
      }
    }
  });
  // ← NUEVO: Configurar logout global UNA SOLA VEZ por página
  setupLogout();
}

/**
 * Actualiza la información del header (nombre del comercio y plan)
 * @param {string} nombreComercio - Nombre del comercio del usuario
 * @param {Object} planData - Datos del plan { nombre, emoji, estado }
 */
export function updateHeaderInfo(nombreComercio, planData) {
  const nameEl = document.getElementById('commerceName');
  const badgeEl = document.getElementById('planBadge');
  

  if (nameEl) {
    nameEl.textContent = nombreComercio || 'Mi Comercio';
  }
  

  if (badgeEl && planData) {
    badgeEl.textContent = `${planData.emoji || '🔵'} ${planData.nombre || 'Trial'}`;
    

    // Cambiar color del badge según el plan
    badgeEl.className = 'plan-badge';
    if (planData.estado === 'activo') {
      badgeEl.classList.add('active');
    } else if (planData.estado === 'expirado') {
      badgeEl.classList.add('expired');
    }
  }
}

/**
 * Actualiza el banner de suscripción con mensaje y estado
 * @param {string} mensaje - Mensaje a mostrar en el banner (puede incluir HTML)
 * @param {string} estado - Estado: 'trial', 'active', 'warning', 'expired'
 */
export function updateSubscriptionBanner(mensaje, estado = 'trial') {
  const banner = document.getElementById('subscriptionBanner');
  const msg = document.getElementById('subscriptionMessage');
  

  if (!banner || !msg) return;
  

  // Cambiar clases según estado
  banner.className = 'subscription-banner';
  banner.classList.add(estado);
  
  // ✅ CORREGIDO: Usar innerHTML para que renderice las etiquetas HTML

  // Usar innerHTML para permitir HTML en el mensaje
  msg.innerHTML = mensaje;
  

  // Cambiar icono según estado
  const icon = banner.querySelector('i');
  if (icon) {
    const iconMap = {
      'expired': 'fas fa-exclamation-triangle',
      'warning': 'fas fa-clock',
      'active': 'fas fa-check-circle',
      'trial': 'fas fa-info-circle'
    };
    icon.className = iconMap[estado] || iconMap.trial;
  }
}

/**
 * Oculta el banner de suscripción (útil para planes que no lo necesiten)
 * Oculta el banner de suscripción
 */
export function hideSubscriptionBanner() {
  const banner = document.getElementById('subscriptionBanner');
  if (banner) {
    banner.style.display = 'none';
  }
}

/**
 * Muestra el banner de suscripción
 */
export function showSubscriptionBanner() {
  const banner = document.getElementById('subscriptionBanner');
  if (banner) {
    banner.style.display = 'flex';
  }
}

/**
 * Renderiza la barra de progreso del onboarding
 * @param {number} currentStep - Paso actual (1-5)
 * @param {Array} steps - Array de pasos completados
 */
export function renderProgressBar(currentStep, steps = []) {
  const container = document.getElementById('progressContainer');
  if (!container) return;

  const totalSteps = 5;
  const percentage = Math.round((steps.length / totalSteps) * 100);

  const stepLabels = [
    { num: 1, name: 'Usuario', icon: 'fa-user' },
    { num: 2, name: 'Mi Comercio', icon: 'fa-store' },
    { num: 3, name: 'Horarios', icon: 'fa-clock' },
    { num: 4, name: 'Productos', icon: 'fa-box' },
    { num: 5, name: 'Config. IA', icon: 'fa-robot' }
  ];

  const stepsHTML = stepLabels.map(step => {
    const isCompleted = steps.includes(step.num);
    const isCurrent = step.num === currentStep;
    const statusClass = isCompleted ? 'completed' : (isCurrent ? 'current' : '');

    return `
      <div class="step-item ${statusClass}">
        <div class="step-circle">
          ${isCompleted ? '<i class="fas fa-check"></i>' : step.num}
        </div>
        <span class="step-label">${step.name}</span>
      </div>
    `;
  }).join('');

  container.innerHTML = `
    <div class="onboarding-progress">
      <div class="progress-header">
        <h3>Configuración de tu comercio</h3>
        <p class="progress-subtitle">Paso ${currentStep} de ${totalSteps} • ${percentage}% completado</p>
      </div>
      
     
      <div class="progress-bar-container">
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${percentage}%"></div>
        </div>
      </div>
      
     
      <div class="steps-grid">
        ${stepsHTML}
      </div>
    </div>
  `;
}

console.log('📦 Módulo layout.js cargado');
