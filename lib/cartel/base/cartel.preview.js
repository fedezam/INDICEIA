import { CARTEL_PREVIEW_CONFIG } from '../config/formatos.js';
import { CARTEL_COPY } from '../copy/cartel.copy.js';

/**
 * Renderiza el cartel base (preview único)
 * @param {Object} params
 * @param {HTMLCanvasElement} params.qrCanvas - QR ya generado
 * @returns {HTMLCanvasElement}
 */
export function renderCartelPreview({ qrCanvas }) {
  if (!qrCanvas) {
    throw new Error('renderCartelPreview: qrCanvas es requerido');
  }

  const {
    size,
    backgroundColor,
    qrSize,
    padding,
  } = CARTEL_PREVIEW_CONFIG;

  const {
    titulo,
    subtitulo,
    instrucciones,
    footer,
  } = CARTEL_COPY.preview;

  // Canvas final del preview
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;

  const ctx = canvas.getContext('2d');

  // Fondo
  ctx.fillStyle = backgroundColor;
  ctx.fillRect(0, 0, size, size);

  // Layout base
  const centerX = size / 2;
  let cursorY = padding;

  // Título
  ctx.fillStyle = '#000';
  ctx.font = 'bold 42px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText(titulo, centerX, cursorY);

  cursorY += 56;

  // Subtítulo
  ctx.font = '24px system-ui, sans-serif';
  ctx.fillText(subtitulo, centerX, cursorY);

  cursorY += 48;

  // QR
  const qrX = (size - qrSize) / 2;
  ctx.drawImage(qrCanvas, qrX, cursorY, qrSize, qrSize);

  cursorY += qrSize + 32;

  // Instrucciones
  ctx.font = '20px system-ui, sans-serif';
  wrapText(ctx, instrucciones, centerX, cursorY, size - padding * 2, 28);

  // Footer
  ctx.font = '16px system-ui, sans-serif';
  ctx.textBaseline = 'bottom';
  ctx.fillText(footer, centerX, size - padding);

  return canvas;
}

/**
 * Helper para texto multilínea centrado
 */
function wrapText(ctx, text, x, startY, maxWidth, lineHeight) {
  const words = text.split(' ');
  let line = '';
  let y = startY;

  ctx.textAlign = 'center';

  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + ' ';
    const metrics = ctx.measureText(testLine);

    if (metrics.width > maxWidth && n > 0) {
      ctx.fillText(line, x, y);
      line = words[n] + ' ';
      y += lineHeight;
    } else {
      line = testLine;
    }
  }

  ctx.fillText(line, x, y);
}
