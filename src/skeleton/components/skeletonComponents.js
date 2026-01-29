// ============================================
// skeletonComponents.js
// Componentes comunes que cada página puede usar
// ============================================

/**
 * 📦 CARDS
 */
export function createCard({ title, icon, content, actions = [] }) {
  const card = document.createElement('div');
  card.className = 'dash-card';
  
  card.innerHTML = `
    ${icon ? `<div class="dash-icon"><i class="${icon}"></i></div>` : ''}
    <div class="dash-content">
      <h3>${title}</h3>
      ${content}
    </div>
    ${actions.length ? `
      <div class="dash-actions">
        ${actions.map(action => `
          <button class="btn ${action.className || 'btn-primary'}" data-action="${action.id}">
            ${action.icon ? `<i class="${action.icon}"></i>` : ''} ${action.label}
          </button>
        `).join('')}
      </div>
    ` : ''}
  `;
  
  // Bind eventos
  actions.forEach(action => {
    const btn = card.querySelector(`[data-action="${action.id}"]`);
    if (btn && action.onClick) {
      btn.addEventListener('click', action.onClick);
    }
  });
  
  return card;
}

/**
 * ✅ CHECKBOX GROUP
 */
export function createCheckboxGroup({ name, options, value = [] }) {
  const container = document.createElement('div');
  container.className = 'checkbox-group';
  
  container.innerHTML = options.map(opt => `
    <label class="checkbox-label">
      <input 
        type="checkbox" 
        name="${name}" 
        value="${opt.value}"
        ${value.includes(opt.value) ? 'checked' : ''}
      >
      <span>${opt.label}</span>
    </label>
  `).join('');
  
  return container;
}

/**
 * 📝 FORM FIELD
 */
export function createFormField({ 
  label, 
  type = 'text', 
  id, 
  value = '', 
  placeholder = '',
  required = false,
  helper = null 
}) {
  const field = document.createElement('div');
  field.className = 'form-field';
  
  field.innerHTML = `
    <label for="${id}">
      ${label}
      ${required ? '<span class="required">*</span>' : ''}
    </label>
    <input 
      type="${type}" 
      id="${id}" 
      name="${id}"
      value="${value}"
      placeholder="${placeholder}"
      ${required ? 'required' : ''}
    >
    ${helper ? `<small class="helper-text">${helper}</small>` : ''}
  `;
  
  return field;
}

/**
 * 📊 TABLE
 */
export function createTable({ 
  columns, 
  data, 
  actions = [],
  emptyMessage = 'No hay datos para mostrar' 
}) {
  const table = document.createElement('table');
  table.className = 'data-table';
  
  // Header
  const thead = document.createElement('thead');
  thead.innerHTML = `
    <tr>
      ${columns.map(col => `<th>${col.label}</th>`).join('')}
      ${actions.length ? '<th>Acciones</th>' : ''}
    </tr>
  `;
  table.appendChild(thead);
  
  // Body
  const tbody = document.createElement('tbody');
  
  if (data.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="${columns.length + (actions.length ? 1 : 0)}" class="empty-state">
          ${emptyMessage}
        </td>
      </tr>
    `;
  } else {
    data.forEach((row, index) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        ${columns.map(col => `<td>${row[col.key] || '-'}</td>`).join('')}
        ${actions.length ? `
          <td class="actions">
            ${actions.map(action => `
              <button 
                class="btn-icon ${action.className || ''}" 
                data-action="${action.id}"
                data-index="${index}"
                title="${action.label}"
              >
                <i class="${action.icon}"></i>
              </button>
            `).join('')}
          </td>
        ` : ''}
      `;
      
      // Bind eventos
      actions.forEach(action => {
        const btn = tr.querySelector(`[data-action="${action.id}"]`);
        if (btn && action.onClick) {
          btn.addEventListener('click', () => action.onClick(row, index));
        }
      });
      
      tbody.appendChild(tr);
    });
  }
  
  table.appendChild(tbody);
  return table;
}

/**
 * 🪟 MODAL
 */
export function createModal({ 
  title, 
  content, 
  actions = [],
  size = 'medium' 
}) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  
  overlay.innerHTML = `
    <div class="modal modal-${size}">
      <div class="modal-header">
        <h3>${title}</h3>
        <button class="modal-close">&times;</button>
      </div>
      <div class="modal-body">
        ${content}
      </div>
      ${actions.length ? `
        <div class="modal-footer">
          ${actions.map(action => `
            <button 
              class="btn ${action.className || 'btn-primary'}" 
              data-action="${action.id}"
            >
              ${action.label}
            </button>
          `).join('')}
        </div>
      ` : ''}
    </div>
  `;
  
  // Cerrar al hacer click fuera
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      overlay.remove();
    }
  });
  
  // Cerrar con X
  const closeBtn = overlay.querySelector('.modal-close');
  closeBtn.addEventListener('click', () => overlay.remove());
  
  // Bind eventos de acciones
  actions.forEach(action => {
    const btn = overlay.querySelector(`[data-action="${action.id}"]`);
    if (btn && action.onClick) {
      btn.addEventListener('click', () => {
        action.onClick();
        if (action.closeAfter !== false) {
          overlay.remove();
        }
      });
    }
  });
  
  document.body.appendChild(overlay);
  return overlay;
}

/**
 * 🎨 EMPTY STATE
 */
export function createEmptyState({ 
  icon = 'fas fa-inbox', 
  title, 
  message, 
  action = null 
}) {
  const container = document.createElement('div');
  container.className = 'empty-state';
  
  container.innerHTML = `
    <div class="empty-icon">
      <i class="${icon}"></i>
    </div>
    <h3>${title}</h3>
    <p>${message}</p>
    ${action ? `
      <button class="btn btn-primary" id="emptyStateAction">
        ${action.icon ? `<i class="${action.icon}"></i>` : ''} ${action.label}
      </button>
    ` : ''}
  `;
  
  if (action && action.onClick) {
    const btn = container.querySelector('#emptyStateAction');
    btn.addEventListener('click', action.onClick);
  }
  
  return container;
}

/**
 * 🏷️ BADGE
 */
export function createBadge({ text, variant = 'default' }) {
  const badge = document.createElement('span');
  badge.className = `badge badge-${variant}`;
  badge.textContent = text;
  return badge;
}

/**
 * 📋 STATS CARD
 */
export function createStatsCard({ 
  label, 
  value, 
  icon, 
  trend = null,
  onClick = null 
}) {
  const card = document.createElement('div');
  card.className = 'stats-card';
  if (onClick) card.style.cursor = 'pointer';
  
  card.innerHTML = `
    <div class="stats-icon">
      <i class="${icon}"></i>
    </div>
    <div class="stats-content">
      <div class="stats-label">${label}</div>
      <div class="stats-value">${value}</div>
      ${trend ? `
        <div class="stats-trend ${trend.direction}">
          <i class="fas fa-arrow-${trend.direction === 'up' ? 'up' : 'down'}"></i>
          ${trend.value}
        </div>
      ` : ''}
    </div>
  `;
  
  if (onClick) {
    card.addEventListener('click', onClick);
  }
  
  return card;
}

/**
 * 🎯 PROGRESS BAR
 */
export function createProgressBar({ 
  current, 
  max, 
  label = null,
  showPercentage = true 
}) {
  const percentage = Math.round((current / max) * 100);
  
  const container = document.createElement('div');
  container.className = 'progress-container';
  
  container.innerHTML = `
    ${label ? `<div class="progress-label">${label}</div>` : ''}
    <div class="progress-bar">
      <div class="progress-fill" style="width: ${percentage}%"></div>
    </div>
    ${showPercentage ? `<div class="progress-text">${current}/${max} (${percentage}%)</div>` : ''}
  `;
  
  return container;
}

/**
 * 🔍 SEARCH BAR
 */
export function createSearchBar({ 
  placeholder = 'Buscar...', 
  onSearch 
}) {
  const container = document.createElement('div');
  container.className = 'search-bar';
  
  container.innerHTML = `
    <i class="fas fa-search"></i>
    <input 
      type="text" 
      placeholder="${placeholder}"
      class="search-input"
    >
  `;
  
  const input = container.querySelector('.search-input');
  
  let timeout;
  input.addEventListener('input', (e) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      if (onSearch) onSearch(e.target.value);
    }, 300);
  });
  
  return container;
}

/**
 * 📑 TABS
 */
export function createTabs({ tabs, onTabChange }) {
  const container = document.createElement('div');
  container.className = 'tabs-container';
  
  const tabButtons = document.createElement('div');
  tabButtons.className = 'tabs-buttons';
  
  const tabContents = document.createElement('div');
  tabContents.className = 'tabs-contents';
  
  tabs.forEach((tab, index) => {
    // Botón
    const btn = document.createElement('button');
    btn.className = `tab-button ${index === 0 ? 'active' : ''}`;
    btn.textContent = tab.label;
    btn.dataset.tabId = tab.id;
    
    // Contenido
    const content = document.createElement('div');
    content.className = `tab-content ${index === 0 ? 'active' : ''}`;
    content.dataset.tabId = tab.id;
    content.innerHTML = tab.content;
    
    btn.addEventListener('click', () => {
      // Desactivar todos
      container.querySelectorAll('.tab-button').forEach(b => b.classList.remove('active'));
      container.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      
      // Activar seleccionado
      btn.classList.add('active');
      content.classList.add('active');
      
      if (onTabChange) onTabChange(tab.id, index);
    });
    
    tabButtons.appendChild(btn);
    tabContents.appendChild(content);
  });
  
  container.appendChild(tabButtons);
  container.appendChild(tabContents);
  
  return container;
}
