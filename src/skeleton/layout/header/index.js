// src/skeleton/layout/header/index.js

import { renderHeader } from './render.js';
import { updateHeader } from './update.js';

// Inyectar CSS automáticamente la primera vez que se importa el módulo
if (!document.getElementById('s-header-styles')) {
  const link = document.createElement('link');
  link.id = 's-header-styles';
  link.rel = 'stylesheet';
  link.href = new URL('./header.css', import.meta.url).href;
  document.head.appendChild(link);
  console.log('[header] CSS inyectado automáticamente');
}

/**
 * Crea y retorna el elemento header con API pública
 * @returns {HTMLElement & {
 *   update: (data: { userData?: any, comercioData?: any }) => void,
 *   getElement: () => HTMLElement
 * }}
 */
export function createHeader() {
  // Renderiza el HTML si aún no existe
  const headerElement = renderHeader();

  // API pública
  const api = {
    // Actualiza contenido dinámico
    update: ({ userData, comercioData } = {}) => {
      updateHeader({ userData, comercioData });
    },

    // Retorna el elemento DOM raíz
    getElement: () => headerElement,

    // Método opcional para destruir/limpiar (si lo necesitás en el futuro)
    destroy: () => {
      headerElement.innerHTML = '';
    }
  };

  // Retornamos el elemento DOM + métodos adjuntos
  Object.assign(headerElement, api);

  console.log('[header] Creado con API pública');

  return headerElement;
}
