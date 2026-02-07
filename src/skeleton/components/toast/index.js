import { renderToast } from './render';
import { updateToast } from './update';

let container;

function getContainer() {
  if (!container) {
    container = document.createElement('div');
    container.className = 's-toast-container';
    document.body.appendChild(container);
  }
  return container;
}

/**
 * Muestra una notificación toast temporal
 * @param {string} title - Título del toast
 * @param {string} message - Mensaje del toast
 * @param {'info'|'success'|'warning'|'error'} [variant='info'] - Tipo de toast
 * @param {number} [duration=3000] - Duración en milisegundos antes de desaparecer
 * @example
 * showToast('Éxito', 'Los datos se guardaron correctamente', 'success');
 * showToast('Error', 'No se pudo conectar al servidor', 'error', 5000);
 */
export function showToast(title, message, variant = 'info', duration = 3000) {
  const toast = renderToast();
  updateToast(toast, title, message, variant);
  getContainer().appendChild(toast);
  
  setTimeout(() => {
    toast.classList.add('hide');
    setTimeout(() => toast.remove(), 300);
  }, duration);
}
