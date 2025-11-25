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
          abierto: false,
          apertura: "09:00",
          cierre: "18:00"
        };
      });
    }
  } else {
    comercioData = { plan: 'trial', pais: 'Argentina', horarios: {} };
    DAYS.forEach(day => {
      comercioData.horarios[day] = {
        abierto: false,
        apertura: "09:00",
        cierre: "18:00"
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
  return `
    <div class="day-card ${data.abierto ? 'active' : ''}" data-day="${day}">
      <div class="day-header">
        <div class="day-toggle">
          <input 
            type="checkbox" 
            id="toggle_${day}" 
            data-day="${day}"
            ${data.abierto ? 'checked' : ''}
          >
          <label for="toggle_${day}">
            <span class="day-name">${DAYS_LABELS[day]}</span>
            <span class="status-badge">${data.abierto ? 'Abierto' : 'Cerrado'}</span>
          </label>
        </div>
      </div>
      <div class="day-body ${data.abierto ? '' : 'disabled'}">
        <div class="time-inputs">
          <div class="time-group">
            <label><i class="fas fa-sunrise"></i> Apertura</label>
            <input 
              type="time" 
              id="apertura_${day}"
              data-day="${day}"
              data-field="apertura"
              value="${data.apertura}"
              ${data.abierto ? '' : 'disabled'}
            >
          </div>
          <div class="time-group">
            <label><i class="fas fa-sunset"></i> Cierre</label>
            <input 
              type="time" 
              id="cierre_${day}"
              data-day="${day}"
              data-field="cierre"
              value="${data.cierre}"
              ${data.abierto ? '' : 'disabled'}
            >
          </div>
        </div>
      </div>
    </div>
  `;
}

function attachDayCardListeners() {
  // Toggles abierto/cerrado
  document.querySelectorAll('.day-card input[type="checkbox"]').forEach(toggle => {
    toggle.addEventListener('change', (e) => {
      const day = e.target.dataset.day;
      const card = document.querySelector(`.day-card[data-day="${day}"]`);
      const body = card.querySelector('.day-body');
      const inputs = card.querySelectorAll('input[type="time"]');
      const badge = card.querySelector('.status-badge');
      
      comercioData.horarios[day].abierto = e.target.checked;
      
      if (e.target.checked) {
        card.classList.add('active');
        body.classList.remove('disabled');
        inputs.forEach(i => i.disabled = false);
        badge.textContent = 'Abierto';
      } else {
        card.classList.remove('active');
        body.classList.add('disabled');
        inputs.forEach(i => i.disabled = true);
        badge.textContent = 'Cerrado';
      }
      
      markAsChanged();
      checkFormValidity();
    });
  });
  
  // Time inputs
  document.querySelectorAll('.day-card input[type="time"]').forEach(input => {
    input.addEventListener('change', (e) => {
      const day = e.target.dataset.day;
      const field = e.target.dataset.field;
      comercioData.horarios[day][field] = e.target.value;
      markAsChanged();
      checkFormValidity();
    });
  });
  
  // Copiar a todos
  const copiarBtn = document.getElementById('copiarATodos');
  if (copiarBtn) {
    copiarBtn.addEventListener('click', () => {
      const lunes = comercioData.horarios.lunes;
      DAYS.forEach(day => {
        if (day !== 'lunes') {
          comercioData.horarios[day] = { ...lunes };
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
        comercioData.horarios[day].abierto = false;
      });
      renderHorariosModule();
      attachDayCardListeners();
      markAsChanged();
      checkFormValidity();
      showToast('Cerrado', 'Todos los días marcados como cerrado', 'info');
    });
  }
}

// ==================== VALIDACIÓN ====================
function markAsChanged() {
  hasUnsavedChanges = true;
  checkFormValidity();
}

function checkFormValidity() {
  // Validar que al menos un día esté abierto
  const alMenosUnDiaAbierto = DAYS.some(day => comercioData.horarios[day].abierto);
  
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
  
  // Validar que al menos un día esté abierto
  const alMenosUnDiaAbierto = DAYS.some(day => comercioData.horarios[day].abierto);
  
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
