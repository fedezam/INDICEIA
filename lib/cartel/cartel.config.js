// lib/cartel/cartel.config.js

/**
 * Configuración de formatos de cartel
 * Define tamaños y metadata, no diseño
 */
export const CARTEL_CONFIG = {
  formatos: {
    redes: {
      size: 1080,      // 1080x1080 (Instagram)
      qrSize: 600,     // QR ocupa 600px
      padding: 80,
    },
    a4: {
      size: 2480,      // A4 a 300 DPI (210mm)
      qrSize: 1400,
      padding: 200,
    },
    vidriera: {
      size: 3508,      // A3+ a 300 DPI
      qrSize: 2000,
      padding: 300,
    },
  },
};

/**
 * Copy de cada formato
 * Solo texto, sin lógica
 */
export const CARTEL_COPY = {
  redes: {
    titulo: 'Compartir en redes',
    descripcion: 'Usá este link o QR en perfiles de Instagram, Facebook, WhatsApp o respuestas automáticas para que la IA atienda consultas de clientes.',
    instrucciones: [
      '📱 Escaneá el código QR',
      '💬 Chateá con nuestra IA',
      '⚡ Respuestas al instante',
    ],
  },
  a4: {
    titulo: 'Cartel A4',
    descripcion: 'Ideal para imprimir y colocar dentro del local, mostrador o sala de espera.',
    instrucciones: [
      '📱 Escaneá el código QR',
      '💬 Consultá lo que necesites',
      '🤖 Atención 24/7',
    ],
  },
  vidriera: {
    titulo: 'Cartel para vidriera',
    descripcion: 'Pensado para ser escaneado desde la calle. Usalo en vidrieras o accesos al comercio.',
    instrucciones: [
      '📱 Escaneá desde la calle',
      '💬 Hacé tu consulta',
      '⚡ IA disponible siempre',
    ],
  },
};
