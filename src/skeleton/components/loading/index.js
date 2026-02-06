import { renderLoading } from './render';
import { updateLoading } from './update';

let overlay;

export function showLoading(message = 'Cargando...') {
  if (!overlay) {
    overlay = renderLoading();
    document.body.appendChild(overlay);
  }
  updateLoading(overlay, message);
  overlay.style.display = 'flex';
}

export function hideLoading() {
  if (overlay) {
    overlay.style.display = 'none';
  }
}
