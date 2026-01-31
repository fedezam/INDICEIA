export function updateHeader({ userData, comercioData }) {
  console.log('🧩 updateHeader()', { userData, comercioData });

  const userEl = document.getElementById('headerUserName');
  if (userEl && userData) {
    userEl.textContent =
      `${userData.nombre || ''} ${userData.apellido || ''}`.trim()
      || userData.email
      || 'Usuario';
  }

  const commerceEl = document.getElementById('headerCommerceName');
  if (commerceEl && comercioData) {
    commerceEl.textContent = comercioData.nombre || 'Mi comercio';
  }

  const comercioNameEl = document.getElementById('headerCommerceName');

  if (comercioNameEl && comercioData) {
     comercioNameEl.textContent =
      comercioData.nombre || 'Mi Comercio';
  }

  const planEl = document.getElementById('headerPlan');
  const planTypeEl = document.getElementById('headerPlanType');

  if (planEl && comercioData?.plan) {
    planEl.textContent = comercioData.plan;
  }

  if (planTypeEl && comercioData?.tipoPlan) {
    planTypeEl.textContent = ` · ${comercioData.tipoPlan}`;
  }

  const logoutBtn = document.getElementById('headerLogoutBtn');
  if (logoutBtn) {
    logoutBtn.onclick = () => {
      console.log('⎋ Logout clickeado');
      document.dispatchEvent(new CustomEvent('skeleton:logout'));
    };
  }
}

