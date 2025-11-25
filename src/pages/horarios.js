// src/pages/horarios.js
// -----------------------------------------
// HORARIOS – ÍndiceIA (clon exacto lógico/visual de mi-comercio)
// -----------------------------------------

import '../styles/base.css';
import '../styles/layout.css';
import '../styles/components.css';
import '../styles/forms.css';
import '../styles/forms-premium.css';
import './horarios.css';

import { auth, db } from '../firebase.js';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

import { renderLayout, updateHeaderInfo, updateSubscriptionBanner } from '../shared/layout.js';
import { initNavigation } from '../shared/navigation.js';
import { showToast, showLoading, hideLoading } from '../shared/utils.js';
import { runFlowController } from '../controllers/flowController.js';
import Navigation from '../shared/navigation.js'; // si en tu proyecto existe
// -----------------------------------------

const DAYS = ["lunes","martes","miercoles","jueves","viernes","sabado","domingo"];

let currentUser = null;
let currentComercioId = null;
let comercioData = {};
let originalHorarios = {};
let hasUnsavedChanges = false;

// ------------------- init auth -------------------
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "/login.html";
    return;
  }
  currentUser = user;
  try {
    await user.getIdToken();
  } catch (err) {
    console.warn("Sesión expirada, cerrando...");
    signOut(auth);
    window.location.href = "/login.html";
    return;
  }
  await initializePage();
  runFlowController(user.uid);
});

// ------------------- initialize page -------------------
async function initializePage() {
  try {
    showLoading('Cargando horarios...');
    renderLayout(); // reutiliza layout (header, contenedores, etc.)

    // obtener comercioId desde usuario
    const userRef = doc(db, 'usuarios', currentUser.uid);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists() && userSnap.data().comercioId) {
      currentComercioId = userSnap.data().comercioId;
    } else {
      // si no existe, redirigimos (flujo normal: mi-comercio crea comercio primero)
      showToast('Error', 'No se encontró comercio. Completa primero "Mi comercio".', 'warning');
      hideLoading();
      return;
    }

    await loadComercioData();

    initNavigation();
    updateHeaderInfo(comercioData.nombreComercio, comercioData.plan ? { nombre: comercioData.plan } : {} );
    updateSubscriptionBanner();

    // renderizar formulario de horarios dentro del layout
    renderScheduleContainer();

    // setear eventos globales (logout, beforeunload)
    setupGlobalListeners();

    hideLoading();
  } catch (err) {
    console.error(err);
    hideLoading();
    showToast('Error', 'No se pudo inicializar: ' + err.message, 'error');
  }
}

async function loadComercioData() {
  const ref = doc(db, 'comercios', currentComercioId);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    comercioData = { id: currentComercioId, ...snap.data() };
  } else {
    comercioData = { plan: 'trial', pais: 'Argentina' };
  }
  // guardar copia (por si se necesita)
  originalHorarios = JSON.parse(JSON.stringify(comercioData.horarios || {}));
}

// ------------------- RENDER contenedor y formulario -------------------
function renderScheduleContainer() {
  // buscamos el contenedor principal que usa renderLayout()
  const container = document.querySelector('main .container') || document.querySelector('main') || document.getElementById('main') || document.getElementById('app');

  if (!container) {
    console.warn('Contenedor principal no encontrado. Intentando body...');
  }

  // insertar HTML (solo el módulo de horarios)
  const wrapper = document.createElement('div');
  wrapper.className = 'mi-comercio-module horarios-module';

  wrapper.innerHTML = `
    <div class="card">
      <div class="card-header">
        <h2>Horarios</h2>
        <p class="muted">Marca los días que trabajás y completa los rangos horarios.</p>
      </div>

      <div class="card-body">
        <div id="scheduleGrid" class="schedule-grid"></div>
      </div>

      <div class="card-footer form-navigation">
        <button id="btnBack" class="btn btn-secondary">← Volver</button>
        <button id="saveChangesBtn" class="btn-save" disabled><i class="fas fa-save"></i> <span>Guardar Cambios</span></button>
      </div>
    </div>
  `;

  // Insertar y reemplazar si ya existe
  const existing = document.querySelector('.horarios-module');
  if (existing) existing.replaceWith(wrapper);
  else if (container) container.prepend(wrapper);
  else document.body.appendChild(wrapper);

  // preparar datos y renderizar el form
  const horarios = comercioData.horarios ? adaptOldStructureToForm(comercioData.horarios) : initDefaultSchedule();
  renderScheduleForm(document.getElementById('scheduleGrid'), horarios);

  // crear botón guardar/header igual que en mi-comercio
  createSaveButton();

  // bind botones
  document.getElementById('btnBack')?.addEventListener('click', () => {
    // volver al paso anterior según flowController (o history)
    window.history.back();
  });

  document.getElementById('saveChangesBtn')?.addEventListener('click', saveScheduleData);
}

// ------------------- helpers de estructura de datos -------------------

// Inicializa datos de un comercio con valores por defecto (estructura usada por el formulario)
function initDefaultSchedule(existingData = {}) {
  const horarios = {};
  DAYS.forEach(day => {
    const d = existingData[day] || {};
    horarios[day] = {
      closed: d.closed ?? true,
      continuous: d.continuous ?? false,
      open: d.open ?? "09:00",
      close: d.close ?? "18:00",
      morning: {
        enabled: d.morning?.enabled ?? false,
        open: d.morning?.open ?? "08:00",
        close: d.morning?.close ?? "12:00"
      },
      afternoon: {
        enabled: d.afternoon?.enabled ?? false,
        open: d.afternoon?.open ?? "16:00",
        close: d.afternoon?.close ?? "20:00"
      }
    };
  });
  return horarios;
}

// Si la DB usaba otra estructura, la adaptamos para el form (compatibilidad)
function adaptOldStructureToForm(stored) {
  // asumimos que stored ya tiene la estructura que describiste (closed/continuous/morning/afternoon)
  // si no, tratamos de mapear datos simples
  const out = {};
  DAYS.forEach(day => {
    const d = stored[day] || {};
    out[day] = {
      closed: d.closed ?? (d.habilitado === false),
      continuous: d.continuous ?? false,
      open: d.open ?? "",
      close: d.close ?? "",
      morning: {
        enabled: d.morning?.enabled ?? false,
        open: d.morning?.open ?? "",
        close: d.morning?.close ?? ""
      },
      afternoon: {
        enabled: d.afternoon?.enabled ?? false,
        open: d.afternoon?.open ?? "",
        close: d.afternoon?.close ?? ""
      }
    };
    // backward fallback for older key names
    if (d.habilitado !== undefined) out[day].closed = !d.habilitado;
    if (d.bloque1) {
      out[day].morning = { enabled: true, open: d.bloque1.inicio || "", close: d.bloque1.fin || "" };
      out[day].continuous = false;
    }
    if (d.bloque2) {
      out[day].afternoon = { enabled: true, open: d.bloque2.inicio || "", close: d.bloque2.fin || "" };
      out[day].continuous = false;
    }
  });
  return out;
}

// Convertir el formulario a la estructura EXACTA que guarda la DB (continuous/morning/afternoon)
function formToDBStructure(horariosForm) {
  const out = {};
  Object.entries(horariosForm).forEach(([day, d]) => {
    if (d.closed === true) {
      out[day] = { closed: true };
      return;
    }

    // si only open/close were provided (continuous)
    if (d.continuous) {
      out[day] = {
        closed: false,
        continuous: true,
        open: d.open || "00:00",
        close: d.close || "00:00"
      };
      return;
    }

    // otherwise use morning/afternoon enabled flags
    out[day] = {
      closed: false,
      continuous: false,
      morning: {
        enabled: !!d.morning?.enabled,
        open: d.morning?.open || "00:00",
        close: d.morning?.close || "00:00"
      },
      afternoon: {
        enabled: !!d.afternoon?.enabled,
        open: d.afternoon?.open || "00:00",
        close: d.afternoon?.close || "00:00"
      }
    };
  });
  return out;
}

// ------------------- RENDER FORM (HTML generado desde JS para respetar layout.js) -------------------

function renderScheduleForm(container, scheduleData) {
  if (!container) return;

  container.innerHTML = DAYS.map(day => {
    const d = scheduleData[day];
    // Card visible only when not closed (we'll toggle via class)
    return `
      <div class="day-row" data-day="${day}">
        <div class="day-header">
          <label class="day-toggle">
            <input type="checkbox" class="chk-day" ${!d.closed ? "checked" : ""}>
            <span class="day-label">${capitalize(day)}</span>
          </label>
        </div>

        <div class="day-card ${d.closed ? "disabled" : ""}">
          <!-- Siempre mostramos ambos bloques (UI simple), pero usamos morning/afternoon en DB -->
          <div class="time-block">
            <label class="time-label">Horario 1</label>
            <input type="time" class="time-input slot1-open" value="${d.morning.open || d.open || "00:00"}">
            <span class="sep">a</span>
            <input type="time" class="time-input slot1-close" value="${d.morning.close || d.close || "00:00"}">
          </div>

          <div class="time-block">
            <label class="time-label">Horario 2</label>
            <input type="time" class="time-input slot2-open" value="${d.afternoon.open || "00:00"}">
            <span class="sep">a</span>
            <input type="time" class="time-input slot2-close" value="${d.afternoon.close || "00:00"}">
          </div>
        </div>
      </div>
    `;
  }).join('');

  setupScheduleEvents(container);
  // reset unsaved flag
  hasUnsavedChanges = false;
  updateSaveButtonState();
}

// ------------------- EVENTS del formulario -------------------

function setupScheduleEvents(container) {
  // change event delegation
  container.addEventListener('change', (e) => {
    const dayEl = e.target.closest('.day-row');
    if (!dayEl) return;
    const day = dayEl.dataset.day;

    // checkbox toggle day
    if (e.target.matches('.chk-day')) {
      const checked = e.target.checked;
      const card = dayEl.querySelector('.day-card');
      if (checked) card.classList.remove('disabled');
      else card.classList.add('disabled');
      markAsChanged();
      return;
    }

    // time inputs
    if (e.target.matches('.time-input')) {
      markAsChanged();
      return;
    }
  });
}

// ------------------- OBTENER DATOS DEL FORMULARIO -------------------

function getScheduleData() {
  const grid = document.getElementById('scheduleGrid');
  if (!grid) return {};

  const horarios = {};

  const rows = Array.from(grid.querySelectorAll('.day-row'));
  rows.forEach(row => {
    const day = row.dataset.day;
    const checked = row.querySelector('.chk-day')?.checked ?? false;
    if (!checked) {
      horarios[day] = { closed: true };
      return;
    }

    const slot1Open = row.querySelector('.slot1-open')?.value || "00:00";
    const slot1Close = row.querySelector('.slot1-close')?.value || "00:00";
    const slot2Open = row.querySelector('.slot2-open')?.value || "00:00";
    const slot2Close = row.querySelector('.slot2-close')?.value || "00:00";

    // Interpretamos: si solo llenó slot1 => morning.enabled true, continuous true
    // si llenó ambos => morning.enabled true, afternoon.enabled true, continuous false
    const morningEnabled = slot1Open !== "00:00" || slot1Close !== "00:00";
    const afternoonEnabled = slot2Open !== "00:00" || slot2Close !== "00:00";

    if (morningEnabled && !afternoonEnabled) {
      // considerarlo corrido (continuous) si solo slot1 tiene horas
      horarios[day] = {
        closed: false,
        continuous: true,
        open: slot1Open,
        close: slot1Close
      };
    } else {
      horarios[day] = {
        closed: false,
        continuous: false,
        morning: {
          enabled: morningEnabled,
          open: morningEnabled ? slot1Open : "00:00",
          close: morningEnabled ? slot1Close : "00:00"
        },
        afternoon: {
          enabled: afternoonEnabled,
          open: afternoonEnabled ? slot2Open : "00:00",
          close: afternoonEnabled ? slot2Close : "00:00"
        }
      };
    }
  });

  return horarios;
}

// ------------------- VALIDACIÓN Y ESTADO SAVE BUTTON -------------------

function hasValidSchedule(horarios) {
  return Object.values(horarios).some(day => {
    if (day.closed) return false;
    if (day.continuous) return day.open !== "00:00" && day.close !== "00:00";
    const morningOk = day.morning?.enabled && day.morning.open !== "00:00" && day.morning.close !== "00:00";
    const afternoonOk = day.afternoon?.enabled && day.afternoon.open !== "00:00" && day.afternoon.close !== "00:00";
    return morningOk || afternoonOk;
  });
}

function markAsChanged() {
  hasUnsavedChanges = true;
  updateSaveButtonState();
}

function updateSaveButtonState() {
  const btn = document.getElementById('saveChangesBtn');
  if (!btn) return;
  const current = getScheduleData();
  const valid = hasValidSchedule(current);
  if (!valid || !hasUnsavedChanges) {
    btn.disabled = true;
    btn.classList.remove('ready');
  } else {
    btn.disabled = false;
    btn.classList.add('ready');
  }
}

// ------------------- CREATE SAVE BUTTON (header) -------------------

function createSaveButton() {
  if (document.getElementById('saveChangesBtn')) return;
  const userInfo = document.querySelector('.header .user-info') || document.querySelector('.top-header .header-content');
  if (!userInfo) return;

  const saveBtn = document.createElement('button');
  saveBtn.id = 'saveChangesBtn';
  saveBtn.className = 'btn-save';
  saveBtn.disabled = true;
  saveBtn.innerHTML = '<i class="fas fa-save"></i> <span>Guardar Cambios</span>';

  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn && userInfo.parentNode) {
    userInfo.parentNode.insertBefore(saveBtn, logoutBtn);
  } else {
    userInfo.appendChild(saveBtn);
  }
  saveBtn.addEventListener('click', saveScheduleData);
}

// ------------------- SAVE -> Firestore -------------------

async function saveScheduleData() {
  const btn = document.getElementById('saveChangesBtn');
  if (!btn) return;

  const horarios = getScheduleData();
  if (!hasValidSchedule(horarios)) {
    showToast('Horarios', 'Debes configurar al menos un horario válido', 'warning');
    return false;
  }

  try {
    btn.classList.add('saving');
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';
    btn.disabled = true;

    // Guardar en Firestore en la raíz del comercio (misma convención que mi-comercio)
    const comercioRef = doc(db, 'comercios', currentComercioId);
    await updateDoc(comercioRef, {
      horarios,
      'onboardingSteps.horarios': true,
      fechaActualizacion: new Date()
    });

    // Actualizamos estado local
    comercioData.horarios = horarios;
    originalHorarios = JSON.parse(JSON.stringify(horarios));
    hasUnsavedChanges = false;

    btn.classList.remove('saving');
    btn.classList.add('saved');
    btn.innerHTML = '<i class="fas fa-check-circle"></i> Guardado ✓';

    // refrescar header/banner
    updateHeaderInfo(comercioData.nombreComercio, comercioData.plan ? { nombre: comercioData.plan } : {} );
    updateSubscriptionBanner();

    // ejecutar flowController (redirección al siguiente paso)
    try { runFlowController(currentUser.uid); } catch (e) { console.warn('runFlowController fallo:', e); }

    setTimeout(() => {
      btn.classList.remove('saved');
      btn.innerHTML = '<i class="fas fa-save"></i> <span>Guardar Cambios</span>';
      btn.disabled = true;
    }, 1500);

    showToast('Éxito', 'Horarios guardados correctamente', 'success');
    return true;
  } catch (err) {
    console.error('Error al guardar horarios:', err);
    btn.classList.remove('saving');
    btn.className = 'btn-save';
    btn.innerHTML = '<i class="fas fa-exclamation-circle"></i> Error';
    btn.disabled = false;
    showToast('Error', 'No se pudieron guardar los horarios: ' + (err.message || err), 'error');
    return false;
  } finally {
    updateSaveButtonState();
  }
}

// ------------------- GLOBAL LISTENERS -------------------

function setupGlobalListeners() {
  // logout
  document.getElementById('logoutBtn')?.addEventListener('click', () => {
    if (confirm('¿Cerrar sesión?')) signOut(auth);
  });

  // beforeunload
  window.addEventListener('beforeunload', (e) => {
    if (hasUnsavedChanges) {
      e.preventDefault();
      e.returnValue = '¿Seguro que quieres salir? Tienes cambios sin guardar.';
    }
  });

  // change/save propagation from dynamic inputs
  document.addEventListener('input', (e) => {
    if (e.target.matches('.time-input') || e.target.matches('.chk-day')) {
      markAsChanged();
    }
  });
}

// ------------------- util -------------------
function capitalize(s) {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}
