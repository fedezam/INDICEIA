// shared/logout.js
// Manejo global del logout - único en toda la app

import { auth } from '../firebase.js';
import { signOut } from 'firebase/auth';
import { showToast } from './utils.js';

export function setupLogout() {
  const logoutBtn = document.getElementById('logoutBtn');
  if (!logoutBtn) {
    console.warn('No se encontró botón #logoutBtn en esta página');
    return;
  }

  // Removemos listeners viejos para evitar duplicados
  logoutBtn.replaceWith(logoutBtn.cloneNode(true));
  const newLogoutBtn = document.getElementById('logoutBtn');

  newLogoutBtn.addEventListener('click', async () => {
    if (!confirm('¿Querés cerrar sesión?')) return;

    newLogoutBtn.disabled = true;
    newLogoutBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Cerrando...';

    try {
      await signOut(auth);
      console.log('Sesión cerrada correctamente');
      showToast('Sesión cerrada', 'success');
    } catch (err) {
      console.error('Error al cerrar sesión:', err);
      showToast('Error al cerrar sesión', 'error');
    } finally {
      // Redirección forzada a la raíz (tu index.html = login)
      window.location.href = '/';
    }
  });
}
