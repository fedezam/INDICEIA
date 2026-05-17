// src/skeleton/components/chip/render.js
export function renderChip() {
  const chip = document.createElement('span');
  chip.className = 's-chip';
  chip.setAttribute('role', 'status');

  // Contenedor interno para icono + texto (flex)
  const content = document.createElement('span');
  content.className = 's-chip__content';
  chip.appendChild(content);

  // Botón de cerrar (se muestra/oculta según config)
  const closeBtn = document.createElement('button');
  closeBtn.className = 's-chip__close';
  closeBtn.setAttribute('type', 'button');
  closeBtn.setAttribute('aria-label', 'Remover');
  closeBtn.innerHTML = '&times;';
  closeBtn.style.display = 'none'; // Se activa en update si removable: true
  chip.appendChild(closeBtn);

  return { chip, content, closeBtn };
}
