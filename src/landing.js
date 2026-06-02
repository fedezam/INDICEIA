// landing.js — UI logic para index.html
// Sin Firebase directo. Firebase vive en main.js vía window.__auth

// ─── Ref query ───
const _ref = new URLSearchParams(window.location.search).get('ref');
if (_ref) sessionStorage.setItem('indiceia_ref', _ref);

// ─── Screens ───
function showScreen(name) {
  document.getElementById('landing').classList.toggle('active', name === 'landing');
  document.getElementById('verify-screen').classList.toggle('active', name === 'verify');
}

// ─── Modal ───
function openAuth(mode) {
  document.getElementById('auth-modal').classList.add('open');
  switchTab(mode);
  document.body.style.overflow = 'hidden';
}
function closeAuth() {
  document.getElementById('auth-modal').classList.remove('open');
  document.body.style.overflow = '';
  clearMsgs();
}
function handleOverlayClick(e) {
  if (e.target === document.getElementById('auth-modal')) closeAuth();
}
function switchTab(tab) {
  ['login', 'register'].forEach(t => {
    document.getElementById('tab-'   + t).classList.toggle('active', t === tab);
    document.getElementById('panel-' + t).classList.toggle('active', t === tab);
  });
}

// ─── Mensajes ───
function clearMsgs() {
  document.querySelectorAll('.auth-msg').forEach(el => {
    el.textContent = '';
    el.classList.remove('visible');
  });
}
function showMsg(id, text, type) {
  const el = document.getElementById(id);
  el.textContent = text;
  el.className = 'auth-msg ' + type + ' visible';
}
function setLoading(btnId, loading, label) {
  const b = document.getElementById(btnId);
  b.disabled = loading;
  b.textContent = loading ? 'Procesando...' : label;
}

// ─── Mensajes de error Firebase ───
function fbMsg(code) {
  return ({
    'auth/user-not-found':         'No existe una cuenta con ese email.',
    'auth/wrong-password':         'Contraseña incorrecta.',
    'auth/invalid-credential':     'Email o contraseña incorrectos.',
    'auth/email-already-in-use':   'Ya existe una cuenta con ese email.',
    'auth/weak-password':          'La contraseña debe tener al menos 6 caracteres.',
    'auth/invalid-email':          'El formato del email no es válido.',
    'auth/too-many-requests':      'Demasiados intentos. Esperá unos minutos.',
    'auth/popup-closed-by-user':   'Cancelaste el inicio de sesión con Google.',
    'auth/network-request-failed': 'Error de red. Verificá tu conexión.',
  })[code] || 'Error inesperado. Intentá de nuevo.';
}

// ─── Acciones auth (implementadas en main.js vía window.__auth) ───
async function doLogin() {
  clearMsgs();
  const email = document.getElementById('login-email').value.trim();
  const pass  = document.getElementById('login-pass').value;
  if (!email || !pass) { showMsg('login-error', 'Completá los dos campos.', 'error'); return; }
  setLoading('btn-login', true, 'Ingresar');
  try {
    await window.__auth.login(email, pass);
    closeAuth();
  } catch(e) { showMsg('login-error', fbMsg(e.code), 'error'); }
  setLoading('btn-login', false, 'Ingresar');
}

async function doRegister() {
  clearMsgs();
  const email = document.getElementById('reg-email').value.trim();
  const pass  = document.getElementById('reg-pass').value;
  const pass2 = document.getElementById('reg-pass2').value;
  if (!email || !pass || !pass2) { showMsg('register-error', 'Completá todos los campos.', 'error'); return; }
  if (pass !== pass2)            { showMsg('register-error', 'Las contraseñas no coinciden.', 'error'); return; }
  if (pass.length < 8)           { showMsg('register-error', 'La contraseña debe tener al menos 8 caracteres.', 'error'); return; }
  setLoading('btn-register', true, 'Crear cuenta');
  try {
    const email_used = await window.__auth.register(email, pass);
    closeAuth();
    document.getElementById('verify-email-display').textContent = email_used || email;
    showScreen('verify');
  } catch(e) { showMsg('register-error', fbMsg(e.code), 'error'); }
  setLoading('btn-register', false, 'Crear cuenta');
}

async function doGoogleLogin() {
  clearMsgs();
  try {
    await window.__auth.loginWithGoogle();
    closeAuth();
  } catch(e) {
    const panel = document.getElementById('panel-login').classList.contains('active')
      ? 'login-error' : 'register-error';
    showMsg(panel, fbMsg(e.code), 'error');
  }
}

async function doResetPassword() {
  clearMsgs();
  const email = document.getElementById('login-email').value.trim();
  if (!email) { showMsg('login-error', 'Ingresá tu email arriba para recuperar la contraseña.', 'error'); return; }
  try {
    await window.__auth.resetPassword(email);
    showMsg('login-success', '✓ Revisá tu email para restablecer la contraseña.', 'success');
  } catch(e) { showMsg('login-error', fbMsg(e.code), 'error'); }
}

async function uiResendVerification() {
  const fb = document.getElementById('verify-feedback');
  try {
    await window.__auth.resendVerification();
    fb.textContent   = '✓ Email reenviado. Revisá tu bandeja.';
    fb.style.color   = 'var(--green)';
  } catch(e) {
    fb.textContent   = 'No pudimos reenviar el email. Intentá más tarde.';
    fb.style.color   = 'var(--red-text)';
  }
}

async function uiSignOutToHome() {
  await window.__auth.signOut();
  showScreen('landing');
}

// ─── Keyboard ───
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeAuth();
  if (e.key === 'Enter' && document.getElementById('auth-modal').classList.contains('open')) {
    document.getElementById('panel-login').classList.contains('active') ? doLogin() : doRegister();
  }
});

// ─── QR ───
window.addEventListener('load', () => {
  new QRCode(document.getElementById('qr-pizza'), {
    text: 'https://indiceia.vercel.app/entidad/wv3uTMVE5gyriqWqledV',
    width: 100, height: 100,
    colorDark: '#0a0a0a', colorLight: '#ffffff',
    correctLevel: QRCode.CorrectLevel.M
  });
  ['qr-tienda', 'qr-estetica'].forEach(id => {
    new QRCode(document.getElementById(id), {
      text: 'https://indiceia.vercel.app',
      width: 100, height: 100,
      colorDark: '#3a3835', colorLight: '#ffffff',
      correctLevel: QRCode.CorrectLevel.M
    });
  });
});

// ─── Scroll reveal ───
const revealObserver = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.classList.add('visible');
      revealObserver.unobserve(e.target);
    }
  });
}, { threshold: 0.08 });

document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

// ─── Exponer funciones al HTML inline (onclick="...") ───
window.openAuth           = openAuth;
window.closeAuth          = closeAuth;
window.handleOverlayClick = handleOverlayClick;
window.switchTab          = switchTab;
window.doLogin            = doLogin;
window.doRegister         = doRegister;
window.doGoogleLogin      = doGoogleLogin;
window.doResetPassword    = doResetPassword;
window.uiResendVerification = uiResendVerification;
window.uiSignOutToHome    = uiSignOutToHome;
window.showScreen         = showScreen;
