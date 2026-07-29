import { CARTEL_A4_CONFIG } from '../config/formatos.js';
import { CARTEL_COPY } from '../copy/cartel.copy.js';
import {
  COLOR,
  FONT,
  ensureBrandFonts,
  drawVignette,
  drawSignatureRing,
} from '../config/tokens.js';

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

  return y - lineHeight;
}

/**
 * Exporta el cartel en formato A4 listo para impresión (300 DPI).
 * @param {Object} params
 * @param {HTMLCanvasElement} params.qrCanvas
 * @returns {Promise<{ canvas: HTMLCanvasElement, download: Function }>}
 */
export async function exportCartelA4({ qrCanvas }) {
  if (!qrCanvas) {
    throw new Error('exportCartelA4: qrCanvas es requerido');
  }

  await ensureBrandFonts();

  const DPI = 300;
  const MM_TO_INCH = 1 / 25.4;
  const width = Math.round(210 * MM_TO_INCH * DPI);   // 2480px
  const height = Math.round(297 * MM_TO_INCH * DPI);  // 3508px
  const SCALE = DPI / 96;

  const {
    qrSize,
    padding,
    titleBlockGap,
    preQrGap,
    ringGap,
    postQrGap,
  } = CARTEL_A4_CONFIG;

  const QR_SIZE = Math.round(qrSize * SCALE);
  const PADDING = Math.round(padding * SCALE);
  const TITLE_GAP = Math.round(titleBlockGap * SCALE);
  const PRE_QR_GAP = Math.round(preQrGap * SCALE);
  const RING_GAP = Math.round(ringGap * SCALE);
  const POST_QR_GAP = Math.round(postQrGap * SCALE);

  const { titulo, subtitulo, instrucciones, footer } = CARTEL_COPY.a4;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  drawVignette(ctx, width, height, COLOR.linen, COLOR.linenShadow);

  const centerX = width / 2;
  let cursorY = PADDING;

  ctx.fillStyle = COLOR.obsidian;
  ctx.font = `700 100px "${FONT.display}", sans-serif`;
  ctx.textBaseline = 'top';
  cursorY = drawMultiline(ctx, titulo, centerX, cursorY, width - PADDING * 2, 124) + 124;

  cursorY += TITLE_GAP;

  ctx.fillStyle = COLOR.moss;
  ctx.font = `500 44px "${FONT.body}", sans-serif`;
  cursorY = drawMultiline(ctx, subtitulo, centerX, cursorY, width - PADDING * 2, 62) + 62;

  cursorY += PRE_QR_GAP;

  const ringRadius = QR_SIZE / 2 + RING_GAP;
  const qrCenterY = cursorY + QR_SIZE / 2;
  drawSignatureRing(ctx, centerX, qrCenterY, ringRadius, Math.round(3 * SCALE), COLOR.sapphire);

  const qrX = centerX - QR_SIZE / 2;
  ctx.drawImage(qrCanvas, qrX, cursorY, QR_SIZE, QR_SIZE);
  cursorY += QR_SIZE + RING_GAP + POST_QR_GAP;

  ctx.fillStyle = COLOR.obsidian;
  ctx.font = `400 38px "${FONT.body}", sans-serif`;
  cursorY = drawMultiline(ctx, instrucciones, centerX, cursorY, width - PADDING * 2, 54) + 54;

  ctx.fillStyle = COLOR.moss;
  ctx.font = `600 32px "${FONT.body}", sans-serif`;
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
