// src/pages/skeletonTest.js
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
    // Contenido base del test (NO tocamos header/footer)
    page.innerHTML = `
      <h2>🦴 Skeleton Test</h2>
      <p>✔ Skeleton inicializado</p>
      <p>✔ Firebase adapter conectado</p>
      <p>▶ Probando componente Card...</p>
    `;

    // ---- CARD DE PRUEBA ----
    const wrapper = document.createElement('div');
    wrapper.innerHTML = Card.render({ highlight: true });
    try {
      console.log('🔍 Intentando crear Card con datos de prueba...');

    const cardNode = wrapper.firstElementChild;
    console.log('✅ Card creada:', cardNode);
      // ✅ USO CORRECTO: Card(data) devuelve un HTMLElement listo
      const cardElement = Card({
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

    // Ahora hidratamos con datos reales usando update
    Card.update(cardNode, {
      icon: 'fas fa-box',
      title: 'Card de prueba',
      description: 'Si ves esto, la card funciona'
    });
      console.log('✅ Card creada exitosamente:', cardElement);
      console.log('📄 HTML generado:', cardElement.outerHTML);

    page.appendChild(cardNode);
      // Añadir al contenedor
      page.appendChild(cardElement);

      console.log('🎉 Card insertada en el DOM');
    } catch (err) {
      console.error('💥 ERROR al crear o insertar la Card:', err);
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
