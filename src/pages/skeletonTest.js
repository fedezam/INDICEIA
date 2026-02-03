console.log('🧪 skeletonTest.js iniciado');

import { runSkeleton } from '../skeleton/skeleton.js';
import { createFirebaseAdapter } from '../skeleton/adapters/firebaseAdapter.js';

// 👇 IMPORT DIRECTO Y LOG
import { renderCard } from '../skeleton/components/card/render.js';
console.log('renderCard:', renderCard);

const testPage = {

  async load(context) {
    this._context = context;
  },

  render() {
    const page = document.getElementById('skeleton-page');
    if (!page) {
      console.error('❌ #skeleton-page no existe');
      return;
    }

    page.innerHTML = `
      <h2>🦴 Skeleton Test</h2>
      <p>✔ Skeleton inicializado</p>
      <p>✔ Firebase adapter conectado</p>
    `;

    // -------------------------
    // CARD TEST
    // -------------------------
    if (typeof renderCard !== 'function') {
      console.error('❌ renderCard NO es una función');
      return;
    }

    const card = renderCard({
      title: 'Card de prueba',
      icon: 'fas fa-vial',
      content: `<p>Si ves esta card, el componente funciona.</p>`
    });

    if (!card) {
      console.error('❌ renderCard devolvió undefined/null');
      return;
    }

    console.log('✅ Card creada:', card);

    page.appendChild(card);
  }
};

runSkeleton({
  page: testPage,
  adapter: createFirebaseAdapter,
  options: {
    debug: true
  }
});
