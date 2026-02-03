// src/skeleton/components/ai-helper-card/render.js

export function renderAIHelperCard() {
  const card = document.createElement('div');
  card.className = 'ai-helper-card';

  card.innerHTML = `
    <div class="ai-helper-icon">AI</div>
    <div class="ai-helper-content">
      <h4></h4>
      <p></p>
      <small></small>
    </div>
  `;

  return card;
}
