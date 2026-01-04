// src/pages/ia-config.js
// Onboarding Paso 5 – Configuración de IA (Normalizado y limpio)

import '../styles/base.css';
import '../styles/layout.css';
import '../styles/components.css';
import '../styles/forms-premium-final.css';
import './ia-config.css';

import { auth, db } from '../firebase.js';
import { doc, getDoc, collection, getDocs, updateDoc } from 'firebase/firestore';

import { renderLayout, updateHeaderInfo, updateSubscriptionBanner } from '../shared/layout.js';
import { initNavigation } from '../shared/navigation.js';
import { PLANS, calcularEstadoPlan, getDiasRestantesTrial } from '../shared/plans.js';
import { showToast, showLoading, hideLoading } from '../shared/utils.js';

import { bootFlow } from "../controllers/boot/flowBoot.js";
import { redirectAfterSave } from "../controllers/flowController.js";

bootFlow();

// ==================== FORZAR SCROLL ARRIBA ====================
window.addEventListener('load', () => window.scrollTo(0, 0));
if (history.scrollRestoration) history.scrollRestoration = 'manual';

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

// ==================== BANNER ====================
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
      html = `Configurá tu asistente IA para activarlo`;
  }

  updateSubscriptionBanner(html, estado);
}

// ==================== INICIALIZACIÓN ====================
// ✅ CORRECCIÓN: usar bootFlow() en lugar de onAuthStateChanged manual
bootFlow();

// ✅ Mantener la lógica de inicialización pero sin duplicar auth
auth.onAuthStateChanged(async (user) => {
  if (!user) {
    console.warn("No hay usuario autenticado");
    // flowController ya redirigió, no hacer nada más
    return;
  }

  currentUser = user;
  await initializePage();
});

// ==================== CARGA INICIAL ====================
async function initializePage() {
  try {
    showLoading('Cargando configuración de IA...');

    renderLayout();  // ← Header con logout global

    // ✅ CORRECCIÓN CRÍTICA: extraer comercioId correctamente
    const userRef = doc(db, 'usuarios', currentUser.uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists() || !userSnap.data().comercioId) {
      showToast('Error', 'No se encontró comercio. Completá primero "Mi comercio".', 'warning');
      hideLoading();
      return;
    }

    // ✅ CORRECCIÓN: extraer comercioId del usuario
    currentComercioId = userSnap.data().comercioId;

    await loadComercioData();
    await loadProducts();

    initNavigation();

    updateHeaderInfo(comercioData.nombreComercio || 'Mi Comercio', PLANS[comercioData.plan || 'trial']);
    updateBanner();

    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));

    renderPageContent();
    loadAIConfig();
    renderContactosValidacion();

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
      <!-- SECCIÓN 1: PERSONALIDAD -->
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

      <!-- SECCIÓN 2: COMPORTAMIENTOS -->
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

      <!-- SECCIÓN 3: MENSAJES PERSONALIZADOS -->
      <section class="config-section">
        <div class="section-header">
          <h3><i class="fas fa-comment-dots"></i> Mensajes personalizados por canal</h3>
          <p>Personalizá mensajes específicos para cada canal (opcional)</p>
        </div>

        <div class="form-fields">
          <div class="form-field full-width">
            <label for="mensajeWhatsapp">Mensaje para WhatsApp</label>
            <textarea id="mensajeWhatsapp" rows="3" placeholder="Ej: ¡Hola! Te hablo desde [comercio]. ¿En qué te puedo ayudar?"></textarea>
          </div>

          <div class="form-field full-width">
            <label for="mensajeInstagram">Mensaje para Instagram</label>
            <textarea id="mensajeInstagram" rows="3" placeholder="Ej: ¡Gracias por escribirnos! ¿Qué producto te interesa?"></textarea>
          </div>

          <div class="form-field full-width">
            <label for="mensajeWeb">Mensaje para sitio web</label>
            <textarea id="mensajeWeb" rows="3" placeholder="Ej: Hola! Estoy aquí para ayudarte a encontrar lo que buscás."></textarea>
          </div>

          <div class="form-field full-width">
            <label for="mensajeDefault">Mensaje por defecto</label>
            <textarea id="mensajeDefault" rows="3" placeholder="Ej: ¡Hola! ¿Cómo puedo asistirte hoy?"></textarea>
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

      <!-- SECCIÓN 5: CONTACTOS -->
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

// ==================== CARGA CONFIG IA ====================
function loadAIConfig() {
  const config = comercioData.aiConfig || {};
  originalAIConfig = JSON.parse(JSON.stringify(config));

  [
    'aiName', 'aiPersonality', 'aiTone', 'aiGreeting', 'sinPrecio', 'sinStock',
    'localCerrado', 'proactividad', 'formatoRespuestas', 'mensajeWhatsapp',
    'mensajeInstagram', 'mensajeWeb', 'mensajeDefault'
  ].forEach(id => safeSet(id, config[id]));

  safeSet('aiLanguage', config.aiLanguage || 'es-AR');

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
    .filter(Boolean);

  renderDestacados();
}

// ==================== DESTACADOS ====================
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
        <div class="destacado-icon"><i class="fas fa-star"></i></div>
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

  list.querySelectorAll('.btn-quitar').forEach(btn => {
    btn.onclick = () => {
      productosDestacados = productosDestacados.filter(x => x.id !== btn.dataset.id);
      renderDestacados();
      markAsChanged();

      const input = $('searchProductos');
      if (input?.value) buscarProductos(input.value);
    };
  });
}

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
      const text = [p.nombre, p.codigo, p.descripcion, p.categoria].join(' ').toLowerCase();
      return text.includes(term);
    })
    .slice(0, 20);

  if (!results.length) {
    container.innerHTML = `<div class="search-empty"><p>No hay resultados para "${query}"</p></div>`;
    container.style.display = 'block';
    return;
  }

  container.innerHTML = results.map(p => {
    const yaAgregado = productosDestacados.some(d => d.id === p.id);
    const limiteAlcanzado = productosDestacados.length >= 10;
    const disabled = yaAgregado || limiteAlcanzado;

    const precio = p.precio_final > 0 
      ? `$${Number(p.precio_final).toLocaleString('es-AR', { minimumFractionDigits: 2 })}` 
      : 'Sin precio';

    let buttonHtml = yaAgregado
      ? `<button class="btn btn-secondary btn-sm" disabled><i class="fas fa-check"></i> Agregado</button>`
      : limiteAlcanzado
      ? `<button class="btn btn-secondary btn-sm" disabled><i class="fas fa-lock"></i> Límite</button>`
      : `<button class="btn btn-primary btn-sm btn-destacar" data-id="${p.id}"><i class="fas fa-plus"></i> Agregar</button>`;

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
  if (!p) return;

  if (productosDestacados.some(x => x.id === id)) return;

  productosDestacados.push({
    id: p.id,
    codigo: p.codigo || '',
    nombre: p.nombre || '',
    precio_final: Number(p.precio_final || 0)
  });

  renderDestacados();
  markAsChanged();

  const input = $('searchProductos');
  if (input?.value) buscarProductos(input.value);
}

// ==================== CONTACTOS ====================
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
          <p>Completá esta información en <a href="/mi-comercio.html">Mi Comercio</a></p>
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
          ${valid ? '<i class="fas fa-check-circle" style="color: #10b981;"></i>' : '<i class="fas fa-times-circle" style="color: #ef4444;"></i>'}
        </div>
      </div>`;
  });
  html += '</div>';

  container.innerHTML = html;
}

// ==================== VALIDACIÓN ====================
function markAsChanged() {
  hasUnsavedChanges = true;
  checkFormValidity();
}

function checkFormValidity() {
  const required = [
    'aiName', 'aiLanguage', 'aiPersonality', 'aiTone', 'aiGreeting',
    'sinPrecio', 'sinStock', 'localCerrado', 'proactividad', 'formatoRespuestas'
  ];

  const allFilled = required.every(id => safeGet(id));
  const hasRealChanges = JSON.stringify(getCurrentConfig()) !== JSON.stringify(originalAIConfig);

  const btn = $('saveChangesBtn');
  if (!btn) return;

  if (!allFilled || !hasRealChanges) {
    btn.disabled = true;
    btn.classList.remove('ready');
  } else {
    btn.disabled = false;
    btn.classList.add('ready');
  }
}

// ==================== BOTÓN GUARDAR ====================
function createSaveButton() {
  if ($('saveChangesBtn')) return;

  const userInfo = document.querySelector('.header .user-info');
  const logoutBtn = $('logoutBtn');
  if (!userInfo || !logoutBtn) return;

  const btn = document.createElement('button');
  btn.id = 'saveChangesBtn';
  btn.className = 'btn-save';
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-save"></i> <span>Guardar Cambios</span>';

  userInfo.insertBefore(btn, logoutBtn);
  btn.addEventListener('click', saveAIConfig);
}

// ==================== EVENTOS ====================
function setupEventListeners() {
  const form = $('iaConfigForm');
  if (form) {
    form.addEventListener('input', (e) => {
      if (e.target.id !== 'searchProductos') markAsChanged();
    });
    form.addEventListener('change', (e) => {
      if (e.target.id !== 'searchProductos') markAsChanged();
    });
  }

  const searchInput = $('searchProductos');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => buscarProductos(e.target.value), 300);
    });

    document.addEventListener('click', (e) => {
      const results = $('searchResults');
      if (results && !searchInput.contains(e.target) && !results.contains(e.target)) {
        results.style.display = 'none';
      }
    });
  }

  window.addEventListener('scroll', () => {
    const results = $('searchResults');
    if (results) results.style.display = 'none';
  }, { passive: true });

  window.addEventListener('beforeunload', (e) => {
    if (hasUnsavedChanges) {
      e.preventDefault();
      e.returnValue = 'Tenés cambios sin guardar. ¿Estás seguro de salir?';
    }
  });
}

// ==================== GUARDAR ====================
async function saveAIConfig() {
  const btn = $('saveChangesBtn');

  const required = [
    'aiName', 'aiLanguage', 'aiPersonality', 'aiTone', 'aiGreeting',
    'sinPrecio', 'sinStock', 'localCerrado', 'proactividad', 'formatoRespuestas'
  ];

  const missing = required.filter(id => !safeGet(id));
  if (missing.length > 0) {
    showToast('Faltan datos', 'Completá todos los campos obligatorios (*)', 'warning');
    return;
  }

  const sinPrecio = safeGet('sinPrecio');
  const canalMap = { whatsapp: 'whatsapp', instagram: 'instagram', email: 'email', web: 'website', telefono: 'telefono' };
  const canalRequerido = canalMap[sinPrecio];
  if (canalRequerido && !comercioData[canalRequerido]?.trim()) {
    showToast('Falta contacto', `Configuraste redirección a ${sinPrecio}, pero falta ese contacto en "Mi Comercio"`, 'warning');
    return;
  }

  showLoading('Guardando configuración...');

  try {
    if (btn) {
      btn.classList.add('saving');
      btn.disabled = true;
      btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';
    }

    const config = getCurrentConfig();

    // ✅ CORRECCIÓN CRÍTICA: actualizar comercio con comercioId correcto
    await updateDoc(doc(db, 'comercios', currentComercioId), {
      aiConfig: config,
      'onboardingSteps.ia-config': true,
      fechaActualizacion: new Date()
    });

    hasUnsavedChanges = false;
    comercioData.aiConfig = config;
    originalAIConfig = JSON.parse(JSON.stringify(config));

    hideLoading();
    showToast('¡Configuración guardada!', 'Tu IA está lista', 'success');

    if (btn) {
      btn.classList.remove('saving');
      btn.classList.add('saved');
      btn.innerHTML = '<i class="fas fa-check"></i> ¡Guardado!';
      setTimeout(() => {
        btn.disabled = true;
        btn.className = 'btn-save';
        btn.innerHTML = '<i class="fas fa-save"></i> <span>Guardar Cambios</span>';
        checkFormValidity();
      }, 2500);
    }

    // ✅ CORRECCIÓN: sin parámetro porque es el último paso
    // flowController decide si va a dashboard (modo normal) o vuelve a dashboard (modo edición)
    setTimeout(() => {
      redirectAfterSave(); // ← Sin parámetro: último paso del onboarding
    }, 500);
  } catch (err) {
    console.error(err);
    hideLoading();
    showToast('Error', 'No se pudo guardar: ' + err.message, 'error');
    if (btn) {
      btn.className = 'btn-save';
      btn.disabled = false;
    }
  }
}

// ==================== AI HELPER CARD ====================
function insertAIHelperCard() {
  const container = document.querySelector('main .container');
  if (!container || document.querySelector('.ai-helper-card')) return;

  const card = document.createElement('div');
  card.className = 'ai-helper-card';
  card.innerHTML = `
    <div class="ai-helper-icon"><i class="fas fa-robot"></i></div>
    <div class="ai-helper-content">
      <h4>¡Estás a punto de activar tu IA!</h4>
      <p>Con esta configuración, tu asistente sabrá cómo hablar con tus clientes, qué productos ofrecer y cuándo actuar proactivamente.</p>
      <small>Cuanto más detallada sea tu configuración, mejor será la experiencia de tus clientes</small>
    </div>
  `;

  container.insertBefore(card, container.firstChild);
}

// ==================== VALIDACIÓN NAVEGACIÓN ====================
window.validateCurrentPageData = async () => {
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
    showToast('Configuración incompleta', 'Completá todos los campos obligatorios', 'warning');
    return false;
  }

  return true;
};
