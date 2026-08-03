// src/skeleton/layout/header/render.js
import './header.css';

export function renderHeader() {
  const header = document.getElementById('skeleton-header');
  if (!header) {
    console.error('❌ #skeleton-header no existe');
    return null;
  }

  header.className = 'header';
  header.innerHTML = `
    <div class="container">
      <div class="header-inner">

        <!-- IZQUIERDA: logo + usuario -->
        <div class="header-left">
          <div class="logo">
            <i class="fas fa-brain logo-icon"></i>
            <span class="logo-text">INDICEIA</span>
          </div>
          <span id="headerUserName" class="user-name">Usuario</span>
        </div>

        <!-- DERECHA: comercio + plan + alertas + logout -->
        <div class="header-right">
          <div class="header-right-info">
            <span id="headerCommerceName" class="commerce-name">Mi Comercio</span>
            <span id="headerPlan" class="plan-badge trial">TRIAL</span>
          </div>
          <button id="headerAlertasBtn" class="btn-alertas" title="Alertas">
            <i class="fas fa-bell"></i>
            <span id="headerAlertasBadge" class="alertas-badge" hidden>0</span>
          </button>
          <button id="headerLogoutBtn" class="btn-logout" title="Cerrar sesión">
            <i class="fas fa-sign-out-alt"></i>
          </button>
        </div>

      </div>
    </div>
  `;

  console.log('✅ Header renderizado');
  return header;
}
