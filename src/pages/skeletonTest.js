console.log('🧪 skeletonTest.js iniciado');

import { runSkeleton } from '../skeleton/skeleton.js';
import { createFirebaseAdapter } from '../skeleton/adapters/firebaseAdapter.js';
import { renderCard } from '../skeleton/components/card/render.js';

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

    // 👉 lo que YA tenía el test
    page.innerHTML = `
      <h2>🦴 Skeleton Test</h2>
      <p>✔ Skeleton inicializado</p>
      <p>✔ Firebase adapter conectado</p>
      <p>✔ Header arriba, footer abajo</p>
    `;

    // 👉 LA CARD
    const card = renderCard({
      title: 'Card Skeleton',
      icon: 'fas fa-vial',
      content: `
        <p>Si ves esto, las cards del skeleton funcionan.</p>
      `
    });

    card.classList.add('highlight');

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
