// ================================
// API PÚBLICA DEL MÓDULO CARTEL
// ================================

import { createQR } from './qr/qr.factory.js';
import { renderCartelPreview } from './base/cartel.preview.js';
import { exportCartelA4 } from './export/a4.js';
import { CARTEL_EXPORT_FORMATS } from './config/formatos.js';

/**
 * Genera el QR único del comercio
 * @param {string} publicUrl
 * @returns {Promise<HTMLCanvasElement>}
 */
export async function generateQR(publicUrl) {
  return await createQR(publicUrl);
}

/**
 * Renderiza el cartel base (preview único)
 * @param {Object} params
 * @param {HTMLCanvasElement} params.qrCanvas
 * @returns {HTMLCanvasElement}
 */
export function renderPreview({ qrCanvas }) {
  return renderCartelPreview({ qrCanvas });
}

/**
 * Devuelve los formatos disponibles para exportar
 * (para renderizar botones)
 */
export function getExportFormats() {
  return CARTEL_EXPORT_FORMATS;
}

/**
 * Exporta el cartel en un formato específico
 * @param {Object} params
 * @param {string} params.formatId
 * @param {HTMLCanvasElement} params.qrCanvas
 * @returns {{ canvas: HTMLCanvasElement, download: Function }}
 */
export function exportCartel({ formatId, qrCanvas }) {
  switch (formatId) {
    case 'a4':
      return exportCartelA4({ qrCanvas });

    default:
      throw new Error(`Formato de exportación no soportado: ${formatId}`);
  }
}
