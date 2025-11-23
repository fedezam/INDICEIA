// src/shared/layout.js
// Renderiza el header + barra de progreso + banner (común a todas las páginas del onboarding)

export function renderLayout() {
  const body = document.querySelector('body');
  
  // Verificar que no esté ya renderizado
  if (document.querySelector('.header')) {
    console.warn('⚠️ Layout ya renderizado');
    return;
  }

  const layoutHTML = `
    <!-- Header -->
    <header class="header">
      <div class="logo">
        <div class="logo-icon"><i class="fas fa-robot"></i></div>
        <h1>INDICEIA</h1>
      </div>
      <div class="user-info">
        <span id="commerceName">Mi Comercio</span>
        <span id="planBadge" class="badge">Trial</span>
        <button id="logoutBtn" class="btn">Salir</button>
      </div>
    </header>

    <!-- Barra de progreso (navigation) -->
    <div id="progressContainer"></div>

    <!-- Banner de suscripción -->
    <div id="subscriptionBanner" class="subscription-banner">
      <p id="subscriptionMessage"></p>
    </div>
  `;

  // Insertar antes del primer elemento del body
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = layoutHTML;
  
  while (tempDiv.firstChild) {
    body.insertBefore(tempDiv.firstChild, body.firstChild);
  }

  console.log('✅ Layout renderizado');
}

// Función auxiliar para actualizar solo el nombre del comercio y plan
export function updateHeaderInfo(nombreComercio, planData) {
  const nameEl = document.getElementById('commerceName');
  const badgeEl = document.getElementById('planBadge');
  
  if (nameEl) {
    nameEl.textContent = nombreComercio || 'Mi Comercio';
  }
  
  if (badgeEl && planData) {
    badgeEl.textContent = `${planData.emoji} ${planData.nombre}`;
  }
}

// Función auxiliar para actualizar el banner de suscripción
export function updateSubscriptionBanner(html, estado = 'trial') {
  const banner = document.getElementById('subscriptionBanner');
  const msg = document.getElementById('subscriptionMessage');
  
  if (!banner || !msg) return;
  
  banner.className = 'subscription-banner';
  banner.classList.add(estado); // trial, activo, expirado
  msg.innerHTML = html;
}
