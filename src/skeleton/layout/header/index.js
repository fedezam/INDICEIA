// src/skeleton/layout/header/index.js

import { renderHeader } from './render.js';
import { updateHeader } from './update.js';

// Inyectar CSS automáticamente (patrón consistente con form-field)
if (!document.getElementById('s-header-styles')) {
  const link = document.createElement('link');
  link.id = 's-header-styles';
  link.rel = 'stylesheet';
  link.href = new URL('./header.css', import.meta.url).href;
  document.head.appendChild(link);
  console.log('[header] CSS inyectado automáticamente');
}

/**
 * Crea el header con API pública
 * @returns {HTMLElement & {
 *   update: (data: { userData?: any, comercioData?: any }) => void,
 *   getElement: () => HTMLElement
 * }}
 */
export function createHeader() {
  const headerElement = renderHeader();

  const api = {
    update: ({ userData, comercioData } = {}) => {
      updateHeader({ userData, comercioData });
    },
    getElement: () => headerElement
  };

  Object.assign(headerElement, api);
  console.log('[header] Creado con API pública');

  return headerElement;
}
