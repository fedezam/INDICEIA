// src/skeleton/components/chip/index.js
import './styles.css';
import { renderChip } from './render.js';
import { updateChip } from './update.js';

/**
 * Crea un chip (etiqueta interactiva pequeña)
 * @param {Object} config
 * @param {string} config.text - Texto principal del chip
 * @param {string} [config.icon] - Icono de Font Awesome (ej: 'fa-map-marker-alt')
 * @param {boolean} [config.removable=false] - Si muestra botón de cerrar
 * @param {'primary'|'secondary'|'success'|'danger'|'warning'|'info'} [config.variant='secondary'] - Estilo visual
 * @param {'small'|'medium'|'large'} [config.size='medium'] - Tamaño
 * @param {Function} [config.onRemove] - Callback al hacer click en cerrar
 * @param {Function} [config.onClick] - Callback al hacer click en el chip
 * @returns {HTMLElement} Elemento chip
 */
export function createChip(config = {}) {
  const chip = renderChip();
  updateChip(chip, config);
  return chip;
}
