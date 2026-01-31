// src/skeleton/layout/header/render.js
import './header.css';

export function renderHeader() {
  console.log('🧱 renderHeader()');
  
  const header = document.getElementById('skeleton-header');
  if (!header) {
    console.error('❌ #skeleton-header no existe');
    return;
  }

  header.className = 'header';
  
  header.innerHTML = `
    <div class="container">
      <div class="header-top">
        <div class="logo">
          <div class="logo-icon">🧠</div>
          <h1>INDICEIA</h1>
        </div>

        <div class="commerce-and-logout">
          <div id="headerCommerceName" class="commerce-name">
            Mi Comercio
          </div>

          <button
            id="headerLogoutBtn"
            class="btn-logout"
            title="Cerrar sesión"
          >
            <i class="fas fa-sign-out-alt"></i>
          </button>
        </div>
      </div>

      <div class="header-bottom">
        <div id="headerUserName" class="user-name">
          Usuario
        </div>

        <div id="headerPlan" class="plan-badge trial">
          TRIAL
        </div>
      </div>
    </div>
  `;

  console.log('✅ Header HTML renderizado con estructura de dos líneas');
}
