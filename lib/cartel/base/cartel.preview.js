// lib/cartel/base/cartel.preview.js

import { CARTEL_PREVIEW_CONFIG } from '../config/formatos.js';
import { CARTEL_COPY } from '../copy/cartel.copy.js';
import {
  COLOR,
  FONT,
  ensureBrandFonts,
  drawVignette,
  drawSignatureRing,
} from '../config/tokens.js';

/**
 * Dibuja texto multilínea respetando saltos manuales (\n) y haciendo
 * wrap automático solo si una línea individual excede maxWidth.
 * Devuelve la posición Y final (última línea dibujada).
 */
function drawMultiline(ctx, text, x, startY, maxWidth, lineHeight) {
  const manualLines = text.split('\n');
  let y = startY;
  ctx.textAlign = 'center';

  for (const rawLine of manualLines) {
    const words = rawLine.split(' ');
    let line = '';

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
    y += lineHeight;
  }

  return y - lineHeight; // Y de la última línea realmente dibujada
}

/**
 * Renderiza el preview gráfico sobre canvas.
 * @param {Object} params
 * @param {HTMLCanvasElement} params.qrCanvas
 * @returns {Promise<HTMLCanvasElement>}
 */
export async function renderCartelPreview({ qrCanvas }) {
  if (!qrCanvas) {
    throw new Error('renderCartelPreview: qrCanvas es requerido');
  }

  await ensureBrandFonts();

  const {
    width,
    height,
    qrSize,
    padding,
    titleBlockGap,
    preQrGap,
    ringGap,
    postQrGap,
  } = CARTEL_PREVIEW_CONFIG;

  // 🔍 DEBUG TEMPORAL — borrar una vez confirmado el bug
  console.log('[cartel.preview] CONFIG recibido:', {
    width, height, qrSize, padding, titleBlockGap, preQrGap, ringGap, postQrGap,
  });
  console.log('[cartel.preview] qrCanvas recibido:', qrCanvas, qrCanvas?.width, qrCanvas?.height);

  const { titulo, subtitulo, instrucciones, footer } = CARTEL_COPY.preview;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  // 🔍 DEBUG TEMPORAL — borrar una vez confirmado el bug
  console.log('[cartel.preview] canvas creado:', canvas.width, canvas.height);

  // Fondo con viñeta sutil hacia los bordes
  drawVignette(ctx, width, height, COLOR.linen, COLOR.linenShadow);

  const centerX = width / 2;
  let cursorY = padding;

  // Bloque título — Space Grotesk, primero en jerarquía
  ctx.fillStyle = COLOR.obsidian;
  ctx.font = `700 32px "${FONT.display}", sans-serif`;
  ctx.textBaseline = 'top';
  cursorY = drawMultiline(ctx, titulo, centerX, cursorY, width - padding * 2, 40) + 40;

  cursorY += titleBlockGap;

  // Subtítulo — agrupado cerca del título (menos aire que hacia el QR)
  ctx.fillStyle = COLOR.moss;
  ctx.font = `500 16px "${FONT.body}", sans-serif`;
  cursorY = drawMultiline(ctx, subtitulo, centerX, cursorY, width - padding * 2, 23) + 23;

  cursorY += preQrGap;

  // Anillo + QR — centro de gravedad de la pieza
  const ringRadius = qrSize / 2 + ringGap;
  const qrCenterY = cursorY + qrSize / 2;
  drawSignatureRing(ctx, centerX, qrCenterY, ringRadius, 3, COLOR.sapphire);

  const qrX = centerX - qrSize / 2;
  ctx.drawImage(qrCanvas, qrX, cursorY, qrSize, qrSize);
  cursorY += qrSize + ringGap + postQrGap;

  // Instrucción — caption chica, pegada al QR funcionalmente
  ctx.fillStyle = COLOR.obsidian;
  ctx.font = `400 14px "${FONT.body}", sans-serif`;
  cursorY = drawMultiline(ctx, instrucciones, centerX, cursorY, width - padding * 2, 20) + 20;

  // Footer — casi invisible, solo firma
  ctx.fillStyle = COLOR.moss;
  ctx.font = `600 12px "${FONT.body}", sans-serif`;
  ctx.textBaseline = 'bottom';
  ctx.fillText(footer, centerX, height - padding / 2);

  return canvas;
}
