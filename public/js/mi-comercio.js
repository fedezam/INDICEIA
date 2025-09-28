// mi-comercio.js - Versión corregida
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

      // Event listener para el botón de guardar
      const saveButton = document.getElementById('saveDataBtn');
      if (saveButton) {
        saveButton.addEventListener('click', async (e) => {
          e.preventDefault();
          await saveFormDataAndContinue(form);
        });
      }

      // Agregar event listeners para auto-save (opcional)
      form.querySelectorAll('input, textarea, select').forEach(field => {
        field.addEventListener('blur', debounce(async () => {
          await saveFormData(form, false); // false = no continuar a siguiente página
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
async function saveFormData(form, showToast = true) {
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
    if (showToast) {
      Utils.showToast('Guardado', 'Información actualizada correctamente', 'success');
    }
    
    return true;
  } catch (error) {
    console.error('❌ Error guardando:', error);
    Utils.showToast('Error', 'No se pudieron guardar los datos', 'error');
    return false;
  }
}

// 🛠️ Función para guardar y continuar a la siguiente página
async function saveFormDataAndContinue(form) {
  try {
    Utils.showLoading('Guardando datos...');
    
    // Primero validar campos requeridos
    const isValid = await window.validateCurrentPageData();
    if (!isValid) {
      Utils.hideLoading();
      return;
    }

    // Guardar datos
    const saved = await saveFormData(form, false);
    if (!saved) {
      Utils.hideLoading();
      return;
    }

    // Marcar como completada y ir a siguiente página
    if (window.Navigation) {
      Utils.hideLoading();
      Utils.showToast('¡Datos guardados!', 'Continuando a la siguiente sección...', 'success');
      
      setTimeout(() => {
        window.Navigation.goToNextPage();
      }, 1000);
    } else {
      Utils.hideLoading();
      Utils.showToast('Guardado', 'Datos guardados correctamente', 'success');
    }

  } catch (error) {
    Utils.hideLoading();
    console.error('❌ Error guardando y continuando:', error);
    Utils.showToast('Error', 'Hubo un problema al guardar', 'error');
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

// 🛠️ Esperar a que Firebase Auth esté completamente inicializado
async function waitForAuth() {
  return new Promise(async (resolve) => {
    // Si ya hay un usuario, resolver inmediatamente
    if (AuthHelpers.getCurrentUser()) {
      resolve();
      return;
    }

    // Usar onAuthStateChanged para esperar
    const { onAuthStateChanged } = await import('https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js');
    const { auth } = await import('../js/shared.js');
    
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe(); // Dejar de escuchar
      resolve(); // Resolver cuando auth esté listo (con o sin usuario)
    });

    // Timeout de seguridad (5 segundos máximo)
    setTimeout(() => {
      unsubscribe();
      resolve();
    }, 5000);
  });
}
