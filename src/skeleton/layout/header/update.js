// src/skeleton/layout/header/update.js
import { auth } from '/src/services/firebase/firebase.js';
import { signOut } from 'firebase/auth';
import { resolvePlanStatus, getDiasHastaVencimiento } from '../../../../lib/plan/resolvePlanStatus.js';
import { contarAlertasNoLeidas } from '/src/services/firebase/alerts.js';

export function updateHeader({ userData, comercioData, uid, comercioId }) {
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

  // 🔔 Alertas
  const alertasBtn = document.getElementById('headerAlertasBtn');
  if (alertasBtn) {
    alertasBtn.onclick = () => { window.location.href = '/alertas.html'; };
  }

  const badgeEl = document.getElementById('headerAlertasBadge');
  if (badgeEl && uid && comercioId) {
    contarAlertasNoLeidas(uid, comercioId)
      .then(count => {
        if (count > 0) {
          badgeEl.textContent = count > 9 ? '9+' : String(count);
          badgeEl.hidden = false;
        } else {
          badgeEl.hidden = true;
        }
      })
      .catch(err => console.error('[header] Error contando alertas:', err));
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
