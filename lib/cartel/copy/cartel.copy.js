/**
 * COPY HUMANO DEL CARTEL
 * Textos visibles para personas.
 * Fuente única de verdad.
 */

const BASE_COPY = {
  titulo: 'Escaneá y hablá con nosotros',
  instrucciones:
    'Apuntá la cámara de tu celular al código QR y accedé al canal oficial del comercio.',
};

export const CARTEL_COPY = {
  // ============================
  // PREVIEW (pantalla)
  // ============================
  preview: {
    ...BASE_COPY,
    subtitulo: 'Atención directa desde tu celular',
    footer: 'ÍndiceIA · Canal oficial',
  },

  // ============================
  // A4 (imprimible)
  // ============================
  a4: {
    ...BASE_COPY,
    footer: 'ÍndiceIA · Atención directa',
  },
};
