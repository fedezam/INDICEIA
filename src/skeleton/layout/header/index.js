// src/skeleton/layout/header/index.js
import { renderHeader } from './render.js';
import { updateHeader } from './update.js';

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
    update: ({ userData, entidadData } = {}) => {
      updateHeader({ userData, entidadData });
    },
    getElement: () => headerElement
  };
  
  Object.assign(headerElement, api);
  console.log('[header] Creado con API pública');
  return headerElement;
}
