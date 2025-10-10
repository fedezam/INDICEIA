// js/horarios.js
// Lógica de la página Horarios (modular, dependencias en ./shared.js y ./navigation.js)

import { LocalData, Utils, FirebaseHelpers, PlansManager, AuthHelpers, auth } from './shared.js';
import Navigation from './navigation.js';

const DAYS = [
  { key: "lunes", label: "Lunes" },
  { key: "martes", label: "Martes" },
  { key: "miercoles", label: "Miércoles" },
  { key: "jueves", label: "Jueves" },
  { key: "viernes", label: "Viernes" },
  { key: "sabado", label: "Sábado" },
  { key: "domingo", label: "Domingo" }
];

let userData = {};
let saveDebounceTimer = null;
const SAVE_DEBOUNCE_MS = 900;

function waitForAuth() {
  return new Promise((resolve) => {
    const unsubscribe = auth.onAuthStateChanged((u) => {
      unsubscribe();
      resolve(u);
    });
  });
}

// -------------------------
// Inicialización
// -------------------------
document.addEventListener('DOMContentLoaded', async () => {
  try {
    Utils.showLoading?.('Verificando sesión...');

    const user = await waitForAuth();
    if (!user) {
      window.location.href = '/index.html';
      return;
    }

    Utils.showLoading?.('Cargando horarios...');

    userData = (await FirebaseHelpers.getUserData()) || {};

    renderScheduleForm();
    setupEventListeners();
    updateUIWithUserData();
    updateSubscriptionBanner();

    // Inicializar navegación si existe
    if (Navigation && typeof Navigation.init === 'function') Navigation.init();

    // Validación usada por el flujo de navegación
    window.validateCurrentPageData = validateCurrentPageData;

    Utils.hideLoading?.();
  } catch (error) {
    Utils.hideLoading?.();
    console.error('Error inicializando página de horarios:', error);
    // Intentar mostrar toast con la API que exista
    if (typeof Utils.showToast === 'function') {
      try { Utils.showToast('Error', 'No se pudo cargar la página', 'error'); } catch (e) { alert('No se pudo cargar la página'); }
    } else alert('No se pudo cargar la página');
  }
});

// -------------------------
// Renderizado del formulario
// -------------------------
function renderScheduleForm() {
  const container = document.getElementById('scheduleGrid');
  if (!container) return;

  const horarios = userData.horarios || {};

  container.innerHTML = DAYS.map(day => {
    const dayData = horarios[day.key] || {
      closed: true,
      continuous: false,
      morning: { enabled: false, open: '08:00', close: '12:00' },
      afternoon: { enabled: false, open: '16:00', close: '20:00' }
    };

    // seguridad
    if (!dayData.morning) dayData.morning = { enabled: false, open: '08:00', close: '12:00' };
    if (!dayData.afternoon) dayData.afternoon = { enabled: false, open: '16:00', close: '20:00' };

    const dayEnabled = !dayData.closed;
    const continuous = !!dayData.continuous;

    // Valores para schedule continuo
    const continuousOpen = dayData.open || '09:00';
    const continuousClose = dayData.close || '18:00';

    return `
      <div class="schedule-day" data-day="${day.key}">
        <div class="day-header">
          <label class="day-toggle">
            <input type="checkbox" ${dayEnabled ? 'checked' : ''} />
            <span>${day.label} (marcar para habilitar)</span>
          </label>
        </div>

        <div class="day-hours ${dayEnabled ? '' : 'disabled'}">
          <div class="schedule-mode">
            <label class="schedule-option">
              <input type="radio" name="${day.key}_mode" value="continuous" ${continuous ? 'checked' : ''} />
              <span>Horario Continuo</span>
            </label>
            <label class="schedule-option">
              <input type="radio" name="${day.key}_mode" value="split" ${!continuous ? 'checked' : ''} />
              <span>Horario Cortado</span>
            </label>
          </div>

          <div class="time-blocks">
            <div class="time-block continuous-schedule ${continuous ? '' : 'hidden'}">
              <label>Horario:</label>
              <div class="time-range">
                <input class="continuous-open" type="time" value="${continuousOpen}" />
                <span>a</span>
                <input class="continuous-close" type="time" value="${continuousClose}" />
              </div>
            </div>

            <div class="time-block split-schedule ${!continuous ? '' : 'hidden'}">
              <div class="morning-hours">
                <label>
                  <input class="morning-enabled" type="checkbox" ${dayData.morning.enabled ? 'checked' : ''} />
                  <span>Mañana:</span>
                </label>
                <div class="time-range">
                  <input class="morning-open" type="time" value="${dayData.morning.open}" ${dayData.morning.enabled ? '' : 'disabled'} />
                  <span>a</span>
                  <input class="morning-close" type="time" value="${dayData.morning.close}" ${dayData.morning.enabled ? '' : 'disabled'} />
                </div>
              </div>

              <div class="afternoon-hours">
                <label>
                  <input class="afternoon-enabled" type="checkbox" ${dayData.afternoon.enabled ? 'checked' : ''} />
                  <span>Tarde:</span>
                </label>
                <div class="time-range">
                  <input class="afternoon-open" type="time" value="${dayData.afternoon.open}" ${dayData.afternoon.enabled ? '' : 'disabled'} />
                  <span>a</span>
                  <input class="afternoon-close" type="time" value="${dayData.afternoon.close}" ${dayData.afternoon.enabled ? '' : 'disabled'} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// -------------------------
// Event listeners y guardado
// -------------------------
function setupEventListeners() {
  const grid = document.getElementById('scheduleGrid');
  if (!grid) return;

  // Delegación de eventos para cambios en el grid
  grid.addEventListener('change', (e) => {
    const target = e.target;

    // Toggle día (habilitar / deshabilitar)
    if (target.matches('.day-toggle input[type="checkbox"]')) {
      const dayEl = target.closest('.schedule-day');
      const hoursEl = dayEl.querySelector('.day-hours');
      if (target.checked) hoursEl.classList.remove('disabled');
      else hoursEl.classList.add('disabled');

      scheduleChanged();
      return;
    }

    // Cambio de modo continuous / split
    if (target.matches('input[type="radio"][name$="_mode"]')) {
      const name = target.name; // ex: lunes_mode
      const dayKey = name.replace('_mode', '');
      const dayEl = document.querySelector(`.schedule-day[data-day="${dayKey}"]`);
      if (!dayEl) return;

      const continuousBlock = dayEl.querySelector('.continuous-schedule');
      const splitBlock = dayEl.querySelector('.split-schedule');

      if (target.value === 'continuous') {
        continuousBlock.classList.remove('hidden');
        splitBlock.classList.add('hidden');
      } else {
        continuousBlock.classList.add('hidden');
        splitBlock.classList.remove('hidden');
      }

      scheduleChanged();
      return;
    }

    // Toggle mañana/tarde en modo cortado
    if (target.matches('.morning-enabled, .afternoon-enabled')) {
      const section = target.closest('.morning-hours') || target.closest('.afternoon-hours');
      if (!section) return;
      const timeInputs = section.querySelectorAll('.time-range input[type="time"]');
      timeInputs.forEach(i => i.disabled = !target.checked);

      scheduleChanged();
      return;
    }

    // Cambios en inputs de tipo time
    if (target.matches('input[type="time"]')) {
      scheduleChanged();
      return;
    }
  });

  // Botón logout
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      if (!confirm('¿Cerrar sesión?')) return;
      try {
        await AuthHelpers.logout();
        window.location.href = '/index.html';
      } catch (err) {
        console.error('Error al cerrar sesión:', err);
        Utils.showToast?.('Error', 'No se pudo cerrar sesión', 'error');
      }
    });
  }

  // Guardar al salir de la página
  window.addEventListener('beforeunload', (e) => {
    // guardar sincronamente si es posible
    if (saveDebounceTimer) clearTimeout(saveDebounceTimer);
    // Intentamos guardar pero no podemos garantizar completitud en beforeunload
    navigator.sendBeacon && saveScheduleData().catch(() => {});
  });
}

function scheduleChanged() {
  if (saveDebounceTimer) clearTimeout(saveDebounceTimer);
  saveDebounceTimer = setTimeout(() => {
    saveScheduleData().catch(err => console.error('Error auto-guardando horarios:', err));
  }, SAVE_DEBOUNCE_MS);
}

// -------------------------
// Lectura y armado de datos
// -------------------------
function getScheduleData() {
  const grid = document.getElementById('scheduleGrid');
  if (!grid) return {};

  const days = Array.from(grid.querySelectorAll('.schedule-day'));
  const horarios = {};

  days.forEach(dayEl => {
    const day = dayEl.dataset.day;
    const enabled = !!dayEl.querySelector('.day-toggle input[type="checkbox"]')?.checked;

    if (!enabled) {
      horarios[day] = { closed: true };
      return;
    }

    const continuous = !!dayEl.querySelector(`input[name="${day}_mode"][value="continuous"]`)?.checked;

    if (continuous) {
      const inputs = dayEl.querySelectorAll('.continuous-schedule .time-range input[type="time"]');
      horarios[day] = {
        closed: false,
        continuous: true,
        open: inputs[0]?.value || '09:00',
        close: inputs[1]?.value || '18:00'
      };
    } else {
      const morningEnabled = !!dayEl.querySelector('.morning-enabled')?.checked;
      const afternoonEnabled = !!dayEl.querySelector('.afternoon-enabled')?.checked;

      const morningInputs = Array.from(dayEl.querySelectorAll('.morning-hours .time-range input[type="time"]'));
      const afternoonInputs = Array.from(dayEl.querySelectorAll('.afternoon-hours .time-range input[type="time"]'));

      horarios[day] = {
        closed: false,
        continuous: false,
        morning: {
          enabled: morningEnabled,
          open: morningEnabled ? (morningInputs[0]?.value || '08:00') : '00:00',
          close: morningEnabled ? (morningInputs[1]?.value || '12:00') : '00:00'
        },
        afternoon: {
          enabled: afternoonEnabled,
          open: afternoonEnabled ? (afternoonInputs[0]?.value || '16:00') : '00:00',
          close: afternoonEnabled ? (afternoonInputs[1]?.value || '20:00') : '00:00'
        }
      };
    }
  });

  return horarios;
}

// -------------------------
// Guardado en Firestore
// -------------------------
async function saveScheduleData() {
  const horarios = getScheduleData();
  try {
    await FirebaseHelpers.updateUserData({ horarios });
    userData.horarios = horarios;
    Utils.showToast?.('Horarios', 'Horarios guardados', 'success');
  } catch (error) {
    console.error('Error saving schedule:', error);
    Utils.showToast?.('Error', 'No se pudo guardar los horarios', 'error');
  }
}

// -------------------------
// Integración con navegación
// -------------------------
// Guardado antes de cambiar de página si Navigation expone los métodos
if (Navigation) {
  const originalNext = Navigation.goToNextPage;
  if (typeof originalNext === 'function') {
    Navigation.goToNextPage = async function() {
      try { await saveScheduleData(); } catch (e) { /* ignore */ }
      return originalNext.call(this);
    };
  }

  const originalPrev = Navigation.goToPreviousPage;
  if (typeof originalPrev === 'function') {
    Navigation.goToPreviousPage = async function() {
      try { await saveScheduleData(); } catch (e) { /* ignore */ }
      return originalPrev.call(this);
    };
  }
}

// -------------------------
// Validadores y UI helpers
// -------------------------
function validateCurrentPageData() {
  const horarios = getScheduleData();
  const hasValidSchedule = Object.values(horarios).some(day => {
    if (day.closed) return false;
    if (day.continuous) {
      return day.open && day.close && day.open !== '00:00' && day.close !== '00:00';
    } else {
      const hasMorning = day.morning?.enabled && day.morning.open !== '00:00';
      const hasAfternoon = day.afternoon?.enabled && day.afternoon.open !== '00:00';
      return hasMorning || hasAfternoon;
    }
  });

  if (!hasValidSchedule) {
    Utils.showToast?.('Horarios', 'Debes configurar al menos un horario válido', 'warning');
  }
  return hasValidSchedule;
}

function updateSubscriptionBanner() {
  const banner = document.getElementById('subscriptionBanner');
  const messageEl = document.getElementById('subscriptionMessage');
  if (!banner || !messageEl) return;

  const trialEnd = userData.trialEndDate ? new Date(userData.trialEndDate) : null;
  const now = new Date();
  const status = userData.estado || 'trial';

  if (status === 'active') {
    const endDate = userData.subscriptionEndDate ? new Date(userData.subscriptionEndDate) : null;
    const formattedDate = endDate ? endDate.toLocaleDateString('es-ES') : 'fecha no disponible';
    messageEl.textContent = `Suscripción activa hasta ${formattedDate}`;
    banner.className = 'subscription-banner active';
  } else if (status === 'trial' && trialEnd) {
    const daysLeft = Math.ceil((trialEnd - now) / (1000 * 60 * 60 * 24));
    if (daysLeft > 0) {
      messageEl.textContent = `Trial gratuito - ${daysLeft} días restantes`;
      banner.className = 'subscription-banner';
    } else {
      messageEl.textContent = `Trial expirado - actualiza tu plan`;
      banner.className = 'subscription-banner expired';
    }
  } else {
    messageEl.textContent = `Suscripción vencida - actualiza tu plan`;
    banner.className = 'subscription-banner expired';
  }
}

function updateUIWithUserData() {
  const commerceNameEl = document.getElementById('commerceName');
  const planBadgeEl = document.getElementById('planBadge');

  if (commerceNameEl) commerceNameEl.textContent = userData.nombreComercio || userData.displayName || userData.email || 'Comercio';
  if (planBadgeEl) planBadgeEl.textContent = (userData.plan || 'Trial');
}
