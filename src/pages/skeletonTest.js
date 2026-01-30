import { runSkeleton } from './skeleton/skeleton.js';
import { createFirebaseAdapter } from './skeleton/adapters/firebaseAdapter.js';
import { renderLayout } from './skeleton/layout/renderLayout.js';
import { renderHeader } from './skeleton/layout/header/render.js';
import { updateHeader } from './skeleton/layout/header/update.js';

console.log('🧪 skeletonTest.js iniciado');

const testPage = {
  _context: {},

  async load(context) {
    console.log('📦 PAGE.load(context)');
    console.log('Contexto recibido:', context);

    const { user, userData, comercioData } = context;
    console.log('👤 Usuario UID:', user.uid);
    console.log('📧 Email:', user.email);
    console.log('🏪 Comercio:', comercioData?.nombre);
    console.log('🎟️ Plan:', comercioData?.plan);

    // Guardamos los datos para el render
    this._context = { userData, comercioData };
  },

  render() {
    console.log('🎨 PAGE.render()');

    // Render layout base
    renderLayout();
    console.log('🦴 Skeleton layout renderizado');

    // Render y update del header
    renderHeader();
    updateHeader({ ...this._context, pageName: 'Página de prueba' });
    console.log('✔ Header renderizado y actualizado');

    // Render contenido de la página
    const app = document.getElementById('app');
    app.innerHTML = `
      <h1>🔥 Skeleton + Firebase + Header Test</h1>
      <p>Abrí la consola para ver todos los logs</p>
    `;
    console.log('✔ DOM renderizado en #app');
  }
};

console.log('🚀 runSkeleton()');
runSkeleton({
  page: testPage,
  adapter: createFirebaseAdapter,
  options: { loadingMessage: 'Probando Skeleton + Firebase + Header...' }
});
