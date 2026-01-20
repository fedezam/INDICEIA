import QRCodeStyling from 'qr-code-styling';

/**
 * Genera un QR como canvas reutilizable
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

  // Contenedor aislado y efímero (no visual)
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-99999px';
  container.style.top = '-99999px';
  document.body.appendChild(container);

  await qr.append(container);

  const canvas = container.querySelector('canvas');

  document.body.removeChild(container);

  if (!canvas) {
    throw new Error('createQR: no se pudo generar el canvas del QR');
  }

  return canvas;
}
