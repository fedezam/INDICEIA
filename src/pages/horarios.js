// ============================================================
// src/pages/horarios/horarios.js
// ============================================================

// ==================== SKELETON CORE ====================
import { runLifecycle }          from '/src/skeleton/lifecycle.js';
import { createFirebaseAdapter } from '/src/skeleton/adapters/firebaseAdapter.js';
import { mountLayout }           from '/src/skeleton/layout/index.js';

// ==================== FLOW ====================
import { runFlowController } from '/src/controllers/flowController.js';

// ==================== COMPONENTES ====================
import { createButton }            from '/src/skeleton/components/button/index.js';
import { createCard }              from '/src/skeleton/components/card/index.js';
import { showToast }               from '/src/skeleton/components/toast/index.js';
import { createOnboardingButton }  from '/src/skeleton/components/onboarding-button/index.js';

import './horarios.css';

// ==================== DATOS ESTÁTICOS ====================
const DAYS = ["lunes", "martes", "miercoles", "jueves", "viernes", "sabado", "domingo"];
const DAYS_LABELS = {
  lunes:     "Lunes",
  martes:    "Martes",
  miercoles: "Miércoles",
  jueves:    "Jueves",
  viernes:   "Viernes",
  sabado:    "Sábado",
  domingo:   "Domingo"
};

// ==================== ADAPTER ====================
const adapter = (options) => createFirebaseAdapter(options);

// ==================== LIFECYCLE ====================
runLifecycle({
  adapter,
  options: {
    loadingMessage: 'Cargando horarios...',
  },

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
    closed: false,
    continuous: true,
    open: "09:00",
    close: "18:00",
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
// LOAD
// ============================================================
async function load(ctx) {
  const horarios = ensureHorariosStructure(ctx.comercioData?.horarios);
  console.log('✅ [LOAD] Horarios desde DB:', horarios);
  return { horarios };
}

// ============================================================
// RENDER
// ============================================================
function render(ctx, state) {
  const page = document.getElementById('skeleton-page');
  page.innerHTML = '';

  const refs = {
    dayCards: [],
    guardarBtn: null,
  };

  const uiState = {
    horarios: state.horarios,
  };

  // ==================== HEADER ====================
  const header = document.createElement('div');
  header.className = 'page-header';
  header.innerHTML = `
    <h2><i class="fas fa-clock"></i> Horarios de Atención</h2>
    <p>Configurá cuándo está abierto tu comercio</p>
  `;
  page.appendChild(header);

  // ==================== AI CARD ====================
  page.appendChild(createCard({
    title: '¡Tu IA conocerá tus horarios!',
    icon: 'fa-robot',
    variant: 'info',
    highlight: true,
    content: 'Configurando tus horarios, tu asistente sabrá cuándo puede atender clientes y gestionar pedidos automáticamente.',
    compact: true
  }));

  // ==================== GRID DE DÍAS ====================
  const grid = document.createElement('div');
  grid.className = 'horarios-grid';

  DAYS.forEach(day => {
    const card = createDayCard(day, uiState, refs);
    refs.dayCards.push(card);
    grid.appendChild(card);
  });

  page.appendChild(grid);

  // ==================== QUICK ACTIONS ====================
  const quickActions = document.createElement('div');
  quickActions.className = 'quick-actions';

  quickActions.appendChild(createButton({
    label: 'Copiar lunes a todos',
    icon: 'fa-copy',
    variant: 'secondary',
    onClick: () => {
      const lunes = structuredClone(uiState.horarios.lunes);
      DAYS.forEach(day => {
        if (day !== 'lunes') uiState.horarios[day] = structuredClone(lunes);
      });
      rebuildGrid(grid, uiState, refs);
      showToast('Horarios de lunes aplicados a todos los días', 'success');
    }
  }));

  quickActions.appendChild(createButton({
    label: 'Cerrar todos',
    icon: 'fa-times-circle',
    variant: 'secondary',
    onClick: () => {
      DAYS.forEach(day => { uiState.horarios[day].closed = true; });
      rebuildGrid(grid, uiState, refs);
      showToast('Todos los días marcados como cerrado', 'info');
    }
  }));

  page.appendChild(quickActions);

  // ==================== BOTÓN GUARDAR (onboarding-button canónico) ====================
  refs.guardarBtn = createOnboardingButton({
    stepName: 'horarios',
    getData: () => ({
      horarios: uiState.horarios,
      comercioId: ctx.comercioId,
    }),
    validate: () => DAYS.some(day => !uiState.horarios[day].closed),
  });

  const btnContainer = document.createElement('div');
  btnContainer.style.marginTop = '30px';
  btnContainer.appendChild(refs.guardarBtn);
  page.appendChild(btnContainer);
}

// ============================================================
// REBUILD GRID
// ============================================================
function rebuildGrid(grid, uiState, refs) {
  grid.innerHTML = '';
  refs.dayCards = [];
  DAYS.forEach(day => {
    const card = createDayCard(day, uiState, refs);
    refs.dayCards.push(card);
    grid.appendChild(card);
  });
}

// ============================================================
// DAY CARD
// ============================================================
function createDayCard(day, uiState, refs) {
  const schedule = uiState.horarios[day];
  const isOpen = !schedule.closed;

  const card = document.createElement('div');
  card.className = `day-card ${isOpen ? 'active' : ''}`;
  card.dataset.day = day;

  card.appendChild(createDayHeader(day, isOpen, uiState, refs));

  const body = document.createElement('div');
  body.className = `day-body ${!isOpen ? 'disabled' : ''}`;
  body.appendChild(buildDayContent(day, uiState, refs));
  card.appendChild(body);

  return card;
}

function createDayHeader(day, isOpen, uiState, refs) {
  const header = document.createElement('div');
  header.className = 'day-header';

  const toggle = document.createElement('div');
  toggle.className = 'day-toggle';

  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.id = `toggle_${day}`;
  checkbox.checked = isOpen;

  const label = document.createElement('label');
  label.htmlFor = `toggle_${day}`;
  label.innerHTML = `
    <span class="day-name">${DAYS_LABELS[day]}</span>
    <span class="status-badge">${isOpen ? 'Abierto' : 'Cerrado'}</span>
  `;

  checkbox.addEventListener('change', (e) => {
    uiState.horarios[day].closed = !e.target.checked;
    updateDayCard(day, uiState, refs);
  });

  toggle.appendChild(checkbox);
  toggle.appendChild(label);
  header.appendChild(toggle);

  return header;
}

function buildDayContent(day, uiState, refs) {
  const schedule = uiState.horarios[day];
  const container = document.createElement('div');
  container.className = 'day-content';

  if (schedule.closed) {
    const msg = document.createElement('p');
    msg.className = 'closed-message';
    msg.textContent = 'Este día el comercio permanece cerrado';
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
  const wrapper = document.createElement('div');
  wrapper.className = 'schedule-type-toggle';

  const label = document.createElement('label');
  label.className = 'schedule-type-label';

  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.id = `continuous_${day}`;
  checkbox.checked = isContinuous;

  checkbox.addEventListener('change', (e) => {
    uiState.horarios[day].continuous = e.target.checked;
    updateDayCard(day, uiState, refs);
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
  const wrapper = document.createElement('div');
  wrapper.className = 'continuous-schedule';

  const title = document.createElement('h4');
  title.textContent = 'Horario de atención';
  wrapper.appendChild(title);

  const timeWrapper = document.createElement('div');
  timeWrapper.className = 'time-inputs';

  timeWrapper.appendChild(createTimeInput({
    id: `open_${day}`,
    label: 'Apertura',
    value: schedule.open,
    onChange: (v) => { schedule.open = v; }
  }));

  timeWrapper.appendChild(createTimeInput({
    id: `close_${day}`,
    label: 'Cierre',
    value: schedule.close,
    onChange: (v) => { schedule.close = v; }
  }));

  wrapper.appendChild(timeWrapper);
  return wrapper;
}

function createSplitSchedule(day, uiState, refs) {
  const schedule = uiState.horarios[day];
  const wrapper = document.createElement('div');
  wrapper.className = 'split-schedule';

  wrapper.appendChild(createPeriodSection({
    day, period: 'morning', label: 'Mañana', icon: 'fa-sun',
    data: schedule.morning, uiState, refs
  }));

  const spacer = document.createElement('div');
  spacer.style.height = '20px';
  wrapper.appendChild(spacer);

  wrapper.appendChild(createPeriodSection({
    day, period: 'afternoon', label: 'Tarde', icon: 'fa-moon',
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
  checkbox.type = 'checkbox';
  checkbox.id = `${period}_enabled_${day}`;
  checkbox.checked = data.enabled;

  checkbox.addEventListener('change', (e) => {
    data.enabled = e.target.checked;
    updateDayCard(day, uiState, refs);
  });

  const span = document.createElement('span');
  span.innerHTML = `<i class="fas ${icon}"></i> ${label}`;

  toggleLabel.appendChild(checkbox);
  toggleLabel.appendChild(span);
  header.appendChild(toggleLabel);
  section.appendChild(header);

  if (!data.enabled) {
    const msg = document.createElement('p');
    msg.className = 'period-disabled';
    msg.textContent = `${label} cerrado`;
    section.appendChild(msg);
    return section;
  }

  const timeWrapper = document.createElement('div');
  timeWrapper.className = 'time-inputs';

  timeWrapper.appendChild(createTimeInput({
    id: `${period}_open_${day}`,
    label: 'Apertura',
    value: data.open,
    onChange: (v) => { data.open = v; }
  }));

  timeWrapper.appendChild(createTimeInput({
    id: `${period}_close_${day}`,
    label: 'Cierre',
    value: data.close,
    onChange: (v) => { data.close = v; }
  }));

  section.appendChild(timeWrapper);
  return section;
}

function createTimeInput({ id, label, value, onChange }) {
  const group = document.createElement('div');
  group.className = 'time-group';

  const labelEl = document.createElement('label');
  labelEl.textContent = label;

  const input = document.createElement('input');
  input.type = 'time';
  input.id = id;
  input.value = value;

  input.addEventListener('change', (e) => onChange(e.target.value));

  group.appendChild(labelEl);
  group.appendChild(input);

  return group;
}

// ============================================================
// UPDATE DAY CARD
// ============================================================
function updateDayCard(day, uiState, refs) {
  const index = DAYS.indexOf(day);
  const oldCard = refs.dayCards[index];
  const newCard = createDayCard(day, uiState, refs);
  oldCard.replaceWith(newCard);
  refs.dayCards[index] = newCard;
}
