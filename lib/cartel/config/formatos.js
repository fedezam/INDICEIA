export const CARTEL_PREVIEW_CONFIG = {
  width: 600,
  height: 800,
  qrSize: 300,
  padding: 48,
  titleBlockGap: 14,   // espacio título → subtítulo (bloque agrupado)
  preQrGap: 46,          // aire entre bloque textual y el QR
  ringGap: 14,            // espacio entre QR y el anillo que lo enmarca
  postQrGap: 40,
};
 
export const CARTEL_A4_CONFIG = {
  qrSize: 360,
  padding: 90,
  titleBlockGap: 20,
  preQrGap: 100,
  ringGap: 16,
  postQrGap: 90,
};
 
export const CARTEL_EXPORT_FORMATS = [
  { id: 'a4', label: 'A4 imprimible (300 DPI)' },
];
