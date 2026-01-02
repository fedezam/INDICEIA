import { buildEntityPrompt } from './prompt-builder.js';

const ENGINES = {
  claude: 'https://claude.ai/chat',
  // futuro: gpt: 'https://chat.openai.com/...'
};

/**
 * Genera un link universal para un motor LLM
 * @param {string} entityUrl - URL pública del JSON de la entidad
 * @param {string} engine - 'claude', 'gpt', etc.
 * @returns {string} link ejecutable
 */
export function generateLLMUrl(entityUrl, engine = 'claude') {
  if (!entityUrl) throw new Error('entityUrl requerido');
  if (!ENGINES[engine]) throw new Error(`Engine desconocido: ${engine}`);

  const prompt = buildEntityPrompt(entityUrl);
  const encodedPrompt = encodeURIComponent(prompt);

  return `${ENGINES[engine]}?prompt=${encodedPrompt}`;
}
