import { auth, db } from '../firebase.js';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import Navigation from '../shared/navigation.js';
import { showLoading, hideLoading, showToast, updateComercioJSON } from '../shared/utils.js';

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
    
    renderScheduleForm();
    setupEventListeners();
    updateHeader();
    updateSubscriptionBanner();
    Navigation.init();

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
    showToast('Error', 'No se pudo cargar la página', 'error');
  }
});

function updateHeader() {
  const commerceName = document.getElementById('commerceName');
  const planBadge = document.getElementById('planBadge');
  
  if (commerceName) {
    commerceName.textContent = comercioData.nombreComercio || 'Mi Comercio';
  }
  if (planBadge) {
    planBadge.textContent = comercioData.plan ? comercioData.plan.toUpperCase() : 'TRIAL';
  }
}

function updateSubscriptionBanner() {
  const banner = document.getElementById('subscriptionBanner');
  const messageEl = document.getElementById('subscriptionMessage');
  
  if (!banner || !messageEl) return;
  
  const trialEnd = comercioData.trialEndDate ? new Date(comercioData.trialEndDate) : null;
  const now = new Date();
  const status = comercioData.estado || 'trial';
  
  if (status === 'active') {
    const endDate = comercioData.subscriptionEndDate ? new Date(comercioData.subscriptionEndDate) : null;
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
      const hoursEl = dayEl.querySelector('.day-hours');
      if (e.target.checked) {
        hoursEl.classList.remove('disabled');
      } else {
        hoursEl.classList.add('disabled');
      }
    }
    
    if (e.target.type === 'radio' && e.target.name.includes('_mode')) {
      const dayKey = e.target.name.replace('_mode', '');
      const dayEl = document.querySelector(`[data-day="${dayKey}"]`);
      const continuousBlock = dayEl.querySelector('.continuous-schedule');
      const splitBlock = dayEl.querySelector('.split-schedule');
      
      if (e.target.value === 'continuous') {
        continuousBlock.classList.remove('hidden');
        splitBlock.classList.add('hidden');
      } else {
        continuousBlock.classList.add('hidden');
        splitBlock.classList.remove('hidden');
      }
    }
    
    if (e.target.type === 'checkbox' && e.target.closest('.morning-hours, .afternoon-hours')) {
      const timeInputs = e.target.closest('label').nextElementSibling.querySelectorAll('input[type="time"]');
      if (e.target.checked) {
        timeInputs.forEach(input => input.disabled = false);
      } else {
        timeInputs.forEach(input => input.disabled = true);
      }
    }
  });

  document.getElementById('logoutBtn').addEventListener('click', async () => {
    if (confirm('¿Cerrar sesión?')) {
      await signOut(auth);
      window.location.href = '/index.html';
    }
  });
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
  const horarios = getScheduleData();
  try {
    const comercioRef = doc(db, 'comercios', currentComercioId);
    await updateDoc(comercioRef, { horarios });
    comercioData.horarios = horarios;
    
    try {
      await updateComercioJSON(currentComercioId, currentUser.uid);
    } catch (jsonError) {
      console.error('Error actualizando JSON:', jsonError);
    }
  } catch (error) {
    console.error('Error saving schedule:', error);
  }
}

const originalGoToNextPage = Navigation.goToNextPage;
Navigation.goToNextPage = async function() {
  await saveScheduleData();
  return originalGoToNextPage.call(this);
};

const originalGoToPreviousPage = Navigation.goToPreviousPage;
Navigation.goToPreviousPage = async function() {
  await saveScheduleData();
  return originalGoToPreviousPage.call(this);
};
