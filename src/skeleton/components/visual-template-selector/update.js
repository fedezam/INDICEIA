update.js// skeleton/components/visual-template-selector/update.js

export function updateTemplateSelector(dom, config = {}) {
  const {
    templates = [],
    selectedId = null,
    actions = {}
  } = config;

  const { grid } = dom;

  grid.innerHTML = '';

  if (templates.length === 0) {
    grid.innerHTML = `
      <div class="s-visual-empty">
        <i class="fas fa-exclamation-circle"></i>
        <p>No hay templates disponibles en este momento.</p>
      </div>`;
    return;
  }

  templates.forEach(template => {
    const isActive = selectedId === template.id;
    const card = renderCard(template, isActive);

    card.addEventListener('click', () => {
      const nuevoId = card.dataset.id === selectedId ? null : template.id;
      actions.onChange?.(nuevoId);
    });

    grid.appendChild(card);
  });
}

// ── Card individual (uso interno de update.js) ─────────────
function renderCard(template, isActive) {
  const card = document.createElement('div');
  card.className = `s-visual-card${isActive ? ' s-active' : ''}`;
  card.dataset.id = template.id;

  card.innerHTML = `
    ${isActive ? `<div class="s-visual-badge"><i class="fas fa-check"></i> Activo</div>` : ''}
    <div class="s-visual-thumbnail">
      ${template.previews?.thumbnail
        ? `<img src="${template.previews.thumbnail}" alt="${template.name}" loading="lazy" />`
        : `<div class="s-visual-thumbnail-placeholder"><i class="fas fa-image"></i></div>`}
      <div class="s-visual-overlay">
        <i class="fas fa-mouse-pointer"></i> ${isActive ? 'Deseleccionar' : 'Seleccionar'}
      </div>
    </div>
    <div class="s-visual-info">
      <h3>${template.name || 'Sin nombre'}</h3>
      <span class="s-visual-version">v${template.version || '1.0'} · ${template.tier || 'free'}</span>
      <p class="s-visual-description">${template.description || 'Sin descripción.'}</p>
      ${template.ideal_for?.length ? `
        <div class="s-visual-tags">
          ${template.ideal_for.map(t => `<span class="s-visual-tag">${t}</span>`).join('')}
        </div>` : ''}
    </div>
  `;

  return card;
}
