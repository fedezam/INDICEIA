// src/skeleton/layout/header/render.js
import './header.css';  // ✅ Importar header.css directamente

export function renderHeader() {
  console.log('🧱 renderHeader() - Versión corregida');
  const header = document.getElementById('skeleton-header');
  if (!header) {
    console.error('❌ #skeleton-header no existe');
    return null;
  }
  header.className = 'header';
  header.innerHTML = `
    <div class="container">
      <div class="header-top">
        <div class="header-left">
          <div class="logo">
            <div class="logo-icon">🧠</div>
            <h1>INDICEIA</h1>
          </div>
        </div>
        <div class="header-right-top">
          <div id="headerCommerceName" class="commerce-name">
            Mi Comercio
          </div>
        </div>
      </div>
      <div class="header-bottom">
        <div class="header-left-bottom">
          <div id="headerUserName" class="user-name">
            Usuario
          </div>
        </div>
        <div class="header-right-bottom">
          <div id="headerPlan" class="plan-badge trial">
            TRIAL
          </div>
          <button id="headerLogoutBtn" class="btn-logout" title="Cerrar sesión">
            <i class="fas fa-sign-out-alt"></i>
          </button>
        </div>
      </div>
    </div>
  `;
  console.log('✅ Header renderizado con dos filas - IDs preservados');
  return header;
}
