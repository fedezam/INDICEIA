// INDICEIA/lib/link-builder/claude.js

import { buildPrompt } from './config/prompt-template.js';

/**
 * Genera un link a Claude con micro prompt embebido a partir de la URL pública del JSON de la entidad
 * @param {string} entityUrl - URL pública del JSON de la entidad
 * @returns {string} Link listo para abrir Claude
 */
export function generateClaudeUrl(entityUrl) {
  if (!entityUrl) {
    throw new Error('entityUrl es requerido para generar link a Claude');
  }

  const prompt = buildPrompt(entityUrl);
  const encodedPrompt = encodeURIComponent(prompt);

  // Base URL de Claude
  const CLAUDE_BASE_URL = 'https://claude.ai/chat';

  return `${CLAUDE_BASE_URL}?prompt=${encodedPrompt}`;
}
