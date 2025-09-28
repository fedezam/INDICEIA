// mi-comercio.js
import { LocalData, FirebaseHelpers, Utils, AppInit } from './shared.js';

document.addEventListener('DOMContentLoaded', async () => {
  // 1️⃣ Inicializar datos compartidos
  const userData = await AppInit.initSharedData();
  if (!userData) return;

  // 2️⃣ Mostrar nombre del comercio y plan
  const commerceName = document.getElementById('commerceName');
  const planBadge = document.getElementById('planBadge');
  if (commerceName) commerceName.textContent = userData.nombreComercio || 'Mi Comercio';
  if (planBadge) planBadge.textContent = userData.plan || 'Trial';

  // 3️⃣ Llenar formulario con datos existentes
  const form = document.getElementById('miComercioForm');
  if (form) {
    form.querySelectorAll('input, textarea').forEach(field => {
      field.value = userData[field.name] || '';
      
      // Guardado automático al cambiar el campo
      field.addEventListener('change', async () => {
        const updates = {};
        Array.from(form.elements).forEach(el => {
          if (el.name) updates[el.name] = el.value;
        });

        try {
          await FirebaseHelpers.updateUserData(updates);
          LocalData.updateSharedData({ userData: updates });
          Utils.showToast('Guardado', 'Datos actualizados correctamente', 'success');

          // Actualizar progreso si tienes Navigation
          if (window.Navigation) {
            window.Navigation.markPageAsCompleted('mi-comercio');
            window.Navigation.updateProgressBar();
          }
        } catch (error) {
          Utils.showToast('Error', 'No se pudieron guardar los datos', 'error');
          console.error(error);
        }
      });
    });
  }

  // 4️⃣ Logout
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      Utils.showLoading('Cerrando sesión...');
      try {
        await FirebaseHelpers.logout();
        window.location.href = '/index.html';
      } catch (error) {
        Utils.hideLoading();
        Utils.showToast('Error', 'No se pudo cerrar sesión', 'error');
      }
    });
  }

  // 5️⃣ Validación de página (Navigation)
  window.validateCurrentPageData = async () => {
    return Array.from(form.querySelectorAll('[required]')).every(f => f.value.trim() !== '');
  };
});

 
