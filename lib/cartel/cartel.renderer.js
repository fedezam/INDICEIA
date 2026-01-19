// lib/cartel/cartel.renderer.js

import { CARTEL_COPY } from './cartel.config.js';
import { verticalTemplate } from './cartel.templates.js';

/**
 * Renderiza un cartel completo listo para imprimir o exportar
 *
 * @param {Object} params
 * @param {string} params.comercioNombre
 * @param {string} params.qrSvg - SVG del QR ya generado
 * @param {string} [params.template='vertical']
 */
export function renderCartel({ comercioNombre, qrSvg, template = 'vertical' }) {
  const data = {
    title: CARTEL_COPY.title,
    subtitle: CARTEL_COPY.subtitle,
    comercio: comercioNombre,
    qrSvg,
    instructions: CARTEL_COPY.instructions,
    footer: CARTEL_COPY.footer,
  };

  switch (template) {
    case 'vertical':
    default:
      return verticalTemplate(data);
  }
}
