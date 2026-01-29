// ============================================
// auth.js
// UI y eventos del formulario de login/register
// ============================================

import { loginWithGoogle, loginWithEmail, registerWithEmail } from './firebaseAuth.js';

console.log('✅ auth.js cargado');

// ==================== ELEMENTOS DEL DOM ====================
const googleBtn = document.getElementById('googleLogin');
const form = document.getElementById('emailLogin');
const toggleLink = document.getElementById('toggleModeLink');

let isRegisterMode = false;

// ==================== LOGIN / REGISTER CON EMAIL ====================
if (form) {
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = form.querySelector('#email').value.trim();
    const password = form.querySelector('#password').value.trim();
    const repeat = form.querySelector('#repeatPassword')?.value.trim();

    try {
      let result;

      if (isRegisterMode) {
        // Validar que las contraseñas coincidan
        if (password !== repeat) {
          throw new Error('Las contraseñas no coinciden');
        }

        result = await registerWithEmail(email, password);
      } else {
        result = await loginWithEmail(email, password);
      }

      if (result.success) {
        console.log('✅ Autenticación exitosa');
        // La redirección la maneja main.js con onAuthStateChanged
      } else {
        throw new Error(result.error);
      }

    } catch (err) {
      console.error('❌ Error en autenticación:', err);
      alert(err.message || 'Error en la autenticación');
    }
  });
}

// ==================== LOGIN CON GOOGLE ====================
if (googleBtn) {
  googleBtn.addEventListener('click', async () => {
    console.log('🌐 Iniciando login con Google...');

    try {
      const result = await loginWithGoogle();

      if (!result.success) {
        throw new Error(result.error);
      }

      console.log('✅ Login con Google exitoso');
      // La redirección la maneja main.js con onAuthStateChanged

    } catch (err) {
      console.error('❌ Error en login con Google:', err);
      alert('Error al iniciar sesión con Google: ' + (err.message || err));
    }
  });
}

// ==================== ALTERNAR MODO LOGIN / REGISTER ====================
if (toggleLink) {
  toggleLink.addEventListener('click', (e) => {
    e.preventDefault();
    isRegisterMode = !isRegisterMode;

    const repeatGroup = document.getElementById('repeatPasswordGroup');
    const btnText = document.getElementById('btnText');
    const subtitle = document.getElementById('loginSubtitle');

    if (isRegisterMode) {
      // MODO REGISTRO
      if (repeatGroup) repeatGroup.style.display = 'block';
      if (btnText) btnText.textContent = 'Registrarme';
      if (subtitle) subtitle.textContent = 'Crea tu cuenta IA personalizada';
      toggleLink.innerHTML = '¿Ya tienes cuenta? <a href="#">Inicia sesión aquí</a>';
    } else {
      // MODO LOGIN
      if (repeatGroup) repeatGroup.style.display = 'none';
      if (btnText) btnText.textContent = 'Iniciar Sesión';
      if (subtitle) subtitle.textContent = 'Tu vendedor IA personalizado';
      toggleLink.innerHTML = '¿No tienes cuenta? <a href="#">Regístrate aquí</a>';
    }
  });
}
