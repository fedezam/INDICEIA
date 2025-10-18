// src/pages/miIa.js
import { auth, db } from '../firebase.js';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, collection, getDocs, updateDoc } from 'firebase/firestore';
import Navigation from '../shared/navigation.js';
import { showLoading, hideLoading, showToast } from '../shared/utils.js';
import { updateCommerceJSON } from '../shared/updateCommerceJSON.js';
import { PLANS, calcularEstadoPlan, getDiasRestantesTrial } from '../shared/plans.js';

// ==================== VARIABLES GLOBALES ====================
let currentUser = null;
let currentComercioId = null;
let comercioData = {};
let productos = [];
let productosDestacados = [];
let hasUnsavedChanges = false;
let originalAIConfig = null;
let searchTimeout = null;

// ==================== HELPERS ====================
const $ = (id) => document.getElementById(id);

const safeSet = (id, value, defaultValue = '') => {
  const el = $(id);
  if (!el) {
    console.warn(`⚠️ Elemento no encontrado: ${id}`);
    return;
  }
  el.value = value ?? defaultValue;
};

const safeGet = (id) => {
  const el = $(id);
  return el ? el.value.trim() : '';
};

// ==================== INIT ====================
document.addEventListener('DOMContentLoaded', () => {
  console.log('🚀 Iniciando mi-ia.js (production)');

  onAuthStateChanged(auth, async (user) => {
    if (user) {
      console.log('✅ Usuario autenticado:', user.email);
      currentUser = user;
      await initializePage();
    } else {
      console.log('❌ Usuario no autenticado, redirigiendo...');
      window.location.href = '/index.html';
    }
  });
});

async function initializePage() {
  try {
    showLoading('Cargando configuración de IA...');

    const userRef = doc(db, 'usuarios', currentUser.uid);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists() || !userDoc.data()?.comercioId) {
      console.warn('⚠️ No existe comercioId');
      hideLoading();
      window.location.href = './mi-comercio.html';
      return;
    }

    currentComercioId = userDoc.data().comercioId;
    console.log('📍 Comercio ID:', currentComercioId);

    const comercioRef = doc(db, 'comercios', currentComercioId);
    const comercioDoc = await getDoc(comercioRef);

    if (comercioDoc.exists()) {
      comercioData = { id: currentComercioId, ...comercioDoc.data() };
      console.log('✅ Datos cargados:', comercioData.nombreComercio);
    } else {
      comercioData = { id: currentComercioId };
    }

    await loadProducts();

    updateHeader();
    updateSubscriptionBanner();
    loadAIConfig();
    renderContactosValidacion();
    setupEventListeners();
    createSaveButton();

    try {
      Navigation.init();
    } catch (e) {
      console.warn('⚠️ Navigation.init falló:', e);
    }

    window.validateCurrentPageData = async () => {
      const aiName = safeGet('aiName');
      const aiPersonality = safeGet('aiPersonality');
      const aiTone = safeGet('aiTone');
      const aiLanguage = safeGet('aiLanguage');
      const aiGreeting = safeGet('aiGreeting');

      if (!aiName || !aiPersonality || !aiTone || !aiLanguage || !aiGreeting) {
        showToast('warning', 'Campos incompletos', 'Completá Identidad del Asistente');
        return false;
      }

      const sinPrecio = safeGet('sinPrecio');
      const sinStock = safeGet('sinStock');
      const localCerrado = safeGet('localCerrado');
      const proactividad = safeGet('proactividad');
      const formatoRespuestas = safeGet('formatoRespuestas');

      if (!sinPrecio || !sinStock || !localCerrado || !proactividad || !formatoRespuestas) {
        showToast('warning', 'Campos incompletos', 'Completá Comportamientos del Asistente');
        return false;
      }

      if (hasUnsavedChanges) {
        showToast('warning', 'Cambios sin guardar', 'Guardá antes de continuar');
        return false;
      }

      return true;
    };

    hideLoading();
    console.log('✅ Página inicializada');

  } catch (error) {
    hideLoading();
    console.error('❌ Error:', error);
    showToast('error', 'Error', 'No se pudo cargar: ' + (error.message || error));
  }
}

// ==================== LOAD PRODUCTS ====================
async function loadProducts() {
  try {
    if (!currentComercioId) {
      productos = [];
      return;
    }

    const productosRef = collection(db, 'comercios', currentComercioId, 'productos');
    const snapshot = await getDocs(productosRef);

    productos = snapshot.docs.map(d => ({
      id: d.id,
      ...d.data()
    }));

    console.log('✅ Productos cargados:', productos.length);
  } catch (error) {
    console.error('❌ Error cargando productos:', error);
    productos = [];
  }
}

// ==================== HEADER ====================
function updateHeader() {
  const commerceName = $('commerceName');
  const planBadge = $('planBadge');

  if (commerceName) {
    commerceName.textContent = comercioData.nombreComercio || 'Mi Comercio';
  }
  if (planBadge) {
    const plan = PLANS[comercioData.plan || 'trial'];
    planBadge.textContent = plan ? `${plan.emoji} ${plan.nombre}` : 'Trial';
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
    case 'trial': {
      const diasRestantes = getDiasRestantesTrial(comercioData);
      banner.classList.add('trial');
      message.innerHTML = `🎉 <strong>Trial activo</strong> - Te quedan <strong>${diasRestantes} días</strong>`;
      break;
    }
    case 'expirado':
      banner.classList.add('expired');
      message.innerHTML = `⚠️ <strong>Trial expirado.</strong> Elegí un plan`;
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

// ==================== LOAD CONFIG ====================
function loadAIConfig() {
  const aiConfig = comercioData.aiConfig || {};
  originalAIConfig = JSON.parse(JSON.stringify(aiConfig));

  safeSet('aiName', aiConfig.aiName);
  safeSet('aiPersonality', aiConfig.aiPersonality);
  safeSet('aiTone', aiConfig.aiTone);
  safeSet('aiLanguage', aiConfig.aiLanguage, 'es-AR');
  safeSet('aiGreeting', aiConfig.aiGreeting);

  safeSet('sinPrecio', aiConfig.sinPrecio);
  safeSet('sinStock', aiConfig.sinStock);
  safeSet('localCerrado', aiConfig.localCerrado);
  safeSet('proactividad', aiConfig.proactividad);
  safeSet('formatoRespuestas', aiConfig.formatoRespuestas);

  safeSet('mensajeWhatsapp', aiConfig.mensajeWhatsapp);
  safeSet('mensajeInstagram', aiConfig.mensajeInstagram);
  safeSet('mensajeWeb', aiConfig.mensajeWeb);
  safeSet('mensajeDefault', aiConfig.mensajeDefault);

  productosDestacados = Array.isArray(aiConfig.productosDestacados) 
    ? aiConfig.productosDestacados 
    : [];

  renderDestacados();

  console.log('✅ Config IA cargada');
}

// ==================== PRODUCTOS DESTACADOS ====================
function renderDestacados() {
  const counter = $('destacadosCounter');
  const list = $('destacadosList');

  if (!counter || !list) return;

  counter.textContent = `${productosDestacados.length}/10`;

  if (productosDestacados.length === 0) {
    list.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-star"></i>
        <p>Aún no seleccionaste productos destacados</p>
        <small>Usá el buscador para agregar hasta 10</small>
      </div>
    `;
    return;
  }

  list.innerHTML = productosDestacados.map(p => `
    <div class="destacado-item">
      <div class="producto-info">
        <div class="producto-codigo">[${p.codigo || 'SIN CÓDIGO'}]</div>
        <div class="producto-nombre">${p.nombre || 'Sin nombre'}</div>
        <div class="producto-precio">${p.precio ? `$${p.precio.toLocaleString()}` : 'Sin precio'}</div>
      </div>
      <button class="btn-quitar" onclick="window.quitarDestacado('${p.id}')">
        <i class="fas fa-trash"></i> Quitar
      </button>
    </div>
  `).join('');
}

function buscarProductos(query) {
  const resultsDiv = $('searchResults');
  if (!resultsDiv) return;

  if (!query || query.length < 2) {
    resultsDiv.style.display = 'none';
    return;
  }

  const q = query.toLowerCase();
  const filtrados = productos.filter(p => {
    if (productosDestacados.some(d => d.id === p.id)) return false;

    const codigo = (p.codigo || '').toLowerCase();
    const nombre = (p.nombre || '').toLowerCase();
    const descripcion = (p.descripcion || '').toLowerCase();

    return codigo.includes(q) || nombre.includes(q) || descripcion.includes(q);
  }).slice(0, 10);

  if (filtrados.length === 0) {
    resultsDiv.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-search"></i>
        <p>No se encontraron productos con "${query}"</p>
      </div>
    `;
    resultsDiv.style.display = 'block';
    return;
  }

  const maxDestacados = productosDestacados.length >= 10;

  resultsDiv.innerHTML = filtrados.map(p => `
    <div class="search-result-item">
      <div class="producto-info">
        <div class="producto-codigo">[${p.codigo || 'SIN CÓDIGO'}]</div>
        <div class="producto-nombre">${p.nombre || 'Sin nombre'}</div>
        <div class="producto-precio">${p.precio ? `$${p.precio.toLocaleString()}` : 'Sin precio'}</div>
      </div>
      <button 
        class="btn-destacar" 
        onclick="window.agregarDestacado('${p.id}')"
        ${maxDestacados ? 'disabled' : ''}
      >
        <i class="fas fa-plus"></i> Destacar
      </button>
    </div>
  `).join('');

  resultsDiv.style.display = 'block';
}

window.agregarDestacado = (productoId) => {
  if (productosDestacados.length >= 10) {
    showToast('warning', 'Límite alcanzado', 'Máximo 10 productos. Quitá uno para agregar otro');
    return;
  }

  const producto = productos.find(p => p.id === productoId);
  if (!producto) return;

  const productoData = {
    id: producto.id,
    codigo: producto.codigo || '',
    nombre: producto.nombre || '',
    descripcion: producto.descripcion || '',
    precio: producto.precio || 0
  };

  productosDestacados.push(productoData);
  renderDestacados();
  markAsChanged();

  const searchInput = $('searchProductos');
  if (searchInput) {
    buscarProductos(searchInput.value);
  }

  showToast('success', 'Producto agregado', `${productoData.nombre} destacado`);
};

window.quitarDestacado = (productoId) => {
  const index = productosDestacados.findIndex(p => p.id === productoId);
  if (index === -1) return;

  const producto = productosDestacados[index];
  productosDestacados.splice(index, 1);

  renderDestacados();
  markAsChanged();

  const searchInput = $('searchProductos');
  if (searchInput && searchInput.value) {
    buscarProductos(searchInput.value);
  }

  showToast('info', 'Producto quitado', `${producto.nombre} removido de destacados`);
};

// ==================== CONTACTOS ====================
function renderContactosValidacion() {
  const container = $('contactosValidacion');

  if (!container) {
    console.error('❌ No se encontró contactosValidacion');
    return;
  }

  const contactos = [
    {
      id: 'whatsapp',
      icon: '📱',
      label: 'WhatsApp',
      value: comercioData.whatsapp || '',
      valid: !!(comercioData.whatsapp && comercioData.whatsapp.toString().trim())
    },
    {
      id: 'instagram',
      icon: '📸',
      label: 'Instagram',
      value: comercioData.instagram || '',
      valid: !!(comercioData.instagram && comercioData.instagram.toString().trim())
    },
    {
      id: 'sitioWeb',
      icon: '🌐',
      label: 'Sitio Web',
      value: comercioData.sitioWeb || '',
      valid: !!(comercioData.sitioWeb && comercioData.sitioWeb.toString().trim())
    },
    {
      id: 'email',
      icon: '📧',
      label: 'Email',
      value: comercioData.email || '',
      valid: !!(comercioData.email && comercioData.email.toString().trim())
    },
    {
      id: 'telefono',
      icon: '☎️',
      label: 'Teléfono',
      value: comercioData.telefono || '',
      valid: !!(comercioData.telefono && comercioData.telefono.toString().trim())
    }
  ];

  const hasInvalid = contactos.some(c => !c.valid);

  container.innerHTML = `
    ${hasInvalid ? `
      <div class="alert alert-warning" style="grid-column:1/-1;">
        <i class="fas fa-exclamation-triangle"></i>
        <strong>Algunos contactos no configurados.</strong>
        El asistente no podrá derivar a esos canales.
      </div>
    ` : ''}

    ${contactos.map(c => `
      <div class="contacto-item ${c.valid ? 'valid' : 'invalid'}">
        <div class="contacto-icon">${c.icon}</div>
        <div class="contacto-info">
          <strong>${c.label}</strong>
          ${c.valid
            ? `<span class="contacto-value">${c.value}</span>`
            : `<span class="contacto-missing">No configurado</span>`
          }
        </div>
        <div class="contacto-status">
          ${c.valid
            ? '<i class="fas fa-check-circle" style="color:#10b981;"></i>'
            : '<i class="fas fa-times-circle" style="color:#ef4444;"></i>'
          }
        </div>
      </div>
    `).join('')}
  `;

  console.log('✅ Contactos renderizados');
}

// ==================== EVENT LISTENERS ====================
function setupEventListeners() {
  $('openAssistant')?.addEventListener('click', () => {
    showToast('info', '🤖 Asistente', 'Decile: "Soy de Indice IA"', 8000);
  });

  const searchInput = $('searchProductos');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        buscarProductos(e.target.value);
      }, 300);
    });
  }

  const allInputs = document.querySelectorAll('input, select, textarea');
  allInputs.forEach(input => {
    if (input.id !== 'searchProductos') {
      input.addEventListener('change', markAsChanged);
      input.addEventListener('input', markAsChanged);
    }
  });

  $('logoutBtn')?.addEventListener('click', handleLogout);

  window.addEventListener('beforeunload', (e) => {
    if (hasUnsavedChanges) {
      e.preventDefault();
      e.returnValue = 'Cambios sin guardar';
    }
  });
}

// ==================== SAVE ====================
function createSaveButton() {
  const userInfo = document.querySelector('.header .user-info');
  if (!userInfo || $('saveChangesBtn')) return;

  const saveBtn = document.createElement('button');
  saveBtn.id = 'saveChangesBtn';
  saveBtn.className = 'btn-save';
  saveBtn.disabled = true;
  saveBtn.innerHTML = '<i class="fas fa-save"></i> <span>Guardar</span>';

  const logoutBtn = $('logoutBtn');
  if (logoutBtn) {
    userInfo.insertBefore(saveBtn, logoutBtn);
  } else {
    userInfo.appendChild(saveBtn);
  }

  saveBtn.addEventListener('click', saveAIConfig);
  console.log('✅ Botón creado');
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

async function saveAIConfig() {
  const saveBtn = $('saveChangesBtn');

  try {
    const aiName = safeGet('aiName');
    const aiPersonality = safeGet('aiPersonality');
    const aiTone = safeGet('aiTone');
    const aiLanguage = safeGet('aiLanguage');
    const aiGreeting = safeGet('aiGreeting');

    if (!aiName || !aiPersonality || !aiTone || !aiLanguage || !aiGreeting) {
      showToast('warning', 'Campos requeridos', 'Completá Identidad');
      return false;
    }

    const sinPrecio = safeGet('sinPrecio');
    const sinStock = safeGet('sinStock');
    const localCerrado = safeGet('localCerrado');
    const proactividad = safeGet('proactividad');
    const formatoRespuestas = safeGet('formatoRespuestas');

    if (!sinPrecio || !sinStock || !localCerrado || !proactividad || !formatoRespuestas) {
      showToast('warning', 'Campos requeridos', 'Completá Comportamientos');
      return false;
    }

    if (saveBtn) {
      saveBtn.className = 'btn-save saving';
      saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> <span>Guardando...</span>';
      saveBtn.disabled = true;
    }

    showLoading('Guardando...');

    const aiConfig = {
      aiName,
      aiPersonality,
      aiTone,
      aiLanguage,
      aiGreeting,
      sinPrecio,
      sinStock,
      localCerrado,
      proactividad,
      formatoRespuestas,
      mensajeWhatsapp: safeGet('mensajeWhatsapp'),
      mensajeInstagram: safeGet('mensajeInstagram'),
      mensajeWeb: safeGet('mensajeWeb'),
      mensajeDefault: safeGet('mensajeDefault'),
      productosDestacados,
      fechaActualizacion: new Date(),
      aiGenerated: true
    };

    const comercioRef = doc(db, 'comercios', currentComercioId);
    await updateDoc(comercioRef, {
      aiConfig,
      fechaActualizacion: new Date()
    });

    console.log('✅ Guardado en Firestore');

    try {
      await updateCommerceJSON(currentComercioId, currentUser.uid);
      console.log('✅ JSON actualizado');
    } catch (jsonError) {
      console.warn('⚠️ Error JSON:', jsonError);
    }

    comercioData.aiConfig = aiConfig;
    originalAIConfig = JSON.parse(JSON.stringify(aiConfig));
    hasUnsavedChanges = false;

    if (saveBtn) {
      saveBtn.className = 'btn-save saved';
      saveBtn.innerHTML = '<i class="fas fa-check-circle"></i> <span>Guardado ✓</span>';
      setTimeout(() => {
        if (saveBtn) {
          saveBtn.disabled = true;
          saveBtn.className = 'btn-save';
          saveBtn.innerHTML = '<i class="fas fa-save"></i> <span>Guardar</span>';
        }
      }, 2000);
    }

    try {
      Navigation.markPageAsCompleted('mi-ia');
      Navigation.updateProgressBar();
    } catch (e) {
      console.warn('⚠️ Error marcando:', e);
    }

    hideLoading();
    showToast('success', '✅ Guardado', 'Config lista');
    return true;

  } catch (error) {
    console.error('❌ Error:', error);
    hideLoading();

    if (saveBtn) {
      saveBtn.className = 'btn-save';
      saveBtn.innerHTML = '<i class="fas fa-exclamation-circle"></i> <span>Error</span>';
      saveBtn.disabled = false;
    }

    showToast('error', 'Error', 'No se pudo guardar: ' + (error.message || error));
    return false;
  }
}

async function handleLogout() {
  if (!confirm('¿Cerrar sesión?')) return;

  try {
    showLoading('Cerrando...');
    await signOut(auth);
    window.location.href = '/index.html';
  } catch (error) {
    hideLoading();
    console.error('❌ Error logout:', error);
    showToast('error', 'Error', 'No se pudo cerrar sesión');
  }
}

// ==================== EXPORTS ====================
window.markAsChanged = markAsChanged;
window.saveAIConfig = saveAIConfig;

console.log('📦 miIa.js cargado');
