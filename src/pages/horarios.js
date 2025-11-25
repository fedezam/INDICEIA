import '../styles/base.css';
import '../styles/layout.css';
import '../styles/components.css';
import '../styles/forms.css';
import '../styles/forms-premium.css';
import './horarios.css';

import { auth, db } from '../firebase.js';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { renderLayout, updateHeaderInfo } from '../shared/layout.js';
import { initNavigation } from '../shared/navigation.js';
import { PLANS } from '../shared/plans.js';
import { showToast, showLoading, hideLoading } from '../shared/utils.js';
import { runFlowController } from '../controllers/flowController.js';

const DAYS = ["lunes","martes","miércoles","jueves","viernes","sábado","domingo"];

let currentUser = null;
let currentComercioId = null;
let comercioData = {};
let originalHorarios = {};
let hasUnsavedChanges = false;

onAuthStateChanged(auth, async (user) => {
  if (!user) return location.href = "/login.html";
  currentUser = user;
  await initializePage();
  runFlowController(user.uid);
});

async function initializePage() {
  showLoading('Cargando horarios...');
  renderLayout();
  await loadComercioData();
  initNavigation();
  updateHeaderInfo(comercioData.nombreComercio || 'Mi Comercio', PLANS[comercioData.plan || 'trial']);
  renderScheduleForm();
  createTopSaveButton();
  setupEventListeners();
  insertAIHelperCard();
  checkFormValidity();
  hideLoading();
}

async function loadComercioData() {
  const userSnap = await getDoc(doc(db, 'usuarios', currentUser.uid));
  if (!userSnap.exists() || !userSnap.data().comercioId) return location.href = "/mi-comercio.html";
  currentComercioId = userSnap.data().comercioId;
  const comercioSnap = await getDoc(doc(db, 'comercios', currentComercioId));
  comercioData = comercioSnap.exists() ? { id: currentComercioId, ...comercioSnap.data() } : {};
  originalHorarios = structuredClone(comercioData.horarios || {});
}

function renderScheduleForm() {
  const grid = document.getElementById('scheduleGrid');
  grid.innerHTML = DAYS.map(dayKey => {
    const dayData = comercioData.horarios?.[dayKey] || { closed: false, continuous: true };
    return `
      <div class="schedule-day">
        <div class="day-header">
          <h3 class="day-name">${dayKey.charAt(0).toUpperCase() + dayKey.slice(1)}</h3>
          <label class="day-toggle">
            <input type="checkbox" ${!dayData.closed ? 'checked' : ''} data-day="${dayKey}" class="toggle-day">
            <span>${dayData.closed ? 'Cerrado' : 'Abierto'}</span>
          </label>
        </div>

        <div class="day-hours ${dayData.closed ? 'disabled' : ''}">
          <div class="schedule-mode">
            <label class="schedule-option">
              <input type="radio" name="mode-${dayKey}" value="continuous" ${dayData.continuous ? 'checked' : ''} data-day="${dayKey}">
              <span>Horario continuo</span>
            </label>
            <label class="schedule-option">
              <input type="radio" name="mode-${dayKey}" value="split" ${!dayData.continuous ? 'checked' : ''} data-day="${dayKey}">
              <span>Horario cortado</span>
            </label>
          </div>

          <div class="time-blocks">
            <div class="continuous-schedule" style="display: ${dayData.continuous ? 'block' : 'none'}">
              <div class="time-range">
                <input type="time" value="${dayData.open || '09:00'}" data-day="${dayKey}" data-field="open">
                <span>→</span>
                <input type="time" value="${dayData.close || '18:00'}" data-day="${dayKey}" data-field="close">
              </div>
            </div>

            <div class="split-schedule" style="display: ${!dayData.continuous ? 'flex' : 'none'}">
              <div class="morning-hours">
                <label><input type="checkbox" ${dayData.morning?.enabled ? 'checked' : ''} data-day="${dayKey}" data-period="morning"> Mañana</label>
                <div class="time-range">
                  <input type="time" value="${dayData.morning?.open || '09:00'}" data-day="${dayKey}" data-period="morning" data-field="open">
                  <span>→</span>
                  <input type="time" value="${dayData.morning?.close || '13:00'}" data-day="${dayKey}" data-period="morning" data-field="close">
                </div>
              </div>
              <div class="afternoon-hours">
                <label><input type="checkbox" ${dayData.afternoon?.enabled ? 'checked' : ''} data-day="${dayKey}" data-period="afternoon"> Tarde</label>
                <div class="time-range">
                  <input type="time" value="${dayData.afternoon?.open || '15:00'}" data-day="${dayKey}" data-period="afternoon" data-field="open">
                  <span>→</span>
                  <input type="time" value="${dayData.afternoon?.close || '20:00'}" data-day="${dayKey}" data-period="afternoon" data-field="close">
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>`;
  }).join('');
}

function createTopSaveButton() {
  if (document.getElementByD('saveChangesBtn')) return;
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.id = 'saveChangesBtn';
  btn.className = 'btn-save';
  btn.innerHTML = '<i class="fas fa-save"></i> <span>Guardar Cambios</span>';
  btn.disabled = true;
  btn.onclick = () => saveFormData();
  document.querySelector('.section-title').after(btn);
}

function markUnsaved() {
  if (!hasUnsavedChanges) {
    hasUnsavedChanges = true;
    checkFormValidity();
  }
}

function checkFormValidity() {
  const btnTop = document.getElementById('saveChangesBtn');
  const btnBottom = document.getElementById('saveChangesBtnBottom');
  const valid = validateSchedule();
  [btnTop, btnBottom].forEach(b => {
    if (b) {
      b.disabled = !(hasUnsavedChanges && valid);
      b.classList.toggle('ready', hasUnsavedChanges && valid);
    }
  });
}

function validateSchedule() {
  const data = getScheduleData();
  return Object.values(data).some(day => {
    if (day.closed) return true;
    if (day.continuous) return day.open && day.close && day.open !== "00:00";
    const m = day.morning?.enabled && day.morning?.open && day.morning?.close && day.morning.open !== "00:00";
    const a = day.afternoon?.enabled && day.afternoon?.open && day.afternoon?.close && day.afternoon.open !== "00:00";
    return m || a;
  });
}

function getScheduleData() {
  const data = {};
  document.querySelectorAll('.schedule-day').forEach(dayEl => {
    const dayKey = dayEl.querySelector('.toggle-day')?.dataset.day || dayEl.querySelector('input[type="time"]')?.dataset.day;
    if (!dayKey) return;
    const closed = !dayEl.querySelector('.toggle-day')?.checked;
    const continuous = dayEl.querySelector('input[value="continuous"]')?.checked;

    if (closed) {
      data[dayKey] = { closed: true };
      return;
    }

    if (continuous) {
      data[dayKey] = {
        closed: false,
        continuous: true,
        open: dayEl.querySelector('input[data-field="open"]')?.value || "09:00",
        close: dayEl.querySelector('input[data-field="close"]')?.value || "18:00"
      };
    } else {
      data[dayKey] = {
        closed: false,
        continuous: false,
        morning: {
          enabled: dayEl.querySelector('input[data-period="morning"]')?.checked || false,
          open: dayEl.querySelector('input[data-period="morning"][data-field="open"]')?.value || "09:00",
          close: dayEl.querySelector('input[data-period="morning"][data-field="close"]')?.value || "13:00"
        },
        afternoon: {
          enabled: dayEl.querySelector('input[data-period="afternoon"]')?.checked || false,
          open: dayEl.querySelector('input[data-period="afternoon"][data-field="open"]')?.value || "15:00",
          close: dayEl.querySelector('input[data-period="afternoon"][data-field="close"]')?.value || "20:00"
        }
      };
    }
  });
  return data;
}

async function saveFormData() {
  const buttons = [document.getElementById('saveChangesBtn'), document.getElementById('saveChangesBtnBottom')].filter(Boolean);
  if (!validateSchedule()) return showToast('Error', 'Configurá al menos un día con horario válido', 'warning');

  buttons.forEach(b => { b.classList.add('saving'); b.disabled = true; b.innerHTML = b.id === 'saveChangesBtn' ? 'Guardando...' : 'Guardando...'; });

  try {
    const horarios = getScheduleData();
    await updateDoc(doc(db, 'comercios', currentComercioId), {
      horarios,
      'onboardingSteps.horarios': true,
      fechaActualizacion: new Date()
    });

    originalHorarios = structuredClone(horarios);
    hasUnsavedChanges = false;

    buttons.forEach(b => {
      b.classList.remove('saving'); b.classList.add('saved');
      b.innerHTML = b.id === 'saveChangesBtn' ? '<i class="fas fa-check"></i> ¡Guardado!' : '¡Guardado!';
    });

    setTimeout(() => buttons.forEach(b => {
      b.disabled = true; b.className = 'btn-save'; 
      b.innerHTML = b.id === 'saveChangesBtn' ? '<i class="fas fa-save"></i> <span>Guardar Cambios</span>' : 'Guardar Cambios';
    }), 2500);

    showToast('Éxito', 'Horarios guardados', 'success');
    setTimeout(() => runFlowController(currentUser.uid), 1000);

  } catch (err) {
    console.error(err);
    buttons.forEach(b => { b.classList.remove('saving'); b.disabled = false; b.textContent = 'Error'; });
    showToast('Error', 'No se pudo guardar', 'error');
  }
  checkFormValidity();
}

function setupEventListeners() {
  document.getElementById('scheduleGrid').addEventListener('change', markUnsaved);
  document.getElementById('scheduleGrid').addEventListener('input', markUnsaved);
}

function insertAIHelperCard() {
  if (document.querySelector('.ai-helper-card')) return;
  const card = document.createElement('div');
  card.className = 'ai-helper-card';
  card.innerHTML = `<div class="ai-helper-icon">AI</div><div class="ai-helper-content"><h4>¡Horarios inteligentes!</h4><p>Tu IA usará estos horarios para responder automáticamente cuándo estás abierto o cerrado.</p></div>`;
  document.querySelector('.container').insertBefore(card, document.querySelector('.form-section'));
}

window.validateCurrentPageData = () => hasUnsavedChanges ? (showToast('Cambios sin guardar', 'Guardá antes de continuar', 'warning'), false) : true;
