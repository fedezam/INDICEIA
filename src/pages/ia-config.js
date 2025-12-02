// ========================================
// ARCHIVO: src/pages/ia-config.js - PARTE 1/3
// Imports + Variables + Init + Auth
// ========================================

import '../styles/base.css';
import '../styles/layout.css';
import '../styles/components.css';
import '../styles/forms-premium-final.css';
import './ia-config.css';
import { auth, db } from '../firebase.js';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, collection, getDocs, updateDoc } from 'firebase/firestore';
import { renderLayout, updateHeaderInfo, updateSubscriptionBanner } from '../shared/layout.js';
import { initNavigation } from '../shared/navigation.js';
import { PLANS, calcularEstadoPlan, getDiasRestantesTrial } from '../shared/plans.js';
import { showToast, showLoading, hideLoading } from '../shared/utils.js';
import { runFlowController } from '../controllers/flowController.js';

// ==================== FORZAR SCROLL ARRIBA ====================
// Al cargar la página, forzar scroll arriba
window.addEventListener('load', function() {
  window.scrollTo(0, 0);
});

// También al recargar
window.addEventListener('beforeunload', function() {
  window.scrollTo(0, 0);
});

// Por si acaso, inmediatamente
if (history.scrollRestoration) {
  history.scrollRestoration = 'manual';
}
window.scrollTo(0, 0);

// ==================== VARIABLES GLOBALES ====================
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
  if (el) el.value = value ?? defaultValue;
}

function safeGet(id) {
  const el = $(id);
  return el ? el.value?.trim() || '' : '';
}

function getCurrentConfig() {
  return {
    aiName: safeGet('aiName'),
    aiLanguage: safeGet('aiLanguage'),
    aiPersonality: safeGet('aiPersonality'),
    aiTone: safeGet('aiTone'),
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
}

// ==================== BANNER HELPER ====================
function updateBanner() {
  const estado = calcularEstadoPlan(comercioData);
  const plan = PLANS[comercioData.plan || 'trial'];
  let html = '';
  
  switch (estado) {
    case 'trial':
      const dias = getDiasRestantesTrial(comercioData);
      html = `<strong>Trial activo</strong> - Te quedan <strong>${dias} días</strong> gratis`;
      break;
    case 'activo':
      html = `<strong>Plan ${plan.nombre} activo</strong> - Todo funcionando`;
      break;
    case 'expirado':
      html = `Trial expirado - Elegí un plan para continuar`;
      break;
    default:
      html = `Configurá tu asistente IA para activarlo`;
  }
  
  updateSubscriptionBanner(html, estado);
}

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
    showLoading('Cargando configuración de IA...');
    
    // Renderizar layout base
    renderLayout();
    
    // Obtener comercioId del usuario
    const userRef = doc(db, 'usuarios', currentUser.uid);
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists() || !userSnap.data().comercioId) {
      showToast('Error', 'No se encontró comercio. Completá primero "Mi comercio".', 'warning');
      hideLoading();
      return;
    }
    
    currentComercioId = userSnap.data().comercioId;
    
    // Cargar datos del comercio
    await loadComercioData();
    
    // Cargar productos
    await loadProducts();
    
    // Inicializar navegación
    initNavigation();
    
    // Actualizar header y banner
    updateHeaderInfo(comercioData.nombreComercio, PLANS[comercioData.plan || 'trial']);
    updateBanner();
    
    // Esperar un frame antes de manipular DOM
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    
    // Renderizar contenido de la página
    renderPageContent();
    
    // Cargar configuración de IA
    loadAIConfig();
    
    // Renderizar secciones específicas
    renderContactosValidacion();
    
    // Crear botones y eventos
    createSaveButton();
    setupEventListeners();
    
    // Insertar AI Helper Card
    insertAIHelperCard();
    
    // Validar formulario inicial
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
  } else {
    comercioData = { plan: 'trial', pais: 'Argentina' };
  }
}

async function loadProducts() {
  try {
    const snap = await getDocs(collection(db, 'comercios', currentComercioId, 'productos'));
    productos = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (error) {
    console.error('Error cargando productos:', error);
    productos = [];
  }
}

// ==================== RENDER CONTENIDO ====================
function renderPageContent() {
  const main = document.querySelector('main .container');
  if (!main) return;
  
  const html = `
    <div class="page-header">
      <h1><i class="fas fa-robot"></i> Configuración de IA</h1>
      <p>Personalizá cómo tu asistente inteligente interactúa con tus clientes</p>
    </div>

    <form id="iaConfigForm" class="ia-config-form">
      
      <!-- SECCIÓN 1: PERSONALIDAD DEL ASISTENTE -->
      <section class="config-section">
        <div class="section-header">
          <h3><i class="fas fa-user-robot"></i> Personalidad del asistente</h3>
          <p>Define cómo se presenta y comunica tu IA</p>
        </div>
        
        <div class="form-fields">
          <div class="form-field">
            <label for="aiName">Nombre del asistente*</label>
            <input type="text" id="aiName" placeholder="Ej: Lucía, Juan, MiBot..." required>
            <small>El nombre que usará tu IA al presentarse</small>
          </div>
          
          <div class="form-field">
            <label for="aiLanguage">Idioma*</label>
            <select id="aiLanguage" required>
              <option value="es-AR">Español (Argentina)</option>
              <option value="es-ES">Español (España)</option>
              <option value="es-MX">Español (México)</option>
              <option value="en-US">English (US)</option>
              <option value="pt-BR">Português (Brasil)</option>
            </select>
          </div>
        </div>

        <div class="form-fields">
          <div class="form-field full-width">
            <label for="aiPersonality">Personalidad*</label>
            <select id="aiPersonality" required>
              <option value="">Seleccioná una personalidad...</option>
              <option value="amigable">Amigable y cercano</option>
              <option value="profesional">Profesional y formal</option>
              <option value="casual">Casual y relajado</option>
              <option value="entusiasta">Entusiasta y energético</option>
              <option value="servicial">Servicial y atento</option>
            </select>
            <small>Define el estilo de comunicación general</small>
          </div>
        </div>

        <div class="form-fields">
          <div class="form-field full-width">
            <label for="aiTone">Tono de comunicación*</label>
            <select id="aiTone" required>
              <option value="">Seleccioná un tono...</option>
              <option value="formal">Formal (usted)</option>
              <option value="informal">Informal (vos/tú)</option>
              <option value="mixto">Mixto (adapta según contexto)</option>
            </select>
          </div>
        </div>

        <div class="form-fields">
          <div class="form-field full-width">
            <label for="aiGreeting">Saludo inicial*</label>
            <textarea id="aiGreeting" rows="3" placeholder="Ej: ¡Hola! Soy Lucía, tu asistente virtual. ¿En qué puedo ayudarte hoy?" required></textarea>
            <small>El primer mensaje que verán tus clientes</small>
          </div>
        </div>
      </section>

      <!-- SECCIÓN 2: COMPORTAMIENTOS ESPECIALES -->
      <section class="config-section">
        <div class="section-header">
          <h3><i class="fas fa-cog"></i> Comportamientos especiales</h3>
          <p>Define cómo responde tu IA ante situaciones específicas</p>
        </div>

        <div class="form-fields">
          <div class="form-field">
            <label for="sinPrecio">Si un producto no tiene precio*</label>
            <select id="sinPrecio" required>
              <option value="">Seleccioná una opción...</option>
              <option value="whatsapp">Redirigir a WhatsApp</option>
              <option value="instagram">Redirigir a Instagram</option>
              <option value="email">Redirigir a Email</option>
              <option value="web">Redirigir al sitio web</option>
              <option value="telefono">Dar número de teléfono</option>
              <option value="no_mostrar">No mostrar el producto</option>
            </select>
          </div>

          <div class="form-field">
            <label for="sinStock">Si un producto no tiene stock*</label>
            <select id="sinStock" required>
              <option value="">Seleccioná una opción...</option>
              <option value="informar">Informar y ofrecer alternativas</option>
              <option value="consultar">Pedir que consulte disponibilidad</option>
              <option value="no_mostrar">No mostrar el producto</option>
              <option value="pedido">Permitir pedido (próxima reposición)</option>
            </select>
          </div>

          <div class="form-field">
            <label for="localCerrado">Cuando el local está cerrado*</label>
            <select id="localCerrado" required>
              <option value="">Seleccioná una opción...</option>
              <option value="informar">Informar horarios y permitir consultas</option>
              <option value="agenda">Agendar pedido para cuando abra</option>
              <option value="solo_info">Solo mostrar información, sin pedidos</option>
              <option value="derivar">Derivar a contacto directo</option>
            </select>
          </div>

          <div class="form-field">
            <label for="proactividad">Nivel de proactividad*</label>
            <select id="proactividad" required>
              <option value="">Seleccioná un nivel...</option>
              <option value="bajo">Bajo - Solo responde lo que le preguntan</option>
              <option value="medio">Medio - Sugiere productos relacionados</option>
              <option value="alto">Alto - Ofrece activamente promociones y destacados</option>
            </select>
          </div>

          <div class="form-field">
            <label for="formatoRespuestas">Formato de respuestas*</label>
            <select id="formatoRespuestas" required>
              <option value="">Seleccioná un formato...</option>
              <option value="cortas">Cortas y directas</option>
              <option value="detalladas">Detalladas y explicativas</option>
              <option value="listas">Con listas y puntos</option>
              <option value="conversacional">Conversacionales</option>
            </select>
          </div>
        </div>
      </section>

      <!-- SECCIÓN 3: MENSAJES PERSONALIZADOS POR CANAL -->
      <section class="config-section">
        <div class="section-header">
          <h3><i class="fas fa-comment-dots"></i> Mensajes personalizados por canal</h3>
          <p>Personalizá mensajes específicos para cada canal de comunicación (opcional)</p>
        </div>

        <div class="form-fields">
          <div class="form-field full-width">
            <label for="mensajeWhatsapp">Mensaje para WhatsApp</label>
            <textarea id="mensajeWhatsapp" rows="3" placeholder="Ej: ¡Hola! Te hablo desde [comercio]. ¿En qué te puedo ayudar?"></textarea>
            <small>Mensaje inicial cuando te contactan por WhatsApp</small>
          </div>

          <div class="form-field full-width">
            <label for="mensajeInstagram">Mensaje para Instagram</label>
            <textarea id="mensajeInstagram" rows="3" placeholder="Ej: ¡Gracias por escribirnos! ¿Qué producto te interesa?"></textarea>
            <small>Mensaje inicial para mensajes directos de Instagram</small>
          </div>

          <div class="form-field full-width">
            <label for="mensajeWeb">Mensaje para sitio web</label>
            <textarea id="mensajeWeb" rows="3" placeholder="Ej: Hola! Estoy aquí para ayudarte a encontrar lo que buscás."></textarea>
            <small>Mensaje inicial para chat del sitio web</small>
          </div>

          <div class="form-field full-width">
            <label for="mensajeDefault">Mensaje por defecto</label>
            <textarea id="mensajeDefault" rows="3" placeholder="Ej: ¡Hola! ¿Cómo puedo asistirte hoy?"></textarea>
            <small>Mensaje para canales no especificados</small>
          </div>
        </div>
      </section>

      <!-- SECCIÓN 4: PRODUCTOS DESTACADOS -->
      <section class="config-section">
        <div class="section-header">
          <h3><i class="fas fa-star"></i> Productos destacados <span id="destacadosCounter" class="counter">0/10</span></h3>
          <p>Seleccioná hasta 10 productos que tu IA recomendará proactivamente</p>
        </div>
        
        <div class="destacados-search">
          <div class="search-box">
            <i class="fas fa-search"></i>
            <input type="text" id="searchProductos" placeholder="Buscar productos por nombre o código...">
          </div>
          <div id="searchResults" class="search-results" style="display: none;"></div>
        </div>

        <div id="destacadosList" class="destacados-list">
          <div class="empty-state">
            <p>Aún no seleccionaste productos destacados</p>
            <small>Usá el buscador para agregar hasta 10</small>
          </div>
        </div>
      </section>

      <!-- SECCIÓN 5: CONTACTOS CONFIGURADOS -->
      <section class="config-section">
        <div class="section-header">
          <h3><i class="fas fa-address-book"></i> Contactos configurados</h3>
          <p>Verificá que tus canales de contacto estén completos en "Mi comercio"</p>
        </div>
        
        <div id="contactosValidacion"></div>
      </section>
    </form>
  `;
  
  main.innerHTML = html;
}


// ========================================
// ARCHIVO: src/pages/ia-config.js - PARTE 2/3
// Renders + Lógica de productos destacados
// ========================================

// ==================== AI CONFIG ====================
function loadAIConfig() {
  const config = comercioData.aiConfig || {};
  originalAIConfig = JSON.parse(JSON.stringify(config));

  // Cargar campos del formulario
  [
    'aiName', 'aiPersonality', 'aiTone', 'aiGreeting', 'sinPrecio', 'sinStock',
    'localCerrado', 'proactividad', 'formatoRespuestas', 'mensajeWhatsapp',
    'mensajeInstagram', 'mensajeWeb', 'mensajeDefault'
  ].forEach(id => safeSet(id, config[id]));

  safeSet('aiLanguage', config.aiLanguage || 'es-AR');

  // Cargar productos destacados
  const saved = Array.isArray(config.productosDestacados) ? config.productosDestacados : [];
  productosDestacados = saved
    .map(dest => {
      const p = productos.find(x => x.id === dest.id || x.codigo === dest.codigo);
      if (!p) return null;
      return {
        id: p.id,
        codigo: p.codigo || '',
        nombre: p.nombre || '',
        precio_final: Number(p.precio_final || 0)
      };
    })
    .filter(Boolean)
    .filter(p => p.nombre);

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
        <i class="fas fa-star" style="font-size: 3rem; color: #cbd5e0; margin-bottom: 1rem;"></i>
        <p>Aún no seleccionaste productos destacados</p>
        <small>Usá el buscador para agregar hasta 10 productos que tu IA recomendará</small>
      </div>`;
    return;
  }

  list.innerHTML = productosDestacados.map(p => {
    const precio = p.precio_final > 0 
      ? `$${p.precio_final.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` 
      : 'Sin precio';
    
    return `
      <div class="destacado-item">
        <div class="destacado-icon">
          <i class="fas fa-star"></i>
        </div>
        <div class="producto-info">
          <div class="producto-codigo">${p.codigo || 'SIN CÓDIGO'}</div>
          <div class="producto-nombre">${p.nombre}</div>
          <div class="producto-precio">${precio}</div>
        </div>
        <button type="button" class="btn btn-danger btn-sm btn-quitar" data-id="${p.id}">
          <i class="fas fa-times"></i> Quitar
        </button>
      </div>`;
  }).join('');

  // Event listeners para quitar
  list.querySelectorAll('.btn-quitar').forEach(btn => {
    btn.onclick = () => {
      const id = btn.dataset.id;
      const producto = productosDestacados.find(p => p.id === id);
      productosDestacados = productosDestacados.filter(x => x.id !== id);
      renderDestacados();
      markAsChanged();
      
      if (producto) {
        showToast('Producto quitado', `${producto.nombre} fue removido de destacados`, 'info');
      }
      
      // Actualizar resultados de búsqueda si hay
      const searchInput = $('searchProductos');
      if (searchInput?.value) {
        buscarProductos(searchInput.value);
      }
    };
  });
}

// ==================== BÚSQUEDA DE PRODUCTOS ====================
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
      const searchText = [
        p.nombre || '',
        p.codigo || '',
        p.descripcion || '',
        p.categoria || ''
      ].join(' ').toLowerCase();
      
      return searchText.includes(term);
    })
    .slice(0, 20);

  if (!results.length) {
    container.innerHTML = `
      <div class="search-empty">
        <i class="fas fa-search"></i>
        <p>No hay resultados para "${query}"</p>
      </div>`;
    container.style.display = 'block';
    return;
  }

  container.innerHTML = results.map(p => {
    const yaAgregado = productosDestacados.some(d => d.id === p.id);
    const limiteAlcanzado = productosDestacados.length >= 10;
    const disabled = yaAgregado || limiteAlcanzado;
    
    const precio = p.precio_final > 0 
      ? `$${Number(p.precio_final).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` 
      : 'Sin precio';
    
    let buttonHtml;
    if (yaAgregado) {
      buttonHtml = `
        <button type="button" class="btn btn-secondary btn-sm" disabled>
          <i class="fas fa-check"></i> Agregado
        </button>`;
    } else if (limiteAlcanzado) {
      buttonHtml = `
        <button type="button" class="btn btn-secondary btn-sm" disabled>
          <i class="fas fa-lock"></i> Límite
        </button>`;
    } else {
      buttonHtml = `
        <button type="button" class="btn btn-primary btn-sm btn-destacar" data-id="${p.id}">
          <i class="fas fa-plus"></i> Agregar
        </button>`;
    }
    
    return `
      <div class="search-result-item ${yaAgregado ? 'already-added' : ''}">
        <div class="producto-info-search">
          <div class="producto-header">
            <span class="producto-codigo">${p.codigo || 'SIN CÓDIGO'}</span>
            ${p.categoria ? `<span class="producto-categoria">${p.categoria}</span>` : ''}
          </div>
          <div class="producto-nombre">${p.nombre}</div>
          <div class="producto-precio">${precio}</div>
        </div>
        ${buttonHtml}
      </div>`;
  }).join('');

  container.style.display = 'block';
  
  // Event listeners para agregar
  container.querySelectorAll('.btn-destacar').forEach(btn => {
    btn.onclick = () => agregarDestacado(btn.dataset.id);
  });
}

function agregarDestacado(id) {
  if (productosDestacados.length >= 10) {
    showToast('Límite alcanzado', 'Solo podés tener hasta 10 productos destacados', 'warning');
    return;
  }
  
  const p = productos.find(x => x.id === id);
  
  if (!p) {
    showToast('Error', 'Producto no encontrado', 'error');
    return;
  }
  
  if (productosDestacados.some(x => x.id === id)) {
    showToast('Ya agregado', 'Este producto ya está en destacados', 'info');
    return;
  }

  productosDestacados.push({
    id: p.id,
    codigo: p.codigo || '',
    nombre: p.nombre || '',
    precio_final: Number(p.precio_final || 0)
  });

  renderDestacados();
  markAsChanged();
  showToast('Producto agregado', p.nombre, 'success');
  
  // Actualizar resultados de búsqueda
  const input = $('searchProductos');
  if (input?.value) {
    buscarProductos(input.value);
  }
}

// ==================== VALIDACIÓN DE CONTACTOS ====================
function renderContactosValidacion() {
  const container = $('contactosValidacion');
  if (!container) return;

  const contactos = [
    { key: 'whatsapp', icon: 'fa-whatsapp', label: 'WhatsApp', color: '#25D366' },
    { key: 'instagram', icon: 'fa-instagram', label: 'Instagram', color: '#E4405F' },
    { key: 'website', icon: 'fa-globe', label: 'Sitio Web', color: '#667eea' },
    { key: 'email', icon: 'fa-envelope', label: 'Email', color: '#3b82f6' },
    { key: 'telefono', icon: 'fa-phone', label: 'Teléfono', color: '#10b981' }
  ];

  const missing = contactos.filter(c => !comercioData[c.key]?.trim());
  
  let html = '';
  
  if (missing.length > 0) {
    html += `
      <div class="alert alert-warning">
        <i class="fas fa-exclamation-triangle"></i>
        <div>
          <strong>Faltan ${missing.length} contacto${missing.length > 1 ? 's' : ''}</strong>
          <p>Completá esta información en <a href="./mi-comercio.html">Mi Comercio</a> para que tu IA pueda redirigir clientes correctamente</p>
        </div>
      </div>`;
  }

  html += '<div class="contactos-grid">';
  
  contactos.forEach(c => {
    const valid = !!comercioData[c.key]?.trim();
    const value = comercioData[c.key] || 'No configurado';
    
    html += `
      <div class="contacto-item ${valid ? 'valid' : 'invalid'}">
        <div class="contacto-icon" style="background: ${valid ? c.color : '#e2e8f0'};">
          <i class="fab ${c.icon}" style="color: ${valid ? 'white' : '#94a3b8'};"></i>
        </div>
        <div class="contacto-info">
          <div class="contacto-label">${c.label}</div>
          <div class="contacto-value ${valid ? '' : 'missing'}">${value}</div>
        </div>
        <div class="contacto-status">
          ${valid 
            ? '<i class="fas fa-check-circle" style="color: #10b981;"></i>' 
            : '<i class="fas fa-times-circle" style="color: #ef4444;"></i>'}
        </div>
      </div>`;
  });
  
  html += '</div>';
  
  container.innerHTML = html;
}

// ==================== AI HELPER CARD ====================
function insertAIHelperCard() {
  const container = document.querySelector('main .container');
  if (!container || document.querySelector('.ai-helper-card')) return;
  
  const card = document.createElement('div');
  card.className = 'ai-helper-card';
  card.innerHTML = `
    <div class="ai-helper-icon">
      <i class="fas fa-robot"></i>
    </div>
    <div class="ai-helper-content">
      <h4>¡Estás a punto de activar tu IA!</h4>
      <p>Con esta configuración, tu asistente sabrá cómo hablar con tus clientes, qué productos ofrecer y cuándo actuar proactivamente.</p>
      <small>Cuanto más detallada sea tu configuración, mejor será la experiencia de tus clientes</small>
    </div>
  `;
  
  container.insertBefore(card, container.firstChild);
}

// ========================================
// ARCHIVO: src/pages/ia-config.js - PARTE 3/3
// Validación + Guardado + Event Listeners
// ========================================

// ==================== VALIDACIÓN GLOBAL Y HABILITAR BOTONES ====================
function markAsChanged() {
  hasUnsavedChanges = true;
  checkFormValidity();
}

function checkFormValidity() {
  const form = $('iaConfigForm');
  if (!form) return;

  const required = [
    'aiName', 'aiLanguage', 'aiPersonality', 'aiTone', 'aiGreeting',
    'sinPrecio', 'sinStock', 'localCerrado', 'proactividad', 'formatoRespuestas'
  ];

  // Verificar que todos los campos estén llenos
  const allFilled = required.every(id => {
    const el = $(id);
    return el && el.value.trim();
  });

  // Detectar cambios reales comparando con original
  const currentConfig = getCurrentConfig();
  const hasRealChanges = JSON.stringify(currentConfig) !== JSON.stringify(originalAIConfig);

  const btn = $('saveChangesBtn');
  if (!btn) return;

  // Habilitar botón solo si está todo lleno Y hay cambios reales
  if (!allFilled || !hasRealChanges) {
    btn.disabled = true;
    btn.classList.remove('ready', 'saving', 'saved');
    btn.classList.add('btn-save');
    btn.innerHTML = '<i class="fas fa-save"></i> <span>Guardar Cambios</span>';
  } else {
    btn.disabled = false;
    btn.classList.add('ready');
    btn.classList.remove('saving', 'saved');
    if (!btn.classList.contains('saving') && !btn.classList.contains('saved')) {
      btn.innerHTML = '<i class="fas fa-save"></i> <span>Guardar Cambios</span>';
    }
  }
}

// ==================== BOTÓN GUARDAR SUPERIOR ====================
function createSaveButton() {
  if ($('saveChangesBtn')) return;

  const userInfo = document.querySelector('.header .user-info');
  const logoutBtn = $('logoutBtn');
  
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
  btn.addEventListener('click', saveAIConfig);
}

// ==================== GUARDAR CONFIGURACIÓN ====================
async function saveAIConfig() {
  const btn = $('saveChangesBtn');
  const form = $('iaConfigForm');
  
  if (!form) {
    showToast('Error', 'Formulario no encontrado', 'error');
    return;
  }

  // Validar campos requeridos
  const required = [
    'aiName', 'aiLanguage', 'aiPersonality', 'aiTone', 'aiGreeting',
    'sinPrecio', 'sinStock', 'localCerrado', 'proactividad', 'formatoRespuestas'
  ];

  let missing = [];
  required.forEach(id => {
    const el = $(id);
    if (!el || !el.value.trim()) {
      missing.push(id);
    }
  });

  if (missing.length > 0) {
    showToast('Faltan datos', 'Completá todos los campos obligatorios (*)', 'warning');
    
    // Resaltar campos faltantes
    missing.forEach(id => {
      const el = $(id);
      if (el) {
        el.style.borderColor = '#ef4444';
        el.addEventListener('input', function resetBorder() {
          el.style.borderColor = '';
          el.removeEventListener('input', resetBorder);
        });
      }
    });
    
    checkFormValidity();
    return;
  }

  // Validación cruzada: si sinPrecio requiere un canal, verificar que exista
  const sinPrecio = safeGet('sinPrecio');
  const canalMap = {
    whatsapp: 'whatsapp',
    instagram: 'instagram',
    email: 'email',
    web: 'website',
    telefono: 'telefono'
  };
  
  const canalRequerido = canalMap[sinPrecio];
  if (canalRequerido && !comercioData[canalRequerido]?.trim()) {
    showToast(
      'Falta contacto',
      `Configuraste "Si no hay precio" como "${sinPrecio}", pero falta configurar ese contacto en "Mi Comercio"`,
      'warning'
    );
    checkFormValidity();
    return;
  }

  try {
    // Estados de botones: saving
    if (btn) {
      btn.classList.add('saving');
      btn.classList.remove('saved', 'ready');
      btn.disabled = true;
      btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> <span>Guardando...</span>';
    }

    // Construir objeto de configuración
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

    // Guardar en Firestore
    const comercioRef = doc(db, 'comercios', currentComercioId);
    await updateDoc(comercioRef, {
      aiConfig: config,
      'onboardingSteps.ia-config': true,
      fechaActualizacion: new Date()
    });

    console.log('✅ Configuración IA guardada correctamente');

    // Actualizar estado local
    hasUnsavedChanges = false;
    comercioData.aiConfig = config;
    originalAIConfig = JSON.parse(JSON.stringify(config));

    // Estados de botones: saved
    if (btn) {
      btn.classList.remove('saving');
      btn.classList.add('saved');
      btn.innerHTML = '<i class="fas fa-check"></i> <span>¡Guardado!</span>';
    }

    showToast('Éxito', 'Configuración de IA guardada correctamente', 'success');
    
    // Actualizar header
    updateHeaderInfo(comercioData.nombreComercio, PLANS[comercioData.plan]);

    // Volver a estado idle después de 2.5s
    setTimeout(() => {
      if (btn) {
        btn.classList.remove('saved', 'saving', 'ready');
        btn.classList.add('btn-save');
        btn.innerHTML = '<i class="fas fa-save"></i> <span>Guardar Cambios</span>';
        checkFormValidity(); // Reevaluar estado sin forzar disabled
      }
    }, 2500);

    // Ejecutar flow controller
    try {
      runFlowController(currentUser.uid);
    } catch (e) {
      console.warn('runFlowController falló tras guardar:', e);
    }

  } catch (err) {
    console.error('Error guardando configuración IA:', err);
    
    // Estados de botones: error
    if (btn) {
      btn.className = 'btn-save';
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-exclamation-triangle"></i> <span>Error</span>';
    }
    
    showToast('Error', 'No se pudo guardar: ' + err.message, 'error');
  } finally {
    checkFormValidity();
  }
}

// ==================== EVENT LISTENERS ====================
function setupEventListeners() {
  const form = $('iaConfigForm');
  if (form) {
    form.addEventListener('input', (e) => {
      // No marcar como cambiado si es el buscador de productos
      if (e.target.id !== 'searchProductos') {
        markAsChanged();
      }
    });
    
    form.addEventListener('change', (e) => {
      if (e.target.id !== 'searchProductos') {
        markAsChanged();
      }
    });
  }

  // Búsqueda de productos con debounce
  const searchInput = $('searchProductos');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        buscarProductos(e.target.value);
      }, 300);
    });

    // Cerrar resultados al hacer clic fuera
    document.addEventListener('click', (e) => {
      const searchResults = $('searchResults');
      if (searchResults && 
          !searchInput.contains(e.target) && 
          !searchResults.contains(e.target)) {
        searchResults.style.display = 'none';
      }
    });
  }

  // Cerrar búsqueda al hacer scroll
  window.addEventListener('scroll', () => {
    const results = $('searchResults');
    if (results) {
      results.style.display = 'none';
    }
  }, { passive: true });

  // Logout
  const logoutBtn = $('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', handleLogout);
  }

  // Advertencia al salir con cambios sin guardar
  window.addEventListener('beforeunload', (e) => {
    if (hasUnsavedChanges) {
      e.preventDefault();
      e.returnValue = 'Tenés cambios sin guardar. ¿Estás seguro de salir?';
    }
  });

  // Validar campos en tiempo real (quitar borde rojo al corregir)
  const requiredFields = [
    'aiName', 'aiLanguage', 'aiPersonality', 'aiTone', 'aiGreeting',
    'sinPrecio', 'sinStock', 'localCerrado', 'proactividad', 'formatoRespuestas'
  ];

  requiredFields.forEach(id => {
    const el = $(id);
    if (el) {
      el.addEventListener('blur', () => {
        if (!el.value.trim()) {
          el.style.borderColor = '#ef4444';
        } else {
          el.style.borderColor = '';
        }
      });
    }
  });
}

// ==================== LOGOUT ====================
async function handleLogout() {
  if (hasUnsavedChanges && !confirm('Tenés cambios sin guardar. ¿Salir de todas formas?')) {
    return;
  }

  try {
    showLoading('Cerrando sesión...');
    await signOut(auth);
    window.location.href = '/login.html';
  } catch (error) {
    hideLoading();
    console.error('Error al cerrar sesión:', error);
    showToast('Error', 'No se pudo cerrar sesión: ' + error.message, 'error');
  }
}

// ==================== VALIDACIÓN PARA NAVEGACIÓN ====================
window.validateCurrentPageData = async function () {
  if (hasUnsavedChanges) {
    showToast('Cambios sin guardar', 'Guardá antes de continuar', 'warning');
    return false;
  }

  const required = [
    'aiName', 'aiLanguage', 'aiPersonality', 'aiTone', 'aiGreeting',
    'sinPrecio', 'sinStock', 'localCerrado', 'proactividad', 'formatoRespuestas'
  ];

  const missing = required.filter(id => !safeGet(id));
  
  if (missing.length > 0) {
    showToast(
      'Configuración incompleta',
      'Completá todos los campos obligatorios antes de continuar',
      'warning'
    );
    return false;
  }

  return true;
};
