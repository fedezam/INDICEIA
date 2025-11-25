// ========================================
// 📅 PÁGINA DE HORARIOS
// ========================================
// Misma estructura que mi-comercio.js pero para horarios

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
import { PLANS, calcularEstadoPlan, getDiasRestantesTrial } from '../shared/plans.js';
import { showToast, showLoading, hideLoading } from '../shared/utils.js';
import { runFlowController } from '../controllers/flowController.js';

// ==================== DATOS ESTÁTICOS ====================
const DAYS = [
  { key: "lunes", label: "Lunes" },
  { key: "martes", label: "Martes" },
  { key: "miercoles", label: "Miércoles" },
  { key: "jueves", label: "Jueves" },
  { key: "viernes", label: "Viernes" },
  { key: "sabado", label: "Sábado" },
  { key: "domingo", label: "Domingo" }
];

// ==================== VARIABLES GLOBALES ====================
let currentUser = null;
let currentComercioId = null;
let comercioData = {};
let originalHorarios = {};
let hasUnsavedChanges = false;

// ==================== INICIALIZACIÓN ====================
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

// ==================== CARGA INICIAL ====================
async function initializePage() {
  try {
    showLoading('Cargando horarios...');

    // 🎨 Renderizar layout (header + barra + banner)
    renderLayout();

    // 📦 Cargar datos del comercio
    await loadComercioData();

    // 🧭 Inicializar navegación
    initNavigation();

    // 🔄 Actualizar header y banner
    updateHeaderInfo(
      comercioData.nombreComercio || 'Mi Comercio',
      PLANS[comercioData.plan || 'trial']
    );
    updateBanner();

    // 🎨 Renderizar horarios
    renderScheduleForm();

    // 💾 Crear botón de guardar
    createSaveButton();

    // 🎯 Setup event listeners
    setupEventListeners();

    // 📌 Card de ayuda IA
    insertAIHelperCard();

    // ✅ Validar estado inicial
    checkFormValidity();

    hideLoading();
  } catch (err) {
    console.error(err);
    hideLoading();
    showToast('Error', 'No se pudo cargar: ' + err.message, 'error');
  }
}

// ==================== CARGAR DATOS ====================
async function loadComercioData() {
  const userRef = doc(db, 'usuarios', currentUser.uid);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists() || !userSnap.data().comercioId) {
    window.location.href = './mi-comercio.html';
    return;
  }

  currentComercioId = userSnap.data().comercioId;

  const comercioRef = doc(db, 'comercios', currentComercioId);
  const comercioSnap = await getDoc(comercioRef);

  if (comercioSnap.exists()) {
    comercioData = { id: currentComercioId, ...comercioSnap.data() };
  } else {
    comercioData = {};
  }

  originalHorarios = structuredClone(comercioData.horarios || {});
}

// ==================== ACTUALIZAR BANNER ====================
function updateBanner() {
  const estado = calcularEstadoPlan(comercioData);
  const plan = PLANS[comercioData.plan || 'trial'];
  let html = '';

  switch (estado) {
    case 'trial':
      const dias = getDiasRestantesTrial(comercioData);
      html = `<strong>Trial activo</strong> – Te quedan <strong>${dias} días</strong> gratis`;
      break;
    case 'activo':
      html = `<strong>Plan ${plan.nombre} activo</strong> – Todo funcionando`;
      break;
    case 'expirado':
      html = `Trial expirado – Elegí un plan para continuar`;
      break;
    default:
      html = `Completá tus horarios para activar tu IA`;
  }

  updateSubscriptionBanner(html, estado);
}

// ==================== RENDERIZAR HORARIOS ====================
function renderScheduleForm() {
  const container = document.getElementById('scheduleGrid');
  if (!container) {
    console.warn('⚠️ #scheduleGrid no encontrado');
    return;
  }

  const horarios = comercioData.horarios || {};

  container.innerHTML = DAYS.map(day => {
    const dayData = horarios[day.key] || {
      closed: true,
      continuous: false,
      morning: { enabled: false, open: "08:00", close: "12:00" },
      afternoon: { enabled: false, open: "16:00", close: "20:00" }
    };

    // Asegurar que morning y afternoon existan
    if (!dayData.morning) dayData.morning = { enabled: false, open: "08:00", close: "12:00" };
    if (!dayData.afternoon) dayData.afternoon = { enabled: false, open: "16:00", close: "20:00" };

    return `
      <div class="schedule-day" data-day="${day.key}">
        <div class="day-header">
          <label class="day-toggle">
            <input type="checkbox" ${!dayData.closed ? "checked" : ""}>
            <span>${day.label}</span>
          </label>
        </div>

        <div class="day-hours ${dayData.closed ? "disabled" : ""}">
          <!-- Modo: Continuo o Cortado -->
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

          <!-- Horario Continuo -->
          <div class="time-blocks">
            <div class="time-block continuous-schedule ${dayData.continuous ? "" : "hidden"}">
              <label>Horario:</label>
              <div class="time-range">
                <input type="time" value="${dayData.open || "09:00"}">
                <span>a</span>
                <input type="time" value="${dayData.close || "18:00"}">
              </div>
            </div>

            <!-- Horario Cortado (Mañana y Tarde) -->
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

  // Después de renderizar, validar
  checkFormValidity();
}

// ==================== OBTENER DATOS DE HORARIOS ====================
function getScheduleData() {
  const grid = document.getElementById('scheduleGrid');
  if (!grid) return {};

  const days = Array.from(grid.querySelectorAll('.schedule-day'));
  const horarios = {};

  days.forEach(dayEl => {
    const day = dayEl.dataset.day;
    const enabled = dayEl.querySelector('.day-toggle input[type="checkbox"]')?.checked ?? false;

    // Si el día está deshabilitado
    if (!enabled) {
      horarios[day] = { closed: true };
      return;
    }

    const continuous = dayEl.querySelector(`input[name="${day}_mode"][value="continuous"]`)?.checked ?? false;

    // Horario continuo
    if (continuous) {
      const inputs = dayEl.querySelectorAll('.continuous-schedule input[type="time"]');
      horarios[day] = {
        closed: false,
        continuous: true,
        open: inputs[0]?.value || "09:00",
        close: inputs[1]?.value || "18:00"
      };
    }
    // Horario cortado
    else {
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

// ==================== VALIDACIÓN ====================
function checkFormValidity() {
  const horarios = getScheduleData();

  // Validar que haya al menos un horario válido
  const hasValidSchedule = Object.values(horarios).some(day => {
    if (day.closed) return false;

    if (day.continuous) {
      return day.open && day.close && day.open !== "00:00" && day.close !== "00:00";
    } else {
      const hasMorning = day.morning?.enabled &&
                        day.morning?.open &&
                        day.morning?.close &&
                        day.morning.open !== "00:00";
      const hasAfternoon = day.afternoon?.enabled &&
                          day.afternoon?.open &&
                          day.afternoon?.close &&
                          day.afternoon.open !== "00:00";
      return hasMorning || hasAfternoon;
    }
  });

  // Habilitar/deshabilitar botones
  updateSaveButtons(hasValidSchedule && hasUnsavedChanges);
}

// ==================== ACTUALIZAR BOTONES ====================
function updateSaveButtons(enabled) {
  const btnTop = document.getElementById('saveChangesBtn');
  const btnBottom = document.getElementById('saveChangesBtnBottom');
  const buttons = [btnTop, btnBottom].filter(Boolean);

  buttons.forEach(btn => {
    btn.disabled = !enabled;

    if (!enabled) {
      btn.classList.remove('ready', 'saving', 'saved');
      if (btn.id === 'saveChangesBtn') {
        btn.innerHTML = '<i class="fas fa-save"></i> <span>Guardar Cambios</span>';
      } else {
        btn.textContent = 'Guardar Cambios';
      }
    } else {
      btn.classList.add('ready');
    }
  });
}

// ==================== MARCAR COMO CAMBIADO ====================
function markAsChanged() {
  hasUnsavedChanges = true;
  checkFormValidity();
}

// ==================== CREAR BOTÓN SUPERIOR ====================
function createSaveButton() {
  if (document.getElementById('saveChangesBtn')) return;

  const userInfo = document.querySelector('.header .user-info');
  const logoutBtn = document.getElementById('logoutBtn');

  if (!userInfo || !logoutBtn) {
    console.warn('⚠️ No se pudo crear botón de guardar');
    return;
  }

  const btn = document.createElement('button');
  btn.id = 'saveChangesBtn';
  btn.className = 'btn-save';
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-save"></i> <span>Guardar Cambios</span>';

  userInfo.insertBefore(btn, logoutBtn);
  btn.addEventListener('click', saveScheduleData);
}

// ==================== EVENT LISTENERS ====================
function setupEventListeners() {
  const grid = document.getElementById('scheduleGrid');

  if (grid) {
    // Habilitar/Deshabilitar día completo
    grid.addEventListener('change', (e) => {
      if (e.target.type === 'checkbox' && e.target.closest('.day-toggle')) {
        const dayEl = e.target.closest('.schedule-day');
        const dayHours = dayEl.querySelector('.day-hours');
        dayHours.classList.toggle('disabled', !e.target.checked);
        markAsChanged();
      }

      // Cambiar entre continuo y cortado
      if (e.target.type === 'radio' && e.target.name.includes('_mode')) {
        const dayEl = e.target.closest('.schedule-day');
        const isContinuous = e.target.value === 'continuous';
        const continuousBlock = dayEl.querySelector('.continuous-schedule');
        const splitBlock = dayEl.querySelector('.split-schedule');

        continuousBlock.classList.toggle('hidden', !isContinuous);
        splitBlock.classList.toggle('hidden', isContinuous);
        markAsChanged();
      }

      // Habilitar/Deshabilitar mañana o tarde
      if (e.target.type === 'checkbox' && (e.target.closest('.morning-hours') || e.target.closest('.afternoon-hours'))) {
        const timeRange = e.target.closest('.morning-hours, .afternoon-hours').querySelector('.time-range');
        const inputs = timeRange.querySelectorAll('input[type="time"]');
        inputs.forEach(input => input.disabled = !e.target.checked);
        markAsChanged();
      }
    });

    // Detectar cambios en inputs de tiempo
    grid.addEventListener('input', (e) => {
      if (e.target.type === 'time') {
        markAsChanged();
      }
    });
  }

  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      if (confirm('¿Cerrar sesión?')) {
        await signOut(auth);
        window.location.href = '/index.html';
      }
    });
  }

  const btnBottom = document.getElementById('saveChangesBtnBottom');
  if (btnBottom) {
    btnBottom.addEventListener('click', saveScheduleData);
  }

  // Prevenir salida con cambios sin guardar
  window.addEventListener('beforeunload', (e) => {
    if (hasUnsavedChanges) {
      e.preventDefault();
      e.returnValue = '¿Seguro que quieres salir? Tienes cambios sin guardar.';
    }
  });
}

// ==================== GUARDAR ====================
async function saveScheduleData() {
  const btnTop = document.getElementById('saveChangesBtn');
  const btnBottom = document.getElementById('saveChangesBtnBottom');
  const buttons = [btnTop, btnBottom].filter(Boolean);

  const horarios = getScheduleData();

  // Validar que haya al menos un horario válido
  const hasValidSchedule = Object.values(horarios).some(day => {
    if (day.closed) return false;

    if (day.continuous) {
      return day.open && day.close && day.open !== "00:00" && day.close !== "00:00";
    } else {
      const hasMorning = day.morning?.enabled &&
                        day.morning?.open &&
                        day.morning?.close &&
                        day.morning.open !== "00:00";
      const hasAfternoon = day.afternoon?.enabled &&
                          day.afternoon?.open &&
                          day.afternoon?.close &&
                          day.afternoon.open !== "00:00";
      return hasMorning || hasAfternoon;
    }
  });

  if (!hasValidSchedule) {
    showToast('Horarios', 'Debes configurar al menos un horario válido', 'warning');
    return;
  }

  try {
    // Estado: guardando
    buttons.forEach(btn => {
      btn.classList.add('saving');
      btn.classList.remove('saved', 'ready');
      btn.disabled = true;
      if (btn.id === 'saveChangesBtn') {
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';
      } else {
        btn.textContent = 'Guardando...';
      }
    });

    // 💾 Guardar en Firestore
    const comercioRef = doc(db, 'comercios', currentComercioId);
    await updateDoc(comercioRef, {
      horarios,
      'onboardingSteps.horarios': true,
      fechaActualizacion: new Date()
    });

    console.log('✅ Horarios guardados y paso "horarios" marcado como completado');

    // ✅ Actualizar estado local
    comercioData.horarios = horarios;
    originalHorarios = structuredClone(horarios);
    hasUnsavedChanges = false;

    // Estado: guardado
    buttons.forEach(btn => {
      btn.classList.remove('saving');
      btn.classList.add('saved');
      if (btn.id === 'saveChangesBtn') {
        btn.innerHTML = '<i class="fas fa-check"></i> ¡Guardado!';
      } else {
        btn.textContent = '¡Guardado!';
      }
    });

    // Reset después de 2.5s
    setTimeout(() => {
      updateSaveButtons(false);
    }, 2500);

    showToast('Éxito', 'Horarios guardados correctamente', 'success');

    // Actualizar banner
    updateBanner();

    // 🔄 Ejecutar flow controller
    setTimeout(() => {
      runFlowController(currentUser.uid);
    }, 1000);

  } catch (err) {
    console.error('❌ Error al guardar horarios:', err);

    buttons.forEach(btn => {
      btn.classList.remove('saving', 'saved');
      btn.disabled = false;
      if (btn.id === 'saveChangesBtn') {
        btn.innerHTML = '<i class="fas fa-exclamation-circle"></i> Error';
      } else {
        btn.textContent = 'Error al guardar';
      }
    });

    showToast('Error', 'No se pudieron guardar los horarios: ' + err.message, 'error');
  } finally {
    checkFormValidity();
  }
}

// ==================== CARD DE AYUDA IA ====================
function insertAIHelperCard() {
  const container = document.querySelector('main .container');
  if (!container || document.querySelector('.ai-helper-card')) return;

  const card = document.createElement('div');
  card.className = 'ai-helper-card';
  card.innerHTML = `
    <div class="ai-helper-icon">🕐</div>
    <div class="ai-helper-content">
      <h4>¡Horarios inteligentes!</h4>
      <p>Tu IA usará estos horarios para informar a tus clientes cuándo está abierto tu negocio y gestionar consultas fuera de horario.</p>
      <small>Mantén tus horarios actualizados para mejor servicio</small>
    </div>
  `;
  container.insertBefore(card, container.firstChild);
}

// ==================== VALIDACIÓN GLOBAL ====================
window.validateCurrentPageData = () => {
  if (hasUnsavedChanges) {
    showToast('Cambios sin guardar', 'Guardá antes de continuar', 'warning');
    return false;
  }

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

  return true;
};
