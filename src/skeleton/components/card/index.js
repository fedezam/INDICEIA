import { renderCard } from './render.js';
import { updateCard } from './update.js';
import './card.css';

/**
 * Card canónica de Skeleton
 * @param {Object} data
 * @param {string} data.title - Título de la card
 * @param {string|string[]} data.content - Contenido (texto o array de párrafos)
 * @param {string} [data.icon] - Nombre de ícono FontAwesome sin 'fa-' (ej: 'user', 'shopping-cart')
 * @param {boolean} [data.highlight=false] - Si debe destacarse visualmente
 * @param {Object} [data.action] - Acción de la card
 * @param {'link'|'button'} [data.action.type] - Tipo de acción
 * @param {string} [data.action.label] - Texto del botón/link
 * @param {string} [data.action.url] - URL si es type='link'
 * @param {Function} [data.action.onClick] - Callback si es type='button'
 * @returns {HTMLElement} Elemento card
 */
export function Card(data) {
  const wrapper = document.createElement('div');
  wrapper.innerHTML = renderCard();
  const el = wrapper.firstElementChild;
  updateCard(el, data);
  return el;
}
