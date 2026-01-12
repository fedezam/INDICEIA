// src/pages/horarios.js
// ==================== VERSIÓN REFACTORIZADA ====================
// Usa dataPageSkeleton.js - SOLO lógica específica de horarios

// ==================== ESTILOS ====================
import '../styles/base.css';
import '../styles/layout.css';
import '../styles/components.css';
import '../styles/forms.css';
import '../styles/forms-premium.css';
import './horarios.css';

// ==================== FIREBASE ====================
import { db } from '../firebase.js';
import { doc, updateDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// ==================== UTILS ====================
import { showToast, showLoading, hideLoading } from '../shared/utils.js';

// ==================== SKELETON ====================
import { runDataPage } from '../shared/dataPageSkeleton.js';

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

// ==================== ESTADO LOCAL ====================
let horarios = {};

// ==================== HELPERS ====================
function getDefaultDaySchedule() {
  return {
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
}

function ensureHorariosStructure(horariosData) {
  const result = horariosData || {};
  
  DAYS.forEach(day => {
    if (!result[day]) {
      result[day] = getDefaultDaySchedule();
    } else {
      // Asegurar campos morning/afternoon
      if (!result[day].morning) {
        result[day].morning = { enabled: false, open: "08:00", close: "13:00" };
      }
      if (!result[day].afternoon) {
        result[day].afternoon = { enabled: false, open: "16:00", close: "21:00" };
      }
      // Asegurar campo continuous
      if (result[day].continuous === undefined) {
        result[day].continuous = true;
      }
    }
  });
  
  return result;
}

// ==================== MÓDULO EXPORTADO ====================
const horariosModule = {
  // 1️⃣ LOAD - Cargar datos desde Firebase
  async load({ currentComercioId, comercioData }) {
    horarios = ensureHorariosStructure(comercioData.horarios);
    console.log('✅ Horarios cargados');
  },

  // 2️⃣ RENDER - Dibujar UI específica
  render() {
    // Verificar que DOM esté listo
    const main = document.querySelector('main .container');
    if (!main) {
      console.error('❌ DOM no está listo, reintentando...');
      setTimeout(() => this.render(), 100);
      return;
    }

    console.log('🎨 Renderizando UI de horarios...');

    renderHorariosModule();
    attachDayCardListeners();
    insertAIHelperCard();

    console.log('✅ UI renderizada correctamente');
  },

  // 3️⃣ GET CURRENT DATA - Snapshot para dirty detection
  getCurrentData() {
    return { 
      horarios: structuredClone(horarios)
    };
  },

  // 4️⃣ SAVE - Guardar cambios
  async save({ currentComercioId, isEditMode }) {
    // Validar que al menos un día esté abierto
    const alMenosUnDiaAbierto = DAYS.some(day => !horarios[day].closed);
    
    if (!alMenosUnDiaAbierto) {
      showToast('Faltan datos', 'Configurá al menos un día como abierto', 'warning');
      throw new Error('Validación fallida');
    }

    showLoading('Guardando horarios...');

    try {
      const auth = getAuth();
      const user = auth.currentUser;

      if (!user) {
        throw new Error('Usuario no autenticado');
      }

      // 1️⃣ Guardar horarios en el comercio
      const comercioUpdates = {
        horarios: horarios,
        'onboardingSteps.horarios': true,
        fechaActualizacion: new Date()
      };

      await updateDoc(doc(db, 'comercios', currentComercioId), comercioUpdates);

      // 2️⃣ 🔥 FIX CRÍTICO - Marcar paso completo en usuario
      await updateDoc(doc(db, 'usuarios', user.uid), {
        'onboardingSteps.horarios': true
      });

      hideLoading();
      showToast('Éxito', 'Horarios guardados correctamente', 'success');

    } catch (error) {
      hideLoading();
      console.error('❌ Error guardando:', error);
      showToast('Error', 'No se pudo guardar: ' + error.message, 'error');
      throw error;
    }
  },

  // 5️⃣ VALIDACIÓN - ¿Puede avanzar?
  isFormValid() {
    // Validar que al menos un día esté abierto
    return DAYS.some(day => !horarios[day].closed);
  }
};

// ==================== UI RENDERING ====================

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
}

function renderDayCard(day) {
  const data = horarios[day];
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

// ==================== EVENT LISTENERS ====================

function attachDayCardListeners() {
  // Toggle abierto/cerrado
  document.querySelectorAll('.day-card input[id^="toggle_"]').forEach(toggle => {
    toggle.addEventListener('change', (e) => {
      const day = e.target.dataset.day;
      const card = document.querySelector(`.day-card[data-day="${day}"]`);
      const body = card.querySelector('.day-body');
      const badge = card.querySelector('.status-badge');
      const allInputs = card.querySelectorAll('input:not([id^="toggle_"])');

      horarios[day].closed = !e.target.checked;

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
    });
  });

  // Toggle horario corrido/cortado
  document.querySelectorAll('input[id^="continuous_"]').forEach(toggle => {
    toggle.addEventListener('change', (e) => {
      const day = e.target.dataset.day;
      horarios[day].continuous = e.target.checked;

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
    });
  });

  // Toggle mañana/tarde enabled
  document.querySelectorAll('input[id^="morning_enabled_"], input[id^="afternoon_enabled_"]').forEach(toggle => {
    toggle.addEventListener('change', (e) => {
      const day = e.target.dataset.day;
      const period = e.target.dataset.period;
      horarios[day][period].enabled = e.target.checked;
      updateInputStates(day);
    });
  });

  // Time inputs
  document.querySelectorAll('input[type="time"][data-field]').forEach(input => {
    input.addEventListener('change', (e) => {
      const day = e.target.dataset.day;
      const field = e.target.dataset.field;
      const period = e.target.dataset.period;

      if (period) {
        horarios[day][period][field] = e.target.value;
      } else {
        horarios[day][field] = e.target.value;
      }
    });
  });

  // Copiar a todos
  const copiarBtn = document.getElementById('copiarATodos');
  if (copiarBtn) {
    copiarBtn.addEventListener('click', () => {
      const lunes = structuredClone(horarios.lunes);
      DAYS.forEach(day => {
        if (day !== 'lunes') {
          horarios[day] = structuredClone(lunes);
        }
      });
      
      renderHorariosModule();
      attachDayCardListeners();
      showToast('Copiado', 'Horarios de lunes copiados a todos los días', 'success');
    });
  }

  // Cerrar todos
  const cerrarBtn = document.getElementById('cerrarTodos');
  if (cerrarBtn) {
    cerrarBtn.addEventListener('click', () => {
      DAYS.forEach(day => {
        horarios[day].closed = true;
      });
      
      renderHorariosModule();
      attachDayCardListeners();
      showToast('Cerrado', 'Todos los días marcados como cerrado', 'info');
    });
  }
}

function updateInputStates(day) {
  const data = horarios[day];
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

// ==================== BOOT ====================
runDataPage(horariosModule);
