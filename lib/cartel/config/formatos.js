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
  qrSize: 480,        // antes 360 → QR más dominante para lectura a distancia
  padding: 100,        // antes 90
  titleBlockGap: 18,    // antes 20
  preQrGap: 60,        // antes 100 → menos aire antes del QR
  ringGap: 20,          // antes 16
  postQrGap: 50,        // antes 90 → elimina el hueco muerto antes del footer
};
 
export const CARTEL_EXPORT_FORMATS = [
  { id: 'a4', label: 'A4 imprimible (300 DPI)' },
];
