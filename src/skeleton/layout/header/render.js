// Render HTML vacío del header

export function renderHeader() {
  const container = document.getElementById('skeleton-header');
  if (!container) return;

  container.innerHTML = `
    <div class="header">
      <div class="container">
        <div class="logo">
          <div class="logo-icon">🤖</div>
          <h1>INDICEIA</h1>
        </div>

        <div class="user-info">
          <div class="user-details">
            <span class="user-name" data-header="commerceName">—</span>
            <span class="plan-badge" data-header="planBadge">—</span>
          </div>

          <button data-header="logoutBtn" class="btn-logout" title="Cerrar sesión">
            ⎋
          </button>
        </div>
      </div>
    </div>
  `;

  console.log('🧩 Header renderizado');
}
