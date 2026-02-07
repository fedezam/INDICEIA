import { renderLoading } from './render';
import { updateLoading } from './update';

let overlay;

/**
 * Muestra un overlay de carga sobre toda la pantalla
 * @param {string} [message='Cargando...'] - Mensaje a mostrar
 * @example
 * showLoading('Guardando datos...');
 * setTimeout(() => hideLoading(), 2000);
 */
export function showLoading(message = 'Cargando...') {
  if (!overlay) {
    overlay = renderLoading();
    document.body.appendChild(overlay);
  }
  updateLoading(overlay, message);
  overlay.style.display = 'flex';
}

/**
 * Oculta el overlay de carga
 */
export function hideLoading() {
  if (overlay) {
    overlay.style.display = 'none';
  }
}
