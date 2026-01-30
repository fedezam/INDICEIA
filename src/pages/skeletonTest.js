console.log('🧪 skeletonTest.js iniciado');

import { runSkeleton } from '../skeleton/skeleton.js';
import { createFirebaseAdapter } from '../skeleton/adapters/firebaseAdapter.js';

import { renderHeader } from '../skeleton/layout/header/render.js';
import { updateHeader } from '../skeleton/layout/header/update.js';

console.group('🦴 TEST BOOT');
console.log('✔ Imports cargados');
console.log('runSkeleton:', runSkeleton);
console.log('createFirebaseAdapter:', createFirebaseAdapter);
console.log('renderHeader:', renderHeader);
console.log('updateHeader:', updateHeader);
console.groupEnd();

/* ---------------------------
   TEST PAGE
---------------------------- */

const testPage = {

  async load(context) {
    console.group('📦 PAGE.load(context)');
    console.log('Contexto recibido:', context);

    this._context = context;

    if (context?.user) {
      console.log('👤 Usuario UID:', context.user.uid);
      console.log('📧 Email:', context.user.email);
    } else {
      console.warn('⚠️ No hay usuario autenticado');
    }

    console.groupEnd();
  },

  render() {
    console.group('🎨 PAGE.render()');

    const app = document.getElementById('app');
    if (!app) {
      console.error('❌ #app no existe');
      return;
    }

    app.innerHTML = `
      <h2>🦴 Skeleton Test</h2>
      <p>✔ Skeleton inicializado</p>
      <p>✔ Firebase adapter conectado</p>
      <p>✔ Header debería verse arriba</p>

      <div class="log">
        Abrí la consola → logs premium pro 😎
      </div>
    `;

    console.log('🧱 renderHeader()');
    renderHeader();

    console.log('🧩 updateHeader()');
    updateHeader({
      userData: this._context?.userData,
      comercioData: this._context?.comercioData,
      pageName: 'Skeleton Test'
    });

    console.log('✔ DOM renderizado + header actualizado');
    console.groupEnd();
  }
};

/* ---------------------------
   RUN SKELETON
---------------------------- */

console.group('🚀 runSkeleton()');

runSkeleton({
  page: testPage,
  adapter: createFirebaseAdapter,
  options: {
    loadingMessage: '🔌 Probando Skeleton + Firebase + Header...',
    debug: true
  }
});

console.log('✔ runSkeleton invocado');
console.groupEnd();

/* ---------------------------
   WATCHDOG
---------------------------- */

setTimeout(() => {
  console.group('🐶 WATCHDOG (5s)');
  console.log('Skeleton root:', document.getElementById('skeleton-root'));
  console.log('Header slot:', document.getElementById('skeleton-header'));
  console.log('Banner slot:', document.getElementById('skeleton-banner'));
  console.log('Progress slot:', document.getElementById('skeleton-progress'));
  console.log('Page slot:', document.getElementById('skeleton-page'));
  console.groupEnd();
}, 5000);
