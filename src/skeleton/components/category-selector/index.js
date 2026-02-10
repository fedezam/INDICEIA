// skeleton/components/category-selector/index.js
import { renderCategorySelector } from './render.js';
import { updateCategorySelector } from './update.js';

/**
 * Crea un selector de categorías con tags
 * 
 * @param {Object} config - Configuración del selector
 * @param {string[]} [config.options=[]] - Lista de opciones predefinidas para el dropdown
 * @param {string[]} [config.selected=[]] - Categorías pre-seleccionadas
 * @param {string} [config.placeholder] - Placeholder del dropdown
 * @param {string} [config.customPlaceholder] - Placeholder del input personalizado
 * 
 * @returns {HTMLElement} Selector con métodos adicionales:
 * - getSelected() - Retorna array de categorías seleccionadas
 * - setSelected(categories) - Establece categorías seleccionadas
 * - addCategory(category) - Agrega una categoría
 * - removeCategory(category) - Elimina una categoría
 * - clear() - Limpia todas las categorías
 * 
 * @fires categories-change - Se emite cuando cambian las categorías
 * 
 * @example
 * const selector = createCategorySelector({
 *   options: ['Panadería', 'Carnicería', 'Verdulería'],
 *   selected: ['Panadería']
 * });
 * 
 * selector.addEventListener('categories-change', (e) => {
 *   console.log('Categorías:', e.detail.categories);
 * });
 */
export function createCategorySelector(config = {}) {
  const dom = renderCategorySelector();
  const container = updateCategorySelector(dom, config);

  // Guardar config
  container._config = { ...config };
  container._dom = dom;

  // ==================== PUBLIC API ====================

  /**
   * Retorna las categorías seleccionadas
   */
  container.getSelected = () => {
    return [...container._selectedCategories];
  };

  /**
   * Establece las categorías seleccionadas
   */
  container.setSelected = (categories) => {
    container._selectedCategories = [...categories];
    updateCategorySelector(dom, { ...container._config, selected: categories });
  };

  /**
   * Agrega una categoría
   */
  container.addCategory = (category) => {
    const trimmed = category.trim();
    if (!trimmed) return;
    
    if (!container._selectedCategories.includes(trimmed)) {
      container._selectedCategories.push(trimmed);
      updateCategorySelector(dom, { 
        ...container._config, 
        selected: container._selectedCategories 
      });
      
      container.dispatchEvent(new CustomEvent('categories-change', {
        detail: { categories: container._selectedCategories },
        bubbles: true
      }));
    }
  };

  /**
   * Elimina una categoría
   */
  container.removeCategory = (category) => {
    container._selectedCategories = container._selectedCategories.filter(c => c !== category);
    updateCategorySelector(dom, { 
      ...container._config, 
      selected: container._selectedCategories 
    });
    
    container.dispatchEvent(new CustomEvent('categories-change', {
      detail: { categories: container._selectedCategories },
      bubbles: true
    }));
  };

  /**
   * Limpia todas las categorías
   */
  container.clear = () => {
    container._selectedCategories = [];
    updateCategorySelector(dom, { 
      ...container._config, 
      selected: [] 
    });
    
    container.dispatchEvent(new CustomEvent('categories-change', {
      detail: { categories: [] },
      bubbles: true
    }));
  };

  return container;
}
