// lib/cartel/cartel.renderer.js

import QRCodeStyling from 'qr-code-styling';
import { CARTEL_CONFIG, CARTEL_COPY } from './cartel.config.js';
import { verticalTemplate } from './cartel.templates.js';

export function renderCartel(cartelId, publicUrl) {
  const format = CARTEL_CONFIG.formatos[cartelId];
  const copy = CARTEL_COPY[cartelId];

  const size = format.size;

  const qr = new QRCodeStyling({
    width: size,
    height: size,
    data: publicUrl,
    margin: 20,
    qrOptions: { errorCorrectionLevel: 'H' },
    dotsOptions: { type: 'rounded', color: '#000' },
    backgroundOptions: { color: '#fff' },
  });

  qr._drawCanvas = async (canvas) => {
    const ctx = canvas.getContext('2d');
    const qrCanvas = document.createElement('canvas');
    await qr._getQRCanvas(qrCanvas);

    verticalTemplate(
      ctx,
      {
        title: copy.titulo,
        subtitle: copy.descripcion,
        qrImage: qrCanvas,
      },
      size
    );
  };

  return qr;
}
