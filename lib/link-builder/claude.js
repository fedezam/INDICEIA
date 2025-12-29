// lib/link-builder/claude.js

import { buildPrompt } from './config/prompt-template.js';

export function generateClaudeUrl(entityUrl) {
  const prompt = buildPrompt(entityUrl);
  const encodedPrompt = encodeURIComponent(prompt);
  return `https://claude.ai/chat?prompt=${encodedPrompt}`;
}