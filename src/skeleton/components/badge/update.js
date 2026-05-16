// src/skeleton/components/badge/update.js
export function updateBadge(badge, config = {}) {
  // Soporta API plana (legacy) y estructurada (recomendada)
  const content = config.content || { text: config.text || '', emoji: config.emoji || '', icon: config.icon || '' };
  const flags = config.flags || {};
  
  const { text = '', emoji = '', icon = '' } = content;
  const variant = config.variant || flags.variant || 'secondary';
  const size = config.size || flags.size || undefined;
  const interactive = config.interactive ?? flags.interactive ?? false;
  const outline = config.outline ?? flags.outline ?? false;
  const pulse = config.pulse ?? flags.pulse ?? false;
  const dismissible = config.dismissible ?? flags.dismissible ?? false;
  const actions = config.actions || {};
  const customClass = config.customClass || flags.customClass || '';

  // Reset clases base
  badge.className = 's-badge';
  badge.classList.add(`s-badge-${variant}`);
  if (size) badge.classList.add(`s-badge--${size}`);
  if (interactive) badge.classList.add('s-badge--interactive');
  if (outline) badge.classList.add('s-badge--outline');
  if (pulse) badge.classList.add('s-badge--pulse');
  if (customClass) badge.classList.add(customClass);

  // Limpiar contenido previo
  badge.innerHTML = '';

  // Construir contenido de forma segura (sin innerHTML para evitar XSS)
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

  // Botón de cierre (dismissible)
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

  // Evento click general
  if (actions.onClick) {
    badge.addEventListener('click', (e) => {
      if (!e.target.closest('.s-badge__close')) {
        actions.onClick(badge, e);
      }
    });
  }

  return badge;
}
