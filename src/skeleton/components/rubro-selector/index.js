// skeleton/components/rubro-selector/index.js
import { renderRubroSelector } from './render.js';
import { updateRubroSelector } from './update.js';

/**
 * Selector de rubro/subcategoría en 2 niveles encadenados.
 * Reemplaza al uso de category-selector para la CLASIFICACIÓN del negocio.
 * category-selector sigue existiendo para tags descriptivos libres (no clasifican).
 *
 * @param {Object} config
 * @param {string} [config.tipo] - codigo de rubro preseleccionado (ej "VEH")
 * @param {string} [config.subcategoria] - codigo de subcategoría preseleccionada (ej "VEH-VTA")
 * @param {Function} [config.onChange] - callback({tipo, subcategoria, tagLibre?})
 *
 * @returns {HTMLElement} con métodos:
 * - getValue() -> {tipo, subcategoria, tagLibre?}
 * - setValue({tipo, subcategoria})
 * - isComplete() -> boolean (true solo si tipo Y subcategoria están elegidos)
 *
 * @fires rubro-change
 */
export function createRubroSelector(config = {}) {
  const dom = renderRubroSelector();
  const container = updateRubroSelector(dom, config);

  container._config = { ...config };
  container._dom = dom;

  container.getValue = () => ({ ...container._rubroValue });

  container.setValue = ({ tipo, subcategoria }) => {
    updateRubroSelector(dom, { ...container._config, tipo, subcategoria });
  };

  container.isComplete = () => {
    const v = container._rubroValue;
    return !!(v?.tipo && v?.subcategoria);
  };

  return container;
}
