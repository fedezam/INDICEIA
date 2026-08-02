// src/skeleton/layout/header/update.js
import { auth } from '/src/services/firebase/firebase.js';
import { signOut } from 'firebase/auth';
import { resolvePlanStatus, getDiasHastaVencimiento } from '../../../../lib/plan/resolvePlanStatus.js';

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
    commerceEl.textContent = comercioData.nombre || comercioData.nombreComercio || 'Mi Comercio';
  }

  // Badge plan (abajo derecha)
  const planEl = document.getElementById('headerPlan');
  if (planEl && comercioData?.plan) {
    const planData = comercioData.plan;
    const status   = resolvePlanStatus(planData);
    const dias     = getDiasHastaVencimiento(planData);

    planEl.textContent = (planData.type || 'trial').toUpperCase();
    planEl.className = 'plan-badge'; // reset

    if (!status.active) {
      planEl.classList.add('expired');
    } else if (dias !== null && dias <= 3) {
      planEl.classList.add('warning');
    } else {
      planEl.classList.add('active');
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
