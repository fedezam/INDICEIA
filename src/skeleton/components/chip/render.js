export function renderChip() {
  const wrapper = document.createElement('span');
  wrapper.className = 's-chip';
  wrapper.setAttribute('role', 'status');

  // Contenedor interno para Icono + Texto
  const content = document.createElement('span');
  content.className = 's-chip__content';
  wrapper.appendChild(content);

  // Botón de cerrar (oculto por defecto)
  const closeBtn = document.createElement('button');
  closeBtn.className = 's-chip__close';
  closeBtn.setAttribute('type', 'button');
  closeBtn.setAttribute('aria-label', 'Eliminar');
  closeBtn.innerHTML = '&times;';
  closeBtn.style.display = 'none'; 
  wrapper.appendChild(closeBtn);

  return { wrapper, content, closeBtn };
}
