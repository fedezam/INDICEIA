```javascript
// src/pages/ia-config.js
import { auth, db } from '../firebase.js';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, collection, getDocs, updateDoc } from 'firebase/firestore';
import Navigation from '../shared/navigation.js';
import { showLoading, hideLoading, showToast } from '../shared/utils.js';
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
    console.warn(`Elemento no encontrado: ${id}`);
    return;
  }
  el.value = value ?? defaultValue;
};
const safeGet = (id) => {
  const el = $(id);
  if (!el) return '';
  
  // Si es select, devolver value directamente
  if (el.tagName === 'SELECT') {
    return el.value || '';
  }
  
  // Si es input/textarea, hacer trim
  const value = el.value || '';
  return value.trim();
};

// ==================== INIT ====================
document.addEventListener('DOMContentLoaded', () => {
  console.log('Iniciando ia-config.js (producción)');
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      currentUser = user;
      await initializePage();
    } else {
      window.location.href = '/index.html';
    }
  });
});

async function initializePage() {
  try {
    showLoading('Cargando configuración de IA...');
    const userDoc = await getDoc(doc(db, 'usuarios', currentUser.uid));
    if (!userDoc.exists() || !userDoc.data()?.comercioId) {
      hideLoading();
      window.location.href = './mi-comercio.html';
      return;
    }
    currentComercioId = userDoc.data().comercioId;
    const comercioDoc = await getDoc(doc(db, 'comercios', currentComercioId));
    comercioData = comercioDoc.exists() ? { id: currentComercioId, ...comercioDoc.data() } : { id: currentComercioId };
    await loadProducts();
    updateHeader();
    updateSubscriptionBanner();
    loadAIConfig();
    renderContactosValidacion();
    setupEventListeners();
    createSaveButton();
    try { Navigation.init(); } catch (e) { console.warn('Navigation.init falló:', e); }
    
    // Validación para navegación
    window.validateCurrentPageData = async () => {
      const requiredFields = [
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
      
      const emptyFields = [];
      
      for (const field of requiredFields) {
        const value = safeGet(field.id);
        const element = $(field.id);
        
        if (!value || value.trim() === '') {
          emptyFields.push(field.label);
          // Agregar clase de error
          if (element) {
            element.style.borderColor = '#ef4444';
            element.style.boxShadow = '0 0 0 3px rgba(239, 68, 68, 0.1)';
          }
        } else {
          // Quitar clase de error si estaba
          if (element) {
            element.style.borderColor = '';
            element.style.boxShadow = '';
          }
        }
      }
      
      if (emptyFields.length > 0) {
        showToast('warning', 'Campos incompletos', 
          `Faltan: ${emptyFields.slice(0, 3).join(', ')}${emptyFields.length > 3 ? '...' : ''}`);
        return false;
      }
      
      if (hasUnsavedChanges) { 
        showToast('warning', 'Cambios sin guardar', 'Guardá antes de continuar'); 
        return false; 
      }
      
      return true;
    };
    
    hideLoading();
  } catch (error) {
    hideLoading();
    console.error('Error inicializando:', error);
    showToast('error','Error','No se pudo cargar configuración: '+(error.message||error));
  }
}

// ==================== LOAD PRODUCTS ====================
async function loadProducts() {
  try {
    if (!currentComercioId) {
      productos = [];
      console.warn('No hay comercioId, productos = []');
      return;
    }
    const snapshot = await getDocs(collection(db, 'comercios', currentComercioId, 'productos'));
    productos = snapshot.docs.map(d => {
      const data = d.data();
      return {
        id: d.id,
        codigo: data.codigo || '',
        nombre: data.nombre || '',
        descripcion: data.descripcion || '',
        precio_final: Number(data.precio_final || 0),
        precio: Number(data.precio_final || 0),
      };
    });
    console.log('Productos cargados:', productos.length);
  } catch (error) {
    console.error('Error cargando productos:', error);
    productos = [];
  }
}

// ==================== HEADER Y SUSCRIPCIÓN ====================
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
      message.innerHTML = `<strong>Trial activo</strong> - Te quedan <strong>${getDiasRestantesTrial(comercioData)} días</strong>`;
      break;
    case 'expirado':
      banner.classList.add('expired');
      message.innerHTML = `<strong>Trial expirado</strong>`;
      break;
    case 'activo':
      banner.classList.add('active');
      message.innerHTML = `<strong>Plan ${planActual?.nombre} activo</strong>`;
      break;
    default:
      banner.classList.add('trial');
      message.innerHTML = `<strong>Configurá tu asistente IA</strong>`;
  }
}

// ==================== LOAD AI CONFIG ====================
function loadAIConfig() {
  const aiConfig = comercioData.aiConfig || {};
  originalAIConfig = JSON.parse(JSON.stringify(aiConfig));
  
  safeSet('aiName', (aiConfig.aiName || '').trim());
  safeSet('aiPersonality', (aiConfig.aiPersonality || '').trim());
  safeSet('aiTone', (aiConfig.aiTone || '').trim());
  safeSet('aiLanguage', aiConfig.aiLanguage || 'es-AR');
  safeSet('aiGreeting', (aiConfig.aiGreeting || '').trim());
  safeSet('sinPrecio', (aiConfig.sinPrecio || '').trim());
  safeSet('sinStock', (aiConfig.sinStock || '').trim());
  safeSet('localCerrado', (aiConfig.localCerrado || '').trim());
  safeSet('proactividad', (aiConfig.proactividad || '').trim());
  safeSet('formatoRespuestas', (aiConfig.formatoRespuestas || '').trim());
  safeSet('mensajeWhatsapp', (aiConfig.mensajeWhatsapp || '').trim());
  safeSet('mensajeInstagram', (aiConfig.mensajeInstagram || '').trim());
  safeSet('mensajeWeb', (aiConfig.mensajeWeb || '').trim());
  safeSet('mensajeDefault', (aiConfig.mensajeDefault || '').trim());

  const destacadosGuardados = Array.isArray(aiConfig.productosDestacados) ? aiConfig.productosDestacados : [];
  productosDestacados = destacadosGuardados.map((dest) => {
    const productoReal = productos.find((p) => p.id === dest.id) || productos.find((p) => p.codigo === dest.codigo);
    if (productoReal) {
      return {
        id: productoReal.id,
        codigo: productoReal.codigo || dest.codigo || '',
        nombre: productoReal.nombre || dest.nombre || '',
        descripcion: productoReal.descripcion || dest.descripcion || '',
        precio_final: productoReal.precio_final != null ? Number(productoReal.precio_final) : Number(dest.precio_final || 0),
        precio: productoReal.precio_final != null ? Number(productoReal.precio_final) : Number(dest.precio || 0),
      };
    }
    return {
      id: dest.id || null,
      codigo: dest.codigo || '',
      nombre: dest.nombre || '',
      descripcion: dest.descripcion || '',
      precio_final: Number(dest.precio_final || 0),
      precio: Number(dest.precio || 0),
    };
  });
  renderDestacados();
  console.log('IA Config cargada y sincronizada con productos reales:', productosDestacados);
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
        <p>Aún no seleccionaste productos destacados</p>
        <small>Usá el buscador arriba para agregar hasta 10 productos</small>
      </div>`;
    return;
  }
  list.innerHTML = productosDestacados
    .map((p) => {
      const precioNum = p.precio_final > 0 ? Number(p.precio_final) : p.precio > 0 ? Number(p.precio) : null;
      const precioStr = precioNum != null ? `$${precioNum.toLocaleString('es-AR', { minimumFractionDigits: 2 })}` : 'Sin precio';
      return `
        <div class="destacado-item">
          <div class="producto-info">
            <div class="producto-codigo">[${p.codigo || 'SIN CÓDIGO'}]</div>
            <div class="producto-nombre">${p.nombre || 'Sin nombre'}</div>
            <div class="producto-precio">${precioStr}</div>
          </div>
          <button class="btn-quitar" onclick="quitarDestacado('${p.id}')">
            Quitar
          </button>
        </div>
      `;
    })
    .join('');
}

// ==================== CONTACTOS ====================
function renderContactosValidacion() {
  const container = $('contactosValidacion');
  if (!container) return;
  const contactos = [
    { id:'whatsapp', icon:'WhatsApp', label:'WhatsApp', value:comercioData.whatsapp||'', valid:!!(comercioData.whatsapp?.trim()) },
    { id:'instagram', icon:'Instagram', label:'Instagram', value:comercioData.instagram||'', valid:!!(comercioData.instagram?.trim()) },
    { id:'sitioWeb', icon:'Sitio Web', label:'Sitio Web', value:comercioData.sitioWeb||'', valid:!!(comercioData.sitioWeb?.trim()) },
    { id:'email', icon:'Email', label:'Email', value:comercioData.email||'', valid:!!(comercioData.email?.trim()) },
    { id:'telefono', icon:'Teléfono', label:'Teléfono', value:comercioData.telefono||'', valid:!!(comercioData.telefono?.trim()) }
  ];
  const hasInvalid = contactos.some(c=>!c.valid);
  container.innerHTML = `
    ${hasInvalid?`<div class="alert alert-warning" style="grid-column:1/-1;"><strong>Algunos contactos no configurados.</strong></div>`:''}
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

// ==================== BÚSQUEDA DE PRODUCTOS ====================
function buscarProductos(query) {
  const resultadosContainer = $('searchResults');
  if (!resultadosContainer) return;
  const searchTerm = query.trim().toLowerCase();
  if (!searchTerm || searchTerm.length < 2) {
    resultadosContainer.innerHTML = '';
    resultadosContainer.style.display = 'none';
    return;
  }
  const resultados = productos
    .filter(p => {
      const nombre = (p.nombre || '').toLowerCase();
      const codigo = (p.codigo || '').toLowerCase();
      const descripcion = (p.descripcion || '').toLowerCase();
      return nombre.includes(searchTerm) || codigo.includes(searchTerm) || descripcion.includes(searchTerm);
    })
    .slice(0, 10);
  if (resultados.length === 0) {
    resultadosContainer.innerHTML = `<div class="search-result-item" style="text-align: center; color: #999; padding: 2rem;"><p>No se encontraron productos con "${query}"</p></div>`;
    resultadosContainer.style.display = 'block';
    return;
  }
  resultadosContainer.innerHTML = resultados.map(p => {
    const yaDestacado = productosDestacados.some(d => d.id === p.id);
    const disabled = yaDestacado || productosDestacados.length >= 10;
    const precioStr = p.precio_final > 0 ? `$${p.precio_final.toLocaleString('es-AR', { minimumFractionDigits: 2 })}` : 'Sin precio';
    return `
      <div class="search-result-item" style="display: flex; align-items: center; padding: 1rem; border-bottom: 1px solid #e5e7eb;">
        <div class="producto-info" style="flex: 1;">
          <div class="producto-codigo" style="font-size: 0.85rem; color: #6366f1; font-weight: 600;">[${p.codigo || 'SIN CÓDIGO'}]</div>
          <div class="producto-nombre" style="margin: 0.25rem 0; font-weight: 500;">${p.nombre || 'Sin nombre'}</div>
          <div class="producto-precio" style="font-size: 0.9rem; color: #6b7280;">${precioStr}</div>
        </div>
        <button
          class="btn-destacar"
          style="padding: 0.5rem 1rem; background: ${disabled ? '#e5e7eb' : '#10b981'}; color: white; border: none; border-radius: 6px; cursor: ${disabled ? 'not-allowed' : 'pointer'}; font-weight: 600; white-space: nowrap; margin-left: 1rem;"
          ${disabled ? 'disabled' : ''}
          onclick="agregarDestacado('${p.id}')"
        >
          ${yaDestacado ? 'Agregado' : '+ Agregar'}
        </button>
      </div>
    `;
  }).join('');
  resultadosContainer.style.display = 'block';
  resultadosContainer.style.maxHeight = '400px';
  resultadosContainer.style.overflowY = 'auto';
}

// ==================== AGREGAR/QUITAR DESTACADOS ====================
window.agregarDestacado = (productoId) => {
  if (productosDestacados.length >= 10) {
    showToast('warning', 'Límite alcanzado', 'Solo puedes tener 10 productos destacados');
    return;
  }
  const producto = productos.find(p => p.id === productoId);
  if (!producto) {
    showToast('error', 'Error', 'Producto no encontrado');
    return;
  }
  if (productosDestacados.some(p => p.id === productoId)) {
    showToast('info', 'Ya agregado', 'Este producto ya está en destacados');
    return;
  }
  productosDestacados.push(producto);
  renderDestacados();
  markAsChanged();
  const searchInput = $('searchProductos');
  if (searchInput && searchInput.value) buscarProductos(searchInput.value);
  showToast('success', 'Producto agregado', `${producto.nombre} agregado a destacados`);
};

window.quitarDestacado = (productoId) => {
  const index = productosDestacados.findIndex(p => p.id === productoId);
  if (index === -1) return;
  const producto = productosDestacados[index];
  productosDestacados.splice(index, 1);
  renderDestacados();
  markAsChanged();
  const searchInput = $('searchProductos');
  if (searchInput && searchInput.value) buscarProductos(searchInput.value);
  showToast('info', 'Producto quitado', `${producto.nombre} quitado de destacados`);
};

// ==================== EVENT LISTENERS ====================
function setupEventListeners() {
  $('openAssistant')?.addEventListener('click',()=>showToast('info','Asistente','Decile: "Soy de Indice IA"',8000));
  const searchInput = $('searchProductos');
  if (searchInput) {
    searchInput.addEventListener('input', e => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => buscarProductos(e.target.value), 300);
    });
  }
  document.querySelectorAll('input, select, textarea').forEach(input=>{
    if(input.id!=='searchProductos'){
      input.addEventListener('change',markAsChanged);
      input.addEventListener('input',markAsChanged);
    }
  });
  $('logoutBtn')?.addEventListener('click',handleLogout);
  window.addEventListener('beforeunload',e=>{
    if(hasUnsavedChanges){ e.preventDefault(); e.returnValue='Cambios sin guardar'; }
  });
}

// ==================== SAVE ====================
function createSaveButton() {
  const userInfo = document.querySelector('.header .user-info');
  if(!userInfo || $('saveChangesBtn')) return;
  const saveBtn = document.createElement('button');
  saveBtn.id='saveChangesBtn';
  saveBtn.className='btn-save';
  saveBtn.disabled=true;
  saveBtn.innerHTML='<span>Guardar</span>';
  const logoutBtn = $('logoutBtn');
  if(logoutBtn) userInfo.insertBefore(saveBtn,logoutBtn); else userInfo.appendChild(saveBtn);
  saveBtn.addEventListener('click',saveAIConfig);
}

function markAsChanged() {
  hasUnsavedChanges = true;
  const saveBtn = $('saveChangesBtn');
  if(saveBtn){
    saveBtn.disabled=false;
    saveBtn.className='btn-save';
    saveBtn.innerHTML='<span>Guardar</span>';
  }
}

async function saveAIConfig() {
  const saveBtn = $('saveChangesBtn');
  try {
    // Validar 10 campos obligatorios
    const requiredFields = [
      'aiName','aiPersonality','aiTone','aiLanguage','aiGreeting',
      'sinPrecio','sinStock','localCerrado','proactividad','formatoRespuestas'
    ];
    
    for (const f of requiredFields) {
      if (!safeGet(f)) { 
        showToast('warning','Campos incompletos',`Completá todos los campos obligatorios`); 
        return; 
      }
    }

    // Validar que los contactos elegidos existan
    const sinPrecioValue = safeGet('sinPrecio');
    const contactosRequeridos = [];

    if (sinPrecioValue === 'whatsapp' && !comercioData.whatsapp) {
      contactosRequeridos.push('WhatsApp');
    }
    if (sinPrecioValue === 'instagram' && !comercioData.instagram) {
      contactosRequeridos.push('Instagram');
    }
    if (sinPrecioValue === 'email' && !comercioData.email) {
      contactosRequeridos.push('Email');
    }
    if (sinPrecioValue === 'web' && !comercioData.sitioWeb) {
      contactosRequeridos.push('Sitio Web');
    }
    if (sinPrecioValue === 'telefono' && !comercioData.telefono) {
      contactosRequeridos.push('Teléfono');
    }

    if (contactosRequeridos.length > 0) {
      showToast('warning', 'Contactos faltantes', 
        `Configurá en Mi Comercio: ${contactosRequeridos.join(', ')}`);
      return;
    }
    
    saveBtn.disabled = true;
    saveBtn.className = 'btn-saving';
    saveBtn.innerHTML = '<span>Guardando...</span>';
    
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
        ...p,
        precio_final: Number(p.precio_final || 0),
        precio: Number(p.precio_final || 0)
      }))
    };
   
    await updateDoc(comercioRef, {
      aiConfig: updatedConfig,
      fechaActualizacion: new Date()
    });
   
    hasUnsavedChanges = false;
    saveBtn.disabled = true;
    saveBtn.className = 'btn-saved';
    saveBtn.innerHTML = '<span>✓ Guardado</span>';
    showToast('success', 'Cambios guardados', 'Configuración actualizada');
    
  } catch (e) {
    console.error('Error guardando:', e);
    showToast('error', 'Error', 'No se pudo guardar: ' + (e.message || e));
  } finally {
    if (saveBtn) saveBtn.disabled = !hasUnsavedChanges;
  }
}

// ==================== LOGOUT ====================
async function handleLogout() {
  if(hasUnsavedChanges && !confirm('Tenés cambios sin guardar. ¿Salir igual?')) return;
  await signOut(auth);
  window.location.href='/index.html';
}
```
