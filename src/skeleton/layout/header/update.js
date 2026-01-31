// src/skeleton/layout/header/update.js

export function updateHeader({ userData, comercioData }) {
  console.log('🧩 updateHeader()', { userData, comercioData });

  // Nombre usuario (abajo izquierda)
  const userEl = document.getElementById('headerUserName');
  if (userEl && userData) {
    const fullName = `${userData.nombre || ''} ${userData.apellido || ''}`.trim();
    userEl.textContent = fullName || userData.email || 'Usuario';
  }

  // Nombre comercio (arriba derecha)
  const commerceEl = document.getElementById('headerCommerceName');
  if (commerceEl && comercioData) {
    commerceEl.textContent = comercioData.nombreComercio || 'Mi Comercio';
  }

  // Badge plan (abajo derecha)
  const planEl = document.getElementById('headerPlan');
  if (planEl && comercioData?.plan) {
    const planText = comercioData.plan.toUpperCase();
    planEl.textContent = planText;
    
    planEl.className = 'plan-badge'; // reset
    if (comercioData.plan === 'trial') {
      planEl.classList.add('trial');
    } else if (comercioData.planActivo) {
      planEl.classList.add('active');
    } else {
      planEl.classList.add('expired');
    }
  }

  // Evento logout
  const logoutBtn = document.getElementById('headerLogoutBtn');
  if (logoutBtn) {
    logoutBtn.onclick = () => {
      console.log('⎋ Logout clickeado');
      document.dispatchEvent(new CustomEvent('skeleton:logout'));
    };
  }

  console.log('✅ Header actualizado');
}
