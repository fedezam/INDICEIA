// skeleton/components/visual-template-selector/index.js
import { renderTemplateSelector } from './render.js';
import { updateTemplateSelector } from './update.js';

/**
 * Selector visual de templates (grid con click para elegir uno).
 *
 * @param {Object} config
 * @param {Array}  config.templates - lista de templates ya filtrados por tier
 * @param {string|null} [config.selectedId=null] - id del template inicialmente activo
 * @param {Function} [config.onChange] - (templateId|null) => void, cada vez que cambia la selección
 *
 * @returns {HTMLElement & { getValue: Function, setTemplates: Function }}
 *
 * @example
 * const selector = createTemplateSelector({
 *   templates,
 *   selectedId: entidad.templateId,
 *   onChange: (id) => console.log('elegido:', id)
 * });
 * container.appendChild(selector);
 * // luego, al guardar:
 * const templateId = selector.getValue();
 */
export function createTemplateSelector(config = {}) {
  const dom = renderTemplateSelector();
  const el = dom.grid;

  let currentTemplates = config.templates || [];
  let selectedId = config.selectedId ?? null;

  function paint() {
    updateTemplateSelector(dom, {
      templates: currentTemplates,
      selectedId,
      actions: {
        onChange: (nuevoId) => {
          selectedId = nuevoId;
          paint();
          config.onChange?.(selectedId);
        }
      }
    });
  }
  paint();

  // ==================== PUBLIC API ====================
  el.getValue = () => selectedId;

  el.setTemplates = (nuevos) => {
    currentTemplates = nuevos;
    paint();
  };

  return el;
}

/** Fetch + filtro por tier, reusable desde cualquier consumidor */
export async function loadTemplatesForEntityType(entityType = 'comercio') {
  const res = await fetch('/templates/registry.visual.json?t=' + Date.now());
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  const tierMap = {
    comercio:  (t) => t.tier?.startsWith('C'),
    prestador: (t) => t.tier?.startsWith('S'),
    ambos:     (t) => t.tier?.startsWith('A'),
  };
  return (json.templates || []).filter(tierMap[entityType] || tierMap.comercio);
}
