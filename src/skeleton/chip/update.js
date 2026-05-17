export function updateChip(dom, config = {}) {
  const { wrapper, content, closeBtn } = dom;
  const {
    text = '',
    icon = '',
    variant = 'secondary',
    size = 'medium',
    removable = false,
    onClick,
    onRemove
  } = config;

  // 1. Resetear clases base
  wrapper.className = 's-chip';
  wrapper.classList.add(`s-chip--${variant}`);
  wrapper.classList.add(`s-chip--${size}`);
  if (removable) wrapper.classList.add('s-chip--removable');

  // 2. Limpiar y reconstruir contenido
  content.innerHTML = '';

  if (icon) {
    const i = document.createElement('i');
    i.className = `fas ${icon} s-chip__icon`;
    content.appendChild(i);
  }

  if (text) {
    const span = document.createElement('span');
    span.className = 's-chip__text';
    span.textContent = text;
    content.appendChild(span);
  }

  // 3. Configurar botón de cerrar
  if (removable) {
    closeBtn.style.display = 'inline-flex';
    closeBtn.onclick = (e) => {
      e.stopPropagation(); // Evita que se dispare el onClick del chip
      onRemove && onRemove(wrapper, e);
      // Por defecto elimina el elemento del DOM, salvo que se prevenga
      if (!e.defaultPrevented) wrapper.remove();
    };
  } else {
    closeBtn.style.display = 'none';
    closeBtn.onclick = null;
  }

  // 4. Configurar click general
  if (onClick) {
    wrapper.style.cursor = 'pointer';
    wrapper.onclick = (e) => onClick(wrapper, e);
  } else {
    wrapper.style.cursor = 'default';
    wrapper.onclick = null;
  }

  return wrapper;
}
