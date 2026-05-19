// ============================================================
// src/pages/horarios.js
// ============================================================

import { runLifecycle }           from '/src/skeleton/lifecycle.js';
import { createFirebaseAdapter }  from '/src/skeleton/adapters/firebaseAdapter.js';
import { mountLayout }            from '/src/skeleton/layout/index.js';
import { runFlowController }      from '/src/controllers/flowController.js';
import { createCard }             from '/src/skeleton/components/card/index.js';
import { showToast }              from '/src/skeleton/components/toast/index.js';
import { createOnboardingButton } from '/src/skeleton/components/onboarding-button/index.js';

import './horarios.css';

const DAYS = ["lunes", "martes", "miercoles", "jueves", "viernes", "sabado", "domingo"];
const DAYS_LABELS = {
  lunes: "Lunes", martes: "Martes", miercoles: "Miércoles",
  jueves: "Jueves", viernes: "Viernes", sabado: "Sábado", domingo: "Domingo"
};

const DEFAULT_TURNO_CORRIDO  = [{ open: "09:00", close: "18:00" }];
const DEFAULT_TURNO_PARTIDO  = [{ open: "08:00", close: "13:00" }, { open: "16:00", close: "21:00" }];

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
// HELPERS — nueva estructura
// ============================================================

/**
 * Convierte la data de Firestore (nueva estructura) en el uiState interno.
 * Si el día no existe en Firestore, lo inicializa como cerrado con turnos vacíos
 * para que en modo edición el usuario vea el día pero sin horarios inventados.
 */
function normalizeHorarios(horariosData) {
  const result = {};
  DAYS.forEach(day => {
    const existing = horariosData?.[day];
    if (!existing) {
      // Día nunca configurado → cerrado, sin turnos
      result[day] = { open: false, turnos: [] };
    } else {
      result[day] = {
        open:   existing.open   ?? false,
        turnos: Array.isArray(existing.turnos) ? existing.turnos : []
      };
    }
  });
  return result;
}

/**
 * Determina el modo de horario según la cantidad de turnos.
 * Retorna 'corrido' | 'partido' | null (si está cerrado o sin turnos)
 */
function getModo(daySchedule) {
  if (!daySchedule.open || daySchedule.turnos.length === 0) return null;
  return daySchedule.turnos.length === 1 ? 'corrido' : 'partido';
}

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

  const horarios = normalizeHorarios(horariosData);

  const entityType        = ctx.comercioData?.entityType || 'comercio';
  const tieneLocalFisico  = entityType === 'comercio'
    ? ctx.comercioData?.tieneLocalFisico !== false
    : ctx.comercioData?.modalidad_trabajo === 'local';

  return { horarios, tieneLocalFisico, isDelivery };
}

// ============================================================
// RENDER
// ============================================================
function render(ctx, state) {
  const page = document.getElementById('skeleton-page');
  page.innerHTML = '';

  const refs    = { dayCards: [] };
  const uiState = { horarios: state.horarios };

  const originalSnapshot  = structuredClone(state.horarios);
  const dirtyController   = {
    hasUnsavedChanges: () => JSON.stringify(uiState.horarios) !== JSON.stringify(originalSnapshot),
    markSaved:         () => Object.assign(originalSnapshot, structuredClone(uiState.horarios))
  };

  // ── HEADER ───────────────────────────────────────────────
  const header = document.createElement('div');
  header.className = 'page-header';

  if (state.isDelivery) {
    header.innerHTML = `
      <h2><i class="fas fa-motorcycle"></i> Horarios de Delivery</h2>
      <p>Configurá cuándo pueden realizarse entregas</p>`;
  } else if (state.tieneLocalFisico) {
    header.innerHTML = `
      <h2><i class="fas fa-clock"></i> Horarios de Atención</h2>
      <p>Configurá cuándo está abierto tu local</p>`;
  } else {
    header.innerHTML = `
      <h2><i class="fas fa-clock"></i> Horarios de Trabajo</h2>
      <p>Configurá en qué horarios trabajás habitualmente</p>`;
  }
  page.appendChild(header);

  // ── AI CARD ───────────────────────────────────────────────
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
    content:   aiCardContent
  }));

  // ── GRID DE DÍAS ─────────────────────────────────────────
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
    stepName: state.isDelivery ? 'horarios-delivery' : 'horarios',

    validate: () => DAYS.some(day => uiState.horarios[day].open),

    // Solo guardamos los días que el usuario configuró (open true o false).
    // El campo `open` es la fuente de verdad; los días sin tocar tienen turnos:[].
    getData: () => ({
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
// DAY CARD
// ============================================================
function createDayCard(day, uiState, refs, tieneLocalFisico) {
  const schedule = uiState.horarios[day];
  const isOpen   = schedule.open;

  const card = document.createElement('div');
  card.className   = `day-card ${isOpen ? 'active' : ''}`;
  card.dataset.day = day;

  card.appendChild(createDayHeader(day, isOpen, uiState, refs, tieneLocalFisico));

  const body = document.createElement('div');
  body.className = `day-body ${!isOpen ? 'disabled' : ''}`;
  if (isOpen) body.appendChild(buildDayContent(day, uiState, refs));
  card.appendChild(body);

  return card;
}

function createDayHeader(day, isOpen, uiState, refs, tieneLocalFisico) {
  const header = document.createElement('div');
  header.className = 'day-header';

  const toggle   = document.createElement('div');
  toggle.className = 'day-toggle';

  const checkbox = document.createElement('input');
  checkbox.type    = 'checkbox';
  checkbox.id      = `toggle_${day}`;
  checkbox.checked = isOpen;

  const openLabel   = tieneLocalFisico ? 'Abierto'       : 'Disponible';
  const closedLabel = tieneLocalFisico ? 'Cerrado'       : 'No disponible';

  const label = document.createElement('label');
  label.htmlFor = `toggle_${day}`;
  label.innerHTML = `
    <span class="day-name">${DAYS_LABELS[day]}</span>
    <span class="status-badge">${isOpen ? openLabel : closedLabel}</span>
  `;

  checkbox.addEventListener('change', (e) => {
    const opening = e.target.checked;
    uiState.horarios[day].open = opening;

    // Si abre por primera vez y no tiene turnos, inicializar con corrido por defecto
    if (opening && uiState.horarios[day].turnos.length === 0) {
      uiState.horarios[day].turnos = structuredClone(DEFAULT_TURNO_CORRIDO);
    }

    updateDayCard(day, uiState, refs, tieneLocalFisico);
    document.dispatchEvent(new Event('change'));
  });

  toggle.appendChild(checkbox);
  toggle.appendChild(label);
  header.appendChild(toggle);
  return header;
}

// ============================================================
// DAY CONTENT
// ============================================================
function buildDayContent(day, uiState, refs) {
  const schedule  = uiState.horarios[day];
  const container = document.createElement('div');
  container.className = 'day-content';

  const modo = getModo(schedule);

  // Toggle corrido / partido
  container.appendChild(createModeToggle(day, modo === 'corrido', uiState, refs));

  const separator = document.createElement('hr');
  separator.className = 'content-separator';
  container.appendChild(separator);

  if (modo === 'corrido') {
    container.appendChild(createTurnoSection({
      day, turnoIndex: 0, label: 'Horario de atención', uiState
    }));
  } else {
    container.appendChild(createTurnoSection({
      day, turnoIndex: 0, label: 'Mañana', icon: 'fa-sun', uiState
    }));
    const spacer = document.createElement('div');
    spacer.style.height = '20px';
    container.appendChild(spacer);
    container.appendChild(createTurnoSection({
      day, turnoIndex: 1, label: 'Tarde', icon: 'fa-moon', uiState
    }));
  }

  return container;
}

function createModeToggle(day, isCorrido, uiState, refs) {
  const wrapper  = document.createElement('div');
  wrapper.className = 'schedule-type-toggle';

  const label    = document.createElement('label');
  label.className = 'schedule-type-label';

  const checkbox = document.createElement('input');
  checkbox.type    = 'checkbox';
  checkbox.id      = `corrido_${day}`;
  checkbox.checked = isCorrido;

  checkbox.addEventListener('change', (e) => {
    if (e.target.checked) {
      // Partido → Corrido: tomamos el open del primer turno o default
      const primerOpen = uiState.horarios[day].turnos[0]?.open || "09:00";
      uiState.horarios[day].turnos = [{ open: primerOpen, close: "18:00" }];
    } else {
      // Corrido → Partido: tomamos el open del turno actual o default
      const openActual = uiState.horarios[day].turnos[0]?.open || "08:00";
      uiState.horarios[day].turnos = [
        { open: openActual, close: "13:00" },
        { open: "16:00",   close: "21:00" }
      ];
    }
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

// ============================================================
// TURNO SECTION
// Un turno = { open: "HH:MM", close: "HH:MM" (puede ser > 24) }
// ============================================================
function createTurnoSection({ day, turnoIndex, label, icon, uiState }) {
  const turno   = uiState.horarios[day].turnos[turnoIndex];
  const section = document.createElement('div');
  section.className = 'schedule-period';

  if (icon) {
    const header = document.createElement('div');
    header.className = 'period-header';
    header.innerHTML = `<span class="period-label"><i class="fas ${icon}"></i> ${label}</span>`;
    section.appendChild(header);
  } else {
    const title = document.createElement('h4');
    title.textContent = label;
    section.appendChild(title);
  }

  const timeWrapper = document.createElement('div');
  timeWrapper.className = 'time-inputs';

  timeWrapper.appendChild(createTimeInput({
    id:       `open_${turnoIndex}_${day}`,
    label:    'Apertura',
    value:    turno.open,
    onChange: (v) => { turno.open = v; document.dispatchEvent(new Event('change')); }
  }));

  timeWrapper.appendChild(createTimeInput({
    id:        `close_${turnoIndex}_${day}`,
    label:     'Cierre',
    value:     turno.close,
    isClose:   true,
    openValue: turno.open,
    onChange:  (v) => { turno.close = v; document.dispatchEvent(new Event('change')); }
  }));

  section.appendChild(timeWrapper);
  return section;
}

// ============================================================
// TIME INPUT
// ============================================================
function createTimeInput({ id, label, value, onChange, isClose = false, openValue = null }) {
  const group = document.createElement('div');
  group.className = 'time-group';

  const labelEl = document.createElement('label');
  labelEl.setAttribute('for', `${id}_h`);
  labelEl.textContent = label;
  group.appendChild(labelEl);

  // Normalizar — puede venir como "25:00" (extendido) → mostrar como "01"
  const [hStr = '09', mStr = '00'] = (value || '09:00').split(':');
  const currentH = parseInt(hStr, 10) % 24;
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
    const h = parseInt(selectH.value, 10);

    if (isClose && openValue) {
      const openH = parseInt((openValue || '00:00').split(':')[0], 10) % 24;
      if (h <= openH) {
        // Cierre cruza medianoche → hora extendida
        onChange(`${String(h + 24).padStart(2, '0')}:${selectM.value}`);
        document.dispatchEvent(new Event('change'));
        return;
      }
    }

    onChange(`${selectH.value}:${selectM.value}`);
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
