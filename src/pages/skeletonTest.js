console.log('🧪 skeletonTest.js iniciado');

import { runSkeleton } from '../skeleton/skeleton.js';
import { createFirebaseAdapter } from '../skeleton/adapters/firebaseAdapter.js';
import { Card } from '../skeleton/components/card/index.js';
import '../skeleton/components/card/card.css';

/* ---------------------------
   TEST PAGE
---------------------------- */

const testPage = {
  async load(context) {
    console.group('📦 PAGE.load(context)');
    console.log('Contexto recibido:', context);
    this._context = context;
    console.groupEnd();
  },

  render() {
    console.group('🎨 PAGE.render()');

    const page = document.getElementById('skeleton-page');
    if (!page) {
      console.error('❌ skeleton-page no existe');
      return;
    }

    // contenido base del test (NO tocamos header/footer)
    page.innerHTML = `
      <h2>🦴 Skeleton Test</h2>
      <p>✔ Skeleton inicializado</p>
      <p>✔ Firebase adapter conectado</p>
    `;

    // ---- CARD DE PRUEBA ----
    const wrapper = document.createElement('div');
    wrapper.innerHTML = Card.render({ highlight: true });

    const cardNode = wrapper.firstElementChild;
    console.log('✅ Card creada:', cardNode);

    // Ahora hidratamos con datos reales usando update
    Card.update(cardNode, {
      icon: 'fas fa-box',
      title: 'Card de prueba',
      description: 'Si ves esto, la card funciona'
    });

    page.appendChild(cardNode);

    console.groupEnd();
  }
};

/* ---------------------------
   RUN SKELETON
---------------------------- */

runSkeleton({
  page: testPage,
  adapter: createFirebaseAdapter,
  options: {
    loadingMessage: '🧪 Probando Skeleton + Card',
    debug: true
  }
});
