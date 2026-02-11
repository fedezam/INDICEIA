// pages/horarios/skeletonTest.js
// ==================== MIGRACIÓN AL SISTEMA SKELETON ====================

import './horarios.css'; // ← IMPORTANTE: CSS custom de horarios

import { runSkeleton } from '../skeleton/skeleton.js';
import { createFirebaseAdapter } from '../skeleton/adapters/firebaseAdapter.js';
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
    console.log('🔵 [LOAD] Iniciando carga de horarios...');
    
    this.ctx = ctx;
    this.comercioData = ctx.comercioData || {};
    this.currentUser = ctx.currentUser;
    this.currentComercioId = ctx.currentComercioId;
    
    console.log('🔵 [LOAD] Datos recibidos:', {
      comercioId: this.currentComercioId,
      horariosExisten: !!this.comercioData.horarios
    });
    
    this.horarios = ensureHorariosStructure(this.comercioData.horarios);
    
    console.log('✅ [LOAD] Horarios procesados:', this.horarios);
  },
  
  render() {
    console.log('🎨 [RENDER] Iniciando render de página...');
    
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
    console.log('✅ [RENDER] Header creado');
    
    // ==================== AI HELPER CARD ====================
    const aiCard = this.renderAIHelper();
    page.appendChild(aiCard);
    console.log('✅ [RENDER] AI Helper creado');
    
    // ==================== GRID DE DÍAS ====================
    const grid = document.createElement('div');
    grid.className = 'horarios-grid';
    
    this.dayCards = [];
    DAYS.forEach(day => {
      console.log(`🔵 [RENDER] Creando card para: ${day}`);
      const card = this.createDayCard(day);
      this.dayCards.push(card);
      grid.appendChild(card);
    });
    
    page.appendChild(grid);
    console.log('✅ [RENDER] Grid de días creado');
    
    // ==================== QUICK ACTIONS ====================
    const actions = this.renderQuickActions();
    page.appendChild(actions);
    console.log('✅ [RENDER] Quick actions creadas');
    
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
    console.log('✅ [RENDER] Botón guardar creado');
    
    // Validar inicial
    this.validateForm();
    console.log('✅ [RENDER] Render completo');
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
    
    console.log(`🔵 [CARD] Creando card para ${day}:`, {
      closed: schedule.closed,
      continuous: schedule.continuous,
      isOpen
    });
    
    // Contenido dinámico usando componentes CUSTOM
    const content = this.buildDayContent(day);
    
    // Card con header custom
    const card = document.createElement('div');
    card.className = `day-card ${isOpen ? 'active' : ''}`;
    card.dataset.day = day;
    
    // Header con toggle grande
    const header = this.createDayHeader(day, isOpen);
    card.appendChild(header);
    
    // Body con contenido
    const body = document.createElement('div');
    body.className = `day-body ${!isOpen ? 'disabled' : ''}`;
    body.appendChild(content);
    card.appendChild(body);
    
    console.log(`✅ [CARD] Card creada para ${day}`);
    
    return card;
  },
  
  createDayHeader(day, isOpen) {
    const header = document.createElement('div');
    header.className = 'day-header';
    
    // Toggle visual grande (custom, no componente genérico)
    const toggle = document.createElement('div');
    toggle.className = 'day-toggle';
    
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = `toggle_${day}`;
    checkbox.checked = isOpen;
    checkbox.dataset.day = day;
    
    const label = document.createElement('label');
    label.htmlFor = `toggle_${day}`;
    label.innerHTML = `
      <span class="day-name">${DAYS_LABELS[day]}</span>
      <span class="status-badge">${isOpen ? 'Abierto' : 'Cerrado'}</span>
    `;
    
    checkbox.addEventListener('change', (e) => {
      const newState = e.target.checked;
      console.log(`🔵 [TOGGLE] ${day} cambió a: ${newState ? 'ABIERTO' : 'CERRADO'}`);
      
      this.horarios[day].closed = !newState;
      this.updateDayCard(day);
      this.validateForm();
    });
    
    toggle.appendChild(checkbox);
    toggle.appendChild(label);
    header.appendChild(toggle);
    
    return header;
  },
  
  buildDayContent(day) {
    const schedule = this.horarios[day];
    const container = document.createElement('div');
    container.className = 'day-content';
    
    console.log(`🔵 [CONTENT] Construyendo contenido para ${day}:`, schedule);
    
    // Si está cerrado, solo mostrar mensaje
    if (schedule.closed) {
      const closedMsg = document.createElement('p');
      closedMsg.className = 'closed-message';
      closedMsg.textContent = 'Este día el comercio permanece cerrado';
      container.appendChild(closedMsg);
      console.log(`⚪ [CONTENT] ${day} está cerrado, mostrando mensaje`);
      return container;
    }
    
    // ==================== TOGGLE CORRIDO/CORTADO ====================
    const modeToggle = this.createModeToggle(day, schedule.continuous);
    container.appendChild(modeToggle);
    
    // Separador
    const separator = document.createElement('hr');
    separator.className = 'content-separator';
    container.appendChild(separator);
    
    // ==================== RENDER CONDICIONAL ====================
    console.log(`🔵 [CONTENT] ${day} modo: ${schedule.continuous ? 'CORRIDO' : 'CORTADO'}`);
    
    if (schedule.continuous) {
      container.appendChild(this.createContinuousSchedule(day));
      console.log(`✅ [CONTENT] ${day} renderizado con horario CORRIDO`);
    } else {
      container.appendChild(this.createSplitSchedule(day));
      console.log(`✅ [CONTENT] ${day} renderizado con horario CORTADO`);
    }
    
    return container;
  },
  
  createModeToggle(day, isContinuous) {
    const wrapper = document.createElement('div');
    wrapper.className = 'schedule-type-toggle';
    
    const label = document.createElement('label');
    label.className = 'schedule-type-label';
    
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = `continuous_${day}`;
    checkbox.checked = isContinuous;
    checkbox.dataset.day = day;
    
    checkbox.addEventListener('change', (e) => {
      const newMode = e.target.checked ? 'CORRIDO' : 'CORTADO';
      console.log(`🔵 [MODE] ${day} cambió a modo: ${newMode}`);
      
      this.horarios[day].continuous = e.target.checked;
      this.updateDayCard(day);
    });
    
    const span = document.createElement('span');
    span.textContent = 'Horario corrido';
    
    label.appendChild(checkbox);
    label.appendChild(span);
    wrapper.appendChild(label);
    
    return wrapper;
  },
  
  createContinuousSchedule(day) {
    const schedule = this.horarios[day];
    const wrapper = document.createElement('div');
    wrapper.className = 'continuous-schedule';
    
    const title = document.createElement('h4');
    title.textContent = 'Horario de atención';
    wrapper.appendChild(title);
    
    const timeWrapper = document.createElement('div');
    timeWrapper.className = 'time-inputs';
    
    // Apertura
    const openGroup = this.createTimeInput({
      day,
      field: 'open',
      label: 'Apertura',
      value: schedule.open || '09:00',
      onChange: (value) => {
        console.log(`🔵 [TIME] ${day} apertura: ${value}`);
        schedule.open = value;
      }
    });
    
    // Cierre
    const closeGroup = this.createTimeInput({
      day,
      field: 'close',
      label: 'Cierre',
      value: schedule.close || '18:00',
      onChange: (value) => {
        console.log(`🔵 [TIME] ${day} cierre: ${value}`);
        schedule.close = value;
      }
    });
    
    timeWrapper.append(openGroup, closeGroup);
    wrapper.appendChild(timeWrapper);
    
    return wrapper;
  },
  
  createSplitSchedule(day) {
    const schedule = this.horarios[day];
    const wrapper = document.createElement('div');
    wrapper.className = 'split-schedule';
    
    console.log(`🔵 [SPLIT] ${day} horario cortado:`, {
      morningEnabled: schedule.morning.enabled,
      afternoonEnabled: schedule.afternoon.enabled
    });
    
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
    section.className = 'schedule-period';
    
    // Header con toggle
    const header = document.createElement('div');
    header.className = 'period-header';
    
    const toggleLabel = document.createElement('label');
    toggleLabel.className = 'period-toggle';
    
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = `${period}_enabled_${day}`;
    checkbox.checked = data.enabled;
    checkbox.dataset.day = day;
    checkbox.dataset.period = period;
    
    checkbox.addEventListener('change', (e) => {
      const newState = e.target.checked ? 'HABILITADO' : 'DESHABILITADO';
      console.log(`🔵 [PERIOD] ${day} ${period}: ${newState}`);
      
      data.enabled = e.target.checked;
      this.updateDayCard(day);
    });
    
    const span = document.createElement('span');
    span.innerHTML = `<i class="fas ${icon}"></i> ${label}`;
    
    toggleLabel.appendChild(checkbox);
    toggleLabel.appendChild(span);
    header.appendChild(toggleLabel);
    section.appendChild(header);
    
    // Si está deshabilitado, mostrar mensaje
    if (!data.enabled) {
      const disabledMsg = document.createElement('p');
      disabledMsg.className = 'period-disabled';
      disabledMsg.textContent = `${label} cerrado`;
      section.appendChild(disabledMsg);
      console.log(`⚪ [PERIOD] ${day} ${period} deshabilitado`);
      return section;
    }
    
    // Inputs de horario
    const timeWrapper = document.createElement('div');
    timeWrapper.className = 'time-inputs';
    
    const openGroup = this.createTimeInput({
      day,
      field: `${period}_open`,
      label: 'Apertura',
      value: data.open || '08:00',
      onChange: (value) => {
        console.log(`🔵 [TIME] ${day} ${period} apertura: ${value}`);
        data.open = value;
      }
    });
    
    const closeGroup = this.createTimeInput({
      day,
      field: `${period}_close`,
      label: 'Cierre',
      value: data.close || '13:00',
      onChange: (value) => {
        console.log(`🔵 [TIME] ${day} ${period} cierre: ${value}`);
        data.close = value;
      }
    });
    
    timeWrapper.append(openGroup, closeGroup);
    section.appendChild(timeWrapper);
    
    return section;
  },
  
  createTimeInput({ day, field, label, value, onChange }) {
    const group = document.createElement('div');
    group.className = 'time-group';
    
    const labelEl = document.createElement('label');
    labelEl.textContent = label;
    
    const input = document.createElement('input');
    input.type = 'time';
    input.id = `${field}_${day}`;
    input.value = value;
    input.dataset.day = day;
    input.dataset.field = field;
    
    input.addEventListener('change', (e) => {
      onChange(e.target.value);
    });
    
    group.appendChild(labelEl);
    group.appendChild(input);
    
    return group;
  },
  
  updateDayCard(day) {
    console.log(`🔄 [UPDATE] Actualizando card de ${day}`);
    
    // Encontrar la card antigua
    const index = DAYS.indexOf(day);
    const oldCard = this.dayCards[index];
    
    // Crear nueva card
    const newCard = this.createDayCard(day);
    
    // Reemplazar
    oldCard.replaceWith(newCard);
    this.dayCards[index] = newCard;
    
    console.log(`✅ [UPDATE] Card de ${day} actualizada`);
  },
  
  renderQuickActions() {
    const container = document.createElement('div');
    container.className = 'quick-actions';
    
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
    console.log('🔵 [ACTION] Copiando lunes a todos...');
    
    const lunes = structuredClone(this.horarios.lunes);
    
    DAYS.forEach(day => {
      if (day !== 'lunes') {
        this.horarios[day] = structuredClone(lunes);
        console.log(`✅ [ACTION] ${day} copiado desde lunes`);
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
    console.log('🔵 [ACTION] Cerrando todos los días...');
    
    DAYS.forEach(day => {
      this.horarios[day].closed = true;
      console.log(`✅ [ACTION] ${day} cerrado`);
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
    const alMenosUnDiaAbierto = DAYS.some(day => !this.horarios[day].closed);
    
    console.log('🔵 [VALIDATE] Validando formulario:', {
      alMenosUnDiaAbierto,
      diasAbiertos: DAYS.filter(d => !this.horarios[d].closed)
    });
    
    if (this.guardarBtn) {
      if (alMenosUnDiaAbierto) {
        this.guardarBtn.enable();
        console.log('✅ [VALIDATE] Formulario válido - botón habilitado');
      } else {
        this.guardarBtn.disable();
        console.log('❌ [VALIDATE] Formulario inválido - botón deshabilitado');
      }
    }
    
    return alMenosUnDiaAbierto;
  },
  
  async handleGuardar() {
    console.log('💾 [SAVE] Intentando guardar horarios...');
    
    if (!this.validateForm()) {
      console.log('❌ [SAVE] Validación fallida');
      showToast({
        title: 'Faltan datos',
        message: 'Configurá al menos un día como abierto',
        variant: 'warning'
      });
      return;
    }
    
    this.guardarBtn.setLoading(true);
    console.log('🔵 [SAVE] Guardando en Firebase...');
    
    try {
      const updates = {
        horarios: this.horarios,
        'onboardingSteps.horarios': true,
        fechaActualizacion: new Date()
      };
      
      console.log('🔵 [SAVE] Datos a guardar:', updates);
      
      await updateDoc(doc(db, 'comercios', this.currentComercioId), updates);
      
      console.log('✅ [SAVE] Guardado exitoso en Firebase');
      
      showToast({
        title: 'Guardado',
        message: 'Horarios actualizados correctamente',
        variant: 'success'
      });
      
      await new Promise(resolve => setTimeout(resolve, 500));
      
      console.log('🔵 [SAVE] Redirigiendo a dashboard...');
      window.location.href = "/dashboard.html";
      
    } catch (error) {
      console.error('❌ [SAVE] Error guardando:', error);
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
console.log('🚀 Iniciando página de horarios con Skeleton...');

runSkeleton({
  page: horariosPage,
  adapter: createFirebaseAdapter,
  options: {
    debug: true,
    loadingMessage: 'Cargando horarios...'
  }
});
