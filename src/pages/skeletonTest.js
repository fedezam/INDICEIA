// src/pages/skeletonTest.js
console.log('🧪 skeletonTest.js iniciado');

import { runSkeleton } from '../skeleton/skeleton.js';
import { createFirebaseAdapter } from '../skeleton/adapters/firebaseAdapter.js';
import { Card } from '../skeleton/components/card/index.js';

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

    page.innerHTML = `
      <h2>🦴 Skeleton Test</h2>
      <p>✔ Skeleton inicializado</p>
      <p>✔ Firebase adapter conectado</p>
      <p>▶ Probando componente Card...</p>
    `;

    try {
      const card = Card({
        title: "Servicios",
        content: [
          "3 total",
          '<span class="badge-activo">🟢 2 activos</span> <span class="badge-pausado">🔴 1 pausado</span>'
        ],
        icon: "concierge-bell",
        highlight: true,
        action: {
          type: "link",
          url: "#test",
          label: '<i class="fas fa-edit"></i> Editar',
          class: "btn btn-secondary btn-sm"
        }
      });

      page.appendChild(card);
      console.log('🎉 Card renderizada correctamente');

    } catch (err) {
      console.error('💥 ERROR creando Card:', err);
      page.innerHTML += `<p style="color:red;">❌ Error: ${err.message}</p>`;
    }

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

