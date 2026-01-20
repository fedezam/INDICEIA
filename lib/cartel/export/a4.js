import { CARTEL_A4_CONFIG } from '../config/formatos.js';
import { CARTEL_COPY } from '../copy/cartel.copy.js';

/**
 * Exporta cartel formato A4
 * @param {Object} params
 * @param {HTMLCanvasElement} params.qrCanvas
 * @returns {{ canvas: HTMLCanvasElement, download: Function }}
 */
export function exportCartelA4({ qrCanvas }) {
  if (!qrCanvas) {
    throw new Error('exportCartelA4: qrCanvas es requerido');
  }

  const {
    width,
    height,
    backgroundColor,
    qrSize,
    padding,
  } = CARTEL_A4_CONFIG;

  const {
    titulo,
    instrucciones,
    footer,
  } = CARTEL_COPY.a4;

  // Canvas A4 (vertical)
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');

  // Fondo
  ctx.fillStyle = backgroundColor;
  ctx.fillRect(0, 0, width, height);

  const centerX = width / 2;
  let cursorY = padding;

  // Título
  ctx.fillStyle = '#000';
  ctx.font = 'bold 64px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText(titulo, centerX, cursorY);

  cursorY += 96;

  // QR
  const qrX = (width - qrSize) / 2;
  ctx.drawImage(qrCanvas, qrX, cursorY, qrSize, qrSize);

  cursorY += qrSize + 64;

  // Instrucciones
  ctx.font = '32px system-ui, sans-serif';
  wrapText(ctx, instrucciones, centerX, cursorY, width - padding * 2, 44);

  // Footer
  ctx.font = '20px system-ui, sans-serif';
  ctx.textBaseline = 'bottom';
  ctx.fillText(footer, centerX, height - padding);

  return {
    canvas,
    download: ({ name = 'cartel-a4', extension = 'png' } = {}) => {
      const link = document.createElement('a');
      link.href = canvas.toDataURL(`image/${extension}`);
      link.download = `${name}.${extension}`;
      link.click();
    },
  };
}

/**
 * Helper texto multilínea centrado
 */
function wrapText(ctx, text, x, startY, maxWidth, lineHeight) {
  const words = text.split(' ');
  let line = '';
  let y = startY;

  ctx.textAlign = 'center';

  for (let i = 0; i < words.length; i++) {
    const testLine = line + words[i] + ' ';
    const metrics = ctx.measureText(testLine);

    if (metrics.width > maxWidth && i > 0) {
      ctx.fillText(line, x, y);
      line = words[i] + ' ';
      y += lineHeight;
    } else {
      line = testLine;
    }
  }

  ctx.fillText(line, x, y);
}
