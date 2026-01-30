export function updateHeader({ userData, comercioData, pageName = '' }) {
  console.log('🧩 Header update()', { userData, comercioData, pageName });

  const userEl = document.getElementById('headerUserName');
  if (userEl) {
    userEl.textContent = userData?.nombre || userData?.email || 'Usuario';
    console.log('👤 Usuario actualizado:', userEl.textContent);
  }

  const pageEl = document.getElementById('headerPageName');
  if (pageEl) {
    pageEl.textContent = pageName || 'Página';
    console.log('📄 Página actual:', pageEl.textContent);
  }

  const commerceEl = document.getElementById('headerCommerceName');
  if (commerceEl) {
    commerceEl.textContent = comercioData?.nombre || 'Mi comercio';
    console.log('🏪 Comercio actualizado:', commerceEl.textContent);
  }

  const planEl = document.getElementById('headerPlan');
  if (planEl) {
    planEl.textContent = comercioData?.plan || 'Plan';
    console.log('🎟️ Plan actualizado:', planEl.textContent);
  }

  const logoutBtn = document.getElementById('headerLogoutBtn');
  if (logoutBtn) {
    logoutBtn.onclick = () => {
      console.log('⎋ Logout clickeado');
      document.dispatchEvent(new CustomEvent('skeleton:logout'));
    };
    console.log('🔌 Logout hook listo');
  }
}

