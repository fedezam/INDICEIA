// src/pages/ia-config.js
import { auth, db } from '../firebase.js';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, collection, getDocs, updateDoc } from 'firebase/firestore';
import Navigation from '../shared/navigation.js';
import { showLoading, hideLoading, showToast } from '../shared/utils.js';
import { PLANS, calcularEstadoPlan, getDiasRestantesTrial } from '../shared/plans.js';
import { redirectToNextStep } from '../shared/redirect-dashboard.js';

// ==================== CONSTANTES / ESTADO ====================
let currentUser = null;
let currentComercioId = null;
let comercioData = {};
let productos = [];
let productosDestacados = [];
let hasUnsavedChanges = false;
let originalAIConfig = null;
let searchTimeout = null;

// ==================== UTIL HELPERS ====================
const $ = (id) => document.getElementById(id);
const q = (sel, ctx = document) => ctx.querySelector(sel);

function safeSet(id, value, defaultValue = '') {
  const el = $(id);
  if (!el) {
    // no romper si el DOM no tiene el elemento (progressive enhancement)
    return;
  }
  // checkbox/select/textarea/input treatment simple
  if (el.tagName === 'SELECT' || el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
    el.value = (typeof value === 'undefined' || value === null) ? defaultValue : String(value);
  } else {
    el.textContent = (typeof value === 'undefined' || value === null) ? defaultValue : String(value);
  }
}
function safeGet(id) {
  const el = $(id);
  if (!el) return '';
  if (el.tagName === 'SELECT') return el.value || '';
  const val = el.value || '';
  return val.trim();
}

function setButtonState(btn, state) {
  if (!btn) return;
  switch (state) {
    case 'saving':
      btn.disabled = true;
      btn.className = 'btn-saving';
      btn.innerHTML = '<span>Guardando...</span>';
      break;
    case 'saved':
      btn.disabled = true;
      btn.className = 'btn-saved';
      btn.innerHTML = '<span>✓ Guardado</span>';
      break;
    case 'enabled':
      btn.disabled = false;
      btn.className = 'btn-save';
      btn.innerHTML = '<span>Guardar</span>';
      break;
    default:
      btn.disabled = true;
      btn.className = 'btn-save';
      btn.innerHTML = '<span>Guardar</span>';
  }
}

// ==================== INIT ====================
document.addEventListener('DOMContentLoaded', () => {
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
    // 1) Obtener usuario -> comercioId
    const userRef = doc(db, 'usuarios', currentUser.uid);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists() || !userSnap.data()?.comercioId) {
      hideLoading();
      window.location.href = './mi-comercio.html';
      return;
    }
    currentComercioId = userSnap.data().comercioId;

    // 2) Obtener comercio
    const comercioRef = doc(db, 'comercios', currentComercioId);
    const comercioSnap = await getDoc(comercioRef);
    comercioData = comercioSnap.exists() ? { id: currentComercioId, ...comercioSnap.data() } : { id: currentComercioId };

    // 3) Productos
    await loadProducts();

    // 4) UI inicial
    updateHeader();
    updateSubscriptionBanner();
    loadAIConfig();
    renderContactosValidacion();
    setupEventListeners();
    createSaveButton();

    // 5) Navigation + validate hook
    try { Navigation.init(); } catch (e) { console.warn('Navigation.init falló:', e); }

    // Hook que usa el flow para validar antes de redirigir
    window.validateCurrentPageData = async () => {
      const required = [
        { id: 'aiName', label: 'Nombre del asistente' },
        { id: 'aiPersonality', label: 'Personalidad' },
        { id: 'aiTone', label: 'Tono de voz' },
        { id: 'aiLanguage', label: 'Idioma principal' },
        { id: 'aiGreeting', label: 'Saludo inicial' },
        { id: 'sinPrecio', label: 'Comportamiento sin precio' },
        { id: 'sinStock', label: 'Comportamiento sin stock' },
        { id: 'localCerrado', label: 'Comportamiento local cerrado' },
        { id: 'proactividad', label: 'Nivel de proactividad' },
        { id: 'formatoRespuestas', label: 'Formato de respuestas' }
      ];

      const missing = [];
      for (const f of required) {
        const v = safeGet(f.id);
        const el = $(f.id);
        if (!v) {
          missing.push(f.label);
          if (el) {
            el.style.borderColor = '#ef4444';
            el.style.boxShadow = '0 0 0 3px rgba(239, 68, 68, 0.08)';
          }
        } else if (el) {
          el.style.borderColor = '';
          el.style.boxShadow = '';
        }
      }
      if (missing.length) {
        showToast('warning', 'Campos incompletos', 'Faltan: ' + missing.slice(0,3).join(', ') + (missing.length>3 ? '...' : ''));
        return false;
      }
      if (hasUnsavedChanges) {
        showToast('warning', 'Cambios sin guardar', 'Guardá antes de continuar');
        return false;
      }
      return true;
    };

    hideLoading();
  } catch (err) {
    hideLoading();
    console.error('initializePage error:', err);
    showToast('error', 'Error', 'No se pudo inicializar la página: ' + (err.message || err));
  }
}

// ==================== PRODUCTS ====================
async function loadProducts() {
  try {
    if (!currentComercioId) {
      productos = [];
      return;
    }
    const productosRef = collection(db, 'comercios', currentComercioId, 'productos');
    const snap = await getDocs(productosRef);
    productos = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    console.log('Productos cargados:', productos.length);
  } catch (err) {
    console.error('loadProducts error:', err);
    productos = [];
  }
}

// ==================== HEADER & BANNER ====================
function updateHeader() {
  const commerceName = $('commerceName');
  const planBadge = $('planBadge');
  if (commerceName) commerceName.textContent = comercioData.nombreComercio || 'Mi Comercio';
  if (planBadge) {
    const plan = PLANS[comercioData.plan || 'trial'];
    planBadge.textContent = plan ? (plan.emoji + ' ' + plan.nombre) : 'Trial';
  }
}
function updateSubscriptionBanner() {
  const banner = $('subscriptionBanner');
  const message = $('subscriptionMessage');
  if (!banner || !message) return;
  banner.className = 'subscription-banner';
  const estado = calcularEstadoPlan(comercioData);
  const planActual = PLANS[comercioData.plan || 'trial'];
  switch (estado) {
    case 'trial':
      banner.classList.add('trial');
      message.innerHTML = '<strong>Trial activo</strong> - Te quedan <strong>' + getDiasRestantesTrial(comercioData) + ' días</strong>';
      break;
    case 'expirado':
      banner.classList.add('expired');
      message.innerHTML = '<strong>Trial expirado</strong>';
      break;
    case 'activo':
      banner.classList.add('active');
      message.innerHTML = '<strong>Plan ' + (planActual?.nombre || '') + ' activo</strong>';
      break;
    default:
      banner.classList.add('trial');
      message.innerHTML = '<strong>Configurá tu asistente IA</strong>';
  }
}

// ==================== LOAD / SYNC AI CONFIG ====================
function loadAIConfig() {
  const aiConfig = comercioData.aiConfig || {};
  originalAIConfig = JSON.parse(JSON.stringify(aiConfig || {}));

  safeSet('aiName', aiConfig.aiName || '');
  safeSet('aiPersonality', aiConfig.aiPersonality || '');
  safeSet('aiTone', aiConfig.aiTone || '');
  safeSet('aiLanguage', aiConfig.aiLanguage || 'es-AR');
  safeSet('aiGreeting', aiConfig.aiGreeting || '');
  safeSet('sinPrecio', aiConfig.sinPrecio || '');
  safeSet('sinStock', aiConfig.sinStock || '');
  safeSet('localCerrado', aiConfig.localCerrado || '');
  safeSet('proactividad', aiConfig.proactividad || '');
  safeSet('formatoRespuestas', aiConfig.formatoRespuestas || '');
  safeSet('mensajeWhatsapp', aiConfig.mensajeWhatsapp || '');
  safeSet('mensajeInstagram', aiConfig.mensajeInstagram || '');
  safeSet('mensajeWeb', aiConfig.mensajeWeb || '');
  safeSet('mensajeDefault', aiConfig.mensajeDefault || '');

  // reconstruir destacados sincronizados con productos reales
  const saved = Array.isArray(aiConfig.productosDestacados) ? aiConfig.productosDestacados : [];
  productosDestacados = saved.map(dest => {
    const real = productos.find(p => p.id === dest.id) || productos.find(p => p.codigo === dest.codigo);
    if (real) {
      return {
        id: real.id,
        codigo: real.codigo || dest.codigo || '',
        nombre: real.nombre || dest.nombre || '',
        descripcion: real.descripcion || dest.descripcion || '',
        precio_final: real.precio_final != null ? Number(real.precio_final) : Number(dest.precio_final || 0),
        precio: real.precio_final != null ? Number(real.precio_final) : Number(dest.precio || 0)
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
  console.log('AI Config sincronizada');
}

// ==================== RENDER DESTACADOS ====================
function renderDestacados() {
  const counter = $('destacadosCounter');
  const list = $('destacadosList');
  if (!counter || !list) return;
  counter.textContent = (productosDestacados.length) + '/10';
  if (!productosDestacados.length) {
    list.innerHTML = '<div class="empty-state"><i class="fas fa-star"></i><p>Aún no seleccionaste productos destacados</p><small>Usá el buscador arriba para agregar hasta 10 productos</small></div>';
    return;
  }
  list.innerHTML = productosDestacados.map(p => {
    const precio = p.precio_final && Number(p.precio_final) > 0 ? ('$' + Number(p.precio_final).toLocaleString('es-AR', { minimumFractionDigits: 2 })) : 'Sin precio';
    const idSafe = p.id ? p.id : '';
    return '<div class="destacado-item"><div class="producto-info"><div class="producto-codigo">[' + (p.codigo || 'SIN CÓDIGO') + ']</div><div class="producto-nombre">' + (p.nombre || 'Sin nombre') + '</div><div class="producto-precio">' + precio + '</div></div><button class="btn-quitar" data-id="' + idSafe + '">Quitar</button></div>';
  }).join('');
  // listeners
  list.querySelectorAll('.btn-quitar').forEach(btn => {
    btn.onclick = () => {
      const id = btn.dataset.id;
      productosDestacados = productosDestacados.filter(x => x.id !== id);
      renderDestacados();
      markAsChanged();
      showToast('info', 'Producto quitado', 'Producto quitado de destacados');
    };
  });
}

// ==================== CONTACTOS VALIDACION ====================
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

  let html = '';
  if (contactos.some(c => !c.valid)) {
    html += '<div class="alert alert-warning" style="grid-column:1/-1;"><i class="fas fa-exclamation-triangle"></i><strong>Algunos contactos no configurados.</strong></div>';
  }
  contactos.forEach(c => {
    html += '<div class="contacto-item ' + (c.valid ? 'valid' : 'invalid') + '"><div class="contacto-icon">' + c.icon + '</div><div class="contacto-info"><strong>' + c.label + '</strong>' + (c.valid ? '<span class="contacto-value">' + c.value + '</span>' : '<span class="contacto-missing">No configurado</span>') + '</div><div class="contacto-status">' + (c.valid ? '<i class="fas fa-check-circle" style="color:#10b981"></i>' : '<i class="fas fa-times-circle" style="color:#ef4444"></i>') + '</div></div>';
  });

  container.innerHTML = html;
}

// ==================== BÚSQUEDA ====================
function buscarProductos(query) {
  const resultadosContainer = $('searchResults');
  if (!resultadosContainer) return;
  const term = (query || '').trim().toLowerCase();
  if (!term || term.length < 2) {
    resultadosContainer.innerHTML = '';
    resultadosContainer.style.display = 'none';
    return;
  }
  const results = productos.filter(p => {
    const name = (p.nombre || '').toLowerCase();
    const code = (p.codigo || '').toLowerCase();
    const desc = (p.descripcion || '').toLowerCase();
    return name.includes(term) || code.includes(term) || desc.includes(term);
  }).slice(0, 20);

  if (!results.length) {
    resultadosContainer.innerHTML = '<div class="search-result-item" style="text-align:center;color:#999;padding:1rem">No se encontraron productos con "' + query + '"</div>';
    resultadosContainer.style.display = 'block';
    return;
  }

  resultadosContainer.innerHTML = results.map(p => {
    const ya = productosDestacados.some(d => d.id === p.id);
    const disabled = ya || productosDestacados.length >= 10;
    const precio = p.precio_final && Number(p.precio_final) > 0 ? ('$' + Number(p.precio_final).toLocaleString('es-AR', { minimumFractionDigits: 2 })) : 'Sin precio';
    return '<div class="search-result-item" style="display:flex;align-items:center;padding:0.75rem;border-bottom:1px solid #eee"><div style="flex:1"><div class="producto-codigo" style="font-weight:600;color:#6366f1">[' + (p.codigo || 'SIN CÓDIGO') + ']</div><div class="producto-nombre" style="margin-top:4px">' + (p.nombre || 'Sin nombre') + '</div><div class="producto-precio" style="margin-top:4px">' + precio + '</div></div><button class="btn-destacar" data-id="' + p.id + '"' + (disabled ? ' disabled' : '') + ' style="margin-left:12px;white-space:nowrap">' + (ya ? '✓ Agregado' : '+ Agregar') + '</button></div>';
  }).join('');
  resultadosContainer.style.display = 'block';
  // handlers
  resultadosContainer.querySelectorAll('.btn-destacar').forEach(btn => {
    btn.onclick = () => {
      const pid = btn.dataset.id;
      if (!pid) return;
      agregarDestacado(pid);
    };
  });
}

// ==================== AGREGAR / QUITAR DESTACADOS ====================
function agregarDestacado(productoId) {
  if (productosDestacados.length >= 10) { showToast('warning','Límite alcanzado','Solo puedes tener 10 productos destacados'); return; }
  const producto = productos.find(p => p.id === productoId);
  if (!producto) { showToast('error','Error','Producto no encontrado'); return; }
  if (productosDestacados.some(p => p.id === productoId)) { showToast('info','Ya agregado','Este producto ya está en destacados'); return; }
  productosDestacados.push(producto);
  renderDestacados();
  markAsChanged();
  const si = $('searchProductos'); if (si && si.value) buscarProductos(si.value);
  showToast('success','Producto agregado', producto.nombre || 'Agregado');
}
window.agregarDestacado = agregarDestacado;
window.quitarDestacado = (id) => { productosDestacados = productosDestacados.filter(p => p.id !== id); renderDestacados(); markAsChanged(); };

// ==================== EVENTS ====================
function setupEventListeners() {
  $('openAssistant')?.addEventListener('click', () => showToast('info','Asistente','Decile: "Soy de Indice IA"', 8000));
  const si = $('searchProductos');
  if (si) si.addEventListener('input', e => { clearTimeout(searchTimeout); searchTimeout = setTimeout(() => buscarProductos(e.target.value), 300); });

  document.querySelectorAll('input, select, textarea').forEach(el => {
    if (el.id !== 'searchProductos') {
      el.addEventListener('input', markAsChanged);
      el.addEventListener('change', markAsChanged);
    }
  });

  $('logoutBtn')?.addEventListener('click', handleLogout);
  window.addEventListener('beforeunload', e => {
    if (hasUnsavedChanges) { e.preventDefault(); e.returnValue = 'Cambios sin guardar'; }
  });
}

// ==================== SAVE BUTTON UX ====================
function createSaveButton() {
  const userInfo = document.querySelector('.header .user-info');
  if (!userInfo || $('saveChangesBtn')) return;
  const saveBtn = document.createElement('button');
  saveBtn.id = 'saveChangesBtn';
  saveBtn.className = 'btn-save';
  saveBtn.disabled = true;
  saveBtn.innerHTML = '<span>Guardar</span>';
  const logoutBtn = $('logoutBtn');
  if (logoutBtn) userInfo.insertBefore(saveBtn, logoutBtn); else userInfo.appendChild(saveBtn);
  saveBtn.addEventListener('click', saveAIConfig);
}
function markAsChanged() {
  hasUnsavedChanges = true;
  const btn = $('saveChangesBtn');
  if (btn) setButtonState(btn, 'enabled');
}

// ==================== SAVE FLOW ====================
async function saveAIConfig() {
  const btn = $('saveChangesBtn');
  if (btn) setButtonState(btn, 'saving');

  try {
    // Validación de campos obligatorios
    const requiredFields = ['aiName','aiPersonality','aiTone','aiLanguage','aiGreeting','sinPrecio','sinStock','localCerrado','proactividad','formatoRespuestas'];
    for (const f of requiredFields) {
      if (!safeGet(f)) {
        showToast('warning','Campos incompletos','Completá todos los campos obligatorios');
        if (btn) setButtonState(btn, 'enabled');
        return;
      }
    }

    // Validar contactos según sinPrecio seleccionado
    const sinPrecio = safeGet('sinPrecio');
    const faltantes = [];
    if (sinPrecio === 'whatsapp' && !comercioData.whatsapp) faltantes.push('WhatsApp');
    if (sinPrecio === 'instagram' && !comercioData.instagram) faltantes.push('Instagram');
    if (sinPrecio === 'email' && !comercioData.email) faltantes.push('Email');
    if (sinPrecio === 'web' && !comercioData.sitioWeb) faltantes.push('Sitio Web');
    if (sinPrecio === 'telefono' && !comercioData.telefono) faltantes.push('Teléfono');
    if (faltantes.length) {
      showToast('warning','Contactos faltantes','Configurá en Mi Comercio: ' + faltantes.join(', '));
      if (btn) setButtonState(btn, 'enabled');
      return;
    }

    // Preparar objeto
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
      productosDestacados: productosDestacados.map(p => ({
        id: p.id || null,
        codigo: p.codigo || '',
        nombre: p.nombre || '',
        precio_final: Number(p.precio_final || 0),
      }))
    };

    await updateDoc(comercioRef, {
      aiConfig: updatedConfig,
      fechaActualizacion: new Date()
    });

    // Éxito UX
    hasUnsavedChanges = false;
    if (btn) setButtonState(btn, 'saved');
    showToast('success','Cambios guardados','Configuración actualizada');

    // Actualizar memoria local
    comercioData.aiConfig = updatedConfig;
    originalAIConfig = JSON.parse(JSON.stringify(updatedConfig));

    // marcar completion en Navigation y redirigir
    try { Navigation.markPageAsCompleted('ia-config'); Navigation.updateProgressBar(); } catch(e){/*ignore*/}

    // dejar 1s para que el usuario vea el "Guardado" y luego redirigir
    setTimeout(() => {
      try { redirectToNextStep(); } catch (e) { console.warn('redirectToNextStep falló:', e); window.location.href = './dashboard.html'; }
    }, 900);

  } catch (err) {
    console.error('saveAIConfig error:', err);
    showToast('error','Error','No se pudo guardar: ' + (err.message || err));
    if (btn) setButtonState(btn, 'enabled');
  } finally {
    hideLoading();
  }
}

// ==================== LOGOUT ====================
async function handleLogout() {
  if (hasUnsavedChanges && !confirm('Tenés cambios sin guardar. ¿Salir igual?')) return;
  try {
    await signOut(auth);
    window.location.href = '/index.html';
  } catch (err) {
    console.error('logout error:', err);
    showToast('error','Error','No se pudo cerrar sesión');
  }
}

// ==================== EXPORT / TEST HOOKS ====================
window.__iaConfig = {
  loadAIConfig,
  saveAIConfig,
  loadProducts,
  buscarProductos,
  agregarDestacado,
  renderDestacados
};
