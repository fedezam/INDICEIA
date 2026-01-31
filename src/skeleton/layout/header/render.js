// src/skeleton/layout/header/render.js
import './header.css';

export function renderHeader() {
  console.log('🧱 renderHeader()');
  
  const header = document.getElementById('skeleton-header');
  if (!header) {
    console.error('❌ #skeleton-header no existe');
    return;
  }

  // Aplicar clase raíz del CSS
  header.className = 'header';
  
  header.innerHTML = `
    <div class="container">
      <!-- IZQUIERDA: LOGO + USUARIO -->
      <div class="header-left">
        <div class="logo">
          <div class="logo-icon">🧠</div>
          <h1>INDICEIA</h1>
        </div>
        <div id="headerUserName" class="user-name">
          Usuario
        </div>
      </div>

      <!-- DERECHA: COMERCIO + PLAN + LOGOUT -->
      <div class="header-right">
        <div class="commerce-info">
          <div id="headerCommerceName" class="commerce-name">
            Mi Comercio
          </div>
          <div id="headerPlan" class="plan-badge trial">
            TRIAL
          </div>
        </div>

        <!-- BOTÓN LOGOUT -->
        <button
          id="headerLogoutBtn"
          class="btn-logout"
          title="Cerrar sesión"
        >
          <i class="fas fa-sign-out-alt"></i>
        </button>
      </div>
    </div>
  `;

  console.log('✅ Header HTML renderizado');
}
