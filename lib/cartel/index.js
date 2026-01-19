// lib/cartel/index.js

import { CARTEL_CONFIG, CARTEL_COPY } from './cartel.config.js';
import { renderCartel } from './cartel.renderer.js';

/**
 * Devuelve la lista de carteles disponibles
 */
export function getCarteles(publicUrl) {
  return Object.keys(CARTEL_CONFIG.formatos).map(id => ({
    id,
    titulo: CARTEL_COPY[id].titulo,
    descripcion: CARTEL_COPY[id].descripcion,
  }));
}

/**
 * Construye un QR listo para descarga
 */
export function buildCartelQR(cartel, publicUrl) {
  return renderCartel(cartel.id, publicUrl);
}
