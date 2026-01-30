import { runSkeleton } from './skeleton/skeleton.js';
import { createFirebaseAdapter } from './skeleton/adapters/firebaseAdapter.js';
import { renderHeader } from './skeleton/layout/header/render.js';
import { updateHeader } from './skeleton/layout/header/update.js';

console.log('🧪 skeletonTest.js iniciado');

const testPage = {
  async load(context) {
    console.log('📦 PAGE.load(context)');
    console.log('Contexto recibido:', context);

    const { user, userData, comercioData } = context;
    console.log('👤 Usuario:', user.uid);
    console.log('📧 Email:', user.email);
    console.log('🏪 Comercio:', comercioData?.nombre);
    console.log('🎟️ Plan:', comercioData?.plan);

    // Guardamos los datos para render
    this._context = { userData, comercioData };
  },

  render() {
    console.log('🎨 PAGE.render()');

    const app = document.getElementById('app');
    app.innerHTML = `
      <p>🔥 Skeleton + Firebase + Header Test</p>
      <p>Abrí la consola para ver todos los logs</p>
    `;

    // Renderizamos el header y luego lo actualizamos
    renderHeader();
    updateHeader({
      ...this._context,
      pageName: 'Página de prueba'
    });

    console.log('✔ DOM renderizado en #app y header actualizado');
  }
};

// Ejecutamos el skeleton real
console.log('🚀 runSkeleton()');
runSkeleton({
  page: testPage,
  adapter: createFirebaseAdapter,
  options: {
    loadingMessage: 'Probando Skeleton + Firebase + Header...'
  }
});
