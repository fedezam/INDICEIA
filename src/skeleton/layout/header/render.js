import './header.css';

export function renderHeader() {
  console.log('🧱 renderHeader()');

  const header = document.getElementById('skeleton-header');
  if (!header) {
    console.error('❌ skeleton-header no existe');
    return;
  }

  header.innerHTML = `
    <div class="header-left">
      <div class="logo">🧠</div>
      <div class="left-text">
        <div class="brand">INDICEIA</div>
        <div class="user" id="headerUserName">Usuario</div>
      </div>
    </div>

    <div class="header-right">
      <div class="right-text">
        <div class="commerce" id="headerCommerceName">Mi comercio</div>
        <div class="plan">
          <span id="headerPlan">Plan</span>
          <span id="headerPlanType"></span>
        </div>
      </div>

      <button id="headerLogoutBtn" class="logout">⎋</button>
    </div>
  `;
}

