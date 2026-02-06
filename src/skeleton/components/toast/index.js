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

export function showToast(title, message, variant = 'info', duration = 3000) {
  const toast = renderToast();
  updateToast(toast, title, message, variant);

  getContainer().appendChild(toast);

  setTimeout(() => {
    toast.classList.add('hide');
    setTimeout(() => toast.remove(), 300);
  }, duration);
}
