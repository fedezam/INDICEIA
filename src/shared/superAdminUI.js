// src/shared/superAdminUI.js

export function makeSection(titulo, subtitulo = '') {
  const wrap = document.createElement('div');
  wrap.className = 'sa-section';

  const hdr = document.createElement('div');
  hdr.className = 'sa-section-header';
  hdr.innerHTML = `<h3 class="sa-section-title">${titulo}</h3>${subtitulo ? `<p class="sa-section-sub">${subtitulo}</p>` : ''}`;
  wrap.appendChild(hdr);

  const grid = document.createElement('div');
  grid.className = 'sa-grid';
  wrap.appendChild(grid);

  return { wrap, grid };
}

export function makeCard({ icon, title, meta = '', status = 'ok', body = '', onEdit }) {
  const card = document.createElement('div');
  card.className = `sa-card sa-card--${status}`;

  const statusIcon = { ok: '✓', empty: '○', warning: '⚠' }[status] || '○';

  card.innerHTML = `
    <div class="sa-card-head">
      <span class="sa-card-icon">${icon}</span>
      <div class="sa-card-titles">
        <span class="sa-card-title">${title}</span>
        ${meta ? `<span class="sa-card-meta">${meta}</span>` : ''}
      </div>
      <span class="sa-card-status sa-status--${status}">${statusIcon}</span>
    </div>
    <div class="sa-card-body">${body}</div>
    <div class="sa-card-foot"></div>
  `;

  if (onEdit) {
    const btn = document.createElement('button');
    btn.className = 'sa-btn sa-btn--edit';
    btn.innerHTML = '<i class="fas fa-pen"></i> Editar';
    btn.onclick = onEdit;
    card.querySelector('.sa-card-foot').appendChild(btn);
  }

  return card;
}

export function openEditModal({ title, fields, data, onSave }) {
  const overlay = document.createElement('div');
  overlay.className = 'sa-modal-overlay';

  const modal = document.createElement('div');
  modal.className = 'sa-modal';

  const header = document.createElement('div');
  header.className = 'sa-modal-header';
  header.innerHTML = `<h3>${title}</h3><button class="sa-modal-close">&times;</button>`;

  const body = document.createElement('div');
  body.className = 'sa-modal-body';

  const refs = {};
  fields.forEach(f => {
    const wrap = document.createElement('div');
    wrap.className = 'sa-field';
    wrap.innerHTML = `<label class="sa-label">${f.label}${f.required ? ' <span class="sa-required">*</span>' : ''}</label>`;

    let input;

    if (f.type === 'textarea') {
      input = document.createElement('textarea');
      input.className = 'sa-input';
      input.rows = 3;
      input.value = data[f.key] || '';
    } else if (f.type === 'select') {
      input = document.createElement('select');
      input.className = 'sa-input';
      f.options.forEach(opt => {
        const o = document.createElement('option');
        o.value = opt.value;
        o.textContent = opt.label;
        if (data[f.key] === opt.value) o.selected = true;
        input.appendChild(o);
      });
    } else if (f.type === 'boolean') {
      input = document.createElement('input');
      input.type = 'checkbox';
      input.className = 'sa-checkbox';
      input.checked = !!data[f.key];
    } else if (f.type === 'json') {
      input = document.createElement('textarea');
      input.className = 'sa-input sa-input--mono';
      input.rows = 6;
      try { input.value = JSON.stringify(data[f.key] || {}, null, 2); } catch { input.value = '{}'; }
    } else {
      input = document.createElement('input');
      input.type = f.type || 'text';
      input.className = 'sa-input';
      input.value = data[f.key] ?? '';
      if (f.placeholder) input.placeholder = f.placeholder;
    }

    refs[f.key] = { input, field: f };
    wrap.appendChild(input);
    body.appendChild(wrap);
  });

  const footer = document.createElement('div');
  footer.className = 'sa-modal-footer';

  const cancelBtn = document.createElement('button');
  cancelBtn.className = 'sa-btn sa-btn--secondary';
  cancelBtn.textContent = 'Cancelar';
  cancelBtn.onclick = () => overlay.remove();

  const saveBtn = document.createElement('button');
  saveBtn.className = 'sa-btn sa-btn--primary';
  saveBtn.textContent = 'Guardar';
  saveBtn.onclick = async () => {
    const updates = {};
    let valid = true;

    Object.entries(refs).forEach(([key, { input, field }]) => {
      if (field.type === 'boolean') {
        updates[key] = input.checked;
      } else if (field.type === 'json') {
        try { updates[key] = JSON.parse(input.value); }
        catch { valid = false; input.style.borderColor = 'var(--s-danger)'; }
      } else if (field.type === 'number') {
        updates[key] = parseFloat(input.value) || 0;
      } else {
        updates[key] = input.value.trim();
      }
    });

    if (!valid) return;

    saveBtn.disabled = true;
    saveBtn.textContent = 'Guardando...';

    try {
      await onSave(updates);
      overlay.remove();
    } catch (err) {
      console.error('[superAdmin] Error guardando:', err);
      saveBtn.disabled = false;
      saveBtn.textContent = 'Error — reintentar';
    }
  };

  footer.appendChild(cancelBtn);
  footer.appendChild(saveBtn);

  modal.appendChild(header);
  modal.appendChild(body);
  modal.appendChild(footer);
  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  modal.querySelector('.sa-modal-close').onclick = () => overlay.remove();
  overlay.onclick = e => { if (e.target === overlay) overlay.remove(); };
}
