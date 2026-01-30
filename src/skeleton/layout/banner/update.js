// src/skeleton/layout/banner/update.js
// Actualiza contenido y estado del banner

export function updateBanner({ message, state = 'trial' }) {
  const root = document.getElementById('banner-root');
  const msg = document.getElementById('banner-message');
  const icon = document.getElementById('banner-icon');

  if (!root || !msg) return;

  msg.innerHTML = message || '';
  root.className = `skeleton-banner ${state}`;

  const icons = {
    trial: 'ℹ️',
    active: '✅',
    warning: '⏳',
    expired: '⚠️'
  };

  if (icon) icon.textContent = icons[state] || 'ℹ️';

  root.classList.remove('hidden');
}

export function hideBanner() {
  const root = document.getElementById('banner-root');
  if (root) root.classList.add('hidden');
}
