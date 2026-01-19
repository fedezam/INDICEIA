// lib/cartel/cartel.templates.js

/**
 * Templates visuales - funciones que dibujan en canvas
 * Reciben contexto 2D y datos, no devuelven nada (dibujan directo)
 */

/**
 * Template vertical estándar
 * @param {CanvasRenderingContext2D} ctx
 * @param {Object} data - { titulo, instrucciones, qrCanvas, size, qrSize, padding }
 */
export function verticalTemplate(ctx, data) {
  const { titulo, instrucciones, qrCanvas, size, qrSize, padding } = data;

  // Fondo blanco
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, size, size);

  // Borde
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 4;
  ctx.strokeRect(20, 20, size - 40, size - 40);

  // Título
  ctx.fillStyle = '#000000';
  ctx.font = `bold ${size * 0.05}px system-ui, -apple-system, sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText(titulo, size / 2, padding);

  // QR centrado
  const qrX = (size - qrSize) / 2;
  const qrY = padding + 60;
  ctx.drawImage(qrCanvas, qrX, qrY, qrSize, qrSize);

  // Instrucciones
  const startY = qrY + qrSize + 80;
  ctx.font = `${size * 0.032}px system-ui, sans-serif`;
  ctx.textAlign = 'left';
  ctx.fillStyle = '#333333';

  instrucciones.forEach((texto, i) => {
    ctx.fillText(texto, padding + 40, startY + i * (size * 0.045));
  });

  // Footer
  ctx.font = `${size * 0.025}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillStyle = '#999999';
  ctx.fillText('Powered by ÍndiceIA', size / 2, size - 40);
}

/**
 * Template compacto (para redes sociales)
 * @param {CanvasRenderingContext2D} ctx
 * @param {Object} data
 */
export function compactTemplate(ctx, data) {
  const { titulo, qrCanvas, size, qrSize, padding } = data;

  // Fondo blanco
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, size, size);

  // Gradiente sutil
  const gradient = ctx.createLinearGradient(0, 0, 0, size);
  gradient.addColorStop(0, '#f8f9fa');
  gradient.addColorStop(1, '#ffffff');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  // QR centrado
  const qrX = (size - qrSize) / 2;
  const qrY = (size - qrSize) / 2;
  ctx.drawImage(qrCanvas, qrX, qrY, qrSize, qrSize);

  // Título arriba
  ctx.fillStyle = '#000000';
  ctx.font = `bold ${size * 0.04}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText(titulo, size / 2, qrY - 40);

  // CTA abajo
  ctx.font = `${size * 0.035}px system-ui, sans-serif`;
  ctx.fillStyle = '#666666';
  ctx.fillText('Escaneá para chatear', size / 2, qrY + qrSize + 60);
}

/**
 * Registro de templates disponibles
 * Mapea ID → función de render
 */
export const TEMPLATES = {
  vertical: verticalTemplate,
  compact: compactTemplate,
};
