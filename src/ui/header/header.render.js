// ============================================
// header.render.js
// Render puro del header (estructura base)
// ============================================

export function renderHeader() {
  const headerHTML = `
    <div class="header">
      <div class="container">

        <div class="logo">
          <div class="logo-icon">
            <i class="fas fa-robot"></i>
          </div>
          <h1>INDICEIA</h1>
        </div>

        <div class="user-info">
          <div class="user-details">
            <span
              class="user-name"
              id="header-commerce-name"
            >Cargando...</span>

            <span
              class="plan-badge"
              id="header-plan-badge"
            >...</span>
          </div>

          <button
            id="header-logout-btn"
            class="btn-logout"
            title="Cerrar sesión"
          >
            <i class="fas fa-sign-out-alt"></i>
          </button>
        </div>

      </div>
    </div>
  `;

  const mount = document.getElementById('app-header');

  if (!mount) {
    console.warn('❌ No existe #app-header');
    return;
  }

  mount.innerHTML = headerHTML;
}
