// ==========================
// 📦 IMPORTS
// ==========================
import './styles.css';
import { auth } from './firebase.js';
import './auth.js';
import { onAuthStateChanged } from 'firebase/auth';

console.log('Main JS cargado ✅');

// ==========================
// 🔄 Detectar sesión activa
// ==========================
onAuthStateChanged(auth, user => {
  if (user) {
    console.log('Usuario autenticado:', user.email);

    // Redirigir solo si estamos en la página de login
    const isLoginPage = window.location.pathname === '/' || 
                        window.location.pathname.endsWith('index.html');

    if (isLoginPage) {
      console.log('Redirigiendo a panel de usuario...');
      window.location.href = '/src/pages/usuario.html';
    }
  } else {
    console.log('No hay usuario logueado');

    // Redirigir a login si intenta acceder a páginas protegidas
    const isProtectedPage = window.location.pathname.includes('/pages/');
    if (isProtectedPage) {
      console.log('Acceso denegado, redirigiendo a login...');
      window.location.href = '/';
    }
  }
});

// ==========================
// 🔑 Función de logout global
// ==========================
export async function logout() {
  try {
    await auth.signOut();
    console.log('Usuario desconectado ✅');
    window.location.href = '/';
  } catch (error) {
    console.error('Error al cerrar sesión:', error);
    alert('Error al cerrar sesión: ' + error.message);
  }
}

// Hacer logout accesible globalmente desde HTML
window.logout = logout;

