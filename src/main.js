// Importar estilos globales
import './style.css';

// Importar Firebase + auth.js
import { auth, db, provider } from './firebase.js';
import './auth.js'; // tu lógica de login/registro

console.log('Main JS cargado ✅');

// ==========================
// 🔄 Detectar sesión activa (opcional, global)
// ==========================
import { onAuthStateChanged } from "firebase/auth";

onAuthStateChanged(auth, user => {
  if (user) {
    console.log('Usuario autenticado:', user.email);
    // Si estás en la página de login, podés redirigir automáticamente
    if (window.location.pathname.endsWith('index.html')) {
      window.location.href = '/usuario.html';
    }
  } else {
    console.log('No hay usuario logueado');
  }
});

// ==========================
// 🔑 Funciones globales opcionales
// ==========================

// Por ejemplo, si quieres manejar logout globalmente
export function logout() {
  auth.signOut().then(() => {
    console.log('Usuario desconectado');
    window.location.href = '/index.html';
  });
}
