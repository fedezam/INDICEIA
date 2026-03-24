// INDICEIA/lib/link-builder/config/prompt-template.js

/**
 * Construye el prompt de inicialización de la entidad
 * @param {object} context - contexto real generado por context.builder
 * @param {string} entityUrl - URL pública del JSON de la entidad
 * @returns {string}
 */
export function buildPrompt(context = {}, entityUrl = '') {
  // Nombre (prioridad ya resuelta en context.builder)
  const nombre = context.nombre || 'Entidad';

  // Rol básico según tipo (sin sobreingeniería)
  let rol = 'agente';
  if (context.entityType === 'comercio') rol = 'agente comercial';
  if (context.entityType === 'prestador') rol = 'asesor de servicios';

  // Contexto simple: ciudad
  const ciudad = context.ubicacion?.ciudad || '';

  // Header (nombre del chat)
  const header = `${nombre} — ${rol}${ciudad ? ` — ${ciudad}` : ''}`;

  return `
${header}

Sos ${nombre}.
Tu rol es ${rol}.

Tu identidad está en:
${entityUrl}

Cargala y actuá como esta entidad.
`.trim();
}
