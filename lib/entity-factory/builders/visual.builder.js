import { hasData } from '../utils/hasData.js';

/**
 * Construye el bloque visual.
 * Retorna objeto directo — sin wrapper extra.
 * Resultado en entidad: entity.visual = { available, mode, runtime }
 */
export function buildVisual(context, templateRegistry = {}) {
  try {
    if (!hasData(context.templateId)) return null;

    const template = templateRegistry.templates?.[context.templateId];
    if (!template) return null;

    return {
      available: true,
      mode: 'iframe',
      runtime: {
        iframe_url:   template.paths.runtime_html,
        template_url: template.paths.component_jsx,
        input: {
          binding:  'goods.goods',
          strategy: 'postMessage'
        }
      }
    };

  } catch (err) {
    console.warn('⚠️ No se pudo construir visual:', err.message);
    return null;
  }
}
