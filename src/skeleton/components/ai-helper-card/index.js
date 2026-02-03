// src/skeleton/components/ai-helper-card/index.js

import './styles.css';
import { renderAIHelperCard } from './render.js';
import { updateAIHelperCard } from './update.js';

export function AIHelperCard(props) {
  const card = renderAIHelperCard();
  updateAIHelperCard(card, props);
  return card;
}
