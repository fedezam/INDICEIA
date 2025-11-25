// src/pages/horarios/horarios.js

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

const DAYS = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];

let currentUser = null;
let currentComercioId = null;
let comercioData = {};
let originalHorarios = {};
let hasUnsavedChanges = false;

onAuthStateChanged(auth, async (user) => {
  if (!user) return location.href = '/login.html';
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
  if (!userSnap.exists() || !userSnap.data().comercioId) return location.href = '/mi-comercio.html';
  currentComercioId = userSnap.data().comercioId;
  const comercioSnap = await getDoc(doc(db, 'comercios', currentComercioId));
  comercioData = comercioSnap.exists() ? { id: currentComercioId, ...comercioSnap.data() } : {};
  originalHorarios = structuredClone(comercioData.horarios || {});
}

function renderScheduleForm() {
  const grid = document.getElementById('scheduleGrid');
  grid.innerHTML = DAYS.map(dayKey => {
    const day = comercioData.horarios?.[dayKey] || { closed: false, continuous: true };
    const name = dayKey.charAt(0).toUpperCase() + dayKey.slice(1);

    return `
      <div class="schedule-day">
        <div class="day-header">
          <h3 class="day-name">${name}</h3>
          <label class="day-toggle">
            <input type="checkbox" ${!day.closed ? 'checked' : ''} data-day="${dayKey}" class="toggle-day">
            <span>${day.closed ? 'Cerrado' : 'Abierto'}</span>
          </label>
        </div>

        <div class="day-hours ${day.closed ? 'disabled' : ''}">
          <div class="schedule-mode">
            <label class="schedule-option">
              <input type="radio" name="mode-${dayKey}" value="continuous" ${day.continuous ? 'checked' : ''} data-day="${dayKey}">
              <span>Horario continuo</span>
            </label>
            <label class="schedule-option">
              <input type="radio" name="mode-${dayKey}" value="split" ${!day.continuous ? 'checked' : ''} data-day="${dayKey}">
              <span>Horario cortado</span>
            </label>
          </div>

          <div class="time-blocks">
            <div class="continuous-schedule" style="display:${day.continuous ? 'block' : 'none'}">
              <div class="time-range">
                <input type="time" value="${day.open || '09:00'}" data-day="${dayKey}" data-field="open">
                <span>→</span>
                <input type="time" value="${day.close || '18:00'}" data-day="${dayKey}" data-field="close">
              </div>
            </div>

            <div class="split-schedule" style="display:${!day.continuous ? 'flex' : 'none'}">
              <div class="morning-hours">
                <label><input type="checkbox" ${day.morning?.enabled ? 'checked' : ''} data-day="${dayKey}" data-period="morning"> Mañana</label>
                <div class="time-range">
                  <input type="time" value="${day.morning?.open || '09:00'}" data-day="${dayKey}" data-period="morning" data-field="open">
                  <span>→</span>
                  <input type="time" value="${day.morning?.close || '13:00'}" data-day="${dayKey}" data-period="morning" data-field="close">
                </div>
              </div>
              <div class="afternoon-hours">
                <label><input type="checkbox" ${day.afternoon?.enabled ? 'checked' : ''} data-day="${dayKey}" data-period="afternoon"> Tarde</label>
                <div class="time-range">
                  <input type="time" value="${day.afternoon?.open || '15:00'}" data-day="${dayKey}" data-period="afternoon" data-field="open">
                  <span>→</span>
                  <input type="time" value="${day.afternoon?.close || '20:00'}" data-day="${dayKey}" data-period="afternoon" data-field="close">
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>`;
  }).join('');
}

function createTopSaveButton() {
  if (document.getElementById('saveChangesBtn')) return;
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.id = 'saveChangesBtn';
  btn.className = 'btn-save';
  btn.innerHTML = '<i class="fas fa-save"></i> <span>Guardar Cambios</span>';
  btn.disabled = true;
  btn.onclick = saveFormData;
  document.querySelector('.section-title').after(btn);
}

function markAsChanged() {
  hasUnsavedChanges = true;
  checkFormValidity();
}

function checkFormValidity() {
  const top = document.getElementById('saveChangesBtn');
  const bottom = document.getElementById('saveChangesBtnBottom');
  const valid = validateSchedule();
  [top, bottom].forEach(b => {
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
    if (day.continuous) return day.open && day.close && day.open !== '00:00';
    const m = day.morning?.enabled && day.morning?.open && day.morning?.close && day.morning.open !== '00:00';
    const a = day.afternoon?.enabled && day.afternoon?.open && day.afternoon?.close && day.afternoon.open !== '00:00';
    return m || a;
  });
}

function getScheduleData() {
  const data = {};
  document.querySelectorAll('.schedule-day').forEach(el => {
    const dayKey = el.querySelector('.toggle-day')?.dataset.day || el.querySelector('input[type="time"]')?.dataset.day;
    if (!dayKey) return;

    const closed = !el.querySelector('.toggle-day')?.checked;
    const continuous = el.querySelector('input[value="continuous"]')?.checked;

    if (closed) {
      data[dayKey] = { closed: true };
      return;
    }

    if (continuous) {
      data[dayKey] = {
        closed: false,
        continuous: true,
        open: el.querySelector('input[data-field="open"]')?.value || '09:00',
        close: el.querySelector('input[data-field="close"]')?.value || '18:00'
      };
    } else {
      data[dayKey] = {
        closed: false,
        continuous: false,
        morning: {
          enabled: !!el.querySelector('input[data-period="morning"]')?.checked,
          open: el.querySelector('input[data-period="morning"][data-field="open"]')?.value || '09:00',
          close: el.querySelector('input[data-period="morning"][data-field="close"]')?.value || '13:00'
        },
        afternoon: {
          enabled: !!el.querySelector('input[data-period="afternoon"]')?.checked,
          open: el.querySelector('input[data-period="afternoon"][data-field="open"]')?.value || '15:00',
          close: el.querySelector('input[data-period="afternoon"][data-field="close"]')?.value || '20:00'
        }
      };
    }
  });
  return data;
}

async function saveFormData() {
  if (!validateSchedule()) {
    showToast('Horarios', 'Configurá al menos un día abierto con horario válido', 'warning');
    return;
  }

  const buttons = [document.getElementById('saveChangesBtn'), document.getElementById('saveChangesBtnBottom')].filter(Boolean);
  buttons.forEach(b => {
    b.classList.add('saving');
    b.disabled = true;
    b.innerHTML = b.id === 'saveChangesBtn' ? '<i class="fas fa-spinner fa-spin"></i> Guardando...' : 'Guardando...';
  });

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
      b.classList.remove('saving');
      b.classList.add('saved');
      b.innerHTML = b.id === 'saveChangesBtn' ? '<i class="fas fa-check"></i> ¡Guardado!' : '¡Guardado!';
    });

    setTimeout(() => {
      buttons.forEach(b => {
        b.disabled = true;
        b.className = b.id === 'saveChangesBtn' ? 'btn-save' : '';
        b.innerHTML = b.id === 'saveChangesBtn' ? '<i class="fas fa-save"></i> <span>Guardar Cambios</span>' : 'Guardar Cambios';
      });
    }, 2500);

    showToast('Éxito', 'Horarios guardados correctamente', 'success');
    setTimeout(() => runFlowController(currentUser.uid), 1000);

  } catch (err) {
    console.error(err);
    buttons.forEach(b => {
      b.classList.remove('saving');
      b.disabled = false;
      b.textContent = 'Error';
    });
    showToast('Error', 'No se pudieron guardar los horarios', 'error');
  }
  checkFormValidity();
}

function setupEventListeners() {
  document.getElementById('scheduleGrid').addEventListener('change', markAsChanged);
  document.getElementById('scheduleGrid').addEventListener('input', markAsChanged);
}

function insertAIHelperCard() {
  if (document.querySelector('.ai-helper-card')) return;
  const card = document.createElement('div');
  card.className = 'ai-helper-card';
  card.innerHTML = `
    <div class="ai-helper-icon">Horario</div>
    <div class="ai-helper-content">
      <h4>¡Horarios inteligentes!</h4>
      <p>Tu IA usará estos horarios para informar automáticamente cuándo estás abierto o cerrado.</p>
    </div>`;
  document.querySelector('.container').insertBefore(card, document.querySelector('.form-section'));
}

window.validateCurrentPageData = () => hasUnsavedChanges ? (showToast('Cambios sin guardar', 'Guardá antes de continuar', 'warning'), false) : true;
