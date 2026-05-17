import './styles.css';
import { renderAutocomplete } from './render.js';
import { updateAutocomplete } from './update.js';

/**
 * Crea un campo de autocompletado con búsqueda asíncrona
 * @param {Object} config
 * @param {string} [config.placeholder='Buscar...'] - Texto placeholder
 * @param {Function} config.fetchOptions - Async (query) => Promise<Array>
 * @param {Function} [config.formatOption=(item) => String(item)] - Cómo renderizar cada opción
 * @param {Function} [config.getValue=(item) => item] - Qué valor devolver al seleccionar
 * @param {Function} [config.onSelect=(val) => {}] - Callback al seleccionar
 * @param {number} [config.minChars=2] - Mínimo de caracteres para buscar
 * @param {number} [config.debounceMs=300] - Delay en ms antes de buscar
 * @param {number} [config.maxResults=10] - Límite de opciones mostradas
 * @param {boolean} [config.required=false] - Si es obligatorio seleccionar
 * @param {boolean} [config.disabled=false] - Estado inicial deshabilitado
 * @param {*} [config.value=null] - Valor preseleccionado
 * @returns {HTMLElement} Wrapper del componente con métodos públicos
 */
export function createAutocomplete(config = {}) {
  const dom = renderAutocomplete();
  updateAutocomplete(dom, config);
  return dom.wrapper;
}
