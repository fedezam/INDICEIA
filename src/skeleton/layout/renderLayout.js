// src/skeleton/layout/renderLayout.js
// Render base del layout skeleton (estructura pura)

import { createHeader } from './header/index.js';  // ✅ API pública (inyecta CSS)
import { renderBanner } from './banner/render.js';
import { renderProgress } from './progress/render.js';
import { renderFooter } from '../components/footer/render.js';

// ✅ INYECTAR CSS GLOBAL DEL LAYOUT (antes que todo)
if (!document.getElementById('s-layout-styles')) {
  const link = document.createElement('link');
  link.id = 's-layout-styles';
  link.rel = 'stylesheet';
  link.href = new URL('./layout.css', import.meta.url).href;
  document.head.appendChild(link);
  console.log('[layout] CSS base inyectado automáticamente');
}

export function renderLayout() {
  const body = document.body;

  // Evitar doble render
  if (document.getElementById('skeleton-root')) {
    console.warn('⚠️ Skeleton layout ya renderizado');
    return;
  }

  const layoutHTML = `
    <div id="skeleton-root">
      <!-- HEADER SLOT -->
      <header id="skeleton-header"></header>
      <!-- BANNER SLOT -->
      <section id="skeleton-banner"></section>
      <!-- PROGRESS SLOT -->
      <section id="skeleton-progress"></section>
      <!-- PAGE CONTENT -->
      <main id="skeleton-page"></main>
      <!-- FOOTER SLOT -->
      <footer id="skeleton-footer"></footer>
    </div>
  `;

  body.insertAdjacentHTML('afterbegin', layoutHTML);
  console.log('🦴 Skeleton layout base renderizado');

  // ✅ USAR API PÚBLICA (auto-inyecta CSS de cada componente)
  createHeader();
  
  renderBanner();
  renderProgress();
  renderFooter();
}
