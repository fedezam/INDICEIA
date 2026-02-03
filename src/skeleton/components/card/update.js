export function updateCard(el, data = {}) {
  if (!el) return;

  const {
    icon,
    title,
    description,
    badgeOptional,
    servicios = [],
    actions = []
  } = data;

  // Icono
  const iconEl = el.querySelector('.dash-icon');
  if (iconEl && icon) {
    iconEl.innerHTML = `<i class="${icon}"></i>`;
  }

  // Título
  const titleEl = el.querySelector('.dash-content h3');
  if (titleEl && title) {
    titleEl.innerHTML = title;

    if (badgeOptional) {
      titleEl.innerHTML += `<span class="badge-optional">${badgeOptional}</span>`;
    }
  }

  // Descripción
  const descEl = el.querySelector('.dash-content p');
  if (descEl && description) {
    descEl.textContent = description;
  }

  // Servicios / badges
  const serviciosEl = el.querySelector('.servicios-detail');
  if (serviciosEl) {
    serviciosEl.innerHTML = servicios
      .map(s =>
        `<span class="${s.estado === 'activo' ? 'badge-activo' : 'badge-pausado'}">
          ${s.label}
        </span>`
      )
      .join('');
  }

  // Acciones (botones)
  const actionsEl = el.querySelector('.card-actions');
  if (actionsEl) {
    actionsEl.innerHTML = actions
      .map(a =>
        `<button class="btn ${a.class || ''}">${a.label}</button>`
      )
      .join('');
  }
}
