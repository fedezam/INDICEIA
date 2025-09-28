// mi-comercio.js
import { LocalData, FirebaseHelpers, AuthHelpers, Utils, AppInit } from '../js/shared.js';

document.addEventListener('DOMContentLoaded', async () => {
  console.log('🚀 Iniciando mi-comercio.js');

  try {
    // 1️⃣ Verificar autenticación
    if (!AuthHelpers.requireAuth()) {
      console.error('❌ Usuario no autenticado');
      return;
    }

    // 2️⃣ Mostrar loading mientras carga
    Utils.showLoading('Cargando datos del comercio...');

    // 3️⃣ Inicializar datos compartidos
    const userData = await AppInit.initSharedData();
    if (!userData) {
      console.error('❌ No se pudieron cargar los datos del usuario');
      Utils.hideLoading();
      Utils.showToast('Error', 'No se pudieron cargar los datos', 'error');
      return;
    }

    console.log('✅ Datos de usuario cargados:', userData);

    // 4️⃣ Mostrar nombre del comercio y plan en header
    const commerceName = document.getElementById('commerceName');
    const planBadge = document.getElementById('planBadge');
    
    if (commerceName) {
      commerceName.textContent = userData.nombreComercio || 'Mi Comercio';
    }
    if (planBadge) {
      planBadge.textContent = userData.plan || 'Trial';
    }

    // 5️⃣ Llenar formulario con datos existentes
    const form = document.getElementById('miComercioForm');
    if (form) {
      // Llenar campos con datos existentes
      form.querySelectorAll('input, textarea, select').forEach(field => {
        if (field.name && userData[field.name]) {
          field.value = userData[field.name];
        }
      });

      // Agregar event listeners para auto-save
      form.querySelectorAll('input, textarea, select').forEach(field => {
        field.addEventListener('blur', debounce(async () => {
          await saveFormData(form);
        }, 500));
      });

      console.log('✅ Formulario inicializado');
    }

    // 6️⃣ Botón logout
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        
        if (confirm('¿Estás seguro que deseas cerrar sesión?')) {
          Utils.showLoading('Cerrando sesión...');
          try {
            await AuthHelpers.logout(); // Corregido: era FirebaseHelpers.logout()
            window.location.href = '/index.html';
          } catch (error) {
            Utils.hideLoading();
            Utils.showToast('Error', 'No se pudo cerrar sesión', 'error');
            console.error('Error logout:', error);
          }
        }
      });
    }

    // 7️⃣ Función de validación para Navigation
    window.validateCurrentPageData = async () => {
      const form = document.getElementById('miComercioForm');
      if (!form) return false;

      const requiredFields = form.querySelectorAll('[required]');
      const isValid = Array.from(requiredFields).every(field => {
        const value = field.value.trim();
        if (!value) {
          field.classList.add('error');
          return false;
        } else {
          field.classList.remove('error');
          return true;
        }
      });

      if (!isValid) {
        Utils.showToast('Campos requeridos', 'Por favor completa todos los campos marcados como obligatorios', 'warning');
      }

      return isValid;
    };

    Utils.hideLoading();
    console.log('✅ mi-comercio.js cargado completamente');

  } catch (error) {
    Utils.hideLoading();
    console.error('❌ Error en mi-comercio.js:', error);
    Utils.showToast('Error', 'Hubo un problema al cargar la página', 'error');
  }
});

// 🛠️ Función para guardar datos del formulario
async function saveFormData(form) {
  try {
    const formData = new FormData(form);
    const updates = {};
    
    // Convertir FormData a objeto
    for (let [key, value] of formData.entries()) {
      updates[key] = value.trim();
    }

    console.log('💾 Guardando datos:', updates);

    // Guardar en Firebase
    await FirebaseHelpers.updateUserData(updates);
    
    // Actualizar localStorage
    LocalData.updateSharedData({ userData: updates });
    
    // Marcar sección como completada si tiene datos básicos
    if (updates.nombreComercio && updates.telefono) {
      if (window.Navigation) {
        window.Navigation.markPageAsCompleted('mi-comercio');
        window.Navigation.updateProgressBar();
      }
    }

    // Mostrar toast de confirmación
    Utils.showToast('Guardado', 'Información actualizada correctamente', 'success');
    
  } catch (error) {
    console.error('❌ Error guardando:', error);
    Utils.showToast('Error', 'No se pudieron guardar los datos', 'error');
  }
}

// 🛠️ Debounce helper para evitar demasiados saves
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
