import { LocalData, FirebaseHelpers, Utils, AppInit } from './shared.js';

document.addEventListener('DOMContentLoaded', async () => {
  // Inicializar datos compartidos
  const userData = await AppInit.initSharedData();
  if (!userData) return;

  // Mostrar nombre del comercio y plan
  const commerceName = document.getElementById('commerceName');
  const planBadge = document.getElementById('planBadge');
  if (commerceName) commerceName.textContent = userData.nombreComercio || 'Mi Comercio';
  if (planBadge) planBadge.textContent = userData.plan || 'Trial';

  // Logout
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) logoutBtn.addEventListener('click', async () => {
    await Utils.showLoading('Cerrando sesión...');
    await FirebaseHelpers.logout();
    window.location.href = '/index.html';
  });

  // Llenar form con datos existentes
  const form = document.getElementById('miComercioForm');
  if (form && userData) {
    form.nombreComercio.value = userData.nombreComercio || '';
    form.direccion.value = userData.direccion || '';
    form.telefono.value = userData.telefono || '';
    form.ciudad.value = userData.ciudad || '';
    form.provincia.value = userData.provincia || '';
    form.pais.value = userData.pais || '';
    form.barrio.value = userData.barrio || '';
    form.descripcion.value = userData.descripcion || '';
  }

  // Guardar cambios automáticamente al salir del campo
  form.querySelectorAll('input, textarea').forEach(field => {
    field.addEventListener('change', async () => {
      const updates = {};
      Array.from(form.elements).forEach(el => {
        if (el.name) updates[el.name] = el.value;
      });
      try {
        await FirebaseHelpers.updateUserData(updates);
        LocalData.updateSharedData({ userData: updates });
        Utils.showToast('Guardado', 'Datos actualizados correctamente', 'success');
        // Actualizar progress
        window.Navigation.markPageAsCompleted('mi-comercio');
        window.Navigation.updateProgressBar();
      } catch (error) {
        Utils.showToast('Error', 'No se pudieron guardar los datos', 'error');
      }
    });
  });

  // Definir validación para Navigation
  window.validateCurrentPageData = async () => {
    return Array.from(form.querySelectorAll('[required]')).every(f => f.value.trim() !== '');
  };
});
