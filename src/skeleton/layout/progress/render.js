// src/skeleton/layout/progress/render.js
// Renderiza solo la estructura base del progress onboarding

export function renderProgress() {
  const slot = document.getElementById('skeleton-progress');
  if (!slot) return;

  slot.innerHTML = `
    <div class="skeleton-progress hidden" id="progress-root">

      <div class="progress-header">
        <h3 id="progress-title">Configuración de tu comercio</h3>
        <p id="progress-subtitle">—</p>
      </div>

      <div class="progress-bar-container">
        <div class="progress-bar">
          <div class="progress-fill" id="progress-fill"></div>
        </div>
      </div>

      <div class="progress-steps" id="progress-steps"></div>

    </div>
  `;
}
