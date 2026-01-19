// lib/cartel/index.js

import { CARTEL_CONFIG, CARTEL_COPY } from './cartel.config.js';
import { renderCartel } from './cartel.renderer.js';

/**
 * API pública del módulo cartel
 * Contrato estable para páginas
 */

/**
 * Devuelve la lista de carteles disponibles
 * @param {string} publicUrl - URL (no se usa aquí, por coherencia de API)
 * @returns {Array} - Lista de carteles con metadata
 */
export function getCarteles(publicUrl) {
  return Object.keys(CARTEL_CONFIG.formatos).map(id => ({
    id,
    titulo: CARTEL_COPY[id].titulo,
    descripcion: CARTEL_COPY[id].descripcion,
  }));
}

/**
 * Construye un cartel listo para descarga
 * @param {Object} cartel - { id, titulo, descripcion }
 * @param {string} publicUrl - URL que va en el QR
 * @returns {Promise<Object>} - Objeto con método download()
 */
export function buildCartelQR(cartel, publicUrl) {
  return renderCartel(cartel.id, publicUrl);
}
