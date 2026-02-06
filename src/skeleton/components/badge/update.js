export function updateBadge(badge, config = {}) {
  const { content = {}, flags = {} } = config;

  badge.className = 's-badge';

  if (flags.variant) {
    badge.classList.add(`s-badge-${flags.variant}`);
  }

  badge.textContent = '';

  if (content.emoji) {
    badge.textContent += content.emoji + ' ';
  }

  if (content.text) {
    badge.textContent += content.text;
  }

  return badge;
}
