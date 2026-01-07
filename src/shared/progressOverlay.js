// src/shared/progressOverlay.js
// Overlay de progreso reutilizable para procesos largos (imports, guardados masivos, etc.)

let progressState = {
  total: 0,
  current: 0,
  visible: false
};

export function showProgressOverlay(total, options = {}) {
  if (progressState.visible) return;

  progressState.total = total;
  progressState.current = 0;
  progressState.visible = true;

  const {
    title = 'Procesando…',
    initialMessage = 'Iniciando operación'
  } = options;

  const overlay = document.createElement('div');
  overlay.id = 'progressOverlay';

  overlay.innerHTML = `
    <div class="progress-box">
      <h3>${title}</h3>
      <p id="progressText">${initialMessage}</p>

      <div class="progress-bar">
        <div id="progressFill"></div>
      </div>

      <small id="progressCount">0 / ${total}</small>
    </div>
  `;

  document.body.appendChild(overlay);
}

export function updateProgress(message = '') {
  if (!progressState.visible) return;

  progressState.current++;

  const percent = Math.min(
    Math.round((progressState.current / progressState.total) * 100),
    100
  );

  const fill = document.getElementById('progressFill');
  const count = document.getElementById('progressCount');
  const text = document.getElementById('progressText');

  if (fill) fill.style.width = `${percent}%`;
  if (count) count.textContent = `${progressState.current} / ${progressState.total}`;
  if (text && message) text.textContent = message;
}

export function finishProgressOverlay(finalMessage = 'Finalizando…', delay = 600) {
  if (!progressState.visible) return;

  const text = document.getElementById('progressText');
  if (text) text.textContent = finalMessage;

  setTimeout(() => {
    document.getElementById('progressOverlay')?.remove();
    progressState = { total: 0, current: 0, visible: false };
  }, delay);
}
