header.innerHTML = `
  <div class="container">
    <div class="header-main-row">
      <!-- Izquierda: logo + INDICEIA -->
      <div class="header-left">
        <div class="logo">
          <div class="logo-icon">🧠</div>
          <h1>INDICEIA</h1>
        </div>
      </div>

      <!-- Derecha: solo nombre comercio + logout -->
      <div class="header-right">
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

    <!-- Segunda fila: usuario abajo izquierda + plan abajo derecha -->
    <div class="header-info-row">
      <div id="headerUserName" class="user-name">
        Usuario
      </div>
      <div id="headerPlan" class="plan-badge trial">
        TRIAL
      </div>
    </div>
  </div>
`;
