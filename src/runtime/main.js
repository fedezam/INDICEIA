// ============================================
// main.js
// Control global de autenticación y routing
// ============================================

import './styles.css';
import { auth } from './firebase.js';
import './auth.js'; // Importa la lógica de UI de login/register
import { onAuthStateChanged } from 'firebase/auth';
import { saveUserIfNeeded } from './firebaseAuth.js';

console.log('✅ Main JS cargado');

// ==================== DETECCIÓN DE SESIÓN ====================
onAuthStateChanged(auth, async (user) => {
  if (user) {
    console.log('✅ Usuario autenticado:', user.email);

    // Guardar datos en Firestore si es usuario nuevo
    // (esto ya lo hace firebaseAuth.js automáticamente en login/register)

    // Detectar si estamos en página de login
    const isLoginPage = window.location.pathname === '/' ||
                        window.location.pathname.endsWith('index.html');

    if (isLoginPage) {
      console.log('🔄 Redirigiendo desde login al flow...');
      
      // Importar y ejecutar flow controller
      const { runFlowController } = await import('./controllers/flowController.js');
      runFlowController(user.uid);
    }
  } else {
    console.log('❌ No hay usuario logueado');

    // Proteger páginas privadas
    const isProtectedPage = window.location.pathname.includes('/pages/');

    if (isProtectedPage) {
      console.log('🚫 Acceso denegado, redirigiendo a login...');
      window.location.href = '/';
    }
  }
});

// ==================== FUNCIÓN DE LOGOUT GLOBAL ====================
export async function logout() {
  try {
    const { logout: firebaseLogout } = await import('./firebaseAuth.js');
    const result = await firebaseLogout();

    if (result.success) {
      console.log('✅ Usuario desconectado');
      window.location.href = '/';
    } else {
      console.error('❌ Error al cerrar sesión:', result.error);
      alert('Error al cerrar sesión: ' + result.error);
    }
  } catch (error) {
    console.error('❌ Error al cerrar sesión:', error);
    alert('Error al cerrar sesión: ' + error.message);
  }
}

// Hacer logout accesible globalmente desde HTML
window.logout = logout;

// ==================== CONFIGURAR BOTÓN DE LOGOUT ====================
// Esta función se puede llamar desde layout.js o desde cada página
export function setupLogoutButton() {
  const logoutBtn = document.getElementById('logoutBtn');
  if (!logoutBtn) {
    console.warn('⚠️ No se encontró botón #logoutBtn en esta página');
    return;
  }

  // Remover listeners viejos para evitar duplicados
  const newLogoutBtn = logoutBtn.cloneNode(true);
  logoutBtn.replaceWith(newLogoutBtn);

  newLogoutBtn.addEventListener('click', async () => {
    if (!confirm('¿Querés cerrar sesión?')) return;

    newLogoutBtn.disabled = true;
    newLogoutBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Cerrando...';

    await logout();
  });

  console.log('✅ Logout button configurado');
}
