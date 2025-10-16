// src/pages/mi-ia.js
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

// ==================== INIT ====================
document.addEventListener('DOMContentLoaded', async () => {
  console.log('🚀 Iniciando mi-ia.js');

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
    
    if (!userDoc.exists() || !userDoc.data().comercioId) {
      window.location.href = './mi-comercio.html';
      return;
    }

    currentComercioId = userDoc.data().comercioId;

    // Cargar datos del comercio
    const comercioRef = doc(db, 'comercios', currentComercioId);
    const comercioDoc = await getDoc(comercioRef);
    
    if (comercioDoc.exists()) {
      comercioData = { id: currentComercioId, ...comercioDoc.data() };
    }

    // Cargar productos para categorías y destacados
    await loadProducts();

    // Inicializar UI
    updateHeader();
    updateSubscriptionBanner();
    loadAIConfig();
    renderProductosDestacados();
    renderContactosValidacion();
    setupEventListeners();
    Navigation.init();
    createSaveButton();

    // Validación para navegación
    window.validateCurrentPageData = () => {
      if (!comercioData.aiConfig || !comercioData.aiConfig.aiName) {
        showToast('Configuración requerida', '👋 Ey! Necesitás configurar tu asistente IA antes de continuar', 'warning');
        return false;
      }

      if (hasUnsavedChanges) {
        showToast('Cambios sin guardar', 'Guardá los cambios antes de continuar', 'warning');
        return false;
      }

      return true;
    };

    hideLoading();
    console.log('✅ Página inicializada correctamente');

  } catch (error) {
    hideLoading();
    console.error('❌ Error inicializando página:', error);
    showToast('Error', 'No se pudo cargar la página: ' + error.message, 'error');
  }
}

// ==================== CARGAR PRODUCTOS ====================
async function loadProducts() {
  try {
    const productosRef = collection(db, 'comercios', currentComercioId, 'productos');
    const snapshot = await getDocs(productosRef);
    
    productos = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // Extraer categorías únicas
    categorias = [...new Set(productos
      .map(p => p.categoria)
      .filter(c => c && c.trim() !== ''))];

    console.log('✅ Productos cargados:', productos.length);
    console.log('✅ Categorías encontradas:', categorias);
  } catch (error) {
    console.error('❌ Error cargando productos:', error);
  }
}

// ==================== HEADER ====================
function updateHeader() {
  const commerceName = document.getElementById('commerceName');
  const planBadge = document.getElementById('planBadge');
  
  if (commerceName) {
    commerceName.textContent = comercioData.nombreComercio || 'Mi Comercio';
  }
  if (planBadge) {
    const plan = PLANS[comercioData.plan || 'trial'];
    planBadge.textContent = plan ? `${plan.emoji} ${plan.nombre}` : 'Trial';
  }
}

function updateSubscriptionBanner() {
  const banner = document.getElementById('subscriptionBanner');
  const message = document.getElementById('subscriptionMessage');
  
  if (!banner || !message) return;
  
  const estado = calcularEstadoPlan(comercioData);
  const planActual = PLANS[comercioData.plan || 'trial'];
  
  banner.className = 'subscription-banner';
  
  switch(estado) {
    case 'trial':
      const diasRestantes = getDiasRestantesTrial(comercioData);
      banner.classList.add('trial');
      message.innerHTML = `🎉 <strong>Trial activo</strong> - Te quedan <strong>${diasRestantes} días</strong>`;
      break;
      
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
  
  // Guardar copia original
  originalAIConfig = JSON.parse(JSON.stringify(aiConfig));

  // Llenar formularios
  document.getElementById('aiName').value = aiConfig.aiName || '';
  document.getElementById('aiPersonality').value = aiConfig.aiPersonality || '';
  document.getElementById('aiTone').value = aiConfig.aiTone || '';
  document.getElementById('aiLanguage').value = aiConfig.aiLanguage || 'es-AR';
  document.getElementById('aiGreeting').value = aiConfig.aiGreeting || '';

  document.getElementById('sinPrecio').value = aiConfig.sinPrecio || '';
  document.getElementById('sinStock').value = aiConfig.sinStock || '';
  document.getElementById('localCerrado').value = aiConfig.localCerrado || '';
  document.getElementById('proactividad').value = aiConfig.proactividad || '';
  document.getElementById('formatoRespuestas').value = aiConfig.formatoRespuestas || '';

  document.getElementById('mensajeWhatsapp').value = aiConfig.mensajeWhatsapp || '';
  document.getElementById('mensajeInstagram').value = aiConfig.mensajeInstagram || '';
  document.getElementById('mensajeWeb').value = aiConfig.mensajeWeb || '';
  document.getElementById('mensajeDefault').value = aiConfig.mensajeDefault || '';

  console.log('✅ Configuración IA cargada');
}

// ==================== PRODUCTOS DESTACADOS ====================
function renderProductosDestacados() {
  const section = document.getElementById('productosDestacadosSection');
  const content = document.getElementById('productosDestacadosContent');
  
  if (categorias.length === 0 && productos.length === 0) {
    // No hay productos ni categorías
    content.innerHTML = `
      <p style="text-align: center; color: #6b7280; padding: 2rem;">
        <i class="fas fa-box-open" style="font-size: 3rem; display: block; margin-bottom: 1rem; opacity: 0.3;"></i>
        Primero cargá productos en la sección <strong>Productos</strong>
      </p>
    `;
}

// ==================== EVENT LISTENERS ====================
function setupEventListeners() {
  // Asistente IA
  document.getElementById('openAssistant')?.addEventListener('click', () => {
    showToast('info', '🤖 Asistente abierto', 
      'En la nueva pestaña, decile a Claude: "Soy de Indice IA y necesito ayuda configurando mi IA"', 
      8000);
  });

  // Toggle mensajes personalizados
  const toggleMessages = document.getElementById('toggleMessages');
  const messagesForm = document.getElementById('aiMessagesForm');
  
  if (toggleMessages && messagesForm) {
    toggleMessages.addEventListener('click', () => {
      const isVisible = messagesForm.style.display !== 'none';
      messagesForm.style.display = isVisible ? 'none' : 'block';
      toggleMessages.innerHTML = isVisible 
        ? '➕ Configurar mensajes personalizados' 
        : '➖ Ocultar mensajes personalizados';
    });
  }

  // Detectar cambios en todos los campos
  const allInputs = document.querySelectorAll('input, select, textarea');
  allInputs.forEach(input => {
    input.addEventListener('change', () => markAsChanged());
    input.addEventListener('input', () => markAsChanged());
  });

  // Logout
  document.getElementById('logoutBtn')?.addEventListener('click', handleLogout);

  // Beforeunload
  window.addEventListener('beforeunload', (e) => {
    if (hasUnsavedChanges) {
      e.preventDefault();
      e.returnValue = '¿Seguro que quieres salir? Tienes cambios sin guardar.';
    }
  });
}

// ==================== GUARDAR ====================
function createSaveButton() {
  const userInfo = document.querySelector('.header .user-info');
  if (!userInfo) return;

  const saveBtn = document.createElement('button');
  saveBtn.id = 'saveChangesBtn';
  saveBtn.className = 'btn-save';
  saveBtn.disabled = true;
  saveBtn.innerHTML = '<i class="fas fa-save"></i> <span>Guardar Cambios</span>';
  
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    userInfo.insertBefore(saveBtn, logoutBtn);
  } else {
    userInfo.appendChild(saveBtn);
  }

  saveBtn.addEventListener('click', saveAIConfig);
}

function markAsChanged() {
  hasUnsavedChanges = true;
  const saveBtn = document.getElementById('saveChangesBtn');
  if (saveBtn) {
    saveBtn.disabled = false;
    saveBtn.className = 'btn-save';
    saveBtn.innerHTML = '<i class="fas fa-save"></i> <span>Guardar Cambios</span>';
  }
}

// Exponer para uso en HTML
window.markAsChanged = markAsChanged;

async function saveAIConfig() {
  const saveBtn = document.getElementById('saveChangesBtn');
  
  try {
    // Validaciones
    const aiName = document.getElementById('aiName').value.trim();
    const aiPersonality = document.getElementById('aiPersonality').value;
    const aiTone = document.getElementById('aiTone').value;
    const aiLanguage = document.getElementById('aiLanguage').value;
    const aiGreeting = document.getElementById('aiGreeting').value.trim();

    if (!aiName || !aiPersonality || !aiTone || !aiLanguage || !aiGreeting) {
      showToast('warning', 'Campos requeridos', '👋 Ey! Completá todos los campos de Identidad del Asistente');
      return false;
    }

    const sinPrecio = document.getElementById('sinPrecio').value;
    const sinStock = document.getElementById('sinStock').value;
    const localCerrado = document.getElementById('localCerrado').value;
    const proactividad = document.getElementById('proactividad').value;
    const formatoRespuestas = document.getElementById('formatoRespuestas').value;

    if (!sinPrecio || !sinStock || !localCerrado || !proactividad || !formatoRespuestas) {
      showToast('warning', 'Campos requeridos', '👋 Ey! Completá todos los campos de Comportamientos');
      return false;
    }

    if (saveBtn) {
      saveBtn.className = 'btn-save saving';
      saveBtn.innerHTML = '<i class="fas fa-spinner"></i> <span>Guardando...</span>';
      saveBtn.disabled = true;
    }

    showLoading('Guardando configuración de IA...');

    // Obtener categorías destacadas
    const categoriasDestacadas = Array.from(
      document.querySelectorAll('input[name="categoriaDestacada"]:checked')
    ).map(cb => cb.value);

    // Construir objeto de configuración
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
      mensajeWhatsapp: document.getElementById('mensajeWhatsapp').value.trim(),
      mensajeInstagram: document.getElementById('mensajeInstagram').value.trim(),
      mensajeWeb: document.getElementById('mensajeWeb').value.trim(),
      mensajeDefault: document.getElementById('mensajeDefault').value.trim(),
      
      // Productos destacados
      categoriasDestacadas,
      
      // Metadata
      fechaActualizacion: new Date(),
      aiGenerated: true
    };

    // Guardar en Firestore
    const comercioRef = doc(db, 'comercios', currentComercioId);
    await updateDoc(comercioRef, {
      aiConfig,
      fechaActualizacion: new Date()
    });

    console.log('✅ Configuración IA guardada en Firestore');

    // Actualizar JSON en Gist
    try {
      await updateCommerceJSON(currentComercioId, currentUser.uid);
      console.log('✅ JSON actualizado en Gist');
    } catch (jsonError) {
      console.warn('⚠️ Error actualizando JSON:', jsonError);
      showToast('warning', 'Advertencia', 'Configuración guardada pero JSON no actualizado');
    }

    // Estado local
    comercioData.aiConfig = aiConfig;
    originalAIConfig = JSON.parse(JSON.stringify(aiConfig));
    hasUnsavedChanges = false;

    // UI feedback
    if (saveBtn) {
      saveBtn.className = 'btn-save saved';
      saveBtn.innerHTML = '<i class="fas fa-check-circle"></i> <span>Guardado ✓</span>';
      setTimeout(() => {
        saveBtn.disabled = true;
        saveBtn.className = 'btn-save';
        saveBtn.innerHTML = '<i class="fas fa-save"></i> <span>Guardar Cambios</span>';
      }, 2000);
    }

    Navigation.markPageAsCompleted('mi-ia');
    Navigation.updateProgressBar();

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
    
    showToast('error', 'Error', 'No se pudo guardar la configuración: ' + error.message);
    return false;
  }
}

async function handleLogout() {
  if (confirm('¿Estás seguro que deseas cerrar sesión?')) {
    try {
      showLoading('Cerrando sesión...');
      await signOut(auth);
      window.location.href = '/index.html';
    } catch (error) {
      hideLoading();
      showToast('error', 'Error', 'No se pudo cerrar sesión');
    }
  }
}
    return;
  }

  const aiConfig = comercioData.aiConfig || {};
  const destacados = aiConfig.categoriasDestacadas || [];

  // Renderizar checkboxes de categorías
  if (categorias.length > 0) {
    content.innerHTML = `
      <div class="form-field">
        <label>
          Elegí las categorías que querés priorizar
          <span class="tooltip-icon" title="El asistente mencionará estos productos con mayor frecuencia">
            <i class="fas fa-question-circle"></i>
          </span>
        </label>
        <div style="display: grid; gap: 0.5rem; margin-top: 0.5rem;">
          ${categorias.map(cat => `
            <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer;">
              <input 
                type="checkbox" 
                name="categoriaDestacada" 
                value="${cat}"
                ${destacados.includes(cat) ? 'checked' : ''}
                onchange="markAsChanged()"
              >
              <span>⭐ ${cat}</span>
            </label>
          `).join('')}
        </div>
        <small>El asistente sugerirá estos productos cuando sea relevante</small>
      </div>
    `;
  } else {
    content.innerHTML = `
      <p style="text-align: center; color: #6b7280; padding: 2rem;">
        <i class="fas fa-tag" style="font-size: 2rem; display: block; margin-bottom: 1rem; opacity: 0.3;"></i>
        Tus productos no tienen categorías asignadas.<br>
        Agregá categorías en la sección <strong>Productos</strong> para poder destacarlas.
      </p>
    `;
  }
}

// ==================== VALIDACIÓN DE CONTACTOS ====================
function renderContactosValidacion() {
  const container = document.getElementById('contactosValidacion');
  
  const contactos = [
    { 
      id: 'whatsapp', 
      icon: '📱', 
      label: 'WhatsApp', 
      value: comercioData.whatsapp,
      valid: !!comercioData.whatsapp && comercioData.whatsapp.trim() !== ''
    },
    { 
      id: 'instagram', 
      icon: '📸', 
      label: 'Instagram', 
      value: comercioData.instagram,
      valid: !!comercioData.instagram && comercioData.instagram.trim() !== ''
    },
    { 
      id: 'sitioWeb', 
      icon: '🌐', 
      label: 'Sitio Web', 
      value: comercioData.sitioWeb,
      valid: !!comercioData.sitioWeb && comercioData.sitioWeb.trim() !== ''
    },
    { 
      id: 'email', 
      icon: '📧', 
      label: 'Email', 
      value: comercioData.email,
      valid: !!comercioData.email && comercioData.email.trim() !== ''
    },
    { 
      id: 'telefono', 
      icon: '☎️', 
      label: 'Teléfono', 
      value: comercioData.telefono,
      valid: !!comercioData.telefono && comercioData.telefono.trim() !== ''
    }
  ];

  const hasInvalidContacts = contactos.some(c => !c.valid);

  container.innerHTML = `
    ${hasInvalidContacts ? `
      <div class="alert alert-warning" style="grid-column: 1/-1;">
        <i class="fas fa-exclamation-triangle"></i>
        <strong>Algunos contactos no están configurados.</strong> 
        El asistente no podrá derivar a esos canales.
      </div>
    ` : ''}
    
    ${contactos.map(contacto => `
      <div class="contacto-item ${contacto.valid ? 'valid' : 'invalid'}">
        <div class="contacto-icon">${contacto.icon}</div>
        <div class="contacto-info">
          <strong>${contacto.label}</strong>
          ${contacto.valid 
            ? `<span class="contacto-value">${contacto.value}</span>`
            : `<span class="contacto-missing">No configurado</span>`
          }
        </div>
        <div class="contacto-status">
          ${contacto.valid 
            ? '<i class="fas fa-check-circle" style="color: #10b981;"></i>'
            : '<i class="fas fa-times-circle" style="color: #ef4444;"></i>'
          }
        </div>
      </div>
    `).join('')}
  `;
