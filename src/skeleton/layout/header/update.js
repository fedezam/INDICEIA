// src/skeleton/layout/header/update.js

export function updateHeader({
  userData,
  comercioData,
  pageName = ''
}) {
  console.log('🧩 Header update()', { userData, comercioData, pageName });

  // Usuario
  const userEl = document.getElementById('headerUserName');
  if (userEl && userData) {
    userEl.textContent = userData.nombre || userData.email || 'Usuario';
  }

  // Página actual
  const pageEl = document.getElementById('headerPageName');
  if (pageEl) {
    pageEl.textContent = pageName;
  }

  // Comercio
  const commerceEl = document.getElementById('headerCommerceName');
  if (commerceEl && comercioData) {
    commerceEl.textContent = comercioData.nombre || 'Mi comercio';
  }

  // Plan
  const planEl = document.getElementById('headerPlan');
  if (planEl && comercioData?.plan) {
    planEl.textContent = comercioData.plan;
  }

  // Logout (hook, no lógica)
  const logoutBtn = document.getElementById('headerLogoutBtn');
  if (logoutBtn) {
    logoutBtn.onclick = () => {
      console.log('⎋ Logout clickeado (hook)');
      document.dispatchEvent(new CustomEvent('skeleton:logout'));
    };
  }
}
