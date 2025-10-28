// src/pages/ia-config.js
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
  console.log('🚀 Iniciando ia-config.js (producción)');

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

    try { Navigation.init(); } catch (e) { console.warn('⚠️ Navigation.init falló:', e); }

    window.validateCurrentPageData = async () => {
      const requiredFields = ['aiName','aiPersonality','aiTone','aiLanguage','aiGreeting','sinPrecio','sinStock','localCerrado','proactividad','formatoRespuestas'];
      for (const f of requiredFields) if (!safeGet(f)) { showToast('warning','Campos incompletos','Completá todos los campos'); return false; }
      if (hasUnsavedChanges) { showToast('warning','Cambios sin guardar','Guardá antes de continuar'); return false; }
      return true;
    };

    hideLoading();
  } catch (error) {
    hideLoading();
    console.error('❌ Error inicializando:', error);
    showToast('error','Error','No se pudo cargar configuración: '+(error.message||error));
  }
}

// ==================== LOAD PRODUCTS ====================
async function loadProducts() {
  try {
    if (!currentComercioId) { 
      productos = []; 
      console.warn('⚠️ No hay comercioId, productos = []');
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
    console.log('✅ Productos cargados:', productos.length);
    
    // DEBUG: Mostrar 3 productos de ejemplo
    if (productos.length > 0) {
      console.log('📦 Ejemplo de productos cargados:', productos.slice(0, 3));
    }
  } catch (error) {
    console.error('❌ Error cargando productos:', error);
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

// ==================== LOAD AI CONFIG ====================
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

  // 🔄 sincronizar productosDestacados con los productos reales cargados
  const destacadosGuardados = Array.isArray(aiConfig.productosDestacados)
    ? aiConfig.productosDestacados
    : [];

  productosDestacados = destacadosGuardados.map((dest) => {
    const productoReal =
      productos.find((p) => p.id === dest.id) ||
      productos.find((p) => p.codigo === dest.codigo);

    if (productoReal) {
      // usar los datos reales de la DB
      return {
        id: productoReal.id,
        codigo: productoReal.codigo || dest.codigo || '',
        nombre: productoReal.nombre || dest.nombre || '',
        descripcion: productoReal.descripcion || dest.descripcion || '',
        precio_final:
          productoReal.precio_final != null
            ? Number(productoReal.precio_final)
            : Number(dest.precio_final || 0),
        precio:
          productoReal.precio_final != null
            ? Number(productoReal.precio_final)
            : Number(dest.precio || 0),
      };
    }

    // fallback si el producto fue borrado de la DB
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

  console.log('✅ IA Config cargada y sincronizada con productos reales:', productosDestacados);
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
      </div>`;
    return;
  }

  list.innerHTML = productosDestacados
    .map((p) => {
      const precioNum =
        p.precio_final != null && p.precio_final > 0
          ? Number(p.precio_final)
          : p.precio != null && p.precio > 0
          ? Number(p.precio)
          : null;
      const precioStr =
        precioNum != null
          ? `${precioNum.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`
          : 'Sin precio';

      return `
        <div class="destacado-item">
          <div class="producto-info">
            <div class="producto-codigo">[${p.codigo || 'SIN CÓDIGO'}]</div>
            <div class="producto-nombre">${p.nombre || 'Sin nombre'}</div>
            <div class="producto-precio">${precioStr}</div>
          </div>
          <button class="btn-quitar" onclick="window.quitarDestacado('${p.id}')">
            <i class="fas fa-trash"></i> Quitar
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

// ==================== BÚSQUEDA DE PRODUCTOS ====================
function buscarProductos(query) {
  const resultadosContainer = $('productosResultados');
  if (!resultadosContainer) return;

  const searchTerm = query.trim().toLowerCase();
  
  if (!searchTerm) {
    resultadosContainer.innerHTML = '<div class="empty-search">Escribe para buscar productos...</div>';
    resultadosContainer.style.display = 'none';
    return;
  }

  // Filtrar productos que coincidan con la búsqueda
  const resultados = productos.filter(p => {
    const nombre = (p.nombre || '').toLowerCase();
    const codigo = (p.codigo || '').toLowerCase();
    const descripcion = (p.descripcion || '').toLowerCase();
    return nombre.includes(searchTerm) || codigo.includes(searchTerm) || descripcion.includes(searchTerm);
  }).slice(0, 10); // Limitar a 10 resultados

  if (resultados.length === 0) {
    resultadosContainer.innerHTML = '<div class="empty-search">No se encontraron productos</div>';
    resultadosContainer.style.display = 'block';
    return;
  }

  resultadosContainer.innerHTML = resultados.map(p => {
    const yaDestacado = productosDestacados.some(d => d.id === p.id);
    const disabled = yaDestacado || productosDestacados.length >= 10;
    
    const precioStr = p.precio_final > 0 
      ? `${p.precio_final.toLocaleString('es-AR', { minimumFractionDigits: 2 })}` 
      : 'Sin precio';

    return `
      <div class="producto-resultado ${disabled ? 'disabled' : ''}" data-producto-id="${p.id}">
        <div class="producto-info">
          <div class="producto-codigo">[${p.codigo || 'SIN CÓDIGO'}]</div>
          <div class="producto-nombre">${p.nombre || 'Sin nombre'}</div>
          <div class="producto-precio">${precioStr}</div>
        </div>
        <button 
          class="btn btn-sm btn-primary" 
          ${disabled ? 'disabled' : ''}
          onclick="agregarDestacado('${p.id}')"
        >
          ${yaDestacado ? 'Ya agregado' : 'Agregar'}
        </button>
      </div>
    `;
  }).join('');

  resultadosContainer.style.display = 'block';
}

// ==================== AGREGAR/QUITAR DESTACADOS ====================
window.agregarDestacado = (productoId) => {
  console.log('🔍 Intentando agregar producto:', productoId);
  
  if (productosDestacados.length >= 10) {
    showToast('Límite alcanzado', 'Solo puedes tener 10 productos destacados', 'warning');
    return;
  }

  const producto = productos.find(p => p.id === productoId);
  if (!producto) {
    console.error('❌ Producto no encontrado:', productoId);
    showToast('Error', 'Producto no encontrado', 'error');
    return;
  }

  if (productosDestacados.some(p => p.id === productoId)) {
    showToast('Ya agregado', 'Este producto ya está en destacados', 'info');
    return;
  }

  productosDestacados.push(producto);
  console.log('✅ Producto agregado. Total destacados:', productosDestacados.length);
  
  renderDestacados();
  markAsChanged();
  
  // Actualizar búsqueda para reflejar cambios
  const searchInput = $('searchProductos');
  if (searchInput && searchInput.value) {
    buscarProductos(searchInput.value);
  }
  
  showToast('Producto agregado', `${producto.nombre} agregado a destacados`, 'success');
};

window.quitarDestacado = (productoId) => {
  console.log('🗑️ Intentando quitar producto:', productoId);
  
  const index = productosDestacados.findIndex(p => p.id === productoId);
  if (index === -1) {
    console.error('❌ Producto no encontrado en destacados:', productoId);
    return;
  }

  const producto = productosDestacados[index];
  productosDestacados.splice(index, 1);
  console.log('✅ Producto quitado. Total destacados:', productosDestacados.length);
  
  renderDestacados();
  markAsChanged();
  
  // Actualizar búsqueda para reflejar cambios
  const searchInput = $('searchProductos');
  if (searchInput && searchInput.value) {
    buscarProductos(searchInput.value);
  }
  
  showToast('Producto quitado', `${producto.nombre} quitado de destacados`, 'info');
};

// ==================== EVENT LISTENERS ====================
function setupEventListeners() {
  $('openAssistant')?.addEventListener('click',()=>showToast('info','🤖 Asistente','Decile: "Soy de Indice IA"',8000));
  
  const searchInput = $('searchProductos');
  if (searchInput) {
    console.log('✅ Input de búsqueda encontrado');
    searchInput.addEventListener('input', e => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        console.log('🔍 Buscando:', e.target.value);
        buscarProductos(e.target.value);
      }, 300);
    });
  } else {
    console.error('❌ No se encontró el input searchProductos');
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
  
  console.log('✅ Event listeners configurados');
}

// ==================== SAVE ====================
function createSaveButton() {
  const userInfo = document.querySelector('.header .user-info');
  if(!userInfo || $('saveChangesBtn')) return;
  const saveBtn = document.createElement('button');
  saveBtn.id='saveChangesBtn';
  saveBtn.className='btn-save';
  saveBtn.disabled=true;
  saveBtn.innerHTML='<i class="fas fa-save"></i> <span>Guardar</span>';
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
    saveBtn.innerHTML='<i class="fas fa-save"></i> <span>Guardar</span>';
  }
}

async function saveAIConfig() {
  const saveBtn = $('saveChangesBtn');
  try{
    const requiredFields=['aiName','aiPersonality','aiTone','aiLanguage','aiGreeting'];
    for(const f of requiredFields) if(!safeGet(f)){ showToast('warning','Campos incompletos','Completá identidad del asistente'); return; }
    saveBtn.disabled=true; saveBtn.className='btn-saving'; saveBtn.innerHTML='<i class="fas fa-spinner fa-spin"></i> <span>Guardando...</span>';

    const comercioRef = doc(db,'comercios',currentComercioId);
    const updatedConfig = {
      aiName:safeGet('aiName'),
      aiPersonality:safeGet('aiPersonality'),
      aiTone:safeGet('aiTone'),
      aiLanguage:safeGet('aiLanguage'),
      aiGreeting:safeGet('aiGreeting'),
      sinPrecio:safeGet('sinPrecio'),
      sinStock:safeGet('sinStock'),
      localCerrado:safeGet('localCerrado'),
      proactividad:safeGet('proactividad'),
      formatoRespuestas:safeGet('formatoRespuestas'),
      mensajeWhatsapp:safeGet('mensajeWhatsapp'),
      mensajeInstagram:safeGet('mensajeInstagram'),
      mensajeWeb:safeGet('mensajeWeb'),
      mensajeDefault:safeGet('mensajeDefault'),
      productosDestacados:productosDestacados.map(p=>({ ...p, precio_final:Number(p.precio_final||0), precio:Number(p.precio_final||0) }))
    };
    await updateDoc(comercioRef,{aiConfig:updatedConfig});
    
    // ✅ CORREGIDO: Ahora pasa userId como segundo parámetro
    await updateCommerceJSON(currentComercioId, currentUser.uid);
    
    hasUnsavedChanges=false;
    saveBtn.disabled=true; saveBtn.className='btn-saved'; saveBtn.innerHTML='<i class="fas fa-check"></i> <span>Guardado</span>';
    showToast('success','Cambios guardados','Configuración actualizada');
  }catch(e){ console.error('❌ Error guardando:',e); showToast('error','Error','No se pudo guardar'); }
  finally{ if(saveBtn) saveBtn.disabled=!hasUnsavedChanges; }
}

// ==================== LOGOUT ====================
async function handleLogout() {
  if(hasUnsavedChanges && !confirm('Tenés cambios sin guardar. ¿Salir igual?')) return;
  await signOut(auth);
  window.location.href='/index.html';
}
