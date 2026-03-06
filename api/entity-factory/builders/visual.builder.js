import { readFileSync } from 'fs';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { hasData } from '../utils/hasData.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

/**
 * Construye el bloque visual según base/visual.json.
 * Si el comercio tiene templateId activo, configura el iframe de runtime.
 */
export function buildVisual(context, templateRegistry = {}) {
  try {
    const visual = JSON.parse(
      readFileSync(resolve(__dirname, '../base/visual.json'), 'utf-8')
    ).C;

    if (hasData(context.templateId)) {
      const template = templateRegistry.templates?.[context.templateId];
      if (template) {
        visual.visual = {
          available: true,
          mode: 'iframe',
          runtime: {
            iframe_url: `https://indiceia-templates.vercel.app${template.paths.runtime_html}`,
            input: {
              binding: 'bloque_B_contexto_comercial',
              strategy: 'postMessage'
            }
          }
        };
      }
    }

    return visual;

  } catch (err) {
    console.warn('⚠️ No se pudo construir visual:', err.message);
    return {};
  }
}
