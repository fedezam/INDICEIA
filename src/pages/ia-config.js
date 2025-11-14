// src/pages/ia-config.js
/**
 * IA Config - Optimized v1.0
 * - Modular
 * - Defensive
 * - Debounced search + local cache
 * - Robust save flow + UX states
 */

import { auth, db } from '../firebase.js';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, collection, getDocs, updateDoc } from 'firebase/firestore';
import Navigation from '../shared/navigation.js';
import { showLoading, hideLoading, showToast } from '../shared/utils.js';
import { PLANS, calcularEstadoPlan, getDiasRestantesTrial } from '../shared/plans.js';

// ==================== GLOBAL STATE ====================
let currentUser = null;
let currentComercioId = null;
let comercioData = {};
let productos = [];                 // in-memory
let productosDestacados = [];
let hasUnsavedChanges = false;
let originalAIConfig = null;
let searchDebounce = null;
const PRODUCT_CACHE_KEY = 'indiceia_product_cache_v1';

// ==================== DOM HELPERS ====================
const $ = (id) => document.getElementById(id);
const exists = (id) => !!$(id);

const safeSet = (id, value, defaultValue = '') => {
  const el = $(id);
  if (!el) {
    console.warn(`⚠️ safeSet: Elemento no encontrado: ${id}`);
    return;
  }
  // For selects/textareas/inputs
  if (typeof value === 'undefined' || value === null) el.value = defaultValue;
  else el.value = value;
};

const safeGet = (id) => {
  const el = $(id);
  return el ? (el.value == null ? '' : String(el.value).trim()) : '';
};

// ==================== UTILITIES ====================
const debounce = (fn, wait = 300) => {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
};

const safeJSONparse = (s, fallback = null) => {
  try { return JSON.parse(s); } catch (e) { return fallback; }
};

const formatMoney = (n) =>
  (n == null || isNaN(Number(n))) ? 'Sin precio' :
    `$${Number(n).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`;

// ==================== INIT ====================
document.addEventListener('DOMContentLoaded', () => {
  console.log('🚀 Iniciando ia-config.js (optimized)');

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

    // load user -> comercioId
    const userDoc = await getDoc(doc(db, 'usuarios', currentUser.uid));
    if (!userDoc.exists() || !userDoc.data()?.comercioId) {
      hideLoading();
      window.location.href = './mi-comercio.html';
      return;
    }
    currentComercioId = userDoc.data().comercioId;

    // load comercio doc
    const comercioDoc = await getDoc(doc(db, 'comercios', currentComercioId));
    comercioData = comercioDoc.exists() ? { id: currentComercioId, ...comercioDoc.data() } : { id: currentComercioId };

    // load products (from cache if valid) then UI
    await loadProducts();

    updateHeader();
    updateSubscriptionBanner();
    loadAIConfig();                 // sync form with comercioData.aiConfig
    renderContactosValidacion();
    renderDestacados();
    setupEventListeners();
    createSaveButton();

    try { Navigation.init(); } catch (e) { console.warn('⚠️ Navigation.init falló:', e); }

    // expose validator used by navigation
    window.validateCurrentPageData = validatePageData;

    hideLoading();
    console.log('✅ Página IA inicializada');
  } catch (err) {
    hideLoading();
    console.error('❌ initializePage error:', err);
    showToast('error', 'Error', 'No se pudo inicializar la configuración: ' + (err.message || err));
  }
}

// ==================== VALIDATION ====================
async function validatePageData() {
  const requiredFields = ['aiName','aiPersonality','aiTone','aiLanguage','aiGreeting','sinPrecio','sinStock','localCerrado','proactividad','formatoRespuestas'];
  for (const f of requiredFields) if (!safeGet(f)) { showToast('warning','Campos incompletos','Completá todos los campos'); return false; }
  if (hasUnsavedChanges) { showToast('warning','Cambios sin guardar','Guardá antes de continuar'); return false; }
  return true;
}

// ==================== PRODUCTS (LOAD + CACHE) ====================
async function loadProducts() {
  // try local cache first (fast)
  try {
    const cached = safeJSONparse(localStorage.getItem(PRODUCT_CACHE_KEY), null);
    if (cached && cached.comercioId === currentComercioId && Array.isArray(cached.items)) {
      productos = cached.items;
      console.log('⚡ Productos cargados desde cache local:', productos.length);
      return;
    }
  } catch (e) {
    console.warn('⚠️ No se pudo leer cache local de productos', e);
  }

  // fetch from firestore
  try {
    if (!currentComercioId) { productos = []; return; }
    const snap = await getDocs(collection(db, 'comercios', currentComercioId, 'productos'));
    productos = snap.docs.map(d => {
      const data = d.data() || {};
      return {
        id: d.id,
        codigo: data.codigo || '',
        nombre: data.nombre || '',
        descripcion: data.descripcion || '',
        precio_final: Number(data.precio_final || 0),
        precio: Number(data.precio_final || 0),
        paused: !!data.paused
      };
    });
    // persist cache (best-effort)
    try {
      localStorage.setItem(PRODUCT_CACHE_KEY, JSON.stringify({ comercioId: currentComercioId, items: productos, ts: Date.now() }));
    } catch (e) { /* ignore storage errors */ }
    console.log('✅ Productos cargados desde Firestore:', productos.length);
  } catch (e) {
    console.error('❌ Error cargando productos:', e);
    productos = [];
  }
}

// ==================== HEADER & SUBSCRIPTION ====================
function updateHeader() {
  const commerceName = $('commerceName');
  const planBadge = $('planBadge');
  if (commerceName) commerceName.textContent = comercioData.nombreComercio || 'Mi Comercio';
  if (planBadge) {
    const plan = PLANS[comercioData.plan||'trial'];
    planBadge.textContent = plan ? `${plan.emoji} ${plan.nombre}` : 'Trial';
  }
}

function updateSubscriptionBanner() {
  const banner = $('subscriptionBanner');
  const message = $('subscriptionMessage');
  if (!banner || !message) return;
  banner.className = 'subscription-banner';
  const estado = calcularEstadoPlan(comercioData);
  const planActual = PLANS[comercioData.plan||'trial'];

  switch(estado){
    case 'trial':
      banner.classList.add('trial');
      message.innerHTML = `🎉 <strong>Trial activo</strong> - Te quedan <strong>${getDiasRestantesTrial(comercioData)} días</strong>`;
      break;
    case 'expirado':
      banner.classList.add('expired');
      message.innerHTML = `⚠️ <strong>Trial expirado</strong>`;
      break;
    case 'activo':
      banner.classList.add('active');
      message.innerHTML = `✅ <strong>Plan ${planActual?.nombre} activo</strong>`;
      break;
    default:
      banner.classList.add('trial');
      message.innerHTML = `🤖 <strong>Configurá tu asistente IA</strong>`;
  }
}

// ==================== LOAD AI CONFIG INTO FORM ====================
function loadAIConfig() {
  const aiConfig = comercioData.aiConfig || {};
  originalAIConfig = JSON.parse(JSON.stringify(aiConfig || {}));

  safeSet('aiName', aiConfig.aiName ?? '');
  safeSet('aiPersonality', aiConfig.aiPersonality ?? '');
  safeSet('aiTone', aiConfig.aiTone ?? '');
  safeSet('aiLanguage', aiConfig.aiLanguage ?? 'es-AR');
  safeSet('aiGreeting', aiConfig.aiGreeting ?? '');
  safeSet('sinPrecio', aiConfig.sinPrecio ?? '');
  safeSet('sinStock', aiConfig.sinStock ?? '');
  safeSet('localCerrado', aiConfig.localCerrado ?? '');
  safeSet('proactividad', aiConfig.proactividad ?? '');
  safeSet('formatoRespuestas', aiConfig.formatoRespuestas ?? '');
  safeSet('mensajeWhatsapp', aiConfig.mensajeWhatsapp ?? '');
  safeSet('mensajeInstagram', aiConfig.mensajeInstagram ?? '');
  safeSet('mensajeWeb', aiConfig.mensajeWeb ?? '');
  safeSet('mensajeDefault', aiConfig.mensajeDefault ?? '');

  const destacadosGuardados = Array.isArray(aiConfig.productosDestacados) ? aiConfig.productosDestacados : [];
  productosDestacados = destacadosGuardados.map(dest => {
    const productoReal = productos.find(p => p.id === dest.id) || productos.find(p => p.codigo === dest.codigo);
    if (productoReal) {
      return {
        id: productoReal.id,
        codigo: productoReal.codigo || dest.codigo || '',
        nombre: productoReal.nombre || dest.nombre || '',
        descripcion: productoReal.descripcion || dest.descripcion || '',
        precio_final: productoReal.precio_final != null ? Number(productoReal.precio_final) : Number(dest.precio_final || 0),
        precio: productoReal.precio_final != null ? Number(productoReal.precio_final) : Number(dest.precio || 0)
      };
    }
    return {
      id: dest.id || null,
      codigo: dest.codigo || '',
      nombre: dest.nombre || '',
      descripcion: dest.descripcion || '',
      precio_final: Number(dest.precio_final || 0),
      precio: Number(dest.precio || 0)
    };
  });

  renderDestacados();
}

// ==================== RENDER DESTACADOS ====================
function renderDestacados() {
  const counter = $('destacadosCounter');
  const list = $('destacadosList');
  if (!counter || !list) return;

  counter.textContent = `${productosDestacados.length}/10`;

  if (productosDestacados.length === 0) {
    list.innerHTML = `<div class="empty-state"><i class="fas fa-star"></i><p>Aún no seleccionaste productos destacados</p><small>Usá el buscador arriba para agregar hasta 10 productos</small></div>`;
    return;
  }

  list.innerHTML = productosDestacados.map(p => {
    const precioStr = formatMoney(p.precio_final ?? p.precio);
    // guard against null id
    const idForOnclick = p.id ? p.id : `NOID_${Math.random().toString(36).slice(2,8)}`;
    return `
      <div class="destacado-item">
        <div class="producto-info">
          <div class="producto-codigo">[${p.codigo || 'SIN CÓDIGO'}]</div>
          <div class="producto-nombre">${p.nombre || 'Sin nombre'}</div>
          <div class="producto-precio">${precioStr}</div>
        </div>
        <button class="btn-quitar" data-id="${p.id}" aria-label="Quitar destacado">
          <i class="fas fa-trash"></i> Quitar
        </button>
      </div>
    `;
  }).join('');

  // attach listeners for quitar
  list.querySelectorAll('.btn-quitar').forEach(btn => {
    btn.onclick = () => {
      const pid = btn.dataset.id;
      if (!pid) return;
      productosDestacados = productosDestacados.filter(x => x.id !== pid);
      renderDestacados();
      markAsChanged();
      showToast('info', 'Producto quitado', 'Producto quitado de destacados');
    };
  });
}

// ==================== CONTACT VALIDATION ====================
function renderContactosValidacion() {
  const container = $('contactosValidacion');
  if (!container) return;

  const contactos = [
    { id:'whatsapp', icon:'📱', label:'WhatsApp', value:comercioData.whatsapp||'', valid:!!(comercioData.whatsapp?.trim()) },
    { id:'instagram', icon:'📸', label:'Instagram', value:comercioData.instagram||'', valid:!!(comercioData.instagram?.trim()) },
    { id:'sitioWeb', icon:'🌐', label:'Sitio Web', value:comercioData.sitioWeb||'', valid:!!(comercioData.sitioWeb?.trim()) },
    { id:'email', icon:'📧', label:'Email', value:comercioData.email||'', valid:!!(comercioData.email?.trim()) },
    { id:'telefono', icon:'☎️', label:'Teléfono', value:comercioData.telefono||'', valid:!!(comercioData.telefono?.trim()) }
  ];

  const hasInvalid = contactos.some(c=>!c.valid);
  container.innerHTML = `
    ${hasInvalid?`<div class="alert alert-warning" style="grid-column:1/-1;"><i class="fas fa-exclamation-triangle"></i><strong>Algunos contactos no configurados.</strong></div>`:''}
    ${contactos.map(c=>`
      <div class="contacto-item ${c.valid?'valid':'invalid'}">
        <div class="contacto-icon">${c.icon}</div>
        <div class="contacto-info">
          <strong>${c.label}</strong>
          ${c.valid?`<span class="contacto-value">${c.value}</span>`:`<span class="contacto-missing">No configurado</span>`}
        </div>
        <div class="contacto-status">
          ${c.valid?'<i class="fas fa-check-circle" style="color:#10b981;"></i>':'<i class="fas fa-times-circle" style="color:#ef4444;"></i>'}
        </div>
      </div>
    `).join('')}
  `;
}

// ==================== BUSQUEDA ====================
function buscarProductos(query) {
  const resultadosContainer = $('searchResults');
  if (!resultadosContainer) { console.error('❌ Missing #searchResults'); return; }

  const searchTerm = String(query || '').trim().toLowerCase();
  if (!searchTerm || searchTerm.length < 2) {
    resultadosContainer.innerHTML = '';
    resultadosContainer.style.display = 'none';
    return;
  }

  const results = productos.filter(p => {
    const name = (p.nombre || '').toLowerCase();
    const code = (p.codigo || '').toLowerCase();
    const desc = (p.descripcion || '').toLowerCase();
    return name.includes(searchTerm) || code.includes(searchTerm) || desc.includes(searchTerm);
  }).slice(0, 20);

  if (results.length === 0) {
    resultadosContainer.innerHTML = `<div class="search-result-item" style="text-align:center;color:#999;padding:1rem">No se encontraron productos con "${query}"</div>`;
    resultadosContainer.style.display = 'block';
    return;
  }

  resultadosContainer.innerHTML = results.map(p => {
    const yaDestacado = productosDestacados.some(d => d.id === p.id);
    const disabled = yaDestacado || productosDestacados.length >= 10;
    const precioStr = p.precio_final > 0 ? formatMoney(p.precio_final) : 'Sin precio';
    return `
      <div class="search-result-item" style="display:flex;align-items:center;padding:0.75rem;border-bottom:1px solid #eee">
        <div style="flex:1">
          <div class="producto-codigo" style="font-weight:600;color:#6366f1">[${p.codigo || 'SIN CÓDIGO'}]</div>
          <div class="producto-nombre" style="margin-top:4px">${p.nombre || 'Sin nombre'}</div>
          <div class="producto-precio" style="margin-top:4px">${precioStr}</div>
        </div>
        <button class="btn-destacar" data-id="${p.id}" ${disabled ? 'disabled' : ''} style="margin-left:12px;white-space:nowrap">
          ${yaDestacado ? '✓ Agregado' : '+ Agregar'}
        </button>
      </div>
    `;
  }).join('');
  resultadosContainer.style.display = 'block';

  // attach agregar handlers
  resultadosContainer.querySelectorAll('.btn-destacar').forEach(btn => {
    btn.onclick = () => {
      const pid = btn.dataset.id;
      if (!pid) return;
      agregarDestacado(pid);
    };
  });
}

// ==================== ADD / REMOVE DESTACADOS ====================
function agregarDestacado(productoId) {
  if (productosDestacados.length >= 10) { showToast('warning','Límite alcanzado','Solo puedes tener 10 productos destacados'); return; }
  const producto = productos.find(p => p.id === productoId);
  if (!producto) { showToast('error','Error','Producto no encontrado'); return; }
  if (productosDestacados.some(p => p.id === productoId)) { showToast('info','Ya agregado','Este producto ya está en destacados'); return; }
  productosDestacados.push(producto);
  renderDestacados();
  markAsChanged();
  showToast('success','Producto agregado', `${producto.nombre} agregado a destacados`);
}

// Expose (used by inline onclicks sometimes)
window.agregarDestacado = agregarDestacado;
window.quitarDestacado = (id) => {
  productosDestacados = productosDestacados.filter(p => p.id !== id);
  renderDestacados();
  markAsChanged();
};

// ==================== EVENTS ====================
function setupEventListeners() {
  // assistant link
  $('openAssistant')?.addEventListener('click', () => showToast('info','🤖 Asistente','Decile: "Soy de Indice IA"', 8000) );

  // search debounce
  const searchInput = $('searchProductos');
  if (searchInput) {
    const handler = debounce(e => buscarProductos(e.target.value), 250);
    searchInput.addEventListener('input', handler);
  } else {
    console.warn('❌ No se encontró input #searchProductos');
  }

  // change detection on form fields
  document.querySelectorAll('input, select, textarea').forEach(el => {
    if (el.id !== 'searchProductos') {
      el.addEventListener('input', markAsChanged);
      el.addEventListener('change', markAsChanged);
    }
  });

  // logout
  $('logoutBtn')?.addEventListener('click', handleLogout);

  // before unload
  window.addEventListener('beforeunload', (e) => {
    if (hasUnsavedChanges) { e.preventDefault(); e.returnValue = 'Cambios sin guardar'; }
  });
}

// ==================== SAVE UX HELPERS ====================
function createSaveButton() {
  const userInfo = document.querySelector('.header .user-info');
  if (!userInfo || $('saveChangesBtn')) return;

  const saveBtn = document.createElement('button');
  saveBtn.id = 'saveChangesBtn';
  saveBtn.className = 'btn-save';
  saveBtn.disabled = true;
  saveBtn.innerHTML = '<i class="fas fa-save"></i> <span>Guardar</span>';

  const logoutBtn = $('logoutBtn');
  if (logoutBtn) userInfo.insertBefore(saveBtn, logoutBtn); else userInfo.appendChild(saveBtn);

  saveBtn.addEventListener('click', () => saveAIConfig());
}

function markAsChanged() {
  hasUnsavedChanges = true;
  const saveBtn = $('saveChangesBtn');
  if (saveBtn) {
    saveBtn.disabled = false;
    saveBtn.className = 'btn-save';
    saveBtn.innerHTML = '<i class="fas fa-save"></i> <span>Guardar</span>';
  }
}

// ==================== SAVE FLOW ====================
async function saveAIConfig() {
  const saveBtn = $('saveChangesBtn');
  if (!saveBtn) {
    console.error('❌ saveAIConfig: save button not found');
    return;
  }

  // Basic validation
  const required = ['aiName','aiPersonality','aiTone','aiLanguage','aiGreeting'];
  for (const f of required) if (!safeGet(f)) { showToast('warning','Campos incompletos','Completá identidad del asistente'); return; }

  // UI -> saving
  saveBtn.disabled = true;
  saveBtn.className = 'btn-saving';
  saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> <span>Guardando...</span>';
  showLoading('Guardando configuración...');

  const comercioRef = doc(db, 'comercios', currentComercioId);

  const updatedConfig = {
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
    productosDestacados: productosDestacados.map(p => ({ id: p.id || null, codigo: p.codigo || '', nombre: p.nombre || '', precio_final: Number(p.precio_final || 0) }))
  };

  try {
    // update firestore
    await updateDoc(comercioRef, { aiConfig: updatedConfig, fechaActualizacion: new Date() });

    // try to update the exported JSON but do not block UX if it fails
    try {
      await updateCommerceJSON(currentComercioId, currentUser.uid);
    } catch (jsonErr) {
      console.warn('⚠️ updateCommerceJSON fallo, pero la configuración quedó guardada:', jsonErr);
      showToast('warning', 'Advertencia', 'Configuración guardada, pero no se pudo actualizar el JSON exportable');
    }

    hasUnsavedChanges = false;
    saveBtn.disabled = true;
    saveBtn.className = 'btn-saved';
    saveBtn.innerHTML = '<i class="fas fa-check"></i> <span>Guardado</span>';
    showToast('success', 'Cambios guardados', 'Configuración actualizada');

    // Update local original snapshot
    originalAIConfig = JSON.parse(JSON.stringify(updatedConfig));
    // update comercioData in-memory
    comercioData.aiConfig = updatedConfig;

  } catch (err) {
    console.error('❌ Error guardando configuración:', err);
    showToast('error', 'Error', 'No se pudo guardar la configuración: ' + (err.message || err));
    // revert button to allow retry
    saveBtn.disabled = false;
    saveBtn.className = 'btn-save';
    saveBtn.innerHTML = '<i class="fas fa-save"></i> <span>Guardar</span>';
  } finally {
    hideLoading();
  }
}

// ==================== LOGOUT ====================
async function handleLogout() {
  if (hasUnsavedChanges) {
    const leave = confirm('Tenés cambios sin guardar. ¿Salir igual?');
    if (!leave) return;
  }

  try {
    await signOut(auth);
    window.location.href = '/index.html';
  } catch (err) {
    console.error('❌ Error en logout:', err);
    showToast('error', 'Error', 'No se pudo cerrar sesión');
  }
}

// ==================== EXPORTS (for testing) ====================
window.__iaConfig = {
  loadAIConfig,
  saveAIConfig,
  loadProducts,
  buscarProductos,
  agregarDestacado,
  renderDestacados
};
