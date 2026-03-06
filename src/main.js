// src/main.js
// ==========================
// 📦 IMPORTS
// ==========================
import './styles.css';
import { auth, db } from './firebase.js';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  sendEmailVerification,
  sendPasswordResetEmail,
  signOut
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { runFlowController } from './controllers/flowController.js';

console.log('Main JS cargado ✅');

const googleProvider = new GoogleAuthProvider();

// ==========================
// 🌉 BRIDGE: expone funciones auth al HTML (sin module scope)
// La landing usa window.__auth.login(), etc.
// ==========================
window.__auth = {

  async login(email, password) {
    return signInWithEmailAndPassword(auth, email, password);
  },

  async register(email, password) {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    // Enviar email de verificación inmediatamente
    await sendEmailVerification(cred.user, {
      // URL a la que vuelve el usuario después de verificar
      // Ajustá si tenés un dominio propio
      url: window.location.origin + '/'
    });
    console.log('✉️ Email de verificación enviado a:', cred.user.email);
    return cred.user.email;
  },

  async loginWithGoogle() {
    return signInWithPopup(auth, googleProvider);
  },

  async resetPassword(email) {
    return sendPasswordResetEmail(auth, email, {
      url: window.location.origin + '/'
    });
  },

  async resendVerification() {
    const user = auth.currentUser;
    if (!user) throw new Error('No hay sesión activa');
    return sendEmailVerification(user, {
      url: window.location.origin + '/'
    });
  },

  async signOut() {
    return signOut(auth);
  }
};

// ==========================
// 🔒 Helpers de verificación
// ==========================

function isGoogleUser(user) {
  return user.providerData.some(p => p.providerId === 'google.com');
}

function isVerified(user) {
  // Google siempre se considera verificado
  return user.emailVerified || isGoogleUser(user);
}

function isLoginPage() {
  const p = window.location.pathname;
  return p === '/' || p === '/index.html' || p === '';
}

function isProtectedPage() {
  return window.location.pathname.includes('/pages/');
}

// ==========================
// 💾 Guardar usuario nuevo en Firestore
// ==========================
async function saveNewUserIfNeeded(user) {
  try {
    const userRef = doc(db, 'usuarios', user.uid);
    const snap    = await getDoc(userRef);
    if (snap.exists()) return;

    const email    = user.email || '';
    const fullName = (user.displayName || email.split('@')[0]).trim();
    const parts    = fullName.split(/\s+/);

    await setDoc(userRef, {
      uid:         user.uid,
      mail:        email,
      nombre:      parts[0] || '',
      apellido:    parts.slice(1).join(' ') || '',
      referralId:  Math.random().toString(36).substring(2, 10).toUpperCase(),
      emailVerified: user.emailVerified,
      fechaRegistro: serverTimestamp()
    });

    console.log('✅ Usuario nuevo guardado en Firestore');
  } catch (err) {
    console.error('❌ Error al guardar usuario:', err);
  }
}

// ==========================
// 🔄 Auth state listener
// ==========================
onAuthStateChanged(auth, async (user) => {

  if (!user) {
    console.log('Sin sesión activa');
    if (isProtectedPage()) {
      console.log('Página protegida → redirigiendo a inicio...');
      window.location.href = '/';
    }
    return;
  }

  console.log('Usuario autenticado:', user.email, '| Verificado:', user.emailVerified);

  // ── Guardar en Firestore si es nuevo ──
  await saveNewUserIfNeeded(user);

  // ── Si está en la landing / login ──
  if (isLoginPage()) {

    if (!isVerified(user)) {
      // Registrado pero no verificó el email todavía
      console.log('Email no verificado → pantalla de verificación');

      // Mostrar la pantalla de verificación (función expuesta en index.html)
      if (typeof window.showScreen === 'function') {
        const emailEl = document.getElementById('verify-email-display');
        if (emailEl) emailEl.textContent = user.email || '';
        window.showScreen('verify');
      }
      return;
    }

    // Email verificado → ir al dashboard
    console.log('Login verificado → redirigiendo a usuario...');
    window.location.href = '/src/pages/usuario.html';
    return;
  }

  // ── Páginas protegidas ──
  if (!isVerified(user)) {
    // Llegó a una página protegida sin verificar → volver al inicio
    console.log('Email no verificado en página protegida → inicio');
    window.location.href = '/';
    return;
  }

  // Todo ok → flow controller normal
  runFlowController(user.uid);
});

// ==========================
// 🔑 Logout global
// ==========================
export async function logout() {
  try {
    await signOut(auth);
    console.log('Usuario desconectado ✅');
    window.location.href = '/';
  } catch (err) {
    console.error('Error al cerrar sesión:', err);
  }
}

window.logout = logout;

// Exponer showScreen al scope global para que main.js pueda llamarla
// (index.html la define en script normal, main.js es module → no tiene acceso directo)
// La definición está en index.html como función global, acá solo nos aseguramos de que exista
if (typeof window.showScreen !== 'function') {
  window.showScreen = function(name) {
    const landing = document.getElementById('landing');
    const verify  = document.getElementById('verify-screen');
    if (landing) landing.classList.toggle('active', name === 'landing');
    if (verify)  verify.classList.toggle('active',  name === 'verify');
  };
}
