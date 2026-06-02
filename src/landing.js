// src/landing.js
// ======================================================================
// 🎨 CONTROLADOR DE INTERFAZ Y EFECTOS VISUALES (LANDING HOME)
// ======================================================================

document.addEventListener('DOMContentLoaded', () => {
  inicializarModalesYPaneles();
  inicializarQRsEcosystem();
  inicializarScrollReveal();
});

// ─── 1. Gestión de Modales de Autenticación ───
function inicializarModalesYPaneles() {
  const modal = document.getElementById('auth-modal');
  const panelLogin = document.getElementById('panel-login');
  const panelRegister = document.getElementById('panel-register');

  // Capturar selectores de botones de apertura/cierre
  const btnOpenAuth = document.getElementById('btn-open-auth');
  const btnCtaStart = document.getElementById('btn-cta-start');
  const btnCloseAuth = document.getElementById('btn-close-auth');
  
  const toRegister = document.getElementById('to-register');
  const toLogin = document.getElementById('to-login');

  // Abrir login desde el Header
  if (btnOpenAuth) {
    btnOpenAuth.addEventListener('click', () => {
      mostrarPanel('login');
      modal.classList.add('open');
    });
  }

  // Abrir registro desde el botón principal de la Landing (CTA)
  if (btnCtaStart) {
    btnCtaStart.addEventListener('click', () => {
      mostrarPanel('register');
      modal.classList.add('open');
    });
  }

  // Botón X para cerrar modal
  if (btnCloseAuth) {
    btnCloseAuth.addEventListener('click', () => modal.classList.remove('open'));
  }

  // Alternar entre Login y Registro dentro del modal
  if (toRegister) toRegister.addEventListener('click', () => mostrarPanel('register'));
  if (toLogin) toLogin.addEventListener('click', () => mostrarPanel('login'));

  // Cerrar modal al presionar la tecla Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('open')) {
      modal.classList.remove('open');
    }
  });

  function mostrarPanel(tipo) {
    if (tipo === 'login') {
      panelRegister.classList.remove('active');
      panelLogin.classList.add('active');
    } else {
      panelLogin.classList.remove('active');
      panelRegister.classList.add('active');
    }
  }

  // ─── Envío de Formularios enlazados al BRIDGE de tu main.js ───
  const btnDoLogin = document.getElementById('btn-do-login');
  if (btnDoLogin) {
    btnDoLogin.addEventListener('click', async () => {
      const email = document.getElementById('login-email').value;
      const pass = document.getElementById('login-pass').value;
      
      try {
        // Llama de forma limpia a la función que expuso tu main.js original
        await window.__auth.login(email, pass);
        modal.classList.remove('open');
      } catch (error) {
        alert('Error al iniciar sesión: ' + error.message);
      }
    });
  }
}

// ─── 2. Inyección de QRs Dinámicos (Anzuelos Semánticos) ───
function inicializarQRsEcosystem() {
  if (typeof QRCode === 'undefined') {
    console.warn('⚠️ QRCode library no está disponible en el DOM.');
    return;
  }

  // Renderizar QR de Pizzería La Esquina (apunta a la entidad de testeo)
  const qrPizzaEl = document.getElementById('qr-pizza');
  if (qrPizzaEl) {
    new QRCode(qrPizzaEl, {
      text: 'https://indiceia.vercel.app/entidad/wv3uTMVE5gyriqWqledV',
      width: 100,
      height: 100,
      colorDark: '#0a0a0a',
      colorLight: '#ffffff',
      correctLevel: QRCode.CorrectLevel.M
    });
  }

  // Renderizar QRs secundarios de la sección Demos
  ['qr-tienda', 'qr-estetica'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      new QRCode(el, {
        text: 'https://indiceia.vercel.app',
        width: 100,
        height: 100,
        colorDark: '#3a3835',
        colorLight: '#ffffff',
        correctLevel: QRCode.CorrectLevel.M
      });
    }
  });
}

// ─── 3. Scroll Reveal para la experiencia humana ───
function inicializarScrollReveal() {
  const elementosReveal = document.querySelectorAll('.reveal');
  if (elementosReveal.length === 0) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });

  elementosReveal.forEach(el => observer.observe(el));
}
