// src/skeleton/layout/header/update.js
import { auth } from '/src/services/firebase/firebase.js';
import { signOut } from 'firebase/auth';
import { resolvePlanStatus, getDiasHastaVencimiento } from '../../../../lib/plan/resolvePlanStatus.js';
import { contarAlertasNoLeidas } from '/src/services/firebase/alerts.js';

export function updateHeader({ userData, comercioData: entidadData, uid, comercioId: entidadId, isAdminViewing = false }) {
  console.log('🧩 updateHeader()', { userData, comercioData: entidadData });

  // Nombre usuario (abajo izquierda)
  const userEl = document.getElementById('headerUserName');
  if (userEl && userData) {
    const fullName = `${userData.nombre || ''} ${userData.apellido || ''}`.trim();
    userEl.textContent = fullName || userData.email || 'Usuario';
  }

  // Nombre comercio (arriba derecha)
  const commerceEl = document.getElementById('headerCommerceName');
  if (commerceEl && entidadData) {
    // 09/09/2026: prefijo visual cuando el admin está viendo una
    // entidad ajena — sin esto, el nombre de la entidad queda al
    // lado del nombre del admin sin nada que aclare que no son la
    // misma cuenta (ver captura del 09/09/2026).
    const nombre = entidadData.nombre || entidadData.nombreComercio || 'Mi Comercio';
    commerceEl.textContent = isAdminViewing ? `🛡 ${nombre}` : nombre;
  }

  // Badge plan (abajo derecha)
  const planEl = document.getElementById('headerPlan');
  if (planEl && entidadData?.plan) {
    const planData = entidadData.plan;
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
  // 09/09/2026: propaga ?id= cuando el admin está viendo una entidad
  // ajena — sin esto, alertas.html perdía de vista qué entidad se
  // estaba mirando y volvía a resolver la del usuario logueado (mismo
  // bug que ya se corrigió en todos los links de dashboard.js).
  const alertasBtn = document.getElementById('headerAlertasBtn');
  if (alertasBtn) {
    alertasBtn.onclick = () => {
      window.location.href = isAdminViewing && entidadId
        ? `/alertas.html?id=${entidadId}`
        : '/alertas.html';
    };
  }

  const badgeEl = document.getElementById('headerAlertasBadge');
  if (badgeEl && uid && entidadId) {
    contarAlertasNoLeidas(uid, entidadId)
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
