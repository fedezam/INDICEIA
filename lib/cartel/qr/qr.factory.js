import QRCodeStyling from 'qr-code-styling';

/**
 * Genera un QR como canvas estable y reutilizable
 * @param {string} publicUrl
 * @returns {Promise<HTMLCanvasElement>}
 */
export async function createQR(publicUrl) {
  if (!publicUrl) {
    throw new Error('createQR: publicUrl es requerido');
  }

  const qr = new QRCodeStyling({
    width: 512,
    height: 512,
    data: publicUrl,
    margin: 0,
    qrOptions: {
      errorCorrectionLevel: 'H',
      mode: 'Byte',
    },
    dotsOptions: {
      type: 'rounded',
      color: '#000000',
    },
    backgroundOptions: {
      color: '#ffffff',
    },
    cornersSquareOptions: {
      type: 'extra-rounded',
      color: '#000000',
    },
    cornersDotOptions: {
      type: 'dot',
      color: '#000000',
    },
  });

  // Contenedor invisible
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-99999px';
  container.style.top = '-99999px';
  document.body.appendChild(container);

  await qr.append(container);

  const sourceCanvas = container.querySelector('canvas');
  if (!sourceCanvas) {
    document.body.removeChild(container);
    throw new Error('createQR: no se pudo generar el canvas del QR');
  }

  // ⬇️ CLONADO REAL (ESTO ES LA CLAVE)
  const canvas = document.createElement('canvas');
  canvas.width = sourceCanvas.width;
  canvas.height = sourceCanvas.height;

  const ctx = canvas.getContext('2d');
  ctx.drawImage(sourceCanvas, 0, 0);

  document.body.removeChild(container);

  return canvas;
}


