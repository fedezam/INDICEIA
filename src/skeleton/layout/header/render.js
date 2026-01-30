// src/skeleton/layout/header/render.js
import './header.css';

export function renderHeader() {
  console.log('🧱 renderHeader()');

  const header = document.getElementById('skeleton-header');

  if (!header) {
    console.error('❌ #skeleton-header no existe');
    return;
  }

  header.innerHTML = `
    <div class="header-left">
      <div class="logo">🧠 INDICEIA</div>
      <div id="headerUserName" class="user-name">Usuario</div>
    </div>

    <div class="header-right">
      <div class="commerce">
        <div id="headerCommerceName" class="commerce-name">Comercio</div>
        <div id="headerPlan" class="plan">Plan</div>
      </div>

      <button id="headerLogoutBtn" class="logout">Salir</button>
    </div>
  `;

  console.log('✅ Header HTML renderizado');
}

