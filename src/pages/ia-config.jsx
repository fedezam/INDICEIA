// src/pages/ia-config.jsx
import { auth, db } from '../firebase.js';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, collection, getDocs, updateDoc } from 'firebase/firestore';
import Navigation from '../shared/navigation.jsx';
import { showLoading, hideLoading, showToast } from '../shared/utils.jsx';
import { updateCommerceJSON } from '../shared/updateCommerceJSON.js';
import { PLANS, calcularEstadoPlan, getDiasRestantesTrial } from '../shared/plans.js';
import { redirectToNextStep } from '../shared/redirect-dashboard.js';

// ==================== ESTADO GLOBAL ====================
let currentUser = null;
let currentComercioId = null;
let comercioData = {};
let productos = [];
let productosDestacados = [];
let hasUnsavedChanges = false;
let originalAIConfig = {};
let searchTimeout = null;

// ==================== HELPERS ====================
const $ = (id) => document.getElementById(id);

function safeSet(id, value, defaultValue = '') {
  const el = $(id);
  if (!el) return;
  el.value = value ?? defaultValue;
}

function safeGet(id) {
  const el = $(id);
  return el ? el.value?.trim() || '' : '';
}

function setButtonState(btn, state) {
  if (!btn) return;
  const states = {
    saving: { disabled: true, class: 'btn-saving', html: '<span>Guardando...</span>' },
    saved: { disabled: true, class: 'btn-saved', html: '<span>Guardado</span>' },
    enabled: { disabled: false, class: 'btn-save', html: '<span>Guardar</span>' },
    idle: { disabled: true, class: 'btn-save', html: '<span>Guardar</span>' }
  };
  const s = states[state] || states.idle;
  btn.disabled = s.disabled;
  btn.className = s.class;
  btn.innerHTML = s.html;
}

// ==================== INIT ====================
document.addEventListener('DOMContentLoaded', () => {
  console.log('Iniciando ia-config.js');
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      window.location.href = '/index.html';
      return;
    }
    currentUser = user;
    await initializePage();
  });
});

async function initializePage() {
  try {
    showLoading('Cargando configuración de IA...');

    // 1. Obtener comercioId
    const userDoc = await getDoc(doc(db, 'usuarios', currentUser.uid));
    if (!userDoc.exists() || !userDoc.data().comercioId) {
      window.location.href = './mi-comercio.html';
      return;
    }
    currentComercioId = userDoc.data().comercioId;

    // 2. Cargar comercio
    const comercioDoc = await getDoc(doc(db, 'comercios', currentComercioId));
    comercioData = comercioDoc.exists() ? { id: currentComercioId, ...comercioDoc.data() } : { id: currentComercioId };

    // 3. Cargar productos
    await loadProducts();

    // 4. UI
    updateHeader();
    updateSubscriptionBanner();
    loadAIConfig();
    renderContactosValidacion();
    setupEventListeners();
    createSaveButton();

    // 5. Navigation
    Navigation.init();

    // 6. Validación para siguiente paso
    window.validateCurrentPageData = () => validateBeforeNext();

    hideLoading();
    console.log('Página ia-config inicializada');
  } catch (error) {
    hideLoading();
    console.error('Error inicializando ia-config:', error);
    showToast('error', 'Error', 'No se pudo cargar: ' + error.message);
  }
}

// ==================== PRODUCTOS ====================
async function loadProducts() {
  try {
    const snap = await getDocs(collection(db, 'comercios', currentComercioId, 'productos'));
    productos = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    console.log(`Productos cargados: ${productos.length}`);
  } catch (error) {
    console.error('Error cargando productos:', error);
    productos = [];
  }
}

// ==================== HEADER & BANNER ====================
function updateHeader() {
  const nameEl = $('commerceName');
  const badgeEl = $('planBadge');
  if (nameEl) nameEl.textContent = comercioData.nombreComercio || 'Mi Comercio';
  if (badgeEl) {
    const plan = PLANS[comercioData.plan || 'trial'];
    badgeEl.textContent = plan ? `${plan.emoji} ${plan.nombre}` : 'Trial';
  }
}

function updateSubscriptionBanner() {
  const banner = $('subscriptionBanner');
  const message = $('subscriptionMessage');
  if (!banner || !message) return;

  const estado = calcularEstadoPlan(comercioData);
  const plan = PLANS[comercioData.plan || 'trial'];
  banner.className = 'subscription-banner';

  const messages = {
    trial: `Trial activo - Te quedan <strong>${getDiasRestantesTrial(comercioData)} días</strong>`,
    expirado: `<strong>Trial expirado.</strong> Elegí un plan`,
    activo: `<strong>Plan ${plan?.nombre} activo</strong>`,
    default: `<strong>Configurá tu asistente IA</strong>`
  };

  banner.classList.add(estado === 'expirado' ? 'expired' : estado);
  message.innerHTML = messages[estado] || messages.default;
}

// ==================== AI CONFIG ====================
function loadAIConfig() {
  const config = comercioData.aiConfig || {};
  originalAIConfig = JSON.parse(JSON.stringify(config));

  // Campos de texto
  ['aiName', 'aiPersonality', 'aiTone', 'aiGreeting', 'sinPrecio', 'sinStock', 'localCerrado',
   'proactividad', 'formatoRespuestas', 'mensajeWhatsapp', 'mensajeInstagram', 'mensajeWeb', 'mensajeDefault'].forEach(id => {
    safeSet(id, config[id]);
  });
  safeSet('aiLanguage', config.aiLanguage || 'es-AR');

  // Productos destacados
  const saved = Array.isArray(config.productosDestacados) ? config.productosDestacados : [];
  productosDestacados = saved
    .map(dest => {
      const real = productos.find(p => p.id === dest.id || p.codigo === dest.codigo);
      if (real) {
        return {
          id: real.id,
          codigo: real.codigo || '',
          nombre: real.nombre || '',
          precio_final: Number(real.precio_final || 0)
        };
      }
      return { id: dest.id || null, codigo: dest.codigo || '', nombre: dest.nombre || '', precio_final: Number(dest.precio_final || 0) };
    })
    .filter(p => p.nombre); // solo con nombre

  renderDestacados();
}

// ==================== RENDER DESTACADOS ====================
function renderDestacados() {
  const counter = $('destacadosCounter');
  const list = $('destacadosList');
  if (!counter || !list) return;

  counter.textContent = `${productosDestacados.length}/10`;

  if (!productosDestacados.length) {
    list.innerHTML = `
      <div class="empty-state">
        <p>Aún no seleccionaste productos destacados</p>
        <small>Usá el buscador para agregar hasta 10</small>
      </div>`;
    return;
  }

  list.innerHTML = productosDestacados.map(p => {
    const precio = p.precio_final > 0 ? `$${p.precio_final.toLocaleString('es-AR', { minimumFractionDigits: 2 })}` : 'Sin precio';
    return `
      <div class="destacado-item">
        <div class="producto-info">
          <div class="producto-codigo">[${p.codigo || 'SIN CÓDIGO'}]</div>
          <div class="producto-nombre">${p.nombre}</div>
          <div class="producto-precio">${precio}</div>
        </div>
        <button class="btn-quitar" data-id="${p.id || ''}">Quitar</button>
      </div>`;
  }).join('');

  list.querySelectorAll('.btn-quitar').forEach(btn => {
    btn.onclick = () => {
      productosDestacados = productosDestacados.filter(x => x.id !== btn.dataset.id);
      renderDestacados();
      markAsChanged();
    };
  });
}

// ==================== BÚSQUEDA ====================
function buscarProductos(query) {
  const container = $('searchResults');
  if (!container) return;

  const term = query.trim().toLowerCase();
  if (term.length < 2) {
    container.style.display = 'none';
    return;
  }

  const results = productos
    .filter(p => {
      const fields = [p.nombre, p.codigo, p.descripcion].join(' ').toLowerCase();
      return fields.includes(term);
    })
    .slice(0, 20);

  if (!results.length) {
    container.innerHTML = `<div class="search-empty">No hay resultados para "${query}"</div>`;
    container.style.display = 'block';
    return;
  }

  container.innerHTML = results.map(p => {
    const ya = productosDestacados.some(d => d.id === p.id);
    const disabled = ya || productosDestacados.length >= 10;
    const precio = p.precio_final > 0 ? `$${Number(p.precio_final).toLocaleString('es-AR', { minimumFractionDigits: 2 })}` : 'Sin precio';
    return `
      <div class="search-result-item">
        <div style="flex:1">
          <div class="producto-codigo">[${p.codigo || 'SIN CÓDIGO'}]</div>
          <div class="producto-nombre">${p.nombre}</div>
          <div class="producto-precio">${precio}</div>
        </div>
        <button class="btn-destacar" data-id="${p.id}" ${disabled ? 'disabled' : ''}>
          ${ya ? 'Agregado' : '+ Agregar'}
        </button>
      </div>`;
  }).join('');

  container.style.display = 'block';

  container.querySelectorAll('.btn-destacar').forEach(btn => {
    btn.onclick = () => agregarDestacado(btn.dataset.id);
  });
}

function agregarDestacado(id) {
  if (productosDestacados.length >= 10) {
    showToast('warning', 'Límite', 'Máximo 10 productos destacados');
    return;
  }
  const p = productos.find(x => x.id === id);
  if (!p || productosDestacados.some(x => x.id === id)) return;

  productosDestacados.push({
    id: p.id,
    codigo: p.codigo || '',
    nombre: p.nombre || '',
    precio_final: Number(p.precio_final || 0)
  });

  renderDestacados();
  markAsChanged();
  showToast('success', 'Agregado', p.nombre);
  const input = $('searchProductos');
  if (input?.value) buscarProductos(input.value);
}

// ==================== CONTACTOS VALIDACIÓN ====================
function renderContactosValidacion() {
  const container = $('contactosValidacion');
  if (!container) return;

  const contactos = [
    { id: 'whatsapp', icon: 'WhatsApp', value: comercioData.whatsapp },
    { id: 'instagram', icon: 'Instagram', value: comercioData.instagram },
    { id: 'sitioWeb', icon: 'Sitio Web', value: comercioData.sitioWeb },
    { id: 'email', icon: 'Email', value: comercioData.email },
    { id: 'telefono', icon: 'Teléfono', value: comercioData.telefono }
  ];

  const missing = contactos.some(c => !c.value?.trim());
  let html = missing ? `<div class="alert alert-warning"><strong>Faltan contactos</strong></div>` : '';

  contactos.forEach(c => {
    const valid = !!c.value?.trim();
    html += `
      <div class="contacto-item ${valid ? 'valid' : 'invalid'}">
        <div class="contacto-icon">${c.icon}</div>
        <div class="contacto-info">
          <strong>${c.label}</strong>
          <span class="${valid ? 'contacto-value' : 'contacto-missing'}">
            ${valid ? c.value : 'No configurado'}
          </span>
        </div>
        <div class="contacto-status">
          ${valid ? 'Validado' : 'Falta'}
        </div>
      </div>`;
  });

  container.innerHTML = html;
}

// ==================== EVENT LISTENERS ====================
function setupEventListeners() {
  $('openAssistant')?.addEventListener('click', () => {
    showToast('info', 'Asistente IA', 'Decile: "Soy de Indice IA"', 8000);
  });

  const searchInput = $('searchProductos');
  if (searchInput) {
    searchInput.addEventListener('input', e => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => buscarProductos(e.target.value), 300);
    });
  }

  document.querySelectorAll('input, select, textarea').forEach(el => {
    if (el.id !== 'searchProductos') {
      el.addEventListener('input', markAsChanged);
      el.addEventListener('change', markAsChanged);
    }
  });

  $('logoutBtn')?.addEventListener('click', handleLogout);

  window.addEventListener('beforeunload', e => {
    if (hasUnsavedChanges) {
      e.preventDefault();
      e.returnValue = 'Tenés cambios sin guardar';
    }
  });
}

// ==================== SAVE BUTTON ====================
function createSaveButton() {
  const userInfo = document.querySelector('.header .user-info');
  if (!userInfo || $('saveChangesBtn')) return;

  const btn = document.createElement('button');
  btn.id = 'saveChangesBtn';
  btn.className = 'btn-save';
  btn.disabled = true;
  btn.innerHTML = '<span>Guardar</span>';

  const logoutBtn = $('logoutBtn');
  logoutBtn ? userInfo.insertBefore(btn, logoutBtn) : userInfo.appendChild(btn);
  btn.addEventListener('click', saveAIConfig);
}

function markAsChanged() {
  hasUnsavedChanges = true;
  const btn = $('saveChangesBtn');
  if (btn) setButtonState(btn, 'enabled');
}

// ==================== VALIDACIÓN ANTES DE SALIR ====================
function validateBeforeNext() {
  const required = [
    'aiName', 'aiPersonality', 'aiTone', 'aiLanguage', 'aiGreeting',
    'sinPrecio', 'sinStock', 'localCerrado', 'proactividad', 'formatoRespuestas'
  ];

  const missing = required.filter(id => !safeGet(id));
  if (missing.length) {
  showToast('warning', 'Faltan campos', `Completá: ${missing.slice(0, 3).join(', ')}${missing.length > 3 ? '...' : ''}`);
  missing.forEach(id => {
    const el = $(id);
    if (el) el.style.borderColor = '#ef4444';
  });
  return false;
}

  if (hasUnsavedChanges) {
    showToast('warning', 'Cambios sin guardar', 'Guardá antes de continuar');
    return false;
  }

  return true;
}

// ==================== GUARDAR ====================
async function saveAIConfig() {
  const btn = $('saveChangesBtn');
  setButtonState(btn, 'saving');

  try {
    // Validación final
    if (!validateBeforeNext()) {
      setButtonState(btn, 'enabled');
      return;
    }

    // Validar contactos según sinPrecio
    const sinPrecio = safeGet('sinPrecio');
    const canales = { whatsapp: 'whatsapp', instagram: 'instagram', email: 'email', web: 'sitioWeb', telefono: 'telefono' };
    const faltante = canales[sinPrecio];
    if (faltante && !comercioData[faltante]?.trim()) {
      showToast('warning', 'Falta contacto', `Configurá ${faltante} en Mi Comercio`);
      setButtonState(btn, 'enabled');
      return;
    }

    const config = {
      aiName: safeGet('aiName'),
      aiPersonality: safeGet('aiPersonality'),
      aiTone: safeGet('aiTone'),
      aiLanguage: safeGet('aiLanguage'),
      aiGreeting: safeGet('aiGreeting'),
      sinPrecio: safeGet('sinPrecio'),
      sinStock: safeGet('sinStock'),
      localCerrado: safeGet('localCerrado'),
      proactividad: safeGet('proactividad'),
      formatoRespuestas: safeGet('formatoRespuestas'),
      mensajeWhatsapp: safeGet('mensajeWhatsapp'),
      mensajeInstagram: safeGet('mensajeInstagram'),
      mensajeWeb: safeGet('mensajeWeb'),
      mensajeDefault: safeGet('mensajeDefault'),
      productosDestacados: productosDestacados.map(p => ({
        id: p.id,
        codigo: p.codigo,
        nombre: p.nombre,
        precio_final: p.precio_final
      }))
    };

    const comercioRef = doc(db, 'comercios', currentComercioId);
    await updateDoc(comercioRef, {
      aiConfig: config,
      fechaActualizacion: new Date()
    });

    // Actualizar JSON en Gist
    try {
      await updateCommerceJSON(currentComercioId, currentUser.uid);
    } catch (e) {
      console.warn('JSON no actualizado:', e);
    }

    // Éxito
    hasUnsavedChanges = false;
    comercioData.aiConfig = config;
    originalAIConfig = JSON.parse(JSON.stringify(config));

    setButtonState(btn, 'saved');
    showToast('success', 'Guardado', 'Configuración IA actualizada');

    Navigation.markPageAsCompleted('ia-config');
    Navigation.updateProgressBar();

    setTimeout(() => redirectToNextStep(), 1200);

  } catch (error) {
    console.error('Error guardando IA:', error);
    showToast('error', 'Error', 'No se pudo guardar: ' + error.message);
    setButtonState(btn, 'enabled');
  } finally {
    hideLoading();
  }
}

// ==================== LOGOUT ====================
async function handleLogout() {
  if (hasUnsavedChanges && !confirm('¿Salir sin guardar?')) return;
  try {
    await signOut(auth);
    window.location.href = '/index.html';
  } catch (error) {
    showToast('error', 'Error', 'No se pudo cerrar sesión');
  }
}

// ==================== EXPORTS PARA DEBUG ====================
window.__iaConfig = { loadAIConfig, saveAIConfig, agregarDestacado, renderDestacados };
