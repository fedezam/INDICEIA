// src/skeleton/layout/header/update.js
import { auth } from '/src/services/firebase/firebase.js';
import { signOut } from 'firebase/auth';

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

  // ✅ Logout
  const logoutBtn = document.getElementById('headerLogoutBtn');
  if (logoutBtn) {
    logoutBtn.onclick = async () => {
      console.log('⎋ Cerrando sesión...');
      try {
        await signOut(auth);
        window.location.href = '/';
      } catch (err) {
        console.error('❌ Error al cerrar sesión:', err);
      }
    };
  }

  console.log('✅ Header actualizado');
}
