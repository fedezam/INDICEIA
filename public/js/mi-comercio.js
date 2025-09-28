// mi-comercio.js
import { auth, db, Utils } from './firebase.js';
import { doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', async () => {
  const loadingOverlay = document.getElementById('loadingOverlay');
  if (loadingOverlay) loadingOverlay.classList.add('show');

  // Verificar sesión activa
  auth.onAuthStateChanged(async (user) => {
    if (!user) {
      // No hay sesión, volver al login
      window.location.href = '/index.html';
      return;
    }

    const userRef = doc(db, 'usuarios', user.uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      console.error("No existe el documento del usuario");
      window.location.href = '/index.html';
      return;
    }

    const userData = userSnap.data();

    // Mostrar nombre del comercio y plan
    document.getElementById('commerceName').textContent = userData.nombreComercio || 'Mi Comercio';
    document.getElementById('planBadge').textContent = userData.plan || 'Trial';

    // Llenar formulario
    const form = document.getElementById('miComercioForm');
    if (form) {
      form.nombreComercio.value = userData.nombreComercio || '';
      form.direccion.value = userData.direccion || '';
      form.telefono.value = userData.telefono || '';
      form.ciudad.value = userData.ciudad || '';
      form.provincia.value = userData.provincia || '';
      form.pais.value = userData.pais || '';
      form.barrio.value = userData.barrio || '';
      form.descripcion.value = userData.descripcion || '';
    }

    // Guardar cambios al cambiar cada campo
    form.querySelectorAll('input, textarea').forEach(field => {
      field.addEventListener('change', async () => {
        const updates = {};
        Array.from(form.elements).forEach(el => {
          if (el.name) updates[el.name] = el.value;
        });
        try {
          await updateDoc(userRef, updates);
          Utils.showToast('Guardado', 'Datos actualizados correctamente', 'success');

          // Si tenés progress bar
          if (window.Navigation?.markPageAsCompleted) window.Navigation.markPageAsCompleted('mi-comercio');
          if (window.Navigation?.updateProgressBar) window.Navigation.updateProgressBar();
        } catch (err) {
          console.error(err);
          Utils.showToast('Error', 'No se pudieron guardar los datos', 'error');
        }
      });
    });

    // Logout
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) logoutBtn.addEventListener('click', async () => {
      Utils.showLoading('Cerrando sesión...');
      await auth.signOut();
      window.location.href = '/index.html';
    });

    if (loadingOverlay) loadingOverlay.classList.remove('show');
  });
});
