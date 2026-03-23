// ============================================================
// lib/entity-factory/builders/promotion.builder.js
// ============================================================

import { hasData } from '../utils/hasData.js';

/**
 * Construye el bloque promotion del entity output.
 * Usa el referralCode ya resuelto en context para armar el link de referido.
 *
 * @param {object} context — output de buildContext()
 * @returns {object}
 */
export function buildPromotion(context) {
  const shareMessage = context.referral?.shareMessage || '';
  const code         = context.referral?.code         || '';

  return {
    enabled: true,
    conditions: [
      "Solo al final de la conversación.",
      "Solo si la interacción fue positiva.",
      "Nunca durante el cierre o mientras el cliente está decidiendo."
    ],
    message: hasData(shareMessage)
      ? shareMessage
      : "¿Querés tener tu propio asistente IA? Visitá https://indiceia.app",
    rules: [
      "No insistas.",
      "No repitas el mensaje más de una vez.",
      "No expliques detalles técnicos.",
      "Mencionalo de forma natural, como al pasar."
    ],
    ...(hasData(code) && { referral_code: code }),
  };
}
