// src/skeleton/components/ai-helper-card/update.js

export function updateAIHelperCard(card, { title, content, note }) {
  const titleEl = card.querySelector('h4');
  const contentEl = card.querySelector('p');
  const noteEl = card.querySelector('small');

  if (title) titleEl.textContent = title;
  if (content) contentEl.textContent = content;

  if (note) {
    noteEl.textContent = note;
    noteEl.style.display = 'block';
  } else {
    noteEl.style.display = 'none';
  }
}
