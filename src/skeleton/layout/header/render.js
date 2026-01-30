// src/skeleton/layout/header/render.js

export function renderHeader() {
  const slot = document.getElementById('skeleton-header');

  if (!slot) {
    console.warn('❌ Header slot no encontrado');
    return;
  }

  slot.innerHTML = `
    <div class="header-container">
      
      <!-- IZQUIERDA -->
      <div class="header-left">
        <div class="logo">
          🤖 <span class="brand">INDICEIA</span>
        </div>
      </div>

      <!-- DERECHA -->
      <div class="header-right">
        <div class="user-block">
          <span class="user-name" id="headerUserName">...</span>
          <span class="page-name" id="headerPageName">...</span>
        </div>

        <div class="commerce-block">
          <span class="commerce-name" id="headerCommerceName">...</span>
          <span class="plan-badge" id="headerPlan">...</span>
        </div>

        <button id="headerLogoutBtn" class="logout-btn">
          ⎋
        </button>
      </div>

    </div>
  `;

  console.log('🧩 Header renderizado (estructura)');
}

