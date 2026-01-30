// src/skeleton/layout/header/render.js
import './header.css';

export function renderHeader() {
  console.log('🧱 renderHeader()');

  const header = document.getElementById('skeleton-header');

  if (!header) {
    console.error('❌ #skeleton-header no existe');
    return;
  }

  // aplicar clase raíz del CSS
  header.className = 'header';

  header.innerHTML = `
    <div class="container">

      <!-- IZQUIERDA -->
      <div class="logo">
        <div class="logo-icon">🧠</div>
        <h1>INDICEIA</h1>
      </div>

      <!-- DERECHA -->
      <div class="user-info">
        <div class="user-details">
          <div id="headerUserName" class="user-name">
            Usuario
          </div>

          <div
            id="headerPlan"
            class="plan-badge trial"
          >
            Trial
          </div>
        </div>

        <button
          id="headerLogoutBtn"
          class="btn-logout"
          title="Cerrar sesión"
        >
          ⎋
        </button>
      </div>

    </div>
  `;

  console.log('✅ Header HTML renderizado (layout correcto)');
}
