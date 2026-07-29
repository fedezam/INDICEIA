/**
 * COPY HUMANO DEL CARTEL
 * Fuente única de verdad para los textos visibles.
 */

const BASE_COPY = {
  titulo: 'Respuestas al instante,\na cualquier hora',
  subtitulo: 'La IA de este lugar conoce\ntodo lo que necesitás saber.',
  instrucciones: 'Apuntá la cámara al código\ny empezá a escribir.',
};

export const CARTEL_COPY = {
  preview: {
    ...BASE_COPY,
    footer: 'ÍndiceIA · Canal oficial',
  },
  a4: {
    ...BASE_COPY,
    footer: 'ÍndiceIA · Canal oficial',
  },
};
