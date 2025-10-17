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
let categorias = [];
let hasUnsavedChanges = false;
let originalAIConfig = null;

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
  console.log('🚀 Iniciando mi-ia.js (refactorizado)');

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

    // Obtener comercioId
    const userRef = doc(db, 'usuarios', currentUser.uid);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists() || !userDoc.data()?.comercioId) {
      console.warn('⚠️ No existe comercioId en usuario → redirigir a mi-comercio');
      hideLoading();
      window.location.href = './mi-comercio.html';
      return;
    }

    currentComercioId = userDoc.data().comercioId;
    console.log('📍 Comercio ID:', currentComercioId);

    // Cargar datos del comercio
    const comercioRef = doc(db, 'comercios', currentComercioId);
    const comercioDoc = await getDoc(comercioRef);

    if (comercioDoc.exists()) {
      comercioData = { id: currentComercioId, ...comercioDoc.data() };
      console.log('✅ Datos del comercio cargados:', comercioData.nombreComercio);
    } else {
      console.warn('⚠️ Comercio no existe en Firestore');
      comercioData = { id: currentComercioId };
    }

    // Cargar productos para categorías
    await loadProducts();

    // Inicializar UI
    updateHeader();
    updateSubscriptionBanner();
    loadAIConfig();
    renderProductosDestacados();
    renderContactosValidacion();
    setupEventListeners();
    createSaveButton();

    // Inicializar Navigation
    try {
      Navigation.init();
    } catch (e) {
      console.warn('⚠️ Navigation.init falló:', e);
    }

    // Validación para navegación
    window.validateCurrentPageData = async () => {
      if (!comercioData.aiConfig || !comercioData.aiConfig.aiName) {
        showToast('warning', 'Configuración requerida', '👋 Ey! Necesitás configurar tu asistente IA antes de continuar');
        return false;
      }

      if (hasUnsavedChanges) {
        showToast('warning', 'Cambios sin guardar', 'Guardá los cambios antes de continuar');
        return false;
      }

      return true;
    };

    hideLoading();
    console.log('✅ Página inicializada correctamente');

  } catch (error) {
    hideLoading();
    console.error('❌ Error inicializando página:', error);
    showToast('error', 'Error', 'No se pudo cargar la página: ' + (error.message || error));
  }
}

// ==================== CARGAR PRODUCTOS ====================
async function loadProducts() {
  try {
    if (!currentComercioId) {
      productos = [];
      categorias = [];
      console.warn('⚠️ No hay comercioId para cargar productos');
      return;
    }

    const productosRef = collection(db, 'comercios', currentComercioId, 'productos');
    const snapshot = await getDocs(productosRef);

    productos = snapshot.docs.map(d => ({
      id: d.id,
      ...d.data()
    }));

    // Extraer categorías únicas (filtrar vacías y null)
    categorias = [...new Set(
      productos
        .map(p => p.categoria)
        .filter(c => c && c.toString().trim() !== '')
    )];

    console.log('✅ Productos cargados:', productos.length);
    console.log('✅ Categorías encontradas:', categorias.length, categorias);
  } catch (error) {
    console.error('❌ Error cargando productos:', error);
    productos = [];
    categorias = [];
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

  banner.className = 'subscription-banner'; // reset
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
      message.innerHTML = `⚠️ <strong>Tu trial expiró.</strong> Elegí un plan para continuar`;
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

// ==================== CARGAR CONFIGURACIÓN AI ====================
function loadAIConfig() {
  const aiConfig = comercioData.aiConfig || {};

  // Guardar copia original para detectar cambios
  originalAIConfig = JSON.parse(JSON.stringify(aiConfig));

  // Llenar formularios con safe setters
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

  // Auto-expandir mensajes personalizados si hay contenido
  const anyMessage = aiConfig.mensajeWhatsapp || aiConfig.mensajeInstagram || 
                     aiConfig.mensajeWeb || aiConfig.mensajeDefault;
  
  const messagesForm = $('aiMessagesForm');
  const toggleBtn = $('toggleMessages');

  if (anyMessage && messagesForm && toggleBtn) {
    messagesForm.style.display = 'block';
    toggleBtn.innerHTML = '➖ Ocultar mensajes personalizados';
  }

  console.log('✅ Configuración IA cargada');
}

// ==================== PRODUCTOS DESTACADOS ====================
function renderProductosDestacados() {
  const content = $('productosDestacadosContent');

  console.log('🔍 Renderizando productos destacados...', {
    contentExists: !!content,
    categoriasCount: categorias.length,
    productosCount: productos.length
  });

  if (!content) {
    console.error('❌ No se encontró productosDestacadosContent');
    return;
  }

  // Sin productos ni categorías
  if (categorias.length === 0 && productos.length === 0) {
    content.innerHTML = `
      <div style="text-align:center; padding:2rem; color:#6b7280;">
        <i class="fas fa-box-open" style="font-size:3rem; display:block; margin-bottom:1rem; opacity:0.3;"></i>
        <strong>Aún no hay productos cargados.</strong><br>
        Cargá productos en la sección <a href="./productos.html">Productos</a> para poder destacarlos.
      </div>
    `;
    return;
  }

  const aiConfig = comercioData.aiConfig || {};
  const destacados = Array.isArray(aiConfig.categoriasDestacadas) 
    ? aiConfig.categoriasDestacadas 
    : [];

  // Con categorías
  if (categorias.length > 0) {
    content.innerHTML = `
      <div class="form-field">
        <label>
          Elegí las categorías que querés priorizar
          <span class="tooltip-icon" title="El asistente mencionará estos productos con mayor frecuencia">
            <i class="fas fa-question-circle"></i>
          </span>
        </label>
        <div style="display:grid; gap:0.5rem; margin-top:0.5rem;">
          ${categorias.map(cat => `
            <label style="display:flex; align-items:center; gap:0.5rem; cursor:pointer; padding:0.5rem;">
              <input 
                type="checkbox" 
                name="categoriaDestacada" 
                value="${cat}"
                ${destacados.includes(cat) ? 'checked' : ''}
              >
              <span>⭐ ${cat}</span>
            </label>
          `).join('')}
        </div>
        <small>El asistente sugerirá estos productos cuando sea relevante</small>
      </div>
    `;

    // Bind change events
    const checkboxes = content.querySelectorAll('input[name="categoriaDestacada"]');
    checkboxes.forEach(cb => cb.addEventListener('change', markAsChanged));

    console.log('✅ Categorías renderizadas:', categorias.length);
    return;
  }

  // Productos sin categorías
  content.innerHTML = `
    <div style="text-align:center; padding:2rem; color:#6b7280;">
      <i class="fas fa-tag" style="font-size:2rem; display:block; margin-bottom:1rem; opacity:0.3;"></i>
      Tus productos no tienen categorías asignadas.<br>
      Agregá categorías en la sección <strong>Productos</strong> para poder destacarlas.
    </div>
  `;
}

// ==================== VALIDACIÓN DE CONTACTOS ====================
function renderContactosValidacion() {
  const container = $('contactosValidacion');

  console.log('🔍 Renderizando validación de contactos...', {
    containerExists: !!container,
    whatsapp: !!comercioData.whatsapp,
    instagram: !!comercioData.instagram
  });

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
        <strong>Algunos contactos no están configurados.</strong>
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
  // Asistente IA external link
  $('openAssistant')?.addEventListener('click', () => {
    showToast('info', '🤖 Asistente abierto',
      'En la nueva pestaña, decile a Claude: "Soy de Indice IA y necesito ayuda configurando mi IA"',
      8000);
  });

  // Toggle mensajes personalizados
  const toggleBtn = $('toggleMessages');
  const messagesForm = $('aiMessagesForm');

  if (toggleBtn && messagesForm) {
    toggleBtn.addEventListener('click', () => {
      const isVisible = messagesForm.style.display === 'block';
      messagesForm.style.display = isVisible ? 'none' : 'block';
      toggleBtn.innerHTML = isVisible
        ? '➕ Configurar mensajes personalizados'
        : '➖ Ocultar mensajes personalizados';
    });
  }

  // Detectar cambios en todos los campos
  const allInputs = document.querySelectorAll('input, select, textarea');
  allInputs.forEach(input => {
    input.addEventListener('change', markAsChanged);
    input.addEventListener('input', markAsChanged);
  });

  // Logout
  $('logoutBtn')?.addEventListener('click', handleLogout);

  // Beforeunload warning
  window.addEventListener('beforeunload', (e) => {
    if (hasUnsavedChanges) {
      e.preventDefault();
      e.returnValue = '¿Seguro que querés salir? Tenés cambios sin guardar.';
    }
  });
}

// ==================== GUARDAR ====================
function createSaveButton() {
  const userInfo = document.querySelector('.header .user-info');
  if (!userInfo) {
    console.warn('⚠️ No se encontró .user-info para agregar botón');
    return;
  }

  // Evitar duplicados
  if ($('saveChangesBtn')) return;

  const saveBtn = document.createElement('button');
  saveBtn.id = 'saveChangesBtn';
  saveBtn.className = 'btn-save';
  saveBtn.disabled = true;
  saveBtn.innerHTML = '<i class="fas fa-save"></i> <span>Guardar Cambios</span>';

  const logoutBtn = $('logoutBtn');
  if (logoutBtn) {
    userInfo.insertBefore(saveBtn, logoutBtn);
  } else {
    userInfo.appendChild(saveBtn);
  }

  saveBtn.addEventListener('click', saveAIConfig);
  console.log('✅ Botón de guardado creado');
}

function markAsChanged() {
  hasUnsavedChanges = true;
  const saveBtn = $('saveChangesBtn');
  if (saveBtn) {
    saveBtn.disabled = false;
    saveBtn.className = 'btn-save';
    saveBtn.innerHTML = '<i class="fas fa-save"></i> <span>Guardar Cambios</span>';
  }
}

async function saveAIConfig() {
  const saveBtn = $('saveChangesBtn');

  try {
    // === VALIDACIONES ===
    const aiName = safeGet('aiName');
    const aiPersonality = safeGet('aiPersonality');
    const aiTone = safeGet('aiTone');
    const aiLanguage = safeGet('aiLanguage');
    const aiGreeting = safeGet('aiGreeting');

    if (!aiName || !aiPersonality || !aiTone || !aiLanguage || !aiGreeting) {
      showToast('warning', 'Campos requeridos', '👋 Ey! Completá todos los campos de Identidad del Asistente');
      return false;
    }

    const sinPrecio = safeGet('sinPrecio');
    const sinStock = safeGet('sinStock');
    const localCerrado = safeGet('localCerrado');
    const proactividad = safeGet('proactividad');
    const formatoRespuestas = safeGet('formatoRespuestas');

    if (!sinPrecio || !sinStock || !localCerrado || !proactividad || !formatoRespuestas) {
      showToast('warning', 'Campos requeridos', '👋 Ey! Completá todos los campos de Comportamientos');
      return false;
    }

    // === UI FEEDBACK ===
    if (saveBtn) {
      saveBtn.className = 'btn-save saving';
      saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> <span>Guardando...</span>';
      saveBtn.disabled = true;
    }

    showLoading('Guardando configuración de IA...');

    // === OBTENER CATEGORÍAS DESTACADAS ===
    const categoriasDestacadas = Array.from(
      document.querySelectorAll('input[name="categoriaDestacada"]:checked')
    ).map(cb => cb.value);

    // === CONSTRUIR OBJETO ===
    const aiConfig = {
      // Identidad
      aiName,
      aiPersonality,
      aiTone,
      aiLanguage,
      aiGreeting,

      // Comportamientos
      sinPrecio,
      sinStock,
      localCerrado,
      proactividad,
      formatoRespuestas,

      // Mensajes personalizados
      mensajeWhatsapp: safeGet('mensajeWhatsapp'),
      mensajeInstagram: safeGet('mensajeInstagram'),
      mensajeWeb: safeGet('mensajeWeb'),
      mensajeDefault: safeGet('mensajeDefault'),

      // Productos destacados
      categoriasDestacadas,

      // Metadata
      fechaActualizacion: new Date(),
      aiGenerated: true
    };

    // === GUARDAR EN FIRESTORE ===
    const comercioRef = doc(db, 'comercios', currentComercioId);
    await updateDoc(comercioRef, {
      aiConfig,
      fechaActualizacion: new Date()
    });

    console.log('✅ Configuración IA guardada en Firestore');

    // === ACTUALIZAR JSON EN GIST ===
    try {
      await updateCommerceJSON(currentComercioId, currentUser.uid);
      console.log('✅ JSON actualizado en Gist');
    } catch (jsonError) {
      console.warn('⚠️ Error actualizando JSON:', jsonError);
      showToast('warning', 'Advertencia', 'Configuración guardada pero JSON no actualizado');
    }

    // === ESTADO LOCAL ===
    comercioData.aiConfig = aiConfig;
    originalAIConfig = JSON.parse(JSON.stringify(aiConfig));
    hasUnsavedChanges = false;

    // === UI SUCCESS ===
    if (saveBtn) {
      saveBtn.className = 'btn-save saved';
      saveBtn.innerHTML = '<i class="fas fa-check-circle"></i> <span>Guardado ✓</span>';
      setTimeout(() => {
        if (saveBtn) {
          saveBtn.disabled = true;
          saveBtn.className = 'btn-save';
          saveBtn.innerHTML = '<i class="fas fa-save"></i> <span>Guardar Cambios</span>';
        }
      }, 2000);
    }

    // Marcar página como completada
    try {
      Navigation.markPageAsCompleted('mi-ia');
      Navigation.updateProgressBar();
    } catch (e) {
      console.warn('⚠️ Error marcando página como completada:', e);
    }

    hideLoading();
    showToast('success', '✅ Configuración guardada', 'Tu asistente IA está listo para usar');
    return true;

  } catch (error) {
    console.error('❌ Error guardando configuración:', error);
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
  if (!confirm('¿Estás seguro que deseas cerrar sesión?')) return;

  try {
    showLoading('Cerrando sesión...');
    await signOut(auth);
    window.location.href = '/index.html';
  } catch (error) {
    hideLoading();
    console.error('❌ Error cerrando sesión:', error);
    showToast('error', 'Error', 'No se pudo cerrar sesión');
  }
}

// ==================== EXPORTS / DEBUG ====================
window.markAsChanged = markAsChanged;
window.saveAIConfig = saveAIConfig;
window.renderProductosDestacados = renderProductosDestacados;
window.renderContactosValidacion = renderContactosValidacion;

console.log('📦 miIa.js cargado completamente');
