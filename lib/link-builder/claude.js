import { buildPrompt } from './config/prompt-template.js';

/**
 * Genera un link a Claude con prompt embebido (prefill real)
 * usando el endpoint soportado /new?q=
 * @param {string} entityUrl - URL pública del JSON de la entidad
 * @returns {string} Link listo para abrir Claude con prompt cargado
 */
export function generateClaudeUrl(entityUrl) {
  if (!entityUrl) {
    throw new Error('entityUrl es requerido para generar link a Claude');
  }

  const prompt = buildPrompt(entityUrl);
  const encodedPrompt = encodeURIComponent(prompt);

  // ✅ Endpoint correcto (enero 2026)
  const CLAUDE_BASE_URL = 'https://claude.ai/new';

  return `${CLAUDE_BASE_URL}?q=${encodedPrompt}`;
}
