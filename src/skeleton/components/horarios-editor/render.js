// skeleton/components/horarios-editor/render.js
import './styles.css';

export const DAYS = ["lunes", "martes", "miercoles", "jueves", "viernes", "sabado", "domingo"];
export const DAYS_LABELS = {
  lunes: "Lunes", martes: "Martes", miercoles: "Miércoles",
  jueves: "Jueves", viernes: "Viernes", sabado: "Sábado", domingo: "Domingo"
};

export function renderHorariosEditor() {
  const wrapper = document.createElement('div');
  wrapper.className = 's-horarios-editor';

  const grid = document.createElement('div');
  grid.className = 's-horarios-grid';
  wrapper.appendChild(grid);

  // Un slot de refs por día, se llenan en update.js
  const dayRefs = {};
  DAYS.forEach(day => {
    const card = document.createElement('div');
    card.className = 's-day-card';
    card.dataset.day = day;

    const header = document.createElement('div');
    header.className = 's-day-header';

    const toggleWrap = document.createElement('div');
    toggleWrap.className = 's-day-toggle';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = `s-horario-toggle_${day}`;

    const label = document.createElement('label');
    label.htmlFor = `s-horario-toggle_${day}`;
    label.innerHTML = `
      <span class="s-day-name">${DAYS_LABELS[day]}</span>
      <span class="s-status-badge"></span>
    `;

    toggleWrap.appendChild(checkbox);
    toggleWrap.appendChild(label);
    header.appendChild(toggleWrap);
    card.appendChild(header);

    const body = document.createElement('div');
    body.className = 's-day-body';
    card.appendChild(body);

    grid.appendChild(card);

    dayRefs[day] = {
      card,
      checkbox,
      statusBadge: label.querySelector('.s-status-badge'),
      body
    };
  });

  return { wrapper, grid, dayRefs };
}

// ── Sub-render: contenido de un día abierto (modo + turnos) ──
export function renderDayContent() {
  const container = document.createElement('div');
  container.className = 's-day-content';

  const modeToggleWrap = document.createElement('div');
  modeToggleWrap.className = 's-mode-toggle';

  const modeCheckbox = document.createElement('input');
  modeCheckbox.type = 'checkbox';
  modeCheckbox.className = 's-mode-checkbox';

  const modeLabel = document.createElement('label');
  modeLabel.className = 's-mode-label';
  const modeSpan = document.createElement('span');
  modeSpan.textContent = 'Horario corrido';

  modeLabel.appendChild(modeCheckbox);
  modeLabel.appendChild(modeSpan);
  modeToggleWrap.appendChild(modeLabel);
  container.appendChild(modeToggleWrap);

  const separator = document.createElement('hr');
  separator.className = 's-content-separator';
  container.appendChild(separator);

  const turnosWrap = document.createElement('div');
  turnosWrap.className = 's-turnos-wrap';
  container.appendChild(turnosWrap);

  return { container, modeCheckbox, turnosWrap };
}

// ── Sub-render: sección de un turno (open/close) ──
export function renderTurnoSection() {
  const section = document.createElement('div');
  section.className = 's-schedule-period';

  const titleEl = document.createElement('div');
  titleEl.className = 's-period-label';
  section.appendChild(titleEl);

  const timeWrapper = document.createElement('div');
  timeWrapper.className = 's-time-inputs';
  section.appendChild(timeWrapper);

  const openGroup = renderTimeInput();
  const closeGroup = renderTimeInput();

  timeWrapper.appendChild(openGroup.group);
  timeWrapper.appendChild(closeGroup.group);

  return { section, titleEl, openGroup, closeGroup };
}

// ── Sub-render: un selector de hora (label + select H + select M) ──
export function renderTimeInput() {
  const group = document.createElement('div');
  group.className = 's-time-group';

  const labelEl = document.createElement('label');
  group.appendChild(labelEl);

  const row = document.createElement('div');
  row.className = 's-time-selects-row';

  const selectH = document.createElement('select');
  selectH.className = 's-time-select';
  for (let h = 0; h < 24; h++) {
    const opt = document.createElement('option');
    opt.value = String(h).padStart(2, '0');
    opt.textContent = String(h).padStart(2, '0');
    selectH.appendChild(opt);
  }

  const separator = document.createElement('span');
  separator.className = 's-time-separator';
  separator.textContent = ':';

  const selectM = document.createElement('select');
  selectM.className = 's-time-select';
  ['00', '15', '30', '45'].forEach(m => {
    const opt = document.createElement('option');
    opt.value = m;
    opt.textContent = m;
    selectM.appendChild(opt);
  });

  row.appendChild(selectH);
  row.appendChild(separator);
  row.appendChild(selectM);
  group.appendChild(row);

  return { group, labelEl, selectH, selectM };
}
