// skeleton/components/card/index.js
import { renderCard } from './render.js';
import { updateCard } from './update.js';

/**
 * Crea una tarjeta (card) estilo AdminLTE
 * 
 * @param {Object} config - Configuración de la card
 * @param {string} config.title - Título de la card
 * @param {string|string[]|HTMLElement} config.content - Contenido: texto, array de párrafos, o elemento DOM
 * @param {string} [config.icon='fa-cube'] - Ícono FontAwesome (ej: 'fa-user', 'user')
 * @param {string} [config.variant] - Variante de color: 'success', 'danger', 'warning', 'info'
 * @param {boolean} [config.highlight=false] - Destacar con borde de color
 * @param {boolean} [config.selectable=false] - Permite seleccionar la card (toggle)
 * @param {boolean} [config.selected=false] - Estado inicial seleccionado
 * @param {boolean} [config.clickable=false] - Agrega efecto hover de clickable
 * @param {boolean} [config.compact=false] - Versión compacta con menos padding
 * @param {boolean} [config.flat=false] - Sin sombra
 * @param {boolean} [config.noHeader=false] - Oculta el header (ícono y título)
 * @param {Object} [config.action] - Acción en el footer
 * @param {'link'|'button'|'custom'} [config.action.type] - Tipo de acción
 * @param {string} [config.action.label] - Texto del botón/link
 * @param {string} [config.action.url] - URL si es type='link'
 * @param {string} [config.action.className] - Clases CSS personalizadas
 * @param {Function} [config.action.onClick] - Callback del botón/link
 * @param {string|HTMLElement} [config.action.content] - HTML personalizado si type='custom'
 * @param {Function} [config.onClick] - Callback al hacer click en toda la card
 * 
 * @returns {HTMLElement} Card con métodos adicionales:
 * - select() - Selecciona la card (solo si selectable=true)
 * - deselect() - Deselecciona la card
 * - toggle() - Alterna selección
 * - isSelected() - Retorna si está seleccionada
 * - setContent(content) - Actualiza el contenido
 * - setTitle(title) - Actualiza el título
 * - update(config) - Actualiza múltiples propiedades
 * 
 * @example
 * // Card básica
 * const card = createCard({
 *   title: 'Mi Comercio',
 *   content: 'Información del comercio',
 *   icon: 'fa-store'
 * });
 * 
 * @example
 * // Card seleccionable (método de pago)
 * const card = createCard({
 *   title: 'Efectivo',
 *   content: 'Aceptar pagos en efectivo',
 *   icon: 'fa-money-bill',
 *   selectable: true,
 *   variant: 'success'
 * });
 * 
 * @example
 * // Card con acción
 * const card = createCard({
 *   title: 'Tutorial',
 *   content: 'Aprende a usar la plataforma',
 *   icon: 'fa-graduation-cap',
 *   highlight: true,
 *   action: {
 *     type: 'button',
 *     label: 'Comenzar',
 *     onClick: () => startTutorial()
 *   }
 * });
 * 
 * @example
 * // Card clickable completa
 * const card = createCard({
 *   title: 'Ver Dashboard',
 *   content: 'Accede a tus estadísticas',
 *   icon: 'fa-chart-line',
 *   clickable: true,
 *   onClick: () => window.location.href = '/dashboard.html'
 * });
 */
export function createCard(config = {}) {
  const dom = renderCard();
  const card = updateCard(dom, config);

  // Guardar referencias
  card._dom = dom;
  card._config = { ...config };

  // ==================== PUBLIC API ====================

  /**
   * Selecciona la card
   */
  card.select = () => {
    if (card._config.selectable) {
      card.classList.add('selected');
      card.dispatchEvent(new CustomEvent('card-select', {
        detail: { selected: true, card },
        bubbles: true
      }));
    }
  };

  /**
   * Deselecciona la card
   */
  card.deselect = () => {
    if (card._config.selectable) {
      card.classList.remove('selected');
      card.dispatchEvent(new CustomEvent('card-select', {
        detail: { selected: false, card },
        bubbles: true
      }));
    }
  };

  /**
   * Alterna la selección
   */
  card.toggle = () => {
    if (card.classList.contains('selected')) {
      card.deselect();
    } else {
      card.select();
    }
  };

  /**
   * Retorna si está seleccionada
   */
  card.isSelected = () => {
    return card.classList.contains('selected');
  };

  /**
   * Actualiza el contenido
   */
  card.setContent = (content) => {
    card._config.content = content;
    const body = dom.body;
    
    if (Array.isArray(content)) {
      body.innerHTML = content.map(line => `<p>${line}</p>`).join('');
    } else if (typeof content === 'string') {
      body.innerHTML = `<p>${content}</p>`;
    } else if (content && content.nodeType) {
      body.innerHTML = '';
      body.appendChild(content);
    }
  };

  /**
   * Actualiza el título
   */
  card.setTitle = (title) => {
    card._config.title = title;
    dom.title.textContent = title;
  };

  /**
   * Actualiza múltiples propiedades
   */
  card.update = (newConfig) => {
    card._config = { ...card._config, ...newConfig };
    updateCard(dom, card._config);
  };

  return card;
}
