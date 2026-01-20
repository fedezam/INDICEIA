// lib/cartel/renderCartelBase.js

import { createQR } from './qr.factory.js';

/**
 * Renderiza el cartel base con QR
 * @param {Object} params
 * @param {string} params.publicUrl - URL a codificar en el QR
 * @param {number} params.size - Tamaño total del cartel (px)
 * @returns {Promise<{ canvas: HTMLCanvasElement }>}
 */
export async function renderCartelBase({ publicUrl, size = 400 }) {
  if (!publicUrl) {
    throw new Error('renderCartelBase: publicUrl requerido');
  }

  // 1. Crear canvas del cartel
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;

  const ctx = canvas.getContext('2d');

  // 2. Fondo blanco
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, size, size);

  // 3. Padding y tamaños
  const padding = Math.floor(size * 0.08); // 8% de margen
  const qrSize = size - padding * 2;

  // 4. Generar QR (canvas)
  const qrCanvas = await createQR(publicUrl);

  // 5. Dibujar QR escalado dentro del cartel
  ctx.drawImage(
    qrCanvas,
    padding,
    padding,
    qrSize,
    qrSize
  );

  // 6. (Opcional por ahora) Borde sutil para preview
  ctx.strokeStyle = '#e5e7eb';
  ctx.lineWidth = 2;
  ctx.strokeRect(0, 0, size, size);

  return { canvas };
}
