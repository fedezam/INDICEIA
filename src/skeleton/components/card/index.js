// /src/skeleton/components/card/index.js
import { renderCard } from './render.js';
import { updateCard } from './update.js';
import './card.css';

/**
 * Card canónica de Skeleton
 * @param {Object} data
 * @param {string} data.title
 * @param {string|string[]} data.content
 * @param {string} data.icon - nombre de FontAwesome sin 'fa-'
 * @param {boolean} [data.highlight=false]
 * @param {Object} [data.action] - { type: 'link'|'button', ... }
 * @returns {HTMLElement}
 */
export function Card(data) {
  const wrapper = document.createElement('div');
  wrapper.innerHTML = renderCard();
  const el = wrapper.firstElementChild;

  updateCard(el, data);
  return el;
}
