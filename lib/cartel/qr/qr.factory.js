import qrcodegen from 'qrcode-generator';

/**
 * Genera un QR como canvas con el símbolo ÍndiceIA (arco+núcleo)
 * emergiendo del patrón de datos.
 *
 * Contrato: misma firma que el factory anterior.
 * @param {string} publicUrl
 * @returns {Promise<HTMLCanvasElement>}
 */
export async function createQR(publicUrl) {
  if (!publicUrl) {
    throw new Error('createQR: publicUrl es requerido');
  }

  // ── 1. Generar matriz QR ──────────────────────────────────
  // typeNumber 0 = auto, errorCorrectionLevel H
  const qr = qrcodegen(0, 'H');
  qr.addData(publicUrl);
  qr.make();

  const N      = qr.getModuleCount();
  const center = N / 2;

  // Copia mutable de la matriz
  const modules = Array.from({ length: N }, (_, r) =>
    Array.from({ length: N }, (_, c) => qr.isDark(r, c))
  );

  // ── 2. Parámetros del símbolo (en módulos) ───────────────
  const arcRadius = 9;      // igual que en el Python
  const strokeW   = 1.3;
  const innerR    = arcRadius - strokeW;
  const outerR    = arcRadius + strokeW;
  const coreR     = 1.5;

  // Gap: 60° centrado en 45° desde las 12 (sentido horario)
  // En atan2 (y hacia abajo): gap de −75° a −15°
  const GAP_START = -75;
  const GAP_END   = -15;

  function angleInGap(rad) {
    const deg = ((rad * 180) / Math.PI + 360) % 360;
    const gs  = ((GAP_START + 360) % 360); // 285
    const ge  = ((GAP_END   + 360) % 360); // 345
    return deg >= gs && deg <= ge;
  }

  // ── 3. Forzar símbolo sobre la matriz ───────────────────
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      const dx = c - center + 0.5;
      const dy = r - center + 0.5;
      const dc = Math.sqrt(dx * dx + dy * dy);
      const ac = Math.atan2(dy, dx);

      if (dc <= coreR) {
        modules[r][c] = true;   // núcleo sólido
        continue;
      }
      if (dc >= innerR && dc <= outerR) {
        modules[r][c] = !angleInGap(ac); // arco con gap
      }
    }
  }

  // ── 4. Renderizar a canvas ───────────────────────────────
  const S      = 10;   // px por módulo
  const border = 4;    // módulos de margen blanco (spec QR)
  const total  = (N + 2 * border) * S;

  const canvas = document.createElement('canvas');
  canvas.width  = total;
  canvas.height = total;

  const ctx    = canvas.getContext('2d');
  const offset = border * S;

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, total, total);

  ctx.fillStyle = '#000000';
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      if (modules[r][c]) {
        ctx.fillRect(offset + c * S, offset + r * S, S, S);
      }
    }
  }

  return canvas;
}