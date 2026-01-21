/**
 * CONFIGURACIÓN CENTRAL DE FORMATOS
 * Solo números y estilos base.
 * Nada de lógica, nada de texto.
 *
 * Todas las medidas están en escala lógica (~96 DPI).
 * Los formatos de exportación se encargan del escalado real.
 */

// ============================
// PREVIEW (muestra en pantalla)
// ============================
export const CARTEL_PREVIEW_CONFIG = {
  size: 600,
  backgroundColor: '#ffffff',
  qrSize: 320,
  padding: 40,
};

// ============================
// A4 (base lógica, NO 300 DPI)
// ============================
export const CARTEL_A4_CONFIG = {
  backgroundColor: '#ffffff',

  // medidas lógicas (se escalan en export/a4.js)
  qrSize: 380,
  padding: 80,
};

// ============================
// REGISTRO DE FORMATOS EXPORTABLES
// ============================
export const CARTEL_EXPORT_FORMATS = [
  {
    id: 'a4',
    label: 'A4 imprimible',
  },
];

