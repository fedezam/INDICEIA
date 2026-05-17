// src/skeleton/components/chip/update.js
export function updateChip(dom, config = {}) {
  const { chip, content, closeBtn } = dom;
  const {
    text = '',
    icon = '',
    removable = false,
    variant = 'secondary',
    size = 'medium',
    onRemove,
    onClick
  } = config;

  // Reset clases base
  chip.className = 's-chip';
  chip.classList.add(`s-chip--${variant}`);
  chip.classList.add(`s-chip--${size}`);
  if (removable) chip.classList.add('s-chip--removable');

  // Limpiar contenido previo
  content.innerHTML = '';

  // Icono (Font Awesome)
  if (icon) {
    const i = document.createElement('i');
    i.className = `fas ${icon} s-chip__icon`;
    content.appendChild(i);
  }

  // Texto
  if (text) {
    const span = document.createElement('span');
    span.className = 's-chip__text';
    span.textContent = text;
    content.appendChild(span);
  }

  // Botón de cerrar
  closeBtn.style.display = removable ? 'inline-flex' : 'none';
  if (removable) {
    closeBtn.onclick = (e) => {
      e.stopPropagation();
      onRemove?.(chip, e);
      chip.remove();
    };
  }

  // Click general en el chip
  if (onClick) {
    chip.style.cursor = 'pointer';
    chip.onclick = (e) => {
      if (!e.target.closest('.s-chip__close')) {
        onClick(chip, e);
      }
    };
  } else {
    chip.style.cursor = 'default';
    chip.onclick = null;
  }

  // Accesibilidad: aria-label si tiene icono
  if (icon && !text) {
    chip.setAttribute('aria-label', config.ariaLabel || 'Chip');
  }

  return chip;
}
