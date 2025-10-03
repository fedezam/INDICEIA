// mi-comercio.js - Versión completa con Navigation y renderizado
import { auth, db } from './firebase.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js';
import { doc, getDoc, updateDoc } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js';
import Navigation from './navigation.js';

// Variables globales
let currentUser = null;
let userData = {};
let selectedCategories = [];

// Datos de provincias por país
const PROVINCES_BY_COUNTRY = {
  Argentina: ["Buenos Aires", "CABA", "Catamarca", "Chaco", "Chubut", "Córdoba", "Corrientes", "Entre Ríos", "Formosa", "Jujuy", "La Pampa", "La Rioja", "Mendoza", "Misiones", "Neuquén", "Río Negro", "Salta", "San Juan", "San Luis", "Santa Cruz", "Santa Fe", "Santiago del Estero", "Tierra del Fuego", "Tucumán"],
  México: ["Aguascalientes", "Baja California", "Ciudad de México", "Jalisco", "Nuevo León", "Quintana Roo"],
  Colombia: ["Antioquia", "Bogotá D.C.", "Valle del Cauca", "Cundinamarca"],
  Chile: ["Metropolitana", "Valparaíso", "Biobío"],
  Perú: ["Lima", "Cusco", "Arequipa"],
  España: ["Madrid", "Barcelona", "Valencia", "Andalucía"],
  "Estados Unidos": ["California", "Texas", "Florida", "Nueva York"],
  Brasil: ["São Paulo", "Río de Janeiro", "Minas Gerais"]
};

document.addEventListener('DOMContentLoaded', async () => {
  console.log('Iniciando mi-comercio.js');

  onAuthStateChanged(auth, async (user) => {
    if (user) {
      console.log('Usuario autenticado:', user.email);
      currentUser = user;
      await initializePage();
    } else {
      console.log('Usuario no autenticado, redirigiendo...');
      window.location.href = '/index.html';
    }
  });
});

async function initializePage() {
  try {
    showLoading('Cargando datos del comercio...');

    await loadUserData();
    updateHeader();
    fillForm();
    renderPlans();
    renderCategories();
    renderPaymentMethods();
    setupEventListeners();
    setupNavigation();

    hideLoading();
    console.log('Página inicializada correctamente');

  } catch (error) {
    hideLoading();
    console.error('Error inicializando página:', error);
    showToast('Error', 'Hubo un problema al cargar la página', 'error');
  }
}

async function loadUserData() {
  try {
    const userDoc = await getDoc(doc(db, "usuarios", currentUser.uid));
    if (userDoc.exists()) {
      userData = { id: currentUser.uid, ...userDoc.data() };
      selectedCategories = userData.categories || [];
      console.log('Datos de usuario cargados:', userData);
    } else {
      throw new Error('Datos de usuario no encontrados');
    }
  } catch (error) {
    console.error('Error cargando datos usuario:', error);
    throw error;
  }
}

function updateHeader() {
  const commerceName = document.getElementById('commerceName');
  const planBadge = document.getElementById('planBadge');
  
  if (commerceName) {
    commerceName.textContent = userData.nombreComercio || 'Mi Comercio';
  }
  if (planBadge) {
    planBadge.textContent = userData.plan || 'Trial';
  }
}

function fillForm() {
  const form = document.getElementById('miComercioForm');
  if (!form) return;

  form.querySelectorAll('input, textarea, select').forEach(field => {
    if (field.name && userData[field.name]) {
      field.value = userData[field.name];
    }
  });

  // Cargar provincias si hay país seleccionado
  const paisEl = document.getElementById('pais');
  if (paisEl && userData.pais) {
    paisEl.value = userData.pais;
    loadProvinces(userData.pais);
    const provinciaEl = document.getElementById('provincia');
    if (provinciaEl && userData.provincia) {
      provinciaEl.value = userData.provincia;
    }
  }

  console.log('Formulario llenado con datos existentes');
}

function renderPlans() {
  const container = document.getElementById('planSelector');
  if (!container) return;

  const plans = [
    { id: 'trial', nombre: 'Trial', precio: 0, maxProductos: 10, descripcion: 'Ideal para probar' },
    { id: 'basico', nombre: 'Básico', precio: 9, maxProductos: 50, descripcion: 'Para comenzar' },
    { id: 'profesional', nombre: 'Profesional', precio: 19, maxProductos: 200, descripcion: 'Negocio en crecimiento' },
    { id: 'empresa', nombre: 'Empresa', precio: 49, maxProductos: -1, descripcion: 'Sin límites' }
  ];

  container.innerHTML = plans.map(plan => `
    <div class="plan-card ${userData.plan === plan.id ? 'selected' : ''}" data-plan="${plan.id}">
      <div class="plan-header">
        <h4>${plan.nombre}</h4>
        <div class="plan-price">$${plan.precio} USD/mes</div>
      </div>
      <div class="plan-features">
        <div class="feature"><i class="fas fa-check"></i> Hasta ${plan.maxProductos === -1 ? 'ilimitados' : plan.maxProductos} productos</div>
        <div class="feature"><i class="fas fa-check"></i> ${plan.descripcion}</div>
      </div>
    </div>
  `).join('');

  container.querySelectorAll('.plan-card').forEach(card => {
    card.addEventListener('click', async () => {
      container.querySelectorAll('.plan-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      userData.plan = card.dataset.plan;
      await updateDoc(doc(db, "usuarios", currentUser.uid), { plan: userData.plan });
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
    "Bebidas","Panadería","Servicios Profesionales","Salud","Deportes"
  ];

  const allCategories = [...new Set([...predefinedCategories, ...selectedCategories])].sort();
  
  container.innerHTML = `
    <div class="categories-selector">
      <div class="category-dropdown">
        <select id="categorySelect" class="category-select">
          <option value="">Seleccionar categoría...</option>
          ${allCategories.map(cat => `<option value="${cat}" ${selectedCategories.includes(cat) ? 'disabled' : ''}>${cat}</option>`).join("")}
        </select>
        <button type="button" class="btn btn-success" id="addSelectedCategory"><i class="fas fa-plus"></i> Agregar</button>
      </div>
      <div class="custom-category">
        <input type="text" id="customCategory" placeholder="¿No encuentras tu rubro? Escríbelo aquí...">
        <button type="button" class="btn btn-secondary" id="addCustomCategory"><i class="fas fa-plus"></i> Agregar Personalizada</button>
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

  // Event listeners para categorías
  const addSelectedBtn = document.getElementById('addSelectedCategory');
  const addCustomBtn = document.getElementById('addCustomCategory');
  
  if (addSelectedBtn) {
    addSelectedBtn.addEventListener('click', async () => {
      const select = document.getElementById('categorySelect');
      const cat = select.value;
      if (cat && !selectedCategories.includes(cat)) {
        selectedCategories.push(cat);
        await updateDoc(doc(db, "usuarios", currentUser.uid), { categories: selectedCategories });
        userData.categories = selectedCategories;
        renderCategories();
      }
    });
  }

  if (addCustomBtn) {
    addCustomBtn.addEventListener('click', async () => {
      const input = document.getElementById('customCategory');
      const cat = input.value.trim();
      if (cat && !selectedCategories.includes(cat)) {
        selectedCategories.push(cat);
        await updateDoc(doc(db, "usuarios", currentUser.uid), { categories: selectedCategories });
        userData.categories = selectedCategories;
        renderCategories();
        input.value = '';
      }
    });
  }

  // Remover categorías
  container.querySelectorAll('.remove-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const tag = btn.closest('.selected-category-tag');
      const idx = Number(tag.dataset.index);
      selectedCategories.splice(idx, 1);
      await updateDoc(doc(db, "usuarios", currentUser.uid), { categories: selectedCategories });
      userData.categories = selectedCategories;
      renderCategories();
    });
  });
}

function renderPaymentMethods() {
  const container = document.getElementById('paymentMethods');
  if (!container) return;

  const methods = ["Efectivo", "Tarjeta de débito", "Tarjeta de crédito", "Transferencia", "MercadoPago", "PayPal"];
  
  container.innerHTML = methods.map(method => `
    <label class="checkbox-item">
      <input type="checkbox" name="paymentMethods" value="${method}" ${userData.paymentMethods?.includes(method) ? 'checked' : ''}>
      <span class="checkbox-text">${method}</span>
    </label>
  `).join('');
}

function loadProvinces(country) {
  const select = document.getElementById('provincia');
  if (!select) return;
  
  const provinces = PROVINCES_BY_COUNTRY[country] || ['Otro'];
  select.innerHTML = provinces.map(p => `<option value="${p}">${p}</option>`).join('');
}

function setupEventListeners() {
  // Cambio de país
  const paisEl = document.getElementById('pais');
  if (paisEl) {
    paisEl.addEventListener('change', (e) => loadProvinces(e.target.value));
  }

  // Auto-save al cambiar campos
  const form = document.getElementById('miComercioForm');
  if (form) {
    form.querySelectorAll('input, textarea, select').forEach(field => {
      field.addEventListener('blur', debounce(handleAutoSave, 1000));
    });
  }

  // Logout
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', handleLogout);
  }
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
      showToast('Campos requeridos', 'Por favor completa todos los campos marcados como obligatorios', 'warning');
    }

    return isValid;
  };
}

async function handleAutoSave() {
  try {
    await saveFormData(false);
  } catch (error) {
    console.error('Error en auto-save:', error);
  }
}

async function saveFormData(showSuccessToast = true) {
  const form = document.getElementById('miComercioForm');
  if (!form) return;

  const formData = new FormData(form);
  const updates = {};
  
  for (let [key, value] of formData.entries()) {
    updates[key] = value.trim();
  }

  // Agregar métodos de pago seleccionados
  const paymentMethods = Array.from(document.querySelectorAll('input[name="paymentMethods"]:checked'))
    .map(cb => cb.value);
  updates.paymentMethods = paymentMethods;

  await updateDoc(doc(db, "usuarios", currentUser.uid), {
    ...updates,
    fechaActualizacion: new Date()
  });

  try {
    await syncToGist();
  } catch (err) {
    console.error("No se pudo sincronizar JSON:", err);
  }

  userData = { ...userData, ...updates };

  if (showSuccessToast) {
    showToast('Guardado', 'Información actualizada correctamente', 'success');
  }

  updateHeader();
  
  if (updates.nombreComercio && updates.telefono && updates.direccion) {
    Navigation.markPageAsCompleted('mi-comercio');
    Navigation.updateProgressBar();
  }

  console.log('Datos guardados:', updates);
}

async function syncToGist() {
  try {
    const response = await fetch('/api/export-json', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId: currentUser.uid
      })
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const result = await response.json();
    console.log('JSON sincronizado:', result.gist?.rawUrl);
    return result;
  } catch (error) {
    console.error('Error sincronizando JSON:', error);
    throw error;
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

function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}
