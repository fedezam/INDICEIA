// src/skeleton/layout/renderLayout.js
import './layout.css';
import { createHeader }  from './header/index.js';
import { renderProgress } from './progress/render.js';
import { renderFooter }   from '../components/footer/render.js';

export function renderLayout() {
  const body = document.body;

  if (document.getElementById('skeleton-root')) {
    console.warn('⚠️ Skeleton layout ya renderizado');
    return;
  }

  const layoutHTML = `
    <div id="skeleton-root">
      <header id="skeleton-header"></header>
      <section id="skeleton-progress"></section>
      <main id="skeleton-page"></main>
      <footer id="skeleton-footer"></footer>
    </div>
  `;

  body.insertAdjacentHTML('afterbegin', layoutHTML);
  console.log('🦴 Skeleton layout base renderizado');

  createHeader();
  //renderProgress();
  renderFooter();
}
