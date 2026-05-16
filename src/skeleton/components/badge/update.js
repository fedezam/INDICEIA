export function updateBadge(badge, config = {}) {
  const { content = {}, flags = {}, actions = {}, customClass = '' } = config;
  const { text = '', emoji = '', icon = '' } = content;
  const { variant = 'secondary', size, interactive = false, outline = false, pulse = false, dismissible = false } = flags;

  // Reset base
  badge.className = 's-badge';
  badge.classList.add(`s-badge-${variant}`);
  
  if (size) badge.classList.add(`s-badge--${size}`);
  if (interactive) badge.classList.add('s-badge--interactive');
  if (outline) badge.classList.add('s-badge--outline');
  if (pulse) badge.classList.add('s-badge--pulse');
  if (customClass) badge.classList.add(customClass);

  // Build content safely (sin innerHTML para evitar XSS)
  badge.innerHTML = '';
  
  if (emoji) {
    const span = document.createElement('span');
    span.className = 's-badge__emoji';
    span.textContent = emoji;
    badge.appendChild(span);
  }
  
  if (icon) {
    const i = document.createElement('i');
    i.className = `fas ${icon} s-badge__icon`;
    badge.appendChild(i);
  }
  
  if (text) {
    const span = document.createElement('span');
    span.className = 's-badge__text';
    span.textContent = text;
    badge.appendChild(span);
  }

  // Dismissible button
  if (dismissible) {
    const closeBtn = document.createElement('button');
    closeBtn.className = 's-badge__close';
    closeBtn.innerHTML = '&times;';
    closeBtn.setAttribute('aria-label', 'Cerrar badge');
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      actions.onClose?.(badge, e);
      badge.remove();
    });
    badge.appendChild(closeBtn);
  }

  // Click handler
  if (actions.onClick) {
    badge.addEventListener('click', (e) => {
      if (!e.target.closest('.s-badge__close')) {
        actions.onClick(badge, e);
      }
    });
  }

  return badge;
}
