// mi-comercio-standalone.js - Versión más simple y independiente
import { auth, db } from '../js/firebase.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js';
import { doc, getDoc, updateDoc } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js';

// Variables globales
let currentUser = null;
let userData = {};

document.addEventListener('DOMContentLoaded', async () => {
  console.log('🚀 Iniciando mi-comercio.js (versión standalone)');

  // Usar onAuthStateChanged - la forma más confiable
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

    // 1️⃣ Cargar datos del usuario
    await loadUserData();

    // 2️⃣ Llenar header
    updateHeader();

    // 3️⃣ Llenar formulario
    fillForm();

    // 4️⃣ Setup event listeners
    setupEventListeners();

    // 5️⃣ Setup navigation
    setupNavigation();

    hideLoading();
    console.log('✅ Página inicializada correctamente');

  } catch (error) {
    hideLoading();
    console.error('❌ Error inicializando página:', error);
    showToast('Error', 'Hubo un problema al cargar la página', 'error');
  }
}

async function loadUserData() {
  try {
    const userDoc = await getDoc(doc(db, "usuarios", currentUser.uid));
    if (userDoc.exists()) {
      userData = { id: currentUser.uid, ...userDoc.data() };
      console.log('✅ Datos de usuario cargados:', userData);
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

  console.log('✅ Formulario llenado con datos existentes');
}

function setupEventListeners() {
  // Botón guardar
  const saveBtn = document.getElementById('saveDataBtn');
  if (saveBtn) {
    saveBtn.addEventListener('click', handleSaveAndContinue);
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
  // Progress bar simple
  updateProgressBar();
  
  // Validación para navigation
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

async function handleSaveAndContinue() {
  try {
    showLoading('Guardando datos...');

    // Validar
    const isValid = await window.validateCurrentPageData();
    if (!isValid) {
      hideLoading();
      return;
    }

    // Guardar
    await saveFormData();
    
    hideLoading();
    showToast('¡Datos guardados!', 'Redirigiendo a la siguiente sección...', 'success');
    
    // Simular navegación a productos (por ahora solo mostrar mensaje)
    setTimeout(() => {
      // window.location.href = '/dashboard/productos.html';
      showToast('Próximamente', 'La página de productos estará disponible pronto', 'info');
    }, 1500);

  } catch (error) {
    hideLoading();
    console.error('Error guardando:', error);
    showToast('Error', 'No se pudieron guardar los datos', 'error');
  }
}

async function handleAutoSave() {
  try {
    await saveFormData(false); // false = no mostrar toast
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

  // Guardar en Firestore
  await updateDoc(doc(db, "usuarios", currentUser.uid), {
    ...updates,
    fechaActualizacion: new Date()
  });

  // Actualizar datos locales
  userData = { ...userData, ...updates };

  if (showSuccessToast) {
    showToast('Guardado', 'Información actualizada correctamente', 'success');
  }

  // Actualizar header por si cambió el nombre del comercio
  updateHeader();
  
  // Actualizar progress si tiene datos básicos
  if (updates.nombreComercio && updates.telefono) {
    updateProgressBar(33); // 33% completado
  }

  console.log('💾 Datos guardados:', updates);
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

function updateProgressBar(percentage = 25) {
  const fillElement = document.getElementById('completionFill');
  const textElement = document.getElementById('completionText');
  
  if (fillElement) fillElement.style.width = `${percentage}%`;
  if (textElement) textElement.textContent = `${percentage}% completado`;

  // Actualizar steps
  const steps = document.querySelectorAll('.step');
  steps.forEach((step, index) => {
    if (index === 0) { // Mi Comercio
      step.classList.add('current');
    } else {
      step.classList.remove('current');
    }
  });
}

// Utility functions
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
