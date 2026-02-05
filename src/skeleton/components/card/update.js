// /src/skeleton/components/card/update.js
export function updateCard(el, data) {
  const iconEl = el.querySelector('.dash-icon i');
  const titleEl = el.querySelector('h3');
  const bodyEl = el.querySelector('.card-body');
  const actionSlot = el.querySelector('.card-action-slot');

  // Icono
  iconEl.className = `fas fa-${data.icon || 'cube'}`;

  // Título
  titleEl.textContent = data.title || '';

  // Contenido: string simple o array de líneas
  if (Array.isArray(data.content)) {
    bodyEl.innerHTML = data.content.map(line => `<p>${line}</p>`).join('');
  } else {
    bodyEl.innerHTML = `<p>${data.content || ''}</p>`;
  }

  // Highlight
  el.classList.toggle('highlight', !!data.highlight);

  // Acción (link o botón)
  actionSlot.innerHTML = '';
  if (data.action) {
    if (data.action.type === 'link') {
      const link = document.createElement('a');
      link.href = data.action.url;
      link.className = data.action.class || 'btn btn-secondary btn-sm';
      link.innerHTML = data.action.label || 'Ver';
      if (data.action.target) link.target = data.action.target;
      actionSlot.appendChild(link);
    } else if (data.action.type === 'button') {
      const btn = document.createElement('button');
      btn.className = data.action.class || 'btn btn-primary btn-sm';
      btn.innerHTML = data.action.label || 'Acción';
      if (data.action.onClick && typeof data.action.onClick === 'function') {
        // Limpiar listeners previos (evitar duplicados)
        const oldBtn = actionSlot.querySelector('button');
        if (oldBtn) {
          oldBtn.replaceWith(btn);
        } else {
          actionSlot.appendChild(btn);
        }
        btn.addEventListener('click', data.action.onClick);
      } else {
        actionSlot.appendChild(btn);
      }
    }
  }
}
