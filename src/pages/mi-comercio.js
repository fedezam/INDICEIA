// src/pages/mi-comercio.js
import { auth } from '../firebase.js';
import { onAuthStateChanged } from 'firebase/auth';
import { signOut } from 'firebase/auth';
import { getUserData, updateUserData } from '../shared/firebaseHelpers.js';
import Navigation from '../shared/navigation.js';
import { fillProvinciaSelector } from '../shared/provincias.js';
import { PlansManager } from '../shared/plans.js';

// Variables globales
let currentUser = null;
let currentComercioId = null;
let comercioData = {};
let selectedCategories = [];
let hasUnsavedChanges = false;

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

    // ✅ Obtener comercioId desde el documento del usuario
    const userRef = doc(db, 'usuarios', currentUser.uid);
    const userDoc = await getDoc(userRef);
    
    if (userDoc.exists() && userDoc.data().comercioId) {
      // Usuario ya tiene un comercio
      currentComercioId = userDoc.data().comercioId;
      console.log('✅ Comercio existente encontrado:', currentComercioId);
    } else {
      // Crear nuevo comercio
      const newComercioRef = await addDoc(collection(db, 'comercios'), {
        dueñoId: currentUser.uid,
        fechaCreacion: new Date(),
        tipo: 'comercio',
        plan: 'trial',
        pais: 'Argentina'
      });
      currentComercioId = newComercioRef.id;
      
      // ✅ Guardar comercioId en el documento del usuario
      await updateDoc(userRef, {
        comercioId: currentComercioId
      });
      
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
    createSaveButton();

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
    // ✅ ESTRUCTURA CORRECTA: /comercios/{comercioId}
    const comercioRef = doc(db, 'comercios', currentComercioId);
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

  // Hardcodear Argentina en el selector de país
  const paisEl = document.getElementById('pais');
  if (paisEl) {
    paisEl.value = 'Argentina';
    paisEl.disabled = true;
  }

  // Cargar provincias argentinas
  loadProvinciasForCountry('Argentina');

  console.log('✅ Formulario llenado con datos existentes');
}

function loadProvinciasForCountry(country) {
  const provinciaEl = document.getElementById("provincia");
  if (!provinciaEl) return;

  provinciaEl.innerHTML = '<option value="">Selecciona una provincia</option>';
  fillProvinciaSelector(country, provinciaEl);
  
  if (comercioData.provincia) {
    setTimeout(() => {
      provinciaEl.value = comercioData.provincia;
    }, 100);
  }
}

function renderPlans() {
  const container = document.getElementById('planSelector');
  if (!container) return;

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

  container.querySelectorAll('.plan-card').forEach(card => {
    card.addEventListener('click', async () => {
      const planId = card.dataset.plan;
      const plan = PLANS[planId];
      
      if (plan?.contacto) {
        showToast('Plan Empresarial', 'Por favor contactanos para este plan', 'info');
        return;
      }
      
      container.querySelectorAll('.plan-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      comercioData.plan = planId;
      markAsChanged();
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
    });
  });
}

function setupEventListeners() {
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', handleLogout);
  }

  // Detectar cambios en el formulario
  const form = document.getElementById('miComercioForm');
  if (form) {
    form.querySelectorAll('input, textarea, select').forEach(field => {
      field.addEventListener('input', () => {
        markAsChanged();
      });
    });
  }
}

function createSaveButton() {
  const header = document.querySelector('.header .container');
  if (!header) return;

  const saveBtn = document.createElement('button');
  saveBtn.id = 'saveChangesBtn';
  saveBtn.className = 'btn-save';
  saveBtn.disabled = true;
  saveBtn.innerHTML = '<i class="fas fa-save"></i> <span>Guardar Cambios</span>';
  header.appendChild(saveBtn);

  saveBtn.addEventListener('click', saveFormData);

  const style = document.createElement('style');
  style.textContent = `
    .btn-save {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.625rem 1.25rem;
      border: none;
      border-radius: 8px;
      font-size: 0.875rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
      background: #667eea;
      color: white;
    }
    .btn-save:disabled {
      background: #e2e8f0;
      color: #94a3b8;
      cursor: not-allowed;
    }
    .btn-save:not(:disabled):hover {
      background: #5568d3;
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
    }
    .btn-save.saving {
      background: #f59e0b;
    }
    .btn-save.saved {
      background: #10b981;
    }
    .btn-save i {
      font-size: 1rem;
    }
    .btn-save.saving i {
      animation: spin 1s linear infinite;
    }
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(style);
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

function setupNavigation() {
  Navigation.init();
  
  window.validateCurrentPageData = async () => {
    if (hasUnsavedChanges) {
      showToast('Cambios sin guardar', 'Debes guardar los cambios antes de continuar', 'warning');
      return false;
    }

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

  const saveBtn = document.getElementById('saveChangesBtn');

  try {
    // Validar campos requeridos
    const requiredFields = form.querySelectorAll('[required]');
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
      return;
    }

    // Actualizar botón a estado "guardando"
    if (saveBtn) {
      saveBtn.className = 'btn-save saving';
      saveBtn.innerHTML = '<i class="fas fa-spinner"></i> <span>Guardando...</span>';
      saveBtn.disabled = true;
    }

    const formData = new FormData(form);
    const updates = {};
    
    for (let [key, value] of formData.entries()) {
      updates[key] = value.trim();
    }

    updates.pais = 'Argentina';

    const paymentMethods = Array.from(document.querySelectorAll('input[name="paymentMethods"]:checked'))
      .map(cb => cb.value);
    updates.paymentMethods = paymentMethods;
    updates.categories = selectedCategories;
    updates.plan = comercioData.plan || 'trial';

    // ✅ GUARDAR EN /comercios/{comercioId}
    const comercioRef = doc(db, 'comercios', currentComercioId);
    await updateDoc(comercioRef, {
      ...updates,
      fechaActualizacion: new Date()
    });

    comercioData = { ...comercioData, ...updates };
    updateHeader();
    updateSubscriptionBanner();

    hasUnsavedChanges = false;

    // Actualizar botón a estado "guardado"
    if (saveBtn) {
      saveBtn.className = 'btn-save saved';
      saveBtn.innerHTML = '<i class="fas fa-check-circle"></i> <span>Guardado ✓</span>';
      
      setTimeout(() => {
        saveBtn.disabled = true;
        saveBtn.className = 'btn-save';
        saveBtn.innerHTML = '<i class="fas fa-save"></i> <span>Guardar Cambios</span>';
      }, 2000);
    }

    // Marcar página como completada
    if (updates.nombreComercio && updates.telefono && updates.direccion) {
      Navigation.markPageAsCompleted('mi-comercio');
      Navigation.updateProgressBar();
    }

    showToast('Éxito', 'Cambios guardados correctamente', 'success');
    console.log('💾 Guardado exitoso');

  } catch (error) {
    console.error('Error al guardar:', error);
    
    if (saveBtn) {
      saveBtn.className = 'btn-save';
      saveBtn.innerHTML = '<i class="fas fa-exclamation-circle"></i> <span>Error al guardar</span>';
      saveBtn.disabled = false;
    }
    
    showToast('Error', 'No se pudieron guardar los cambios', 'error');
  }
}

async function handleLogout() {
  if (confirm('¿Estás seguro que deseas cerrar sesión?')) {
    try {
      showLoading('Cerrando sesión...');
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
