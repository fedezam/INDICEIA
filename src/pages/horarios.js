// ========================================
// ARCHIVO: src/pages/horarios.js
// ========================================
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

// ==================== CONSTANTES ====================
const DAYS = ["lunes", "martes", "miercoles", "jueves", "viernes", "sabado", "domingo"];
const DAYS_LABELS = {
  lunes: "Lunes",
  martes: "Martes",
  miercoles: "Miércoles",
  jueves: "Jueves",
  viernes: "Viernes",
  sabado: "Sábado",
  domingo: "Domingo"
};

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
    renderLayout();
    
    const userRef = doc(db, 'usuarios', currentUser.uid);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists() && userSnap.data().comercioId) {
      currentComercioId = userSnap.data().comercioId;
    } else {
      showToast('Error', 'No se encontró comercio. Completá primero "Mi comercio".', 'warning');
      hideLoading();
      return;
    }
    
    await loadComercioData();
    initNavigation();
    updateHeaderInfo(comercioData.nombreComercio, PLANS[comercioData.plan || 'trial']);
    updateBanner();
    
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    
    renderHorariosModule();
    createSaveButton();
    setupEventListeners();
    insertAIHelperCard();
    checkFormValidity();
    
    hideLoading();
  } catch (err) {
    console.error(err);
    hideLoading();
    showToast('Error', 'No se pudo cargar: ' + err.message, 'error');
  }
}

async function loadComercioData() {
  const ref = doc(db, 'comercios', currentComercioId);
  const snap = await getDoc(ref);
  
  if (snap.exists()) {
    comercioData = { id: currentComercioId, ...snap.data() };
    
    // Inicializar horarios si no existen
    if (!comercioData.horarios) {
      comercioData.horarios = {};
      DAYS.forEach(day => {
        comercioData.horarios[day] = {
          closed: false,
          continuous: true,
          open: "09:00",
          close: "18:00",
          morning: {
            enabled: false,
            open: "08:00",
            close: "13:00"
          },
          afternoon: {
            enabled: false,
            open: "16:00",
            close: "21:00"
          }
        };
      });
    } else {
      // Asegurar que cada día tenga la estructura completa
      DAYS.forEach(day => {
        if (!comercioData.horarios[day]) {
          comercioData.horarios[day] = {
            closed: false,
            continuous: true,
            open: "09:00",
            close: "18:00",
            morning: { enabled: false, open: "08:00", close: "13:00" },
            afternoon: { enabled: false, open: "16:00", close: "21:00" }
          };
        } else {
          // Asegurar campos morning/afternoon existen
          if (!comercioData.horarios[day].morning) {
            comercioData.horarios[day].morning = { enabled: false, open: "08:00", close: "13:00" };
          }
          if (!comercioData.horarios[day].afternoon) {
            comercioData.horarios[day].afternoon = { enabled: false, open: "16:00", close: "21:00" };
          }
          // Asegurar campo continuous existe
          if (comercioData.horarios[day].continuous === undefined) {
            comercioData.horarios[day].continuous = true;
          }
        }
      });
    }
  } else {
    comercioData = { plan: 'trial', pais: 'Argentina', horarios: {} };
    DAYS.forEach(day => {
      comercioData.horarios[day] = {
        closed: false,
        continuous: true,
        open: "09:00",
        close: "18:00",
        morning: { enabled: false, open: "08:00", close: "13:00" },
        afternoon: { enabled: false, open: "16:00", close: "21:00" }
      };
    });
  }
  
  originalHorarios = structuredClone(comercioData.horarios);
}

// ==================== BANNER HELPER ====================
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
      html = `Configurá tus horarios para que tu IA sepa cuándo atender`;
  }
  
  updateSubscriptionBanner(html, estado);
}

// ==================== RENDER HORARIOS ====================
function renderHorariosModule() {
  const main = document.querySelector('main .container');
  if (!main) return;
  
  const html = `
    <div class="page-header">
      <h1><i class="fas fa-clock"></i> Horarios de atención</h1>
      <p>Configurá cuándo está abierto tu comercio para que tu IA lo sepa</p>
    </div>

    <form id="horariosForm" class="horarios-form">
      <div class="horarios-grid">
        ${DAYS.map(day => renderDayCard(day)).join('')}
      </div>

      <div class="quick-actions">
        <button type="button" id="copiarATodos" class="btn btn-secondary">
          <i class="fas fa-copy"></i> Copiar lunes a todos
        </button>
        <button type="button" id="cerrarTodos" class="btn btn-secondary">
          <i class="fas fa-times-circle"></i> Cerrar todos
        </button>
      </div>

      <div class="form-actions">
        <button type="button" id="saveChangesBtnBottom" class="btn btn-primary btn-save" disabled>
          Guardar Cambios
        </button>
      </div>
    </form>
  `;
  
  main.innerHTML = html;
  attachDayCardListeners();
}

function renderDayCard(day) {
  const data = comercioData.horarios[day];
  const isClosed = data.closed;
  const isContinuous = data.continuous;
  
  return `
    <div class="day-card ${!isClosed ? 'active' : ''}" data-day="${day}">
      <div class="day-header">
        <div class="day-toggle">
          <input 
            type="checkbox" 
            id="toggle_${day}" 
            data-day="${day}"
            ${!isClosed ? 'checked' : ''}
          >
          <label for="toggle_${day}">
            <span class="day-name">${DAYS_LABELS[day]}</span>
            <span class="status-badge">${!isClosed ? 'Abierto' : 'Cerrado'}</span>
          </label>
        </div>
      </div>
      
      <div class="day-body ${isClosed ? 'disabled' : ''}">
        <!-- Toggle Horario Corrido/Cortado -->
        <div class="schedule-type-toggle">
          <label class="schedule-type-label">
            <input 
              type="checkbox" 
              id="continuous_${day}"
              data-day="${day}"
              ${isContinuous ? 'checked' : ''}
              ${isClosed ? 'disabled' : ''}
            >
            <span>Horario corrido</span>
          </label>
        </div>

        <!-- Horario Corrido -->
        <div class="continuous-schedule ${isContinuous ? '' : 'hidden'}" id="continuous_block_${day}">
          <div class="time-inputs">
            <div class="time-group">
              <label><i class="fas fa-sunrise"></i> Apertura</label>
              <input 
                type="time" 
                id="open_${day}"
                data-day="${day}"
                data-field="open"
                value="${data.open || '09:00'}"
                ${isClosed ? 'disabled' : ''}
              >
            </div>
            <div class="time-group">
              <label><i class="fas fa-sunset"></i> Cierre</label>
              <input 
                type="time" 
                id="close_${day}"
                data-day="${day}"
                data-field="close"
                value="${data.close || '18:00'}"
                ${isClosed ? 'disabled' : ''}
              >
            </div>
          </div>
        </div>

        <!-- Horario Cortado (Mañana + Tarde) -->
        <div class="split-schedule ${!isContinuous ? '' : 'hidden'}" id="split_block_${day}">
          <div class="schedule-period">
            <div class="period-header">
              <label class="period-toggle">
                <input 
                  type="checkbox" 
                  id="morning_enabled_${day}"
                  data-day="${day}"
                  data-period="morning"
                  ${data.morning.enabled ? 'checked' : ''}
                  ${isClosed ? 'disabled' : ''}
                >
                <span><i class="fas fa-sun"></i> Mañana</span>
              </label>
            </div>
            <div class="time-inputs ${data.morning.enabled ? '' : 'disabled'}">
              <div class="time-group">
                <label>Apertura</label>
                <input 
                  type="time" 
                  id="morning_open_${day}"
                  data-day="${day}"
                  data-period="morning"
                  data-field="open"
                  value="${data.morning.open || '08:00'}"
                  ${isClosed || !data.morning.enabled ? 'disabled' : ''}
                >
              </div>
              <div class="time-group">
                <label>Cierre</label>
                <input 
                  type="time" 
                  id="morning_close_${day}"
                  data-day="${day}"
                  data-period="morning"
                  data-field="close"
                  value="${data.morning.close || '13:00'}"
                  ${isClosed || !data.morning.enabled ? 'disabled' : ''}
                >
              </div>
            </div>
          </div>

          <div class="schedule-period">
            <div class="period-header">
              <label class="period-toggle">
                <input 
                  type="checkbox" 
                  id="afternoon_enabled_${day}"
                  data-day="${day}"
                  data-period="afternoon"
                  ${data.afternoon.enabled ? 'checked' : ''}
                  ${isClosed ? 'disabled' : ''}
                >
                <span><i class="fas fa-moon"></i> Tarde</span>
              </label>
            </div>
            <div class="time-inputs ${data.afternoon.enabled ? '' : 'disabled'}">
              <div class="time-group">
                <label>Apertura</label>
                <input 
                  type="time" 
                  id="afternoon_open_${day}"
                  data-day="${day}"
                  data-period="afternoon"
                  data-field="open"
                  value="${data.afternoon.open || '16:00'}"
                  ${isClosed || !data.afternoon.enabled ? 'disabled' : ''}
                >
              </div>
              <div class="time-group">
                <label>Cierre</label>
                <input 
                  type="time" 
                  id="afternoon_close_${day}"
                  data-day="${day}"
                  data-period="afternoon"
                  data-field="close"
                  value="${data.afternoon.close || '21:00'}"
                  ${isClosed || !data.afternoon.enabled ? 'disabled' : ''}
                >
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

function attachDayCardListeners() {
  // Toggle abierto/cerrado
  document.querySelectorAll('.day-card input[id^="toggle_"]').forEach(toggle => {
    toggle.addEventListener('change', (e) => {
      const day = e.target.dataset.day;
      const card = document.querySelector(`.day-card[data-day="${day}"]`);
      const body = card.querySelector('.day-body');
      const badge = card.querySelector('.status-badge');
      const allInputs = card.querySelectorAll('input:not([id^="toggle_"])');
      
      comercioData.horarios[day].closed = !e.target.checked;
      
      if (e.target.checked) {
        card.classList.add('active');
        body.classList.remove('disabled');
        badge.textContent = 'Abierto';
        updateInputStates(day);
      } else {
        card.classList.remove('active');
        body.classList.add('disabled');
        badge.textContent = 'Cerrado';
        allInputs.forEach(i => i.disabled = true);
      }
      
      markAsChanged();
      checkFormValidity();
    });
  });
  
  // Toggle horario corrido/cortado
  document.querySelectorAll('input[id^="continuous_"]').forEach(toggle => {
    toggle.addEventListener('change', (e) => {
      const day = e.target.dataset.day;
      comercioData.horarios[day].continuous = e.target.checked;
      
      const continuousBlock = document.getElementById(`continuous_block_${day}`);
      const splitBlock = document.getElementById(`split_block_${day}`);
      
      if (e.target.checked) {
        continuousBlock.classList.remove('hidden');
        splitBlock.classList.add('hidden');
      } else {
        continuousBlock.classList.add('hidden');
        splitBlock.classList.remove('hidden');
      }
      
      updateInputStates(day);
      markAsChanged();
      checkFormValidity();
    });
  });
  
  // Toggle mañana/tarde enabled
  document.querySelectorAll('input[id^="morning_enabled_"], input[id^="afternoon_enabled_"]').forEach(toggle => {
    toggle.addEventListener('change', (e) => {
      const day = e.target.dataset.day;
      const period = e.target.dataset.period;
      comercioData.horarios[day][period].enabled = e.target.checked;
      updateInputStates(day);
      markAsChanged();
      checkFormValidity();
    });
  });
  
  // Time inputs
  document.querySelectorAll('input[type="time"][data-field]').forEach(input => {
    input.addEventListener('change', (e) => {
      const day = e.target.dataset.day;
      const field = e.target.dataset.field;
      const period = e.target.dataset.period;
      
      if (period) {
        comercioData.horarios[day][period][field] = e.target.value;
      } else {
        comercioData.horarios[day][field] = e.target.value;
      }
      markAsChanged();
      checkFormValidity();
    });
  });
  
  // Copiar a todos
  const copiarBtn = document.getElementById('copiarATodos');
  if (copiarBtn) {
    copiarBtn.addEventListener('click', () => {
      const lunes = structuredClone(comercioData.horarios.lunes);
      DAYS.forEach(day => {
        if (day !== 'lunes') {
          comercioData.horarios[day] = structuredClone(lunes);
        }
      });
      renderHorariosModule();
      attachDayCardListeners();
      markAsChanged();
      checkFormValidity();
      showToast('Copiado', 'Horarios de lunes copiados a todos los días', 'success');
    });
  }
  
  // Cerrar todos
  const cerrarBtn = document.getElementById('cerrarTodos');
  if (cerrarBtn) {
    cerrarBtn.addEventListener('click', () => {
      DAYS.forEach(day => {
        comercioData.horarios[day].closed = true;
      });
      renderHorariosModule();
      attachDayCardListeners();
      markAsChanged();
      checkFormValidity();
      showToast('Cerrado', 'Todos los días marcados como cerrado', 'info');
    });
  }
  
  // Asegurar que el botón inferior funcione
  const btnBottom = document.getElementById('saveChangesBtnBottom');
  if (btnBottom) {
    btnBottom.removeEventListener('click', saveFormData);
    btnBottom.addEventListener('click', saveFormData);
  }
}
  
  // Toggle horario corrido/cortado
  document.querySelectorAll('input[id^="continuous_"]').forEach(toggle => {
    toggle.addEventListener('change', (e) => {
      const day = e.target.dataset.day;
      comercioData.horarios[day].continuous = e.target.checked;
      
      const continuousBlock = document.getElementById(`continuous_block_${day}`);
      const splitBlock = document.getElementById(`split_block_${day}`);
      
      if (e.target.checked) {
        continuousBlock.classList.remove('hidden');
        splitBlock.classList.add('hidden');
      } else {
        continuousBlock.classList.add('hidden');
        splitBlock.classList.remove('hidden');
      }
      
      updateInputStates(day);
      markAsChanged();
      checkFormValidity();
    });
  });
  
  // Toggle mañana/tarde enabled
  document.querySelectorAll('input[id^="morning_enabled_"], input[id^="afternoon_enabled_"]').forEach(toggle => {
    toggle.addEventListener('change', (e) => {
      const day = e.target.dataset.day;
      const period = e.target.dataset.period;
      comercioData.horarios[day][period].enabled = e.target.checked;
      updateInputStates(day);
      markAsChanged();
      checkFormValidity();
    });
  });
  
  // Time inputs - horario corrido
  document.querySelectorAll('input[type="time"][data-field]').forEach(input => {
    input.addEventListener('change', (e) => {
      const day = e.target.dataset.day;
      const field = e.target.dataset.field;
      const period = e.target.dataset.period;
      
      if (period) {
        comercioData.horarios[day][period][field] = e.target.value;
      } else {
        comercioData.horarios[day][field] = e.target.value;
      }
      markAsChanged();
      checkFormValidity();
    });
  });
  
  // Copiar a todos
  const copiarBtn = document.getElementById('copiarATodos');
  if (copiarBtn) {
    copiarBtn.addEventListener('click', () => {
      const lunes = structuredClone(comercioData.horarios.lunes);
      DAYS.forEach(day => {
        if (day !== 'lunes') {
          comercioData.horarios[day] = structuredClone(lunes);
        }
      });
      renderHorariosModule();
      attachDayCardListeners();
      markAsChanged();
      checkFormValidity();
      showToast('Copiado', 'Horarios de lunes copiados a todos los días', 'success');
    });
  }
  
  // Cerrar todos
  const cerrarBtn = document.getElementById('cerrarTodos');
  if (cerrarBtn) {
    cerrarBtn.addEventListener('click', () => {
      DAYS.forEach(day => {
        comercioData.horarios[day].closed = true;
      });
      renderHorariosModule();
      attachDayCardListeners();
      markAsChanged();
      checkFormValidity();
      showToast('Cerrado', 'Todos los días marcados como cerrado', 'info');
    });
  }
}

function updateInputStates(day) {
  const data = comercioData.horarios[day];
  const card = document.querySelector(`.day-card[data-day="${day}"]`);
  
  if (data.closed) {
    card.querySelectorAll('input').forEach(i => {
      if (!i.id.startsWith('toggle_')) i.disabled = true;
    });
    return;
  }
  
  // Habilitar toggle continuous
  const continuousToggle = document.getElementById(`continuous_${day}`);
  if (continuousToggle) continuousToggle.disabled = false;
  
  if (data.continuous) {
    // Horario corrido - habilitar open/close
    const openInput = document.getElementById(`open_${day}`);
    const closeInput = document.getElementById(`close_${day}`);
    if (openInput) openInput.disabled = false;
    if (closeInput) closeInput.disabled = false;
  } else {
    // Horario cortado
    const morningToggle = document.getElementById(`morning_enabled_${day}`);
    const afternoonToggle = document.getElementById(`afternoon_enabled_${day}`);
    if (morningToggle) morningToggle.disabled = false;
    if (afternoonToggle) afternoonToggle.disabled = false;
    
    // Mañana
    const morningOpen = document.getElementById(`morning_open_${day}`);
    const morningClose = document.getElementById(`morning_close_${day}`);
    if (morningOpen) morningOpen.disabled = !data.morning.enabled;
    if (morningClose) morningClose.disabled = !data.morning.enabled;
    
    // Tarde
    const afternoonOpen = document.getElementById(`afternoon_open_${day}`);
    const afternoonClose = document.getElementById(`afternoon_close_${day}`);
    if (afternoonOpen) afternoonOpen.disabled = !data.afternoon.enabled;
    if (afternoonClose) afternoonClose.disabled = !data.afternoon.enabled;
  }
}

// ==================== VALIDACIÓN ====================
function markAsChanged() {
  hasUnsavedChanges = true;
  checkFormValidity();
}

function checkFormValidity() {
  // Validar que al menos un día esté abierto
  const alMenosUnDiaAbierto = DAYS.some(day => !comercioData.horarios[day].closed);
  
  const btnTop = document.getElementById('saveChangesBtn');
  const btnBottom = document.getElementById('saveChangesBtnBottom');
  const buttons = [btnTop, btnBottom].filter(Boolean);
  
  if (!alMenosUnDiaAbierto || !hasUnsavedChanges) {
    buttons.forEach(b => {
      b.disabled = true;
      b.classList.remove('ready', 'saving', 'saved');
      b.classList.add('btn-save');
      if (b.id === 'saveChangesBtn') {
        b.innerHTML = '<i class="fas fa-save"></i> <span>Guardar Cambios</span>';
      }
      if (b.id === 'saveChangesBtnBottom') {
        b.innerHTML = 'Guardar Cambios';
      }
    });
  } else {
    buttons.forEach(b => {
      b.disabled = false;
      b.classList.add('ready');
      if (!b.classList.contains('saving') && !b.classList.contains('saved')) {
        if (b.id === 'saveChangesBtn') {
          b.innerHTML = '<i class="fas fa-save"></i> <span>Guardar Cambios</span>';
        }
        if (b.id === 'saveChangesBtnBottom') {
          b.innerHTML = 'Guardar Cambios';
        }
      }
    });
  }
}

// ==================== FORM & SAVE ====================
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
  btn.addEventListener('click', saveFormData);
}

function setupEventListeners() {
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      if (confirm('¿Cerrar sesión?')) signOut(auth);
    });
  }
  
  const btnBottom = document.getElementById('saveChangesBtnBottom');
  if (btnBottom) {
    btnBottom.addEventListener('click', saveFormData);
  }
}

async function saveFormData() {
  const btn = document.getElementById('saveChangesBtn');
  const btnBottom = document.getElementById('saveChangesBtnBottom');
  
  const alMenosUnDiaAbierto = DAYS.some(day => !comercioData.horarios[day].closed);
  
  if (!alMenosUnDiaAbierto) {
    showToast('Faltan datos', 'Configurá al menos un día como abierto', 'warning');
    return;
  }
  
  try {
    [btn, btnBottom].forEach(b => {
      if (b) {
        b.classList.add('saving');
        b.classList.remove('saved', 'ready');
        if (b.id === 'saveChangesBtn') {
          b.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';
        }
        if (b.id === 'saveChangesBtnBottom') {
          b.innerHTML = 'Guardando...';
        }
      }
    });
    
    const updates = {
      horarios: comercioData.horarios,
      'onboardingSteps.horarios': true,
      fechaActualizacion: new Date()
    };
    
    await updateDoc(doc(db, 'comercios', currentComercioId), updates);
    
    originalHorarios = structuredClone(comercioData.horarios);
    hasUnsavedChanges = false;
    
    [btn, btnBottom].forEach(b => {
      if (b) {
        b.classList.remove('saving');
        b.classList.add('saved');
        if (b.id === 'saveChangesBtn') {
          b.innerHTML = '<i class="fas fa-check"></i> ¡Guardado!';
        }
        if (b.id === 'saveChangesBtnBottom') {
          b.innerHTML = '¡Guardado!';
        }
      }
    });
    
    setTimeout(() => {
      [btn, btnBottom].forEach(b => {
        if (b) {
          b.disabled = true;
          b.className = 'btn-save';
          if (b.id === 'saveChangesBtn') {
            b.innerHTML = '<i class="fas fa-save"></i> <span>Guardar Cambios</span>';
          }
          if (b.id === 'saveChangesBtnBottom') {
            b.innerHTML = 'Guardar Cambios';
          }
        }
      });
    }, 2500);
    
    showToast('Éxito', 'Horarios guardados correctamente', 'success');
    updateBanner();
    
    try {
      runFlowController(currentUser.uid);
    } catch (e) {
      console.warn('runFlowController falló tras guardar:', e);
    }
    
  } catch (err) {
    console.error(err);
    [btn, btnBottom].forEach(b => {
      if (b) {
        b.className = 'btn-save';
        b.innerHTML = '<i class="fas fa-save"></i> Error';
      }
    });
    showToast('Error', 'No se pudo guardar: ' + err.message, 'error');
  } finally {
    checkFormValidity();
  }
}

function insertAIHelperCard() {
  const container = document.querySelector('main .container');
  if (!container || document.querySelector('.ai-helper-card')) return;
  
  const card = document.createElement('div');
  card.className = 'ai-helper-card';
  card.innerHTML = `
    <div class="ai-helper-icon">AI</div>
    <div class="ai-helper-content">
      <h4>¡Tu IA conocerá tus horarios!</h4>
      <p>Configurando tus horarios, tu asistente sabrá cuándo puede atender clientes y gestionar pedidos automáticamente.</p>
      <small>Esto evita confusiones y mejora la experiencia</small>
    </div>
  `;
  
  container.insertBefore(card, container.firstChild);
}

window.validateCurrentPageData = async () => {
  if (hasUnsavedChanges) {
    showToast('Cambios sin guardar', 'Guardá antes de continuar', 'warning');
    return false;
  }
  return true;
};
