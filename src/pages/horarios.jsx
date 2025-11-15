// src/pages/horarios.jsx
import { auth, db } from '../firebase.js';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import Navigation from '../shared/navigation.jsx';
import { showLoading, hideLoading, showToast } from '../shared/utils.jsx';
import { redirectToNextStep } from '../shared/redirect-dashboard.jsx';

const DAYS = [
  { key: "lunes", label: "Lunes" },
  { key: "martes", label: "Martes" },
  { key: "miercoles", label: "Miércoles" },
  { key: "jueves", label: "Jueves" },
  { key: "viernes", label: "Viernes" },
  { key: "sabado", label: "Sábado" },
  { key: "domingo", label: "Domingo" }
];

let currentUser = null;
let currentComercioId = null;
let comercioData = {};
let originalHorarios = {};
let hasUnsavedChanges = false;

document.addEventListener('DOMContentLoaded', async () => {
  try {
    showLoading('Verificando sesión...');
    
    const user = await new Promise((resolve) => {
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        unsubscribe();
        resolve(user);
      });
    });

    if (!user) {
      window.location.href = '/index.html';
      return;
    }

    currentUser = user;
    showLoading('Cargando horarios...');
    
    const userRef = doc(db, 'usuarios', currentUser.uid);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists() || !userDoc.data().comercioId) {
      window.location.href = './mi-comercio.html';
      return;
    }
    
    currentComercioId = userDoc.data().comercioId;
    
    const comercioRef = doc(db, 'comercios', currentComercioId);
    const comercioDoc = await getDoc(comercioRef);
    
    if (comercioDoc.exists()) {
      comercioData = { id: currentComercioId, ...comercioDoc.data() };
    }

    originalHorarios = JSON.parse(JSON.stringify(comercioData.horarios || {}));

    renderScheduleForm();
    setupEventListeners();
    updateHeader();
    updateSubscriptionBanner();
    Navigation.init();
    createSaveButton();

    window.validateCurrentPageData = () => {
      const horarios = getScheduleData();
      const hasValidSchedule = Object.values(horarios).some(day => {
        if (day.closed) return false;
        if (day.continuous) {
          return day.open && day.close && day.open !== "00:00" && day.close !== "00:00";
        } else {
          const hasMorning = day.morning?.enabled && day.morning?.open && day.morning?.close && day.morning.open !== "00:00";
          const hasAfternoon = day.afternoon?.enabled && day.afternoon?.open && day.afternoon?.close && day.afternoon.open !== "00:00";
          return hasMorning || hasAfternoon;
        }
      });
      if (!hasValidSchedule) {
        showToast('Horarios', 'Debes configurar al menos un horario válido', 'warning');
      }
      return hasValidSchedule;
    };

    hideLoading();
  } catch (error) {
    hideLoading();
    console.error('Error:', error);
    showToast('Error', 'No se pudo cargar la página: ' + error.message, 'error');
  }
});

function updateHeader() {
  const commerceName = document.getElementById('commerceName');
  const planBadge = document.getElementById('planBadge');
  
  if (commerceName) {
    commerceName.textContent = comercioData.nombreComercio || 'Mi Comercio';
  }
  if (planBadge) {
    const plan = comercioData.plan || 'trial';
    planBadge.textContent = plan.charAt(0).toUpperCase() + plan.slice(1);
  }
}

function updateSubscriptionBanner() {
  const banner = document.getElementById('subscriptionBanner');
  const messageEl = document.getElementById('subscriptionMessage');
  
  if (!banner || !messageEl) return;
  
  const now = new Date();
  const trialStart = comercioData.fechaInicioTrial ? new Date(comercioData.fechaInicioTrial) : null;
  const trialEnd = trialStart ? new Date(trialStart.getTime() + 5 * 24 * 60 * 60 * 1000) : null;
  
  if (comercioData.plan === 'trial' && trialEnd) {
    const daysLeft = Math.ceil((trialEnd - now) / (1000 * 60 * 60 * 24));
    if (daysLeft > 0) {
      messageEl.innerHTML = `<strong>Trial activo</strong> - Te quedan <strong>${daysLeft} días</strong>`;
      banner.className = 'subscription-banner trial';
    } else {
      messageEl.innerHTML = `<strong>Tu trial expiró.</strong> Elige un plan para continuar`;
      banner.className = 'subscription-banner expired';
    }
  } else if (comercioData.plan && comercioData.plan !== 'trial') {
    messageEl.innerHTML = `<strong>Plan ${comercioData.plan}</strong> activo`;
    banner.className = 'subscription-banner active';
  } else {
    messageEl.textContent = 'Completa tu información para activar tu IA';
    banner.className = 'subscription-banner';
  }
}

function renderScheduleForm() {
  const container = document.getElementById('scheduleGrid');
  if (!container) return;

  const horarios = comercioData.horarios || {};
  
  container.innerHTML = DAYS.map(day => {
    const dayData = horarios[day.key] || {
      closed: true,
      continuous: false,
      morning: { enabled: false, open: "08:00", close: "12:00" },
      afternoon: { enabled: false, open: "16:00", close: "20:00" }
    };
    
    if (!dayData.morning) dayData.morning = { enabled: false, open: "08:00", close: "12:00" };
    if (!dayData.afternoon) dayData.afternoon = { enabled: false, open: "16:00", close: "20:00" };
    
    return `
      <div class="schedule-day" data-day="${day.key}">
        <div class="day-header">
          <label class="day-toggle">
            <input type="checkbox" ${!dayData.closed ? "checked" : ""}>
            <span>${day.label} (marcar para habilitar)</span>
          </label>
        </div>
        <div class="day-hours ${dayData.closed ? "disabled" : ""}">
          <div class="schedule-mode">
            <label class="schedule-option">
              <input type="radio" name="${day.key}_mode" value="continuous" ${dayData.continuous ? "checked" : ""}>
              <span>Horario Continuo</span>
            </label>
            <label class="schedule-option">
              <input type="radio" name="${day.key}_mode" value="split" ${!dayData.continuous ? "checked" : ""}>
              <span>Horario Cortado</span>
            </label>
          </div>
          <div class="time-blocks">
            <div class="time-block continuous-schedule ${dayData.continuous ? "" : "hidden"}">
              <label>Horario:</label>
              <div class="time-range">
                <input type="time" value="${dayData.open || "09:00"}">
                <span>a</span>
                <input type="time" value="${dayData.close || "18:00"}">
              </div>
            </div>
            <div class="time-block split-schedule ${!dayData.continuous ? "" : "hidden"}">
              <div class="morning-hours">
                <label>
                  <input type="checkbox" ${dayData.morning.enabled ? "checked" : ""}>
                  <span>Mañana:</span>
                </label>
                <div class="time-range">
                  <input type="time" value="${dayData.morning.open}" ${dayData.morning.enabled ? "" : "disabled"}>
                  <span>a</span>
                  <input type="time" value="${dayData.morning.close}" ${dayData.morning.enabled ? "" : "disabled"}>
                </div>
              </div>
              <div class="afternoon-hours">
                <label>
                  <input type="checkbox" ${dayData.afternoon.enabled ? "checked" : ""}>
                  <span>Tarde:</span>
                </label>
                <div class="time-range">
                  <input type="time" value="${dayData.afternoon.open}" ${dayData.afternoon.enabled ? "" : "disabled"}>
                  <span>a</span>
                  <input type="time" value="${dayData.afternoon.close}" ${dayData.afternoon.enabled ? "" : "disabled"}>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function setupEventListeners() {
  const grid = document.getElementById('scheduleGrid');
  
  grid.addEventListener('change', (e) => {
    if (e.target.type === 'checkbox' && e.target.closest('.day-toggle')) {
      const dayEl = e.target.closest('.schedule-day');
      const dayHours = dayEl.querySelector('.day-hours');
      const isEnabled = e.target.checked;
      dayHours.classList.toggle('disabled', !isEnabled);
    }
    
    if (e.target.type === 'radio' && e.target.name.includes('_mode')) {
      const dayEl = e.target.closest('.schedule-day');
      const isContinuous = e.target.value === 'continuous';
      const continuousBlock = dayEl.querySelector('.continuous-schedule');
      const splitBlock = dayEl.querySelector('.split-schedule');
      continuousBlock.classList.toggle('hidden', !isContinuous);
      splitBlock.classList.toggle('hidden', isContinuous);
    }
    
    if (e.target.type === 'checkbox' && (e.target.closest('.morning-hours') || e.target.closest('.afternoon-hours'))) {
      const timeRange = e.target.closest('.morning-hours, .afternoon-hours').querySelector('.time-range');
      const inputs = timeRange.querySelectorAll('input[type="time"]');
      inputs.forEach(input => input.disabled = !e.target.checked);
    }
    
    markAsChanged();
  });

  grid.addEventListener('input', (e) => {
    if (e.target.type === 'time') markAsChanged();
  });

  document.getElementById('logoutBtn')?.addEventListener('click', async () => {
    if (confirm('¿Cerrar sesión?')) {
      await signOut(auth);
      window.location.href = '/index.html';
    }
  });

  window.addEventListener('beforeunload', (e) => {
    if (hasUnsavedChanges) {
      e.preventDefault();
      e.returnValue = '¿Seguro que quieres salir? Tienes cambios sin guardar.';
    }
  });
}

function markAsChanged() {
  hasUnsavedChanges = true;
  const saveBtn = document.getElementById('saveChangesBtn');
  if (saveBtn) {
    saveBtn.disabled = false;
    saveBtn.className = 'btn-save';
    saveBtn.innerHTML = '<i class="fas fa-save"></i> <span>Guardar Cambios</span>';
  }
}

function createSaveButton() {
  const userInfo = document.querySelector('.header .user-info');
  if (!userInfo) return;

  const saveBtn = document.createElement('button');
  saveBtn.id = 'saveChangesBtn';
  saveBtn.className = 'btn-save';
  saveBtn.disabled = true;
  saveBtn.innerHTML = '<i class="fas fa-save"></i> <span>Guardar Cambios</span>';
  
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    userInfo.insertBefore(saveBtn, logoutBtn);
  } else {
    userInfo.appendChild(saveBtn);
  }

  saveBtn.addEventListener('click', saveScheduleData);

  const style = document.createElement('style');
  style.textContent = `
    .header .user-info { display: flex; align-items: center; gap: 1rem; }
    .btn-save {
      display: flex; align-items: center; gap: 0.5rem; padding: 0.625rem 1.25rem;
      border: none; border-radius: 8px; font-size: 0.875rem; font-weight: 600;
      cursor: pointer; transition: all 0.3s ease; background: #667eea; color: white;
      white-space: nowrap;
    }
    .btn-save:disabled { background: #e2e8f0; color: #94a3b8; cursor: not-allowed; }
    .btn-save:not(:disabled):hover { background: #5568d3; transform: translateY(-1px); box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4); }
    .btn-save.saving { background: #f59e0b; }
    .btn-save.saved { background: #10b981; }
    .btn-save i { font-size: 1rem; }
    .btn-save.saving i { animation: spin 1s linear infinite; }
    @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  `;
  document.head.appendChild(style);
}

function getScheduleData() {
  const grid = document.getElementById('scheduleGrid');
  if (!grid) return {};

  const days = Array.from(grid.querySelectorAll('.schedule-day'));
  const horarios = {};

  days.forEach(dayEl => {
    const day = dayEl.dataset.day;
    const enabled = dayEl.querySelector('.day-toggle input[type="checkbox"]')?.checked ?? false;
    
    if (!enabled) {
      horarios[day] = { closed: true };
      return;
    }

    const continuous = dayEl.querySelector(`input[name="${day}_mode"][value="continuous"]`)?.checked ?? false;
    
    if (continuous) {
      const inputs = dayEl.querySelectorAll('.continuous-schedule input[type="time"]');
      horarios[day] = {
        closed: false,
        continuous: true,
        open: inputs[0]?.value || "09:00",
        close: inputs[1]?.value || "18:00"
      };
    } else {
      const morningEnabled = dayEl.querySelector('.morning-hours input[type="checkbox"]')?.checked ?? false;
      const afternoonEnabled = dayEl.querySelector('.afternoon-hours input[type="checkbox"]')?.checked ?? false;
      
      const morningInputs = dayEl.querySelectorAll('.morning-hours input[type="time"]');
      const afternoonInputs = dayEl.querySelectorAll('.afternoon-hours input[type="time"]');
      
      horarios[day] = {
        closed: false,
        continuous: false,
        morning: {
          enabled: morningEnabled,
          open: morningEnabled ? (morningInputs[0]?.value || "08:00") : "00:00",
          close: morningEnabled ? (morningInputs[1]?.value || "12:00") : "00:00"
        },
        afternoon: {
          enabled: afternoonEnabled,
          open: afternoonEnabled ? (afternoonInputs[0]?.value || "16:00") : "00:00",
          close: afternoonEnabled ? (afternoonInputs[1]?.value || "20:00") : "00:00"
        }
      };
    }
  });

  return horarios;
}

async function saveScheduleData() {
  const saveBtn = document.getElementById('saveChangesBtn');
  
  const horarios = getScheduleData();
  const hasValidSchedule = Object.values(horarios).some(day => {
    if (day.closed) return false;
    if (day.continuous) {
      return day.open && day.close && day.open !== "00:00" && day.close !== "00:00";
    } else {
      const hasMorning = day.morning?.enabled && day.morning?.open && day.morning?.close && day.morning.open !== "00:00";
      const hasAfternoon = day.afternoon?.enabled && day.afternoon?.open && day.afternoon?.close && day.afternoon.open !== "00:00";
      return hasMorning || hasAfternoon;
    }
  });

  if (!hasValidSchedule) {
    showToast('Horarios', 'Debes configurar al menos un horario válido', 'warning');
    return false;
  }

  try {
    if (saveBtn) {
      saveBtn.className = 'btn-save saving';
      saveBtn.innerHTML = '<i class="fas fa-spinner"></i> <span>Guardando...</span>';
      saveBtn.disabled = true;
    }

    // GUARDAR SOLO EN FIRESTORE
    const comercioRef = doc(db, 'comercios', currentComercioId);
    await updateDoc(comercioRef, { 
      horarios,
      fechaActualizacion: new Date()
    });

    // ACTUALIZAR ESTADO LOCAL
    comercioData.horarios = horarios;
    originalHorarios = JSON.parse(JSON.stringify(horarios));
    hasUnsavedChanges = false;

    // UI FEEDBACK
    if (saveBtn) {
      saveBtn.className = 'btn-save saved';
      saveBtn.innerHTML = '<i class="fas fa-check-circle"></i> <span>Guardado</span>';
      setTimeout(() => {
        saveBtn.disabled = true;
        saveBtn.className = 'btn-save';
        saveBtn.innerHTML = '<i class="fas fa-save"></i> <span>Guardar Cambios</span>';
      }, 2000);
    }

    Navigation.markPageAsCompleted('horarios');
    Navigation.updateProgressBar();

    showToast('Éxito', 'Horarios guardados correctamente', 'success');
    setTimeout(() => redirectToNextStep(), 1000);
    return true;

  } catch (error) {
    console.error('Error al guardar horarios:', error);
    if (saveBtn) {
      saveBtn.className = 'btn-save';
      saveBtn.innerHTML = '<i class="fas fa-exclamation-circle"></i> <span>Error</span>';
      saveBtn.disabled = false;
    }
    showToast('Error', 'No se pudieron guardar los horarios: ' + error.message, 'error');
    return false;
  }
}
