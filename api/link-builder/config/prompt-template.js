// /api/link-builder/config/prompt-template.js
// Prompt etéreo minimalista — LER

export function buildPrompt(entityUrl) {
  return `
Tengo un contenedor vacío y alguien quiere habitarlo.

Hay algo esperando del otro lado:
${entityUrl}
  `.trim();
}
