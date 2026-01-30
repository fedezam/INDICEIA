// ================================
// Skeleton Header Test – PREMIUM PRO
// ================================

import { resolveFirebaseContext } from '../src/services/firebase/context.js';

// Skeleton
import { renderLayout } from '../src/skeleton/layout/renderLayout.js';
import { updateHeader } from '../src/skeleton/layout/header/update.js';

const app = document.getElementById('app');

console.log('🧪 Skeleton TEST booting…');

resolveFirebaseContext(
  (context) => {
    console.log('📦 PAGE.load(context)');
    console.log('Contexto recibido:', context);
    console.log('👤 Usuario:', context.user?.uid);
    console.log('📧 Email:', context.user?.email);
    console.log('🏪 Comercio:', context.comercioData?.nombre);

    // ================================
    // RENDER
    // ================================
    console.log('🎨 PAGE.render()');

    app.innerHTML = '';
    const skeletonRoot = renderLayout();
    app.appendChild(skeletonRoot);

    console.log('✔ DOM renderizado en #app');

    // ================================
    // WATCHDOG
    // ================================
    setTimeout(() => {
      console.log('🐶 WATCHDOG (5s)');
      console.log('Skeleton root:', document.getElementById('skeleton-root'));
      console.log('Header slot:', document.getElementById('skeleton-header'));
      console.log('Banner slot:', document.getElementById('skeleton-banner'));
      console.log('Progress slot:', document.getElementById('skeleton-progress'));
      console.log('Page slot:', document.getElementById('skeleton-page'));
    }, 5000);

    // ================================
    // UPDATE HEADER (🔥 LO QUE FALTABA 🔥)
    // ================================
    console.log('🧠 updateHeader(context)');
    try {
      updateHeader(context);
      console.log('✅ Header actualizado correctamente');
    } catch (err) {
      console.error('💥 Error en updateHeader:', err);
    }
  },
  (error) => {
    console.error('🔥 Error resolviendo contexto Firebase:', error);
  }
);
