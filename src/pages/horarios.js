// ============================================================
// src/pages/horarios.js
// ============================================================

import { runLifecycle }          from '/src/skeleton/lifecycle.js';
import { createFirebaseAdapter } from '/src/skeleton/adapters/firebaseAdapter.js';
import { mountLayout }           from '/src/skeleton/layout/index.js';
import { runFlowController }     from '/src/controllers/flowController.js';
import { createButton }          from '/src/skeleton/components/button/index.js';
import { createCard }            from '/src/skeleton/components/card/index.js';
import { showToast }             from '/src/skeleton/components/toast/index.js';
import { createOnboardingButton } from '/src/skeleton/components/onboarding-button/index.js';

import './horarios.css';

const DAYS = ["lunes", "martes", "miercoles", "jueves", "viernes", "sabado", "domingo"];
const DAYS_LABELS = {
  lunes: "Lunes", martes: "Martes", miercoles: "Miércoles",
  jueves: "Jueves", viernes: "Viernes", sabado: "Sábado", domingo: "Domingo"
};

const adapter = (options) => createFirebaseAdapter(options);

runLifecycle({
  adapter,
  options: { loadingMessage: 'Cargando horarios...' },

  async onReady(ctx) {
    await runFlowController(ctx.user.uid);
    mountLayout(ctx);
    const state = await load(ctx);
    render(ctx, state);
  }
});

// ============================================================
// HELPERS
// ============================================================
function getDefaultDaySchedule() {
  return {
    closed: false, continuous: true,
    open: "09:00", close: "18:00",
    morning:   { enabled: true, open: "08:00", close: "13:00" },
    afternoon: { enabled: true, open: "16:00", close: "21:00" }
  };
}

function ensureHorariosStructure(horariosData) {
  const result = {};
  DAYS.forEach(day => {
    const existing = horariosData?.[day];
    if (!existing) {
      result[day] = getDefaultDaySchedule();
    } else {
      result[day] = {
        closed:     existing.closed     ?? false,
        continuous: existing.continuous ?? true,
        open:       existing.open       || "09:00",
        close:      existing.close      || "18:00",
        morning: {
          enabled: existing.morning?.enabled ?? true,
          open:    existing.morning?.open    || "08:00",
          close:   existing.morning?.close   || "13:00"
        },
        afternoon: {
          enabled: existing.afternoon?.enabled ?? true,
          open:    existing.afternoon?.open    || "16:00",
          close:   existing.afternoon?.close   || "21:00"
        }
      };
    }
  });
  return result;
}

// ============================================================
// MODE
// ============================================================
function getMode() {
  return new URLSearchParams(window.location.search).get('mode');
}

// ============================================================
// LOAD
// ============================================================
async function load(ctx) {
  const isDelivery = getMode() === 'delivery';

  const horariosData = isDelivery
    ? ctx.comercioData?.horariosDelivery
    : ctx.comercioData?.horarios;

  const horarios = ensureHorariosStructure(horariosData);

  const entityType = ctx.comercioData?.entityType || 'comercio';
  const tieneLocalFisico = entityType === 'comercio'
    ? ctx.comercioData?.tieneLocalFisico !== false
    : ctx.comercioData?.modalidad_trabajo === 'local';

  return {
    horarios,
    tieneLocalFisico,
    isDelivery
  };
}

// ============================================================
// RENDER
// ============================================================
function render(ctx, state) {
  const page = document.getElementById('skeleton-page');
  page.innerHTML = '';

  const refs    = { dayCards: [] };
  const uiState = { horarios: state.horarios };

  const originalSnapshot = structuredClone(state.horarios);
  const dirtyController  = {
    hasUnsavedChanges: () => JSON.stringify(uiState.horarios) !== JSON.stringify(originalSnapshot),
    markSaved:         () => Object.assign(originalSnapshot, structuredClone(uiState.horarios))
  };

  // ── HEADER — cambia según isDelivery / tieneLocalFisico ───
  const header = document.createElement('div');
  header.className = 'page-header';

  if (state.isDelivery) {
    header.innerHTML = `
      <h2><i class="fas fa-motorcycle"></i> Horarios de Delivery</h2>
      <p>Configurá cuándo pueden realizarse entregas</p>
    `;
  }
  else if (state.tieneLocalFisico) {
    header.innerHTML = `
      <h2><i class="fas fa-clock"></i> Horarios de Atención</h2>
      <p>Configurá cuándo está abierto tu local</p>
    `;
  }
  else {
    header.innerHTML = `
      <h2><i class="fas fa-clock"></i> Horarios de Trabajo</h2>
      <p>Configurá en qué horarios trabajás habitualmente</p>
    `;
  }

  page.appendChild(header);

  // ── AI CARD — cambia según isDelivery / tieneLocalFisico ──
  const aiCardContent = state.isDelivery
    ? 'Tu asistente sabrá cuándo podés realizar entregas y comunicará los horarios a tus clientes automáticamente.'
    : state.tieneLocalFisico
      ? 'Tu asistente sabrá cuándo está abierto tu local y se lo comunicará a tus clientes automáticamente.'
      : 'Tu asistente sabrá en qué horarios trabajás y avisará a los clientes si contactan fuera de ese horario.';

  page.appendChild(createCard({
    title:     '¡Tu IA conocerá tus horarios!',
    icon:      'fa-robot',
    variant:   'info',
    highlight: true,
    compact:   true,
    content: aiCardContent
  }));

  // ── GRID DE DÍAS ──────────────────────────────────────────
  const grid = document.createElement('div');
  grid.className = 'horarios-grid';

  DAYS.forEach(day => {
    const card = createDayCard(day, uiState, refs, state.tieneLocalFisico);
    refs.dayCards.push(card);
    grid.appendChild(card);
  });

  page.appendChild(grid);


  // ── BOTÓN GUARDAR ─────────────────────────────────────────
  const btnContainer = document.createElement('div');
  btnContainer.style.marginTop = '30px';

  btnContainer.appendChild(createOnboardingButton({
    stepName: state.isDelivery
      ? 'horarios-delivery'
      : 'horarios',
    validate: () => DAYS.some(day => !uiState.horarios[day].closed),
    getData:  () => ({
      [state.isDelivery ? 'horariosDelivery' : 'horarios']: uiState.horarios,
      comercioId: ctx.comercioId
    }),
    dirtyController,
    getLabel: () => {
      if (ctx.isEditMode && !dirtyController.hasUnsavedChanges()) return 'Volver al dashboard';
      return 'Guardar y continuar';
    },
    onSuccess: () => showToast('Horarios guardados correctamente', 'success'),
    onError:   (err) => showToast('Error al guardar: ' + err.message, 'error'),
  }));

  page.appendChild(btnContainer);
}

// ============================================================
// REBUILD GRID
// ============================================================
function rebuildGrid(grid, uiState, refs, tieneLocalFisico) {
  grid.innerHTML  = '';
  refs.dayCards   = [];
  DAYS.forEach(day => {
    const card = createDayCard(day, uiState, refs, tieneLocalFisico);
    refs.dayCards.push(card);
    grid.appendChild(card);
  });
}

// ============================================================
// DAY CARD
// ============================================================
function createDayCard(day, uiState, refs, tieneLocalFisico) {
  const schedule = uiState.horarios[day];
  const isOpen   = !schedule.closed;

  const card = document.createElement('div');
  card.className   = `day-card ${isOpen ? 'active' : ''}`;
  card.dataset.day = day;

  card.appendChild(createDayHeader(day, isOpen, uiState, refs, tieneLocalFisico));

  const body = document.createElement('div');
  body.className = `day-body ${!isOpen ? 'disabled' : ''}`;
  body.appendChild(buildDayContent(day, uiState, refs));
  card.appendChild(body);

  return card;
}

function createDayHeader(day, isOpen, uiState, refs, tieneLocalFisico) {
  const header   = document.createElement('div');
  header.className = 'day-header';

  const toggle   = document.createElement('div');
  toggle.className = 'day-toggle';

  const checkbox = document.createElement('input');
  checkbox.type    = 'checkbox';
  checkbox.id      = `toggle_${day}`;
  checkbox.checked = isOpen;

  const openLabel   = tieneLocalFisico ? 'Abierto'   : 'Disponible';
  const closedLabel = tieneLocalFisico ? 'Cerrado'   : 'No disponible';

  const label = document.createElement('label');
  label.htmlFor = `toggle_${day}`;
  label.innerHTML = `
    <span class="day-name">${DAYS_LABELS[day]}</span>
    <span class="status-badge">${isOpen ? openLabel : closedLabel}</span>
  `;

  checkbox.addEventListener('change', (e) => {
    uiState.horarios[day].closed = !e.target.checked;
    updateDayCard(day, uiState, refs, tieneLocalFisico);
    document.dispatchEvent(new Event('change'));
  });

  toggle.appendChild(checkbox);
  toggle.appendChild(label);
  header.appendChild(toggle);
  return header;
}

function buildDayContent(day, uiState, refs) {
  const schedule  = uiState.horarios[day];
  const container = document.createElement('div');
  container.className = 'day-content';

  if (schedule.closed) {
    const msg = document.createElement('p');
    msg.className   = 'closed-message';
    msg.textContent = 'Este día no hay atención';
    container.appendChild(msg);
    return container;
  }

  container.appendChild(createModeToggle(day, schedule.continuous, uiState, refs));

  const separator = document.createElement('hr');
  separator.className = 'content-separator';
  container.appendChild(separator);

  if (schedule.continuous) {
    container.appendChild(createContinuousSchedule(day, uiState));
  } else {
    container.appendChild(createSplitSchedule(day, uiState, refs));
  }

  return container;
}

function createModeToggle(day, isContinuous, uiState, refs) {
  const wrapper  = document.createElement('div');
  wrapper.className = 'schedule-type-toggle';

  const label    = document.createElement('label');
  label.className = 'schedule-type-label';

  const checkbox = document.createElement('input');
  checkbox.type    = 'checkbox';
  checkbox.id      = `continuous_${day}`;
  checkbox.checked = isContinuous;

  checkbox.addEventListener('change', (e) => {
    uiState.horarios[day].continuous = e.target.checked;
    updateDayCard(day, uiState, refs);
    document.dispatchEvent(new Event('change'));
  });

  const span = document.createElement('span');
  span.textContent = 'Horario corrido';

  label.appendChild(checkbox);
  label.appendChild(span);
  wrapper.appendChild(label);
  return wrapper;
}

function createContinuousSchedule(day, uiState) {
  const schedule = uiState.horarios[day];
  const wrapper  = document.createElement('div');
  wrapper.className = 'continuous-schedule';

  const title = document.createElement('h4');
  title.textContent = 'Horario de atención';
  wrapper.appendChild(title);

  const timeWrapper = document.createElement('div');
  timeWrapper.className = 'time-inputs';

  timeWrapper.appendChild(createTimeInput({
    id: `open_${day}`, label: 'Apertura', value: schedule.open,
    onChange: (v) => { schedule.open = v; document.dispatchEvent(new Event('change')); }
  }));
  timeWrapper.appendChild(createTimeInput({
    id: `close_${day}`, label: 'Cierre', value: schedule.close,
    onChange: (v) => { schedule.close = v; document.dispatchEvent(new Event('change')); }
  }));

  wrapper.appendChild(timeWrapper);
  return wrapper;
}

function createSplitSchedule(day, uiState, refs) {
  const schedule = uiState.horarios[day];
  const wrapper  = document.createElement('div');
  wrapper.className = 'split-schedule';

  wrapper.appendChild(createPeriodSection({
    day, period: 'morning',   label: 'Mañana', icon: 'fa-sun',
    data: schedule.morning,   uiState, refs
  }));

  const spacer = document.createElement('div');
  spacer.style.height = '20px';
  wrapper.appendChild(spacer);

  wrapper.appendChild(createPeriodSection({
    day, period: 'afternoon', label: 'Tarde',  icon: 'fa-moon',
    data: schedule.afternoon, uiState, refs
  }));

  return wrapper;
}

function createPeriodSection({ day, period, label, icon, data, uiState, refs }) {
  const section = document.createElement('div');
  section.className = 'schedule-period';

  const header = document.createElement('div');
  header.className = 'period-header';

  const toggleLabel = document.createElement('label');
  toggleLabel.className = 'period-toggle';

  const checkbox = document.createElement('input');
  checkbox.type    = 'checkbox';
  checkbox.id      = `${period}_enabled_${day}`;
  checkbox.checked = data.enabled;

  checkbox.addEventListener('change', (e) => {
    data.enabled = e.target.checked;
    updateDayCard(day, uiState, refs);
    document.dispatchEvent(new Event('change'));
  });

  const span = document.createElement('span');
  span.innerHTML = `<i class="fas ${icon}"></i> ${label}`;

  toggleLabel.appendChild(checkbox);
  toggleLabel.appendChild(span);
  header.appendChild(toggleLabel);
  section.appendChild(header);

  if (!data.enabled) {
    const msg = document.createElement('p');
    msg.className   = 'period-disabled';
    msg.textContent = `${label} cerrado`;
    section.appendChild(msg);
    return section;
  }

  const timeWrapper = document.createElement('div');
  timeWrapper.className = 'time-inputs';

  timeWrapper.appendChild(createTimeInput({
    id: `${period}_open_${day}`, label: 'Apertura', value: data.open,
    onChange: (v) => { data.open = v; document.dispatchEvent(new Event('change')); }
  }));
  timeWrapper.appendChild(createTimeInput({
    id: `${period}_close_${day}`, label: 'Cierre', value: data.close,
    onChange: (v) => { data.close = v; document.dispatchEvent(new Event('change')); }
  }));

  section.appendChild(timeWrapper);
  return section;
}

// ============================================================
// TIME INPUT
// ============================================================
function createTimeInput({ id, label, value, onChange }) {
  const group = document.createElement('div');
  group.className = 'time-group';

  const labelEl = document.createElement('label');
  labelEl.setAttribute('for', `${id}_h`);
  labelEl.textContent = label;
  group.appendChild(labelEl);

  const [hStr = '09', mStr = '00'] = (value || '09:00').split(':');
  const currentH = parseInt(hStr, 10);
  const currentM = parseInt(mStr, 10);

  const row = document.createElement('div');
  row.className = 'time-selects-row';

  const selectH = document.createElement('select');
  selectH.id = `${id}_h`;
  selectH.className = 'time-select';
  for (let h = 0; h < 24; h++) {
    const opt = document.createElement('option');
    opt.value = String(h).padStart(2, '0');
    opt.textContent = String(h).padStart(2, '0');
    if (h === currentH) opt.selected = true;
    selectH.appendChild(opt);
  }

  const separator = document.createElement('span');
  separator.className = 'time-separator';
  separator.textContent = ':';

  const MINUTES = ['00', '15', '30', '45'];
  const selectM = document.createElement('select');
  selectM.className = 'time-select';
  MINUTES.forEach(m => {
    const opt = document.createElement('option');
    opt.value = m;
    opt.textContent = m;
    if (parseInt(m, 10) === Math.round(currentM / 15) * 15 % 60) opt.selected = true;
    selectM.appendChild(opt);
  });

  const notify = () => {
    const val = `${selectH.value}:${selectM.value}`;
    onChange(val);
    document.dispatchEvent(new Event('change'));
  };

  selectH.addEventListener('change', notify);
  selectM.addEventListener('change', notify);

  row.appendChild(selectH);
  row.appendChild(separator);
  row.appendChild(selectM);
  group.appendChild(row);
  return group;
}

// ============================================================
// UPDATE DAY CARD
// ============================================================
function updateDayCard(day, uiState, refs, tieneLocalFisico = true) {
  const index   = DAYS.indexOf(day);
  const oldCard = refs.dayCards[index];
  const newCard = createDayCard(day, uiState, refs, tieneLocalFisico);
  oldCard.replaceWith(newCard);
  refs.dayCards[index] = newCard;
}
