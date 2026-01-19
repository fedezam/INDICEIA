// lib/cartel/cartel.renderer.js

import QRCodeStyling from 'qr-code-styling';
import { CARTEL_CONFIG, CARTEL_COPY } from './cartel.config.js';
import { verticalTemplate } from './cartel.templates.js';

export function renderCartel(cartelId, publicUrl) {
  const format = CARTEL_CONFIG.formatos[cartelId];
  const copy = CARTEL_COPY[cartelId];

  const size = format.size;

  // Canvas final del cartel
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;

  const ctx = canvas.getContext('2d');

  // QR normal (API pública)
  const qr = new QRCodeStyling({
    width: size * 0.6,
    height: size * 0.6,
    data: publicUrl,
    margin: 0,
    qrOptions: { errorCorrectionLevel: 'H' },
    dotsOptions: { type: 'rounded', color: '#000' },
    backgroundOptions: { color: '#fff' },
  });

  // Contenedor temporal
  const temp = document.createElement('div');
  qr.append(temp);

  // Render final
  setTimeout(() => {
    const qrCanvas = temp.querySelector('canvas');

    verticalTemplate(
      ctx,
      {
        title: copy.titulo,
        subtitle: copy.descripcion,
        qrImage: qrCanvas,
      },
      size
    );
  }, 0);

  // Hookeamos descarga REAL
  qr.download = ({ name, extension }) => {
    const link = document.createElement('a');
    link.href = canvas.toDataURL('image/png');
    link.download = `${name}.${extension}`;
    link.click();
  };

  return qr;
}
