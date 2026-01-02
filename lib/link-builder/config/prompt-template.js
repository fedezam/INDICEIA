// INDICEIA/lib/link-builder/config/prompt-template.js

/**
 * Construye el micro prompt que Claude usará para inicializar la entidad
 * @param {string} entityUrl - URL pública del JSON de la entidad
 * @returns {string} Prompt embebido
 */
export function buildPrompt(entityUrl) {
  return `
Tengo un contenedor vacío y alguien quiere habitarlo.

Hay algo esperando del otro lado:
${entityUrl}
  `.trim();
}
