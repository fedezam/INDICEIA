// lib/cartel/index.js

import { CARTEL_COPY } from './cartel.config.js';
import { renderCartel } from './cartel.renderer.js';

export function getCarteles() {
  return Object.entries(CARTEL_COPY).map(([id, data]) => ({
    id,
    titulo: data.titulo,
    descripcion: data.descripcion,
  }));
}

export function buildCartelQR(cartel, publicUrl) {
  return renderCartel(cartel.id, publicUrl);
}

