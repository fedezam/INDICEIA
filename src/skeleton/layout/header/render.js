// src/skeleton/layout/header/render.js
export function renderHeader() {
  console.log('🧱 renderHeader()');
  
  const header = document.getElementById('skeleton-header');
  if (!header) {
    console.error('❌ #skeleton-header no existe');
    return;
  }

  header.className = 'header';

  header.innerHTML = `
    <style>
      /* Estilos internos forzados para garantizar las filas - no dependen de header.css externo */
      .skeleton-header-container {
        max-width: 1400px;
        margin: 0 auto;
        padding: 0 2rem;
        display: flex;
        flex-direction: column;
        gap: 8px;               /* separación entre filas - ajusta este valor si querés más/menos */
      }

      .header-top,
      .header-bottom {
        display: flex !important;
        justify-content: space-between !important;
        align-items: center !important;
      }

      .header-right-top {
        display: flex !important;
        align-items: center !important;
        gap: 1.2rem !important; /* espacio entre comercio y logout */
      }

      .commerce-name {
        max-width: 40%;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      /* Opcional: mínimo para que no se rompa en mobile */
      @media (max-width: 768px) {
        .header-top, .header-bottom {
          flex-direction: column;
          align-items: flex-start;
          gap: 0.6rem;
        }
        .header-right-top {
          width: 100%;
          justify-content: space-between;
        }
      }
    </style>

    <div class="skeleton-header-container">
      <!-- Fila superior -->
      <div class="header-top">
        <div class="logo">
          <div class="logo-icon">🧠</div>
          <h1>INDICEIA</h1>
        </div>

        <div class="header-right-top">
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

      <!-- Fila inferior -->
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

  console.log('✅ Header HTML renderizado con dos filas');
}
