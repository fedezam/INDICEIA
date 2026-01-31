// src/skeleton/layout/header/update.js

export function updateHeader({ userData, comercioData }) {
  console.log('🧩 updateHeader()', { userData, comercioData });

  // Actualizar nombre del usuario (izquierda)
  const userEl = document.getElementById('headerUserName');
  if (userEl && userData) {
    const fullName = `${userData.nombre || ''} ${userData.apellido || ''}`.trim();
    userEl.textContent = fullName || userData.email || 'Usuario';
  }

  // Actualizar nombre del comercio (derecha)
  const commerceEl = document.getElementById('headerCommerceName');
  if (commerceEl && comercioData) {
    commerceEl.textContent = comercioData.nombre || 'Mi Comercio';
  }

  // Actualizar badge del plan (derecha)
  const planEl = document.getElementById('headerPlan');
  if (planEl && comercioData?.plan) {
    const planText = comercioData.plan.toUpperCase();
    planEl.textContent = planText;
    
    // Actualizar clase según el estado del plan
    planEl.className = 'plan-badge';
    
    if (comercioData.plan === 'trial') {
      planEl.classList.add('trial');
    } else if (comercioData.planActivo) {
      planEl.classList.add('active');
    } else {
      planEl.classList.add('expired');
    }
  }

  // Configurar evento de logout
  const logoutBtn = document.getElementById('headerLogoutBtn');
  if (logoutBtn) {
    logoutBtn.onclick = () => {
      console.log('⎋ Logout clickeado');
      document.dispatchEvent(new CustomEvent('skeleton:logout'));
    };
  }

  console.log('✅ Header actualizado');
}
