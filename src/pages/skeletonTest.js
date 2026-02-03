console.log('🧪 skeletonTest.js iniciado');

import { runSkeleton } from '../skeleton/skeleton.js';
import { createFirebaseAdapter } from '../skeleton/adapters/firebaseAdapter.js';
import { renderCard } from '../skeleton/components/card/index.js';

console.group('🦴 TEST BOOT');
console.log('✔ Imports cargados');
console.log('runSkeleton:', runSkeleton);
console.log('createFirebaseAdapter:', createFirebaseAdapter);
console.log('renderCard:', renderCard);
console.groupEnd();

/* ---------------------------
   TEST PAGE
---------------------------- */

const testPage = {

  async load(context) {
    this._context = context;
  },

  render() {
    const app = document.getElementById('app');
    if (!app) return;

    // ⬇️ TODO lo que YA tenía el test, intacto
    app.innerHTML = `
      <h2>🦴 Skeleton Test</h2>
      <p>✔ Skeleton inicializado</p>
      <p>✔ Firebase adapter conectado</p>
      <p>✔ Header ya debería estar arriba (manejado por skeleton)</p>

      <div class="log">
        Abrí la consola → logs premium pro 😎
      </div>
    `;

    // ⬇️ SOLO agregamos una card
    const card = renderCard({
      title: 'Card Skeleton',
      icon: 'fas fa-vial',
      content: `
        <p>Esta card viene del skeleton y debe verse igual en toda la app.</p>
      `,
      actions: []
    });

    card.classList.add('highlight');

    app.appendChild(card);
  }
};

/* ---------------------------
   RUN SKELETON
---------------------------- */

runSkeleton({
  page: testPage,
  adapter: createFirebaseAdapter,
  options: {
    loadingMessage: '🔌 Probando Skeleton + Firebase + Header...',
    debug: true
  }
});
