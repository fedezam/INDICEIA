import { CARTEL_A4_CONFIG } from '../config/formatos.js';
import { CARTEL_COPY } from '../copy/cartel.copy.js';

/**
 * Exporta cartel formato A4 listo para impresión (300 DPI)
 */
export function exportCartelA4({ qrCanvas }) {
  if (!qrCanvas) {
    throw new Error('exportCartelA4: qrCanvas es requerido');
  }

  // ================================
  // A4 real a 300 DPI
  // ================================
  const DPI = 300;
  const MM_TO_INCH = 1 / 25.4;

  const width = Math.round(210 * MM_TO_INCH * DPI);   // 2480
  const height = Math.round(297 * MM_TO_INCH * DPI);  // 3508

  // ================================
  // Config + escalado
  // ================================
  const SCALE = DPI / 96; // base lógica ~96dpi

  const {
    backgroundColor,
    qrSize,
    padding,
  } = CARTEL_A4_CONFIG;

  const QR_SIZE = Math.round(qrSize * SCALE);
  const PADDING = Math.round(padding * SCALE);

  const {
    titulo,
    instrucciones,
    footer,
  } = CARTEL_COPY.a4;

  // ================================
  // Canvas
  // ================================
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');

  // Fondo
  ctx.fillStyle = backgroundColor;
  ctx.fillRect(0, 0, width, height);

  const centerX = width / 2;
  let cursorY = PADDING;

  // ================================
  // Título
  // ================================
  ctx.fillStyle = '#000';
  ctx.font = 'bold 96px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText(titulo, centerX, cursorY);

  cursorY += 140;

  // ================================
  // QR
  // ================================
  const qrX = (width - QR_SIZE) / 2;
  ctx.drawImage(qrCanvas, qrX, cursorY, QR_SIZE, QR_SIZE);

  cursorY += QR_SIZE + 100;

  // ================================
  // Instrucciones
  // ================================
  ctx.font = '42px system-ui, -apple-system, sans-serif';
  wrapText(
    ctx,
    instrucciones,
    centerX,
    cursorY,
    width - PADDING * 2,
    60
  );

  // ================================
  // Footer
  // ================================
  ctx.font = '28px system-ui, -apple-system, sans-serif';
  ctx.textBaseline = 'bottom';
  ctx.fillText(footer, centerX, height - PADDING);

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
