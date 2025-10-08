// mi-comercio.js - Versión corregida con Firestore correcto y planes
import { auth, db } from './firebase.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js';
import { doc, getDoc, updateDoc, addDoc, collection } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js';
import Navigation from './navigation.js';
import { fillProvinciaSelector } from './provincias.js';
import { PLANS, calcularEstadoPlan, getDiasRestantesTrial, puedeAgregarProducto } from './plans.js';
import { AutoSyncManager } from './sync-helper.js';

// Variables globales
let currentUser = null;
let currentComercioId = null;
let comercioData = {};
let selectedCategories = [];
let autoSyncManager = null;

document.addEventListener('DOMContentLoaded', async () => {
  console.log('🚀 Iniciando mi-comercio.js');

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
    showLoading('Cargando datos del comercio...');

    // Obtener o crear comercioId
    currentComercioId = localStorage.getItem('currentComercioId');
    
    if (!currentComercioId) {
      // ✅ ESTRUCTURA CORRECTA: usuarios/{uid}/comercios
      const comerciosRef = collection(db, `usuarios/${currentUser.uid}/comercios`);
      const newComercioRef = await addDoc(comerciosRef, {
        dueñoId: currentUser.uid,
        fechaCreacion: new Date(),
        tipo: 'comercio',
        plan: 'trial',
        pais: 'Argentina' // Hardcoded
      });
      currentComercioId = newComercioRef.id;
      localStorage.setItem('currentComercioId', currentComercioId);
      console.log('✅ Nuevo comercio creado:', currentComercioId);
    }

    await loadComercioData();
    updateHeader();
    updateSubscriptionBanner();
    fillForm();
    renderPlans();
    renderCategories();
    renderPaymentMethods();
    setupEventListeners();
    setupNavigation();
    setupAutoSave();
    createSaveIndicator();

    hideLoading();
    console.log('✅ Página inicializada correctamente');

  } catch (error) {
    hideLoading();
    console.error('❌ Error inicializando página:', error);
    showToast('Error', 'Hubo un problema al cargar la página', 'error');
  }
}

async function loadComercioData() {
  try {
    // ✅ ESTRUCTURA CORRECTA
    const comercioRef = doc(db, `usuarios/${currentUser.uid}/comercios`, currentComercioId);
    const comercioDoc = await getDoc(comercioRef);
    
    if (comercioDoc.exists()) {
      comercioData = { id: currentComercioId, ...comercioDoc.data() };
      selectedCategories = comercioData.categories || [];
      console.log('✅ Datos de comercio cargados:', comercioData);
    } else {
      comercioData = { 
        id: currentComercioId, 
        dueñoId: currentUser.uid,
        plan: 'trial',
        pais: 'Argentina'
      };
    }
  } catch (error) {
    console.error('Error cargando datos comercio:', error);
    throw error;
  }
}

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
      message.innerHTML = `🎉 <strong>Trial activo</strong> - Te quedan <strong>${diasRestantes} días</strong> para probar todas las funciones`;
      break;
      
    case 'expirado':
      banner.classList.add('expired');
      message.innerHTML = `⚠️ <strong>Tu trial expiró.</strong> Elegí un plan para seguir usando tu IA comercial`;
      break;
      
    case 'suspendido':
      banner.classList.add('expired');
      message.innerHTML = `❌ <strong>Servicio suspendido.</strong> Regularizá el pago para continuar`;
      break;
      
    case 'activo':
      banner.classList.add('active');
      message.innerHTML = `✅ <strong>Plan ${planActual?.nombre} activo</strong> - Todo funcionando correctamente`;
      break;
      
    case 'limite_excedido':
      banner.classList.add('expired');
      const limiteActual = planActual?.productos || 0;
      message.innerHTML = `⚠️ <strong>Has superado el límite de ${limiteActual} productos.</strong> Upgrade para continuar`;
      break;
  }
}

function fillForm() {
  const form = document.getElementById('miComercioForm');
  if (!form) return;

  // Llenar campos normales
  form.querySelectorAll('input, textarea').forEach(field => {
    if (field.name && comercioData[field.name]) {
      field.value = comercioData[field.name];
    }
  });

  // Llenar selector de provincias
  const provinciaEl = document.getElementById('provincia');
  if (provinciaEl) {
    fillProvinciaSelector(provinciaEl, comercioData.provincia);
  }

  console.log('✅ Formulario llenado con datos existentes');
}

function renderPlans() {
  const container = document.getElementById('planSelector');
  if (!container) return;

  // Filtrar planes (sin trial en el selector)
  const planesDisponibles = Object.entries(PLANS).filter(([key]) => key !== 'trial');
  
  container.innerHTML = planesDisponibles.map(([key, plan]) => `
    <div class="plan-card ${comercioData.plan === key ? 'selected' : ''}" data-plan="${key}">
      <div class="plan-header">
        <h4>${plan.emoji} ${plan.nombre}</h4>
        <div class="plan-price">
          ${plan.precio ? `$${plan.precio} ARS/mes` : 'Consultar'}
        </div>
      </div>
      <p class="plan-description">${plan.descripcion}</p>
      <div class="plan-features">
        ${plan.features.map(f => `
          <div class="feature"><i class="fas fa-check"></i> ${f}</div>
        `).join('')}
      </div>
      ${plan.ejemplos ? `
        <div class="plan-examples">
          <strong>Ideal para:</strong> ${plan.ejemplos.join(', ')}
        </div>
      ` : ''}
      ${plan.contacto ? `
        <button class="btn btn-primary" onclick="window.location.href='mailto:soporte@indiceia.com'">
          Contactar
        </button>
      ` : ''}
    </div>
  `).join('');

  // Event listeners para selección de plan
  container.querySelectorAll('.plan-card').forEach(card => {
    card.addEventListener('click', async () => {
      const planId = card.dataset.plan;
      const plan = PLANS[planId];
      
      // No permitir cambio si tiene plan empresarial (debe contactar)
      if (plan?.contacto) {
        showToast('Plan Empresarial', 'Por favor contactanos para este plan', 'info');
        return;
      }
      
      container.querySelectorAll('.plan-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      comercioData.plan = planId;
      markAsChanged();
      triggerAutoSave();
      updateSubscriptionBanner();
      updateHeader();
    });
  });
}

function renderCategories() {
  const container = document.getElementById('categoriesGrid');
  if (!container) return;

  const predefinedCategories = [
    "Ropa y Moda","Calzado","Accesorios","Joyería","Electrónicos",
    "Hogar y Decoración","Muebles","Belleza y Cosméticos","Alimentos",
    "Bebidas","Panadería","Servicios Profesionales","Salud","Deportes",
    "Automotriz","Ferretería","Librería","Juguetería","Mascotas"
  ];

  const allCategories = [...new Set([...predefinedCategories, ...selectedCategories])].sort();
  
  container.innerHTML = `
    <div class="categories-selector">
      <div class="category-dropdown">
        <select id="categorySelect" class="category-select">
          <option value="">Seleccionar categoría...</option>
          ${allCategories.map(cat => `
            <option value="${cat}" ${selectedCategories.includes(cat) ? 'disabled' : ''}>
              ${cat}
            </option>
          `).join("")}
        </select>
        <button type="button" class="btn btn-success" id="addSelectedCategory">
          <i class="fas fa-plus"></i> Agregar
        </button>
      </div>
      <div class="custom-category">
        <input type="text" id="customCategory" placeholder="¿No encuentras tu rubro? Escríbelo aquí...">
        <button type="button" class="btn btn-secondary" id="addCustomCategory">
          <i class="fas fa-plus"></i> Agregar Personalizada
        </button>
      </div>
    </div>
    <div class="selected-categories">
      <h4><i class="fas fa-check-circle"></i> Categorías de tu Negocio</h4>
      <div class="selected-categories-grid" id="selectedCategoriesGrid">
        ${selectedCategories.map((cat, idx) => `
          <div class="selected-category-tag" data-index="${idx}">
            <span>${cat}</span>
            <button class="remove-btn"><i class="fas fa-times"></i></button>
          </div>
        `).join("")}
      </div>
      ${selectedCategories.length === 0 ? '<p class="empty-categories">No has seleccionado categorías aún</p>' : ''}
    </div>
  `;

  const addSelectedBtn = document.getElementById('addSelectedCategory');
  const addCustomBtn = document.getElementById('addCustomCategory');
  
  if (addSelectedBtn) {
    addSelectedBtn.addEventListener('click', () => {
      const select = document.getElementById('categorySelect');
      const cat = select.value;
      if (cat && !selectedCategories.includes(cat)) {
        selectedCategories.push(cat);
        comercioData.categories = selectedCategories;
        renderCategories();
        markAsChanged();
        triggerAutoSave();
      }
    });
  }

  if (addCustomBtn) {
    addCustomBtn.addEventListener('click', () => {
      const input = document.getElementById('customCategory');
      const cat = input.value.trim();
      if (cat && !selectedCategories.includes(cat)) {
        selectedCategories.push(cat);
        comercioData.categories = selectedCategories;
        renderCategories();
        input.value = '';
        markAsChanged();
        triggerAutoSave();
      }
    });
  }

  container.querySelectorAll('.remove-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tag = btn.closest('.selected-category-tag');
      const idx = Number(tag.dataset.index);
      selectedCategories.splice(idx, 1);
      comercioData.categories = selectedCategories;
      renderCategories();
      markAsChanged();
      triggerAutoSave();
    });
  });
}

function renderPaymentMethods() {
  const container = document.getElementById('paymentMethods');
  if (!container) return;

  const methods = [
    "Efectivo", 
    "Tarjeta de débito", 
    "Tarjeta de crédito", 
    "Transferencia bancaria",
    "MercadoPago", 
    "PayPal",
    "Criptomonedas"
  ];
  
  container.innerHTML = methods.map(method => `
    <label class="checkbox-item">
      <input type="checkbox" name="paymentMethods" value="${method}" 
        ${comercioData.paymentMethods?.includes(method) ? 'checked' : ''}>
      <span class="checkbox-text">${method}</span>
    </label>
  `).join('');

  container.querySelectorAll('input[type="checkbox"]').forEach(cb => {
    cb.addEventListener('change', () => {
      markAsChanged();
      triggerAutoSave();
    });
  });
}

function setupEventListeners() {
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', handleLogout);
  }
}

function setupAutoSave() {
  const form = document.getElementById('miComercioForm');
  if (!form) return;

  form.querySelectorAll('input, textarea, select').forEach(field => {
    field.addEventListener('input', () => {
      markAsChanged();
      triggerAutoSave();
    });
  });
}

function createSaveIndicator() {
  const header = document.querySelector('.header .container');
  if (!header) return;

  const indicator = document.createElement('div');
  indicator.id = 'saveIndicator';
  indicator.className = 'save-indicator';
  indicator.innerHTML = '<i class="fas fa-check-circle"></i> <span>Todos los cambios guardados</span>';
  header.appendChild(indicator);

  const style = document.createElement('style');
  style.textContent = `
    .save-indicator {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 1rem;
      border-radius: 20px;
      font-size: 0.875rem;
      font-weight: 500;
      transition: all 0.3s ease;
      background: #d4edda;
      color: #155724;
    }
    .save-indicator.saving {
      background: #fff3cd;
      color: #856404;
    }
    .save-indicator.error {
      background: #f8d7da;
      color: #721c24;
    }
    .save-indicator i { font-size: 1rem; }
    .save-indicator.saving i {
      animation: spin 1s linear infinite;
    }
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(style);
}

function updateSaveIndicator(status) {
  const indicator = document.getElementById('saveIndicator');
  if (!indicator) return;

  indicator.className = 'save-indicator';
  
  if (status === 'saving') {
    indicator.classList.add('saving');
    indicator.innerHTML = '<i class="fas fa-spinner"></i> <span>Guardando cambios...</span>';
  } else if (status === 'saved') {
    indicator.innerHTML = '<i class="fas fa-check-circle"></i> <span>Todos los cambios guardados</span>';
  } else if (status === 'error') {
    indicator.classList.add('error');
    indicator.innerHTML = '<i class="fas fa-exclamation-circle"></i> <span>Error al guardar</span>';
  }
}

function markAsChanged() {
  hasUnsavedChanges = true;
}

function triggerAutoSave() {
  clearTimeout(autoSaveTimeout);
  autoSaveTimeout = setTimeout(async () => {
    if (hasUnsavedChanges) {
      await saveFormData();
      hasUnsavedChanges = false;
    }
  }, 2000);
}

function setupNavigation() {
  Navigation.init();
  
  window.validateCurrentPageData = async () => {
    const form = document.getElementById('miComercioForm');
    const requiredFields = form?.querySelectorAll('[required]') || [];
    
    let isValid = true;
    requiredFields.forEach(field => {
      if (!field.value.trim()) {
        field.classList.add('error');
        isValid = false;
      } else {
        field.classList.remove('error');
      }
    });

    if (!isValid) {
      showToast('Campos requeridos', 'Por favor completa todos los campos obligatorios', 'warning');
    }

    return isValid;
  };
}

async function saveFormData() {
  const form = document.getElementById('miComercioForm');
  if (!form) return;

  try {
    updateSaveIndicator('saving');

    const formData = new FormData(form);
    const updates = {};
    
    for (let [key, value] of formData.entries()) {
      updates[key] = value.trim();
    }

    // País siempre Argentina
    updates.pais = 'Argentina';

    const paymentMethods = Array.from(document.querySelectorAll('input[name="paymentMethods"]:checked'))
      .map(cb => cb.value);
    updates.paymentMethods = paymentMethods;
    updates.categories = selectedCategories;
    updates.plan = comercioData.plan || 'trial';

    // ✅ GUARDAR CON ESTRUCTURA CORRECTA
    const comercioRef = doc(db, `usuarios/${currentUser.uid}/comercios`, currentComercioId);
    await updateDoc(comercioRef, {
      ...updates,
      fechaActualizacion: new Date()
    });

    comercioData = { ...comercioData, ...updates };
    updateHeader();
    updateSubscriptionBanner();

    // Sincronización con JSON (no crítico)
    syncToGist().catch(err => {
      console.warn("Sincronización JSON fallida (no crítico):", err.message);
    });

    if (updates.nombreComercio && updates.telefono && updates.direccion) {
      Navigation.markPageAsCompleted('mi-comercio');
      Navigation.updateProgressBar();
    }

    updateSaveIndicator('saved');
    console.log('💾 Auto-guardado exitoso');

  } catch (error) {
    console.error('Error en auto-save:', error);
    updateSaveIndicator('error');
    showToast('Error', 'No se pudieron guardar los cambios', 'error');
  }
}

async function syncToGist() {
  try {
    const response = await fetch('/api/export-json', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        comercioId: currentComercioId,
        userId: currentUser.uid
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`API error: ${response.status}`);
    }

    const result = await response.json();
    console.log('✅ JSON sincronizado:', result.gist?.rawUrl);
    return result;
  } catch (error) {
    console.error('❌ Error sincronizando JSON:', error);
    throw error;
  }
}

async function handleLogout() {
  if (confirm('¿Estás seguro que deseas cerrar sesión?')) {
    try {
      showLoading('Cerrando sesión...');
      localStorage.removeItem('currentComercioId');
      await auth.signOut();
      window.location.href = '/index.html';
    } catch (error) {
      hideLoading();
      showToast('Error', 'No se pudo cerrar sesión', 'error');
    }
  }
}

function showLoading(text = "Cargando...") {
  const overlay = document.getElementById("loadingOverlay");
  const loadingText = document.getElementById("loadingText");
  if (overlay && loadingText) {
    loadingText.textContent = text;
    overlay.classList.add("show");
  }
}

function hideLoading() {
  const overlay = document.getElementById("loadingOverlay");
  if (overlay) overlay.classList.remove("show");
}

function showToast(title, message, type = "success") {
  const container = document.getElementById("toastContainer");
  if (!container) return;

  const toast = document.createElement("div");
  const icons = {
    success: "fas fa-check-circle",
    error: "fas fa-exclamation-circle",
    warning: "fas fa-exclamation-triangle",
    info: "fas fa-info-circle",
  };

  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <i class="${icons[type]}"></i>
    <div class="toast-content">
      <div class="toast-title">${title}</div>
      <div class="toast-message">${message}</div>
    </div>
    <button class="toast-close"><i class="fas fa-times"></i></button>
  `;
  container.appendChild(toast);

  setTimeout(() => toast.classList.add("show"), 100);
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => {
      if (toast.parentNode) container.removeChild(toast);
    }, 300);
  }, 5000);

  toast.querySelector(".toast-close").addEventListener("click", () => {
    toast.classList.remove("show");
    setTimeout(() => {
      if (toast.parentNode) container.removeChild(toast);
    }, 300);
  });
}
