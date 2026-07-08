// skeleton/components/horarios-editor/update.js
import { DAYS, renderDayContent, renderTurnoSection } from './render.js';

const DEFAULT_TURNO_CORRIDO = [{ open: "09:00", close: "18:00" }];

/**
 * Aplica el estado (uiState.horarios) sobre el DOM ya construido en render.js.
 * Reconstruye por completo el body de cada día que esté "open" (barato: son 7 días máx).
 */
export function updateHorariosEditor(dom, uiState, opts, emitChange) {
  const { tieneLocalFisico = true } = opts;

  DAYS.forEach(day => {
    updateDayCard(dom, day, uiState, tieneLocalFisico, emitChange);
  });
}

export function updateDayCard(dom, day, uiState, tieneLocalFisico, emitChange) {
  const refs = dom.dayRefs[day];
  const schedule = uiState.horarios[day];
  const isOpen = schedule.open;

  refs.card.classList.toggle('s-active', isOpen);
  refs.checkbox.checked = isOpen;

  const openLabel   = tieneLocalFisico ? 'Abierto'  : 'Disponible';
  const closedLabel = tieneLocalFisico ? 'Cerrado'  : 'No disponible';
  refs.statusBadge.textContent = isOpen ? openLabel : closedLabel;

  refs.checkbox.onchange = (e) => {
    const opening = e.target.checked;
    schedule.open = opening;
    if (opening && schedule.turnos.length === 0) {
      schedule.turnos = structuredClone(DEFAULT_TURNO_CORRIDO);
    }
    updateDayCard(dom, day, uiState, tieneLocalFisico, emitChange);
    emitChange();
  };

  // Reconstruir body
  refs.body.innerHTML = '';
  refs.body.classList.toggle('s-disabled', !isOpen);
  if (isOpen) {
    refs.body.appendChild(buildDayContentEl(day, uiState, tieneLocalFisico, dom, emitChange));
  }
}

function getModo(schedule) {
  if (!schedule.open || schedule.turnos.length === 0) return null;
  return schedule.turnos.length === 1 ? 'corrido' : 'partido';
}

function buildDayContentEl(day, uiState, tieneLocalFisico, dom, emitChange) {
  const schedule = uiState.horarios[day];
  const modo = getModo(schedule);
  const { container, modeCheckbox, turnosWrap } = renderDayContent();

  modeCheckbox.checked = modo === 'corrido';
  modeCheckbox.onchange = (e) => {
    if (e.target.checked) {
      const primerOpen = schedule.turnos[0]?.open || "09:00";
      schedule.turnos = [{ open: primerOpen, close: "18:00" }];
    } else {
      const openActual = schedule.turnos[0]?.open || "08:00";
      schedule.turnos = [
        { open: openActual, close: "13:00" },
        { open: "16:00", close: "21:00" }
      ];
    }
    updateDayCard(dom, day, uiState, tieneLocalFisico, emitChange);
    emitChange();
  };

  if (modo === 'corrido') {
    turnosWrap.appendChild(buildTurnoSection(day, 0, 'Horario de atención', null, uiState, emitChange));
  } else {
    turnosWrap.appendChild(buildTurnoSection(day, 0, 'Mañana', 'fa-sun', uiState, emitChange));
    const spacer = document.createElement('div');
    spacer.style.height = '20px';
    turnosWrap.appendChild(spacer);
    turnosWrap.appendChild(buildTurnoSection(day, 1, 'Tarde', 'fa-moon', uiState, emitChange));
  }

  return container;
}

function buildTurnoSection(day, turnoIndex, label, icon, uiState, emitChange) {
  const turno = uiState.horarios[day].turnos[turnoIndex];
  const { section, titleEl, openGroup, closeGroup } = renderTurnoSection();

  titleEl.innerHTML = icon
    ? `<span class="s-period-label-text"><i class="fas ${icon}"></i> ${label}</span>`
    : `<h4 class="s-period-title">${label}</h4>`;

  fillTimeGroup(openGroup, 'Apertura', turno.open, (v) => {
    turno.open = v;
    emitChange();
  });

  fillTimeGroup(closeGroup, 'Cierre', turno.close, (v) => {
    turno.close = v;
    emitChange();
  }, { isClose: true, openValue: turno.open });

  return section;
}

function fillTimeGroup({ labelEl, selectH, selectM }, labelText, value, onChange, { isClose = false, openValue = null } = {}) {
  labelEl.textContent = labelText;

  const [hStr = '09', mStr = '00'] = (value || '09:00').split(':');
  const currentH = parseInt(hStr, 10) % 24;
  const currentM = parseInt(mStr, 10);

  selectH.value = String(currentH).padStart(2, '0');
  const roundedM = Math.round(currentM / 15) * 15 % 60;
  selectM.value = String(roundedM).padStart(2, '0');

  const notify = () => {
    const h = parseInt(selectH.value, 10);

    if (isClose && openValue) {
      const openH = parseInt((openValue || '00:00').split(':')[0], 10) % 24;
      if (h <= openH) {
        onChange(`${String(h + 24).padStart(2, '0')}:${selectM.value}`);
        return;
      }
    }
    onChange(`${selectH.value}:${selectM.value}`);
  };

  selectH.onchange = notify;
  selectM.onchange = notify;
}
