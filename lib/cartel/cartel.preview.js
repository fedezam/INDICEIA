// lib/cartel/cartel.preview.js

import { renderCartelBase } from './qr.factory.js';

/**
 * Renderiza el preview único del cartel QR en pantalla
 * @param {HTMLElement} container - Nodo donde se inserta el cartel
 * @param {string} publicUrl - URL pública que va en el QR
 */
export async function renderCartelPreview(container, publicUrl) {
  if (!container) {
    throw new Error('Container inválido para preview de cartel');
  }

  // Limpiamos por las dudas
  container.innerHTML = '';

  // Generamos el cartel base (tamaño preview)
  const { canvas } = await renderCartelBase({
    publicUrl,
    size: 320, // tamaño cómodo para pantalla
  });

  canvas.classList.add('cartel-preview-canvas');

  container.appendChild(canvas);
}
