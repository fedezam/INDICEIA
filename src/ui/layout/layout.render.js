// ============================================
// layout.render.js
// Render base del layout (slots)
// ============================================

export function renderLayoutBase() {
  document.body.insertAdjacentHTML('afterbegin', `
    <header id="app-header"></header>
    <div id="app-banner"></div>
    <div id="app-progress"></div>
    <main id="app-main"></main>
  `);
}
