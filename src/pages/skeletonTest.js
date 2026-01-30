// src/pages/skeleton-test.js

import { runSkeleton } from '../skeleton/skeleton.js';

// ⬇️ el MISMO adapter que usa una página real
import { dashboardAdapter } from '../adapters/dashboardAdapter.js';

// ⬇️ layout real
import { renderLayout } from '../skeleton/layout/renderLayout.js';
import { updateHeader } from '../skeleton/layout/header/update.js';

console.log('🐶 SKELETON TEST — INIT');

const page = {
  load(context) {
    console.log('📦 PAGE.load() context real:', context);

    // render layout base
    const root = document.getElementById('skeleton-root');
    root.innerHTML = '';
    root.appendChild(renderLayout());

    // ⬇️ acá está el foco del test
    console.log('🧠 Actualizando header con datos reales');
    updateHeader(context);
  },

  render() {
    console.log('🎨 PAGE.render()');
  }
};

runSkeleton({
  page,
  adapter: dashboardAdapter, // 🔥 real, con Firebase
  options: {
    debug: true
  }
});
