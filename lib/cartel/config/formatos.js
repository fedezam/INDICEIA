/**
 * CONFIGURACIÓN CENTRAL DE FORMATOS
 * Solo números y estilos base.
 * Nada de lógica, nada de texto.
 */

// ============================
// PREVIEW (muestra en pantalla)
// ============================
export const CARTEL_PREVIEW_CONFIG = {
  size: 600,                // canvas cuadrado
  backgroundColor: '#ffffff',
  qrSize: 320,
  padding: 40,
};

// ============================
// A4 (imprimible)
// ============================
export const CARTEL_A4_CONFIG = {
  // A4 a 300 DPI → 2480 x 3508
  width: 2480,
  height: 3508,
  backgroundColor: '#ffffff',
  qrSize: 1200,
  padding: 200,
};

// ============================
// REGISTRO DE FORMATOS EXPORTABLES
// (esto alimenta los botones)
// ============================
export const CARTEL_EXPORT_FORMATS = [
  {
    id: 'a4',
    label: 'A4 imprimible',
  },
  // futuro:
  // { id: 'redes', label: 'Redes sociales' },
  // { id: 'vidriera', label: 'Vidriera' },
];
