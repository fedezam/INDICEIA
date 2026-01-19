// lib/cartel/cartel.renderer.js

import QRCodeStyling from 'qr-code-styling';
import { CARTEL_CONFIG, CARTEL_COPY } from './cartel.config.js';
import { TEMPLATES } from './cartel.templates.js';

/**
 * Renderiza un cartel completo en canvas
 * @param {string} cartelId - ID del formato (redes|a4|vidriera)
 * @param {string} publicUrl - URL que va en el QR
 * @returns {Object} - Objeto con método download()
 */
export function renderCartel(cartelId, publicUrl) {
  const format = CARTEL_CONFIG.formatos[cartelId];
  const copy = CARTEL_COPY[cartelId];

  if (!format || !copy) {
    throw new Error(`Formato de cartel no válido: ${cartelId}`);
  }

  const { size, qrSize, padding } = format;

  // 1. Canvas final del cartel
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  // 2. Generar QR con qr-code-styling
  const qr = new QRCodeStyling({
    width: qrSize,
    height: qrSize,
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

  // 3. Contenedor temporal para extraer canvas del QR
  const tempContainer = document.createElement('div');
  tempContainer.style.position = 'absolute';
  tempContainer.style.left = '-9999px';
  document.body.appendChild(tempContainer);
  
  qr.append(tempContainer);

  // 4. Esperar a que el QR se renderice
  return new Promise((resolve) => {
    setTimeout(() => {
      const qrCanvas = tempContainer.querySelector('canvas');
      
      if (!qrCanvas) {
        document.body.removeChild(tempContainer);
        throw new Error('No se pudo generar el QR');
      }

      // 5. Elegir template (por ahora siempre vertical)
      const templateFn = TEMPLATES.vertical;

      // 6. Dibujar el cartel completo
      templateFn(ctx, {
        titulo: copy.titulo,
        instrucciones: copy.instrucciones,
        qrCanvas,
        size,
        qrSize,
        padding,
      });

      // 7. Limpiar temporal
      document.body.removeChild(tempContainer);

      // 8. Retornar objeto con método download
      resolve({
        canvas,
        download: ({ name, extension = 'png' }) => {
          const link = document.createElement('a');
          link.href = canvas.toDataURL(`image/${extension}`);
          link.download = `${name}.${extension}`;
          link.click();
        },
      });
    }, 100); // Timeout para asegurar render del QR
  });
}
