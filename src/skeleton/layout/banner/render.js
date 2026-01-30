// src/skeleton/layout/banner/render.js
// Renderiza solo la estructura del banner

export function renderBanner() {
  const slot = document.getElementById('skeleton-banner');
  if (!slot) return;

  slot.innerHTML = `
    <div class="skeleton-banner hidden" id="banner-root">
      <span class="banner-icon" id="banner-icon">ℹ️</span>
      <span class="banner-message" id="banner-message">—</span>
    </div>
  `;
}
