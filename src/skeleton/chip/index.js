import './styles.css';
import { renderChip } from './render.js';
import { updateChip } from './update.js';

/**
 * Crea un Chip (etiqueta interactiva o estática)
 * @param {Object} config
 * @param {string} config.text - Texto del chip
 * @param {string} [config.icon] - Clase de icono (ej: 'fa-map-marker-alt')
 * @param {'primary'|'secondary'|'success'|'danger'|'warning'|'info'} [config.variant='secondary'] - Estilo visual
 * @param {'small'|'medium'|'large'} [config.size='medium'] - Tamaño
 * @param {boolean} [config.removable=false] - Si muestra botón de eliminar
 * @param {Function} [config.onClick] - Callback al hacer click en el chip
 * @param {Function} [config.onRemove] - Callback al hacer click en la X
 * @returns {HTMLElement}
 */
export function createChip(config = {}) {
  const dom = renderChip();
  updateChip(dom, config);
  return dom.wrapper;
}
