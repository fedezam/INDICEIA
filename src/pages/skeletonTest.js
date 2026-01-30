import { runSkeleton } from './skeleton/skeleton.js';
import { createFirebaseAdapter } from './skeleton/adapters/firebaseAdapter.js';
import { renderHeader } from './skeleton/layout/header/render.js';
import { updateHeader } from './skeleton/layout/header/update.js';
import { renderLayout } from './skeleton/layout/renderLayout.js';

console.log('🧪 skeletonTest.js iniciado');

// -------------------------------
// PAGE TEST
// -------------------------------
const testPage = {
  async load(context) {
    console.log('📦 PAGE.load(context)');
    console.log('Contexto recibido:', context);

    const { user, userData, comercioData, isEditMode } = context;

    console.log('👤 Usuario:', user.uid);
    console.log('📧 Email:', user.email);
    console.log('🏪 Comercio:', comercioData?.nombre);
    console.log('🎟️ Plan:', comercioData?.plan);
    console.log('✏️ Edit mode:', isEditMode);

    this._context = { userData, comercioData };
  },

  render() {
    console.log('🎨 PAGE.render()');

    // Render skeleton base
    renderLayout();
    console.log('🦴 Skeleton base renderizado');

    // Render header
    renderHeader();
    console.log('🔹 Header renderizado (vacío)');

    // Update header con datos reales
    updateHeader({
      ...this._context,
      pageName: 'Página de prueba'
    });
    console.log('🔹 Header actualizado con datos de Firebase');

    // Renderizamos el contenido de la página
    const app = document.getElementById('app');
    app.innerHTML = `
      <p>🔥 Skeleton + Firebase + Header Test Full</p>
      <p>Abrí la consola para ver todos los logs</p>
      <p>Usuario: ${this._context.userData?.nombre || this._context.userData?.email}</p>
      <p>Comercio: ${this._context.comercioData?.nombre || 'Mi comercio'}</p>
      <p>Plan: ${this._context.comercioData?.plan || 'Sin plan'}</p>
    `;
    console.log('✔ DOM renderizado en #app y header listo');
  }
};

// -------------------------------
// WATCHDOG
// -------------------------------
function startWatchdog() {
  console.log('🐶 WATCHDOG activado (5s interval)');

  setInterval(() => {
    const root = document.getElementById('skeleton-root');
    const header = document.getElementById('skeleton-header');
    const banner = document.getElementById('skeleton-banner');
    const progress = document.getElementById('skeleton-progress');
    const page = document.getElementById('skeleton-page');

    console.log('--- WATCHDOG ---');
    console.log('Skeleton root:', root);
    console.log('Header slot:', header);
    console.log('Banner slot:', banner);
    console.log('Progress slot:', progress);
    console.log('Page slot:', page);
    console.log('----------------');
  }, 5000);
}

// -------------------------------
// RUN
// -------------------------------
console.log('🚀 runSkeleton()');
runSkeleton({
  page: testPage,
  adapter: createFirebaseAdapter,
  options: { loadingMessage: 'Probando Skeleton + Firebase + Header FULL...' }
});

// Iniciamos watchdog
startWatchdog();
