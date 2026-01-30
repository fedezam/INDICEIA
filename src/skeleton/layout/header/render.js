export function renderHeader() {
  const slot = document.getElementById('skeleton-header');
  if (!slot) {
    console.warn('⚠️ No existe slot header');
    return;
  }

  slot.innerHTML = `
    <div class="header-left">
      <div class="logo">
        <img src="/logo.png" alt="Logo INDICEIA" class="logo-img" />
        <span class="logo-text">INDICEIA</span>
      </div>
      <span id="headerPageName" class="page-name">Cargando...</span>
    </div>

    <div class="header-right">
      <span id="headerUserName" class="user-name">Cargando...</span>
      <span id="headerCommerceName" class="commerce-name">Cargando...</span>
      <span id="headerPlan" class="plan-name">...</span>
      <button id="headerLogoutBtn" class="btn-logout">Logout</button>
    </div>
  `;

  console.log('🖼️ Header renderizado en DOM');
}
