// pages/horarios/horarios.js
// ==================== MIGRACIÓN AL SISTEMA SKELETON ====================

import { runSkeleton } from '../skeleton/skeleton.js';
import { createFirebaseAdapter } from '../skeleton/adapters/firebaseAdapter.js';
import { createFormField } from '../skeleton/components/form-field/index.js';
import { createButton } from '../skeleton/components/button/index.js';
import { createCard } from '../skeleton/components/card/index.js';
import { showToast } from '../skeleton/components/toast/index.js';

// Firebase
import { db } from '../firebase.js';
import { doc, updateDoc } from 'firebase/firestore';

// ==================== DATOS ESTÁTICOS ====================
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

// ==================== HELPERS ====================
function getDefaultDaySchedule() {
  return {
    closed: false,
    continuous: true,
    open: "09:00",
    close: "18:00",
    morning: {
      enabled: true,
      open: "08:00",
      close: "13:00"
    },
    afternoon: {
      enabled: true,
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
      if (!result[day].morning) {
        result[day].morning = { enabled: true, open: "08:00", close: "13:00" };
      }
      if (!result[day].afternoon) {
        result[day].afternoon = { enabled: true, open: "16:00", close: "21:00" };
      }
      if (result[day].continuous === undefined) {
        result[day].continuous = true;
      }
    }
  });
  
  return result;
}

// ==================== PÁGINA ====================
const horariosPage = {
  // Referencias
  dayCards: [],
  guardarBtn: null,
  
  // Estado
  horarios: {},
  
  async load(ctx) {
    this.ctx = ctx;
    this.comercioData = ctx.comercioData || {};
    this.currentUser = ctx.currentUser;
    this.currentComercioId = ctx.currentComercioId;
    
    this.horarios = ensureHorariosStructure(this.comercioData.horarios);
    
    console.log('✅ Horarios cargados:', this.horarios);
  },
  
  render() {
    const page = document.getElementById('skeleton-page');
    page.innerHTML = '';
    
    // ==================== HEADER ====================
    const header = document.createElement('div');
    header.className = 'page-header';
    header.innerHTML = `
      <h2><i class="fas fa-clock"></i> Horarios de Atención</h2>
      <p>Configurá cuándo está abierto tu comercio</p>
    `;
    page.appendChild(header);
    
    // ==================== AI HELPER CARD ====================
    const aiCard = this.renderAIHelper();
    page.appendChild(aiCard);
    
    // ==================== GRID DE DÍAS ====================
    const grid = document.createElement('div');
    grid.className = 'horarios-grid';
    grid.style.display = 'grid';
    grid.style.gridTemplateColumns = 'repeat(auto-fit, minmax(320px, 1fr))';
    grid.style.gap = '20px';
    grid.style.marginBottom = '30px';
    
    this.dayCards = [];
    DAYS.forEach(day => {
      const card = this.createDayCard(day);
      this.dayCards.push(card);
      grid.appendChild(card);
    });
    
    page.appendChild(grid);
    
    // ==================== QUICK ACTIONS ====================
    const actions = this.renderQuickActions();
    page.appendChild(actions);
    
    // ==================== BOTÓN GUARDAR ====================
    this.guardarBtn = createButton({
      label: 'Guardar Horarios',
      icon: 'fa-save',
      variant: 'success',
      size: 'lg',
      block: true,
      onClick: () => this.handleGuardar()
    });
    
    const btnContainer = document.createElement('div');
    btnContainer.style.marginTop = '30px';
    btnContainer.appendChild(this.guardarBtn);
    page.appendChild(btnContainer);
    
    // Validar inicial
    this.validateForm();
  },
  
  renderAIHelper() {
    return createCard({
      title: '¡Tu IA conocerá tus horarios!',
      icon: 'fa-robot',
      variant: 'info',
      highlight: true,
      content: 'Configurando tus horarios, tu asistente sabrá cuándo puede atender clientes y gestionar pedidos automáticamente. Esto evita confusiones y mejora la experiencia.',
      compact: true
    });
  },
  
  createDayCard(day) {
    const schedule = this.horarios[day];
    const isOpen = !schedule.closed;
    
    // Contenido dinámico
    const content = this.buildDayContent(day);
    
    // Card con título dinámico
    const card = createCard({
      title: DAYS_LABELS[day],
      icon: 'fa-calendar-day',
      variant: isOpen ? 'success' : null,
      content: content,
      flat: false
    });
    
    // Guardar referencia al día en el DOM
    card.dataset.day = day;
    
    return card;
  },
  
  buildDayContent(day) {
    const schedule = this.horarios[day];
    const container = document.createElement('div');
    container.className = 'day-content';
    
    // ==================== TOGGLE ABIERTO/CERRADO ====================
    const openToggle = createFormField({
      label: 'Abierto',
      type: 'checkbox',
      name: `open_${day}`,
      value: !schedule.closed
    });
    
    openToggle.input.addEventListener('change', (e) => {
      schedule.closed = !e.target.checked;
      this.updateDayCard(day);
      this.validateForm();
    });
    
    container.appendChild(openToggle);
    
    // Si está cerrado, no mostrar más nada
    if (schedule.closed) {
      const closedMsg = document.createElement('p');
      closedMsg.textContent = 'Este día el comercio permanece cerrado';
      closedMsg.style.color = 'var(--s-gray, #6c757d)';
      closedMsg.style.fontSize = '14px';
      closedMsg.style.marginTop = '10px';
      container.appendChild(closedMsg);
      return container;
    }
    
    // ==================== TOGGLE CORRIDO/CORTADO ====================
    const modeToggle = createFormField({
      label: 'Horario corrido',
      type: 'checkbox',
      name: `continuous_${day}`,
      value: schedule.continuous
    });
    
    modeToggle.input.addEventListener('change', (e) => {
      schedule.continuous = e.target.checked;
      this.updateDayCard(day);
    });
    
    container.appendChild(modeToggle);
    
    // Separador visual
    const separator = document.createElement('hr');
    separator.style.margin = '15px 0';
    separator.style.border = 'none';
    separator.style.borderTop = '1px solid var(--s-border, #d2d6de)';
    container.appendChild(separator);
    
    // ==================== RENDER CONDICIONAL ====================
    if (schedule.continuous) {
      // HORARIO CORRIDO - Un solo bloque
      container.appendChild(this.createContinuousSchedule(day));
    } else {
      // HORARIO CORTADO - Mañana + Tarde
      container.appendChild(this.createSplitSchedule(day));
    }
    
    return container;
  },
  
  createContinuousSchedule(day) {
    const schedule = this.horarios[day];
    const wrapper = document.createElement('div');
    wrapper.className = 'continuous-schedule';
    
    const title = document.createElement('h4');
    title.textContent = 'Horario de atención';
    title.style.marginBottom = '15px';
    title.style.fontSize = '14px';
    title.style.fontWeight = '600';
    title.style.color = 'var(--s-dark, #343a40)';
    wrapper.appendChild(title);
    
    const timeWrapper = document.createElement('div');
    timeWrapper.style.display = 'grid';
    timeWrapper.style.gridTemplateColumns = '1fr 1fr';
    timeWrapper.style.gap = '15px';
    
    const openInput = createFormField({
      label: 'Apertura',
      type: 'time',
      name: `open_${day}`,
      value: schedule.open || '09:00'
    });
    
    openInput.input.addEventListener('change', (e) => {
      schedule.open = e.target.value;
    });
    
    const closeInput = createFormField({
      label: 'Cierre',
      type: 'time',
      name: `close_${day}`,
      value: schedule.close || '18:00'
    });
    
    closeInput.input.addEventListener('change', (e) => {
      schedule.close = e.target.value;
    });
    
    timeWrapper.append(openInput, closeInput);
    wrapper.appendChild(timeWrapper);
    
    return wrapper;
  },
  
  createSplitSchedule(day) {
    const schedule = this.horarios[day];
    const wrapper = document.createElement('div');
    wrapper.className = 'split-schedule';
    
    // ==================== MAÑANA ====================
    const morningSection = this.createPeriodSection({
      day,
      period: 'morning',
      label: 'Mañana',
      icon: 'fa-sun',
      data: schedule.morning
    });
    
    wrapper.appendChild(morningSection);
    
    // Separador
    const separator = document.createElement('div');
    separator.style.height = '20px';
    wrapper.appendChild(separator);
    
    // ==================== TARDE ====================
    const afternoonSection = this.createPeriodSection({
      day,
      period: 'afternoon',
      label: 'Tarde',
      icon: 'fa-moon',
      data: schedule.afternoon
    });
    
    wrapper.appendChild(afternoonSection);
    
    return wrapper;
  },
  
  createPeriodSection({ day, period, label, icon, data }) {
    const section = document.createElement('div');
    section.className = 'period-section';
    
    // Toggle habilitar/deshabilitar período
    const periodToggle = createFormField({
      label: `${label}`,
      type: 'checkbox',
      name: `${period}_enabled_${day}`,
      value: data.enabled
    });
    
    // Agregar ícono al label
    const labelEl = periodToggle.querySelector('.s-label');
    labelEl.innerHTML = `<i class="fas ${icon}"></i> ${label}`;
    
    periodToggle.input.addEventListener('change', (e) => {
      data.enabled = e.target.checked;
      this.updateDayCard(day);
    });
    
    section.appendChild(periodToggle);
    
    // Si está deshabilitado, no mostrar inputs
    if (!data.enabled) {
      const disabledMsg = document.createElement('p');
      disabledMsg.textContent = `${label} cerrado`;
      disabledMsg.style.color = 'var(--s-gray, #6c757d)';
      disabledMsg.style.fontSize = '13px';
      disabledMsg.style.marginTop = '5px';
      section.appendChild(disabledMsg);
      return section;
    }
    
    // Inputs de horario
    const timeWrapper = document.createElement('div');
    timeWrapper.style.display = 'grid';
    timeWrapper.style.gridTemplateColumns = '1fr 1fr';
    timeWrapper.style.gap = '15px';
    timeWrapper.style.marginTop = '10px';
    
    const openInput = createFormField({
      label: 'Apertura',
      type: 'time',
      name: `${period}_open_${day}`,
      value: data.open || '08:00'
    });
    
    openInput.input.addEventListener('change', (e) => {
      data.open = e.target.value;
    });
    
    const closeInput = createFormField({
      label: 'Cierre',
      type: 'time',
      name: `${period}_close_${day}`,
      value: data.close || '13:00'
    });
    
    closeInput.input.addEventListener('change', (e) => {
      data.close = e.target.value;
    });
    
    timeWrapper.append(openInput, closeInput);
    section.appendChild(timeWrapper);
    
    return section;
  },
  
  updateDayCard(day) {
    // Encontrar la card antigua
    const index = DAYS.indexOf(day);
    const oldCard = this.dayCards[index];
    
    // Crear nueva card
    const newCard = this.createDayCard(day);
    
    // Reemplazar
    oldCard.replaceWith(newCard);
    this.dayCards[index] = newCard;
  },
  
  renderQuickActions() {
    const container = document.createElement('div');
    container.className = 'quick-actions';
    container.style.display = 'flex';
    container.style.gap = '15px';
    container.style.marginBottom = '20px';
    container.style.flexWrap = 'wrap';
    
    const copiarBtn = createButton({
      label: 'Copiar lunes a todos',
      icon: 'fa-copy',
      variant: 'secondary',
      onClick: () => this.copiarLunesATodos()
    });
    
    const cerrarBtn = createButton({
      label: 'Cerrar todos',
      icon: 'fa-times-circle',
      variant: 'secondary',
      onClick: () => this.cerrarTodos()
    });
    
    container.append(copiarBtn, cerrarBtn);
    
    return container;
  },
  
  copiarLunesATodos() {
    const lunes = structuredClone(this.horarios.lunes);
    
    DAYS.forEach(day => {
      if (day !== 'lunes') {
        this.horarios[day] = structuredClone(lunes);
      }
    });
    
    // Re-render completo
    this.render();
    
    showToast({
      title: 'Copiado',
      message: 'Horarios de lunes aplicados a todos los días',
      variant: 'success'
    });
  },
  
  cerrarTodos() {
    DAYS.forEach(day => {
      this.horarios[day].closed = true;
    });
    
    // Re-render completo
    this.render();
    
    showToast({
      title: 'Cerrado',
      message: 'Todos los días marcados como cerrado',
      variant: 'info'
    });
  },
  
  validateForm() {
    // Al menos un día debe estar abierto
    const alMenosUnDiaAbierto = DAYS.some(day => !this.horarios[day].closed);
    
    if (this.guardarBtn) {
      if (alMenosUnDiaAbierto) {
        this.guardarBtn.enable();
      } else {
        this.guardarBtn.disable();
      }
    }
    
    return alMenosUnDiaAbierto;
  },
  
  async handleGuardar() {
    if (!this.validateForm()) {
      showToast({
        title: 'Faltan datos',
        message: 'Configurá al menos un día como abierto',
        variant: 'warning'
      });
      return;
    }
    
    this.guardarBtn.setLoading(true);
    
    try {
      const updates = {
        horarios: this.horarios,
        'onboardingSteps.horarios': true,
        fechaActualizacion: new Date()
      };
      
      await updateDoc(doc(db, 'comercios', this.currentComercioId), updates);
      
      showToast({
        title: 'Guardado',
        message: 'Horarios actualizados correctamente',
        variant: 'success'
      });
      
      await new Promise(resolve => setTimeout(resolve, 500));
      
      window.location.href = "/dashboard.html";
      
    } catch (error) {
      console.error('❌ Error guardando:', error);
      showToast({
        title: 'Error',
        message: 'No se pudo guardar: ' + error.message,
        variant: 'error'
      });
    } finally {
      this.guardarBtn.setLoading(false);
    }
  }
};

// ==================== RUN ====================
runSkeleton({
  page: horariosPage,
  adapter: createFirebaseAdapter,
  options: {
    debug: true,
    loadingMessage: 'Cargando horarios...'
  }
});
