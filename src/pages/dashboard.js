// src/pages/dashboard.js
import { auth, db } from '../firebase.js';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';
import { showLoading, hideLoading, showToast } from '../shared/utils.js';
import { PLANS, calcularEstadoPlan, getDiasRestantesTrial } from '../shared/plans.js';

// ==================== VARIABLES GLOBALES ====================
let currentUser = null;
let currentComercioId = null;
let comercioData = {};
let productos = [];

// ==================== VALIDACIÓN DE CONFIGURACIÓN COMPLETA ====================
async function validateCompleteSetup(comercioId) {
  try {
    const comercioRef = doc(db, 'comercios', comercioId);
    const comercioSnap = await getDoc(comercioRef);
    
    if (!comercioSnap.exists()) {
      return { isComplete: false, nextPage: 'mi-comercio.html', message: 'No se encontró el comercio' };
    }
    
    const data = comercioSnap.data();
    
    // 1. Validar Mi Comercio
    if (!data.nombreComercio || !data.ciudad || !data.telefono) {
      return { isComplete: false, nextPage: 'mi-comercio.html', message: 'Completa los datos de tu comercio' };
    }
    
    // 2. Validar Horarios
    if (!data.horarios || Object.keys(data.horarios).length === 0) {
      return { isComplete: false, nextPage: 'horarios.html', message: 'Configura tus horarios de atención' };
    }
    
    // 3. Validar Productos (mínimo 1)
    const productosRef = collection(db, 'comercios', comercioId, 'productos');
    const productosSnap = await getDocs(productosRef);
    
    if (productosSnap.empty) {
      return { isComplete: false, nextPage: 'productos.html', message: 'Agrega al menos un producto' };
    }
    
    // 4. Validar IA Config
    if (!data.aiConfig || !data.aiConfig.aiGenerated) {
      return { isComplete: false, nextPage: 'mi-ia.html', message: 'Configura tu asistente IA' };
    }
    
    // ✅ TODO COMPLETO
    return { isComplete: true };
    
  } catch (error) {
    console.error('Error validando configuración:', error);
    return { isComplete: false, nextPage: 'mi-comercio.html', message: 'Error al validar configuración' };
  }
}

// ==================== OBTENER USUARIO ACTUAL ====================
function getCurrentUser() {
  return new Promise((resolve, reject) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();
      if (user) {
        resolve(user);
      } else {
        reject(new Error('No hay usuario autenticado'));
      }
    });
  });
}

// ==================== CARGAR DATOS DEL COMERCIO ====================
async function loadComercioData() {
  try {
    // Primero obtener el comercioId del usuario
    const userRef = doc(db, 'usuarios', currentUser.uid);
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists()) {
      throw new Error('Usuario no encontrado');
    }
    
    currentComercioId = userSnap.data().comercioId;
    
    if (!currentComercioId) {
      throw new Error('Usuario sin comercio asignado');
    }
    
    // Cargar datos del comercio
    const comercioRef = doc(db, 'comercios', currentComercioId);
    const comercioSnap = await getDoc(comercioRef);
    
    if (!comercioSnap.exists()) {
      throw new Error('Comercio no encontrado');
    }
    
    comercioData = { id: currentComercioId, ...comercioSnap.data() };
    
    // Actualizar header
    updateHeader();
    updateSubscriptionBanner();
    
  } catch (error) {
    console.error('Error cargando datos del comercio:', error);
    throw error;
  }
}

// ==================== CARGAR PRODUCTOS ====================
async function loadProductos() {
  try {
    const productosRef = collection(db, 'comercios', currentComercioId, 'productos');
    const productosSnap = await getDocs(productosRef);
    
    productos = productosSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
  } catch (error) {
    console.error('Error cargando productos:', error);
    productos = [];
  }
}

// ==================== ACTUALIZAR HEADER ====================
function updateHeader() {
  const commerceNameEl = document.getElementById('commerceName');
  const planBadgeEl = document.getElementById('planBadge');
  
  if (commerceNameEl) {
    commerceNameEl.textContent = comercioData.nombreComercio || 'Sin nombre';
  }
  
  if (planBadgeEl) {
    const planName = PLANS[comercioData.plan || 'trial']?.nombre || 'Trial';
    planBadgeEl.textContent = planName;
  }
}

// ==================== ACTUALIZAR BANNER DE SUSCRIPCIÓN ====================
function updateSubscriptionBanner() {
  const banner = document.getElementById('subscriptionBanner');
  const message = document.getElementById('subscriptionMessage');
  
  if (!banner || !message) return;
  
  const estado = calcularEstadoPlan(comercioData);
  const plan = PLANS[comercioData.plan || 'trial'];
  
  // Limpiar clases
  banner.className = 'subscription-banner';
  
  if (estado === 'trial') {
    const diasRestantes = getDiasRestantesTrial(comercioData);
    banner.classList.add('trial');
    message.innerHTML = `
      <strong>${plan.emoji} Plan ${plan.nombre}</strong> - 
      Te quedan ${diasRestantes} días de prueba gratuita
    `;
  } else if (estado === 'expirado') {
    banner.classList.add('expired');
    message.innerHTML = `
      <strong>⚠️ Plan expirado</strong> - 
      Renueva tu suscripción para seguir usando el servicio
    `;
  } else if (estado === 'activo') {
    banner.classList.add('active');
    message.innerHTML = `
      <strong>${plan.emoji} Plan ${plan.nombre}</strong> - 
      Suscripción activa
    `;
  } else {
    banner.classList.add('trial');
    message.textContent = 'Estado de suscripción desconocido';
  }
}

// ==================== RENDERIZAR SECCIÓN DEL ASISTENTE ====================
function renderAsistenteSection() {
  const container = document.getElementById('aiStatusSection');
  if (!container) return;
  
  const isAIConfigured = comercioData.aiConfig && comercioData.aiConfig.aiGenerated;
  
  if (!isAIConfigured) {
    container.innerHTML = `
      <div class="ai-status-card">
        <div class="ai-status-header">
          <i class="fas fa-exclamation-triangle"></i>
          <h3>Asistente no configurado</h3>
        </div>
        <p>Primero debes configurar tu asistente IA para poder compartirlo.</p>
        <button class="btn-config" onclick="window.location.href='./mi-ia.html'">
          <i class="fas fa-robot"></i>
          Configurar ahora
        </button>
      </div>
    `;
    return;
  }
  
  const aiConfig = comercioData.aiConfig;
  
  container.innerHTML = `
    <div class="ai-status-card">
      <div class="ai-status-header">
        <i class="fas fa-check-circle"></i>
        <h3>Tu Asistente Virtual está ACTIVO</h3>
      </div>
      
      <div class="ai-info">
        <span><i class="fas fa-robot"></i> ${aiConfig.aiName || 'Asistente'}</span>
        <span><i class="fas fa-comment-dots"></i> ${aiConfig.aiPersonality || 'Amigable'}</span>
        <span><i class="fas fa-globe"></i> Español (Argentina)</span>
      </div>
      
      <div class="ai-link-container">
        <h4><i class="fas fa-link"></i> Link para compartir tu asistente:</h4>
        
        <div class="link-placeholder">
          <i class="fas fa-info-circle"></i>
          <p>
            <strong>El link de tu asistente se generará automáticamente</strong><br>
            una vez que conectemos con las APIs de Claude/ChatGPT.
          </p>
          <p class="small-text">
            Por ahora, tu configuración está guardada y lista para usar.
          </p>
        </div>
        
        <!-- ESTE BLOQUE SE ACTIVARÁ CUANDO IMPLEMENTES LAS APIS -->
        <!-- 
        <div class="link-display" id="aiLinkDisplay">
          ${window.location.origin}/app?user=${currentUser.uid}
        </div>
        <div class="link-actions">
          <button onclick="copyLinkToClipboard()">
            <i class="fas fa-copy"></i> Copiar link
          </button>
          <button onclick="shareLinkWhatsApp()">
            <i class="fab fa-whatsapp"></i> Compartir por WhatsApp
          </button>
        </div>
        -->
      </div>
      
      <button class="btn-config" onclick="window.location.href='./mi-ia.html'">
        <i class="fas fa-cog"></i> Configurar asistente
      </button>
    </div>
  `;
}

// ==================== RENDERIZAR GRID DE RESUMEN ====================
function renderSummaryCards() {
  const container = document.getElementById('summaryGrid');
  if (!container) return;
  
  // Card 1: Mi Comercio
  const contactos = [
    comercioData.whatsapp ? '✓ WhatsApp' : '✗ WhatsApp',
    comercioData.instagram ? '✓ Instagram' : '✗ Instagram',
    comercioData.facebook ? '✓ Facebook' : '✗ Facebook',
    comercioData.website ? '✓ Sitio web' : '✗ Sitio web'
  ];
  
  // Card 2: Horarios
  const horarios = comercioData.horarios || {};
  const diasAbiertos = Object.keys(horarios).filter(dia => horarios[dia].abierto).length;
  const primerDia = Object.keys(horarios)[0];
  const horarioEjemplo = horarios[primerDia]?.horarios?.[0] || 'No configurado';
  
  // Card 3: Productos
  const totalProductos = productos.length;
  const categorias = [...new Set(productos.map(p => p.categoria).filter(Boolean))];
  const productosDestacados = productos.filter(p => p.destacado).length;
  
  // Card 4: Config IA
  const aiConfig = comercioData.aiConfig || {};
  
  container.innerHTML = `
    <!-- Card: Mi Comercio -->
    <div class="summary-card">
      <div class="summary-card-header">
        <div class="summary-card-title">
          <i class="fas fa-store"></i>
          <h4>Mi Comercio</h4>
        </div>
      </div>
      <div class="summary-data">
        <div class="summary-data-item">
          <i class="fas fa-check-circle"></i>
          <span><strong>Nombre:</strong> ${comercioData.nombreComercio || 'Sin nombre'}</span>
        </div>
        <div class="summary-data-item">
          <i class="fas fa-map-marker-alt"></i>
          <span><strong>Ubicación:</strong> ${comercioData.ciudad || 'Sin ciudad'}, ${comercioData.provincia || ''}</span>
        </div>
        <div class="summary-data-item">
          <i class="fas fa-phone"></i>
          <span><strong>Contactos:</strong><br>${contactos.join('<br>')}</span>
        </div>
      </div>
      <button class="btn-edit" onclick="window.location.href='./mi-comercio.html'">
        <i class="fas fa-edit"></i> Editar
      </button>
    </div>

    <!-- Card: Horarios -->
    <div class="summary-card">
      <div class="summary-card-header">
        <div class="summary-card-title">
          <i class="fas fa-clock"></i>
          <h4>Horarios</h4>
        </div>
      </div>
      <div class="summary-data">
        <div class="summary-data-item">
          <i class="fas fa-calendar-check"></i>
          <span><strong>Días abiertos:</strong> ${diasAbiertos} de 7</span>
        </div>
        <div class="summary-data-item">
          <i class="fas fa-clock"></i>
          <span><strong>Ejemplo:</strong> ${horarioEjemplo}</span>
        </div>
        <div class="summary-data-item">
          <i class="fas fa-info-circle"></i>
          <span>Horarios configurados para toda la semana</span>
        </div>
      </div>
      <button class="btn-edit" onclick="window.location.href='./horarios.html'">
        <i class="fas fa-edit"></i> Editar
      </button>
    </div>

    <!-- Card: Productos -->
    <div class="summary-card">
      <div class="summary-card-header">
        <div class="summary-card-title">
          <i class="fas fa-boxes"></i>
          <h4>Productos</h4>
        </div>
      </div>
      <div class="summary-data">
        <div class="summary-data-item">
          <i class="fas fa-check-circle"></i>
          <span><strong>Total:</strong> ${totalProductos} productos</span>
        </div>
        <div class="summary-data-item">
          <i class="fas fa-tags"></i>
          <span><strong>Categorías:</strong> ${categorias.length}</span>
        </div>
        <div class="summary-data-item">
          <i class="fas fa-star"></i>
          <span><strong>Destacados:</strong> ${productosDestacados}</span>
        </div>
      </div>
      <button class="btn-edit" onclick="window.location.href='./productos.html'">
        <i class="fas fa-box-open"></i> Gestionar
      </button>
    </div>

    <!-- Card: Config IA -->
    <div class="summary-card">
      <div class="summary-card-header">
        <div class="summary-card-title">
          <i class="fas fa-robot"></i>
          <h4>Configuración IA</h4>
        </div>
      </div>
      <div class="summary-data">
        <div class="summary-data-item">
          <i class="fas fa-user"></i>
          <span><strong>Nombre:</strong> ${aiConfig.aiName || 'Sin configurar'}</span>
        </div>
        <div class="summary-data-item">
          <i class="fas fa-smile"></i>
          <span><strong>Personalidad:</strong> ${aiConfig.aiPersonality || 'Sin configurar'}</span>
        </div>
        <div class="summary-data-item">
          <i class="fas fa-volume-up"></i>
          <span><strong>Tono:</strong> ${aiConfig.aiTone || 'Sin configurar'}</span>
        </div>
      </div>
      <button class="btn-edit" onclick="window.location.href='./mi-ia.html'">
        <i class="fas fa-cog"></i> Ajustar
      </button>
    </div>
  `;
}

// ==================== FUNCIONES PARA COMPARTIR (PREPARADAS PARA APIS) ====================
window.copyLinkToClipboard = async function() {
  const link = `${window.location.origin}/app?user=${currentUser.uid}`;
  
  try {
    await navigator.clipboard.writeText(link);
    showToast('¡Copiado!', 'Link copiado al portapapeles', 'success');
  } catch (err) {
    // Fallback para navegadores sin clipboard API
    const input = document.createElement('input');
    input.value = link;
    document.body.appendChild(input);
    input.select();
    document.execCommand('copy');
    document.body.removeChild(input);
    showToast('¡Copiado!', 'Link copiado al portapapeles', 'success');
  }
};

window.shareLinkWhatsApp = function() {
  const link = `${window.location.origin}/app?user=${currentUser.uid}`;
  const message = encodeURIComponent(`¡Hola! Te comparto mi asistente virtual: ${link}`);
  window.open(`https://wa.me/?text=${message}`, '_blank');
};

// ==================== LOGOUT ====================
function setupLogout() {
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      try {
        await signOut(auth);
        window.location.href = '/';
      } catch (error) {
        console.error('Error al cerrar sesión:', error);
        showToast('Error', 'No se pudo cerrar sesión', 'error');
      }
    });
  }
}

// ==================== INICIALIZACIÓN ====================
async function initializePage() {
  showLoading('Cargando dashboard...');
  
  try {
    // 1. Obtener usuario autenticado
    currentUser = await getCurrentUser();
    
    // 2. Cargar datos del comercio
    await loadComercioData();
    
    // 3. Validar configuración completa
    const validation = await validateCompleteSetup(currentComercioId);
    
    if (!validation.isComplete) {
      // Si NO está completo, redirigir a la página que falta
      showToast('Configuración incompleta', validation.message, 'warning');
      setTimeout(() => {
        window.location.href = `./${validation.nextPage}`;
      }, 2000);
      return;
    }
    
    // 4. Cargar productos
    await loadProductos();
    
    // 5. Renderizar todas las secciones
    renderAsistenteSection();
    renderSummaryCards();
    
    // 6. Setup logout
    setupLogout();
    
    console.log('✅ Dashboard cargado correctamente');
    
  } catch (error) {
    console.error('❌ Error inicializando dashboard:', error);
    showToast('Error', 'No se pudo cargar el dashboard', 'error');
    
    // Si hay error crítico, redirigir a mi-comercio
    setTimeout(() => {
      window.location.href = './mi-comercio.html';
    }, 2000);
    
  } finally {
    hideLoading();
  }
}

// ==================== EJECUTAR AL CARGAR LA PÁGINA ====================
document.addEventListener('DOMContentLoaded', () => {
  initializePage();
});
