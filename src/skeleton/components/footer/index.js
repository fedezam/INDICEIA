// src/skeleton/components/footer/index.js
// Punto de entrada del componente Footer

/**
 * Renderiza el HTML del footer
 * @returns {string} HTML del footer
 */
export { renderFooter } from './render.js';

/**
 * Actualiza el contenido del footer
 * @function updateFooter
 * @param {HTMLElement} footer - Elemento footer a actualizar
 * @param {Object} data - Datos del footer
 * @param {string} [data.companyName] - Nombre de la empresa
 * @param {Array<{icon: string, url: string}>} [data.socialLinks] - Links de redes sociales
 */
/**
 * Inicializa eventos del footer
 * @function initFooter
 * @param {HTMLElement} footer - Elemento footer
 */
/**
 * Links de redes sociales por defecto
 * @constant {Array<{icon: string, url: string}>}
 */
export { updateFooter, initFooter, defaultSocialLinks } from './update.js';
