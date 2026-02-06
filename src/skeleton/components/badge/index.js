import { renderBadge } from './render';
import { updateBadge } from './update';

/**
 * Crea un badge (etiqueta pequeña)
 * @param {Object} config
 * @param {string} config.text - Texto del badge
 * @param {'primary'|'secondary'|'success'|'danger'|'warning'|'info'} [config.variant='primary'] - Estilo visual
 * @param {string} [config.size='medium'] - Tamaño: 'small', 'medium', 'large'
 * @returns {HTMLElement} Elemento badge
 */
export function createBadge(config = {}) {
  const badge = renderBadge();
  updateBadge(badge, config);
  return badge;
}
