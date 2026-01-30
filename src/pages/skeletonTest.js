console.log('🧪 skeletonTest.js iniciado');

import { runSkeleton } from '../skeleton/skeleton.js';
import { createFirebaseAdapter } from '../skeleton/adapters/firebaseAdapter.js';

console.group('🦴 TEST BOOT');
console.log('✔ Imports cargados');
console.log('runSkeleton:', runSkeleton);
console.log('createFirebaseAdapter:', createFirebaseAdapter);
console.groupEnd();

/* ---------------------------
   TEST PAGE
---------------------------- */

const testPage = {

  async load(context) {
    console.group('📦 PAGE.load(context)');
    console.log('Contexto recibido:', context);

    if (!context) {
      console.error('❌ Contexto undefined');
    }

    if (context?.user) {
      console.log('👤 Usuario:', context.user.uid);
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

      <p>✔ Layout renderizado</p>
      <p>✔ Firebase adapter ejecutado</p>
      <p>✔ Page montada correctamente</p>

      <div class="log">
        Abrí la consola → logs detallados
      </div>
    `;

    console.log('✔ DOM renderizado en #app');
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
    loadingMessage: '🔌 Probando Skeleton + Firebase...',
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

