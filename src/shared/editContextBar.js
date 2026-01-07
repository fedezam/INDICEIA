// src/shared/editContextBar.js
// Barra contextual para modo edición (canon ÍndiceIA)

let barInjected = false;

/**
 * Inyecta la barra de contexto de edición
 * @param {Object} options
 * @param {boolean} options.hasUnsavedChangesFn → función que retorna boolean
 * @param {string} options.exitUrl → URL de salida (default: /dashboard.html)
 * @param {string} options.message → mensaje contextual
 */
export function injectEditContextBar({
  hasUnsavedChangesFn = () => false,
  exitUrl = '/dashboard.html',
  message = 'Estás editando información existente'
} = {}) {
  if (barInjected) return;

  const container = document.querySelector('main .container');
  if (!container) return;

  const bar = document.createElement('div');
  bar.className = 'edit-context-bar';
  bar.innerHTML = `
    <button id="editContextExit" class="btn-secondary">
      ← Volver al Dashboard
    </button>
    <span class="edit-context-text">
      ${message}
    </span>
  `;

  container.prepend(bar);
  barInjected = true;

  bar.querySelector('#editContextExit').onclick = () => {
    if (hasUnsavedChangesFn()) {
      const ok = confirm(
        'Tenés cambios sin guardar.\n¿Querés salir igual?'
      );
      if (!ok) return;
    }
    window.location.href = exitUrl;
  };
}
