// src/pages/dashboard.jsx
import { auth, db } from '../firebase.js';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';
import { showLoading, hideLoading, showToast } from '../shared/utils.jsx';
import { PLANS, calcularEstadoPlan, getDiasRestantesTrial } from '../shared/plans.js';

let currentUser = null;
let currentComercioId = null;
let comercioData = {};
let productos = [];

// ==================== INIT ====================
async function initializePage() {
  showLoading('Cargando dashboard...');
  try {
    currentUser = await getCurrentUser();
    await loadComercioData();
    await loadProductos();

    renderNavbar();
    renderChecklist();
    renderPlanAlert();
    await renderStats(); // ← ESTADÍSTICAS DESDE VERCEL
    renderAsistenteCard();
    renderSummaryCards();

    setupLogout();
    hideLoading();
  } catch (error) {
    console.error('Error:', error);
    showToast('error', 'Error', 'No se pudo cargar el dashboard');
    setTimeout(() => window.location.href = './mi-comercio.html', 2000);
  }
}

// ==================== CARGA ====================
async function loadComercioData() {
  const userSnap = await getDoc(doc(db, 'usuarios', currentUser.uid));
  if (!userSnap.exists()) throw new Error('Usuario no encontrado');
  currentComercioId = userSnap.data().comercioId;

  const comercioSnap = await getDoc(doc(db, 'comercios', currentComercioId));
  if (!comercioSnap.exists()) throw new Error('Comercio no encontrado');
  comercioData = { id: currentComercioId, ...comercioSnap.data() };
}

async function loadProductos() {
  const snap = await getDocs(collection(db, 'comercios', currentComercioId, 'productos'));
  productos = snap.docs.map(d => ({ id: d.id, ...d.data() })).slice(0, 3);
}

// ==================== NAVBAR ====================
function renderNavbar() {
  const container = document.getElementById('dashboardNavbar');
  if (!container) return;

  const pages = [
    { name: 'Mis Datos', icon: 'fas fa-user', url: 'mis-datos.html' },
    { name: 'Mi Comercio', icon: 'fas fa-store', url: 'mi-comercio.html' },
    { name: 'Horarios', icon: 'fas fa-clock', url: 'horarios.html' },
    { name: 'Productos', icon: 'fas fa-boxes', url: 'productos.html' },
    { name: 'IA Config', icon: 'fas fa-robot', url: 'ia-config.html' }
  ];

  container.innerHTML = `
    <div class="navbar-dashboard">
      ${pages.map(p => `
        <a href="${p.url}" class="nav-item">
          <i class="${p.icon}"></i> ${p.name}
        </a>
      `).join('')}
    </div>
  `;
}

// ==================== 4. CHECKLIST ====================
function renderChecklist() {
  const container = document.getElementById('checklistSection');
  if (!container) return;

  const checks = [
    { label: 'Mis Datos', complete: !!currentUser.displayName && !!currentUser.email, url: 'mis-datos.html' },
    { label: 'Mi Comercio', complete: !!comercioData.nombreComercio && !!comercioData.ciudad, url: 'mi-comercio.html' },
    { label: 'Horarios', complete: comercioData.horarios && Object.keys(comercioData.horarios).length > 0, url: 'horarios.html' },
    { label: 'Productos', complete: productos.length > 0, url: 'productos.html' },
    { label: 'IA Config', complete: !!comercioData.aiConfig?.aiName, url: 'ia-config.html' }
  ];

  const completed = checks.filter(c => c.complete).length;
  const percent = Math.round((completed / checks.length) * 100);

  container.innerHTML = `
    <div class="checklist-card">
      <div class="checklist-header">
        <h3><i class="fas fa-tasks"></i> Configuración completa</h3>
        <div class="progress-circle" data-percent="${percent}">
          <span>${percent}%</span>
        </div>
      </div>
      <div class="checklist-items">
        ${checks.map(c => `
          <a href="${c.url}" class="checklist-item ${c.complete ? 'complete' : 'incomplete'}">
            <i class="fas ${c.complete ? 'fa-check-circle' : 'fa-times-circle'}"></i>
            ${c.label}
          </a>
        `).join('')}
      </div>
      ${percent === 100 ? '<p class="success-msg"><i class="fas fa-check"></i> ¡Tu IA está 100% operativa!</p>' : ''}
    </div>
  `;
}

// ==================== 1. PLAN ALERT ====================
function renderPlanAlert() {
  const container = document.getElementById('planAlert');
  if (!container) return;

  const estado = calcularEstadoPlan(comercioData);
  const plan = PLANS[comercioData.plan || 'trial'];
  const dias = getDiasRestantesTrial(comercioData);

  let html = '';
  if (estado === 'trial' && dias <= 5) {
    const urgency = dias <= 1 ? 'urgente' : 'alerta';
    html = `
      <div class="plan-alert ${urgency}">
        <div class="alert-icon"><i class="fas fa-exclamation-triangle"></i></div>
        <div class="alert-content">
          <strong>PLAN ${plan.nombre.toUpperCase()} – ${dias} DÍAS RESTANTES</strong>
          <p>Renová ahora para no perder tu asistente</p>
          <a href="https://x.com/premium" target="_blank" class="btn-renew">Renovar plan</a>
        </div>
      </div>
    `;
  } else if (estado === 'expirado') {
    html = `
      <div class="plan-alert bloqueado">
        <strong>PLAN EXPIRADO</strong>
        <p>Renová para reactivar tu asistente</p>
        <a href="https://x.com/premium" target="_blank" class="btn-renew">Renovar ahora</a>
      </div>
    `;
  }

  container.innerHTML = html;
}

// ==================== ESTADÍSTICAS (VERCEL API) ====================
async function renderStats() {
  const container = document.getElementById('statsSection');
  if (!container) return;

  try {
    const res = await fetch(`/api/generar-bot?id=${currentComercioId}&stats=true`);
    if (!res.ok) throw new Error('No se pudieron cargar estadísticas');

    const stats = await res.json();
    const llamadas = stats.llamadas || 0;
    const ultimoAcceso = stats.ultimoAcceso ? new Date(stats.ultimoAcceso).toLocaleString('es-AR') : 'Nunca';

    container.innerHTML = `
      <div class="stats-card">
        <h3><i class="fas fa-chart-line"></i> Estadísticas del Asistente</h3>
        <div class="stats-grid">
          <div class="stat-item">
            <div class="stat-value">${llamadas}</div>
            <div class="stat-label">Veces usado</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">${stats.horarioPico || '—'}</div>
            <div class="stat-label">Horario pico</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">${ultimoAcceso}</div>
            <div class="stat-label">Última consulta</div>
          </div>
        </div>
      </div>
    `;
  } catch (error) {
    container.innerHTML = `
      <div class="stats-card warning">
        <p><i class="fas fa-info-circle"></i> Estadísticas no disponibles</p>
      </div>
    `;
  }
}

// ==================== ASISTENTE IA ====================
function renderAsistenteCard() {
  const container = document.getElementById('aiCard');
  if (!container) return;

  const ai = comercioData.aiConfig || {};
  if (!ai.aiName) {
    container.innerHTML = `
      <div class="ai-card warning">
        <h3><i class="fas fa-exclamation-triangle"></i> Asistente no configurado</h3>
        <p>Configura tu IA para activarla</p>
        <a href="ia-config.html" class="btn-primary">Configurar IA</a>
      </div>`;
    return;
  }

  container.innerHTML = `
    <div class="ai-card active">
      <div class="ai-header">
        <h3><i class="fas fa-robot"></i> Asistente ACTIVO: ${ai.aiName}</h3>
      </div>
      <div class="ai-info">
        <div><strong>Personalidad:</strong> ${ai.aiPersonality || 'Amigable'}</div>
        <div><strong>Idioma:</strong> ${ai.aiLanguage === 'es-AR' ? 'Español (AR)' : 'Otro'}</div>
      </div>
      <div class="ai-actions">
        <button id="btn-generar-bot" class="btn-generate">
          <i class="fas fa-cube"></i> Generar Asistente Autónomo
        </button>
        <a href="ia-config.html" class="btn-config">Configurar</a>
      </div>
      <div id="botStatus" class="bot-status"></div>
    </div>`;
  
  document.getElementById('btn-generar-bot')?.addEventListener('click', generarAsistenteAutonomo);
}

// ==================== GENERAR ASISTENTE ====================
async function generarAsistenteAutonomo() {
  const btn = document.getElementById('btn-generar-bot');
  const status = document.getElementById('botStatus');
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generando...';

  try {
    const res = await fetch(`/api/generar-bot?id=${currentComercioId}`);
    if (!res.ok) throw new Error('Error del servidor');
    const { url } = await res.json();
    await navigator.clipboard.writeText(url);
    status.innerHTML = `
      <div class="success-msg">
        <i class="fas fa-check"></i> URL copiada al portapapeles
        <a href="${url}" target="_blank" class="link">Abrir →</a>
      </div>`;
    showToast('success', '¡Listo!', 'Asistente autónomo generado');
  } catch (error) {
    status.innerHTML = `<div class="error-msg">Error: ${error.message}</div>`;
    showToast('error', 'Error', error.message);
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-cube"></i> Generar Asistente Autónomo';
  }
}

// ==================== RESUMEN ====================
function renderSummaryCards() {
  const container = document.getElementById('summaryGrid');
  if (!container) return;

  const horarios = comercioData.horarios || {};
  const dias = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];
  const horarioTexto = dias
    .map(d => {
      const h = horarios[d];
      if (!h || !h.activo) return `${d}: Cerrado`;
      return `${d}: ${h.apertura} - ${h.cierre}`;
    })
    .slice(0, 3)
    .join('<br>');

  container.innerHTML = `
    <!-- MI COMERCIO -->
    <div class="summary-card">
      <h4><i class="fas fa-store"></i> Mi Comercio</h4>
      <div class="summary-item">
        <strong>Nombre:</strong> ${comercioData.nombreComercio || 'Sin nombre'}
      </div>
      <div class="summary-item">
        <strong>Ubicación:</strong> ${comercioData.ciudad || 'Sin ciudad'}, ${comercioData.provincia || ''}
      </div>
      <a href="mi-comercio.html" class="btn-edit">Editar</a>
    </div>

    <!-- HORARIOS -->
    <div class="summary-card">
      <h4><i class="fas fa-clock"></i> Horarios</h4>
      <div class="summary-item text-sm">
        ${horarioTexto}${Object.keys(horarios).length > 3 ? '<br><small>+4 más</small>' : ''}
      </div>
      <a href="horarios.html" class="btn-edit">Editar</a>
    </div>

    <!-- PRODUCTOS -->
    <div class="summary-card">
      <h4><i class="fas fa-boxes"></i> Productos (${productos.length}+)</h4>
      <div class="productos-list">
        ${productos.map(p => `
          <div class="producto-item">
            <strong>${p.nombre}</strong>
            <span>$${p.precio_final?.toLocaleString() || '0'}</span>
          </div>
        `).join('')}
      </div>
      <a href="productos.html" class="btn-edit">Ver todos</a>
    </div>
  `;
}

// ==================== HELPERS ====================
function getCurrentUser() {
  return new Promise((resolve, reject) => {
    const unsub = onAuthStateChanged(auth, user => {
      unsub();
      user ? resolve(user) : reject(new Error('No autenticado'));
    });
  });
}

function setupLogout() {
  document.getElementById('logoutBtn')?.addEventListener('click', async () => {
    await signOut(auth);
    window.location.href = '/';
  });
}

// ==================== INIT ====================
document.addEventListener('DOMContentLoaded', initializePage);
