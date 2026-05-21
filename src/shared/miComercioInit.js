// src/shared/miComercioInit.js

import { auth, db } from '../firebase.js';
import { doc, getDoc, collection } from 'firebase/firestore';
import { renderLayout, updateHeaderInfo } from './layout.js';
import { initNavigation } from './navigation.js';
import { showToast, showLoading, hideLoading } from './utils.js';

/**
 * Inicialización especial para mi-comercio.html
 * Esta página NO usa dataPageSkeleton porque es donde se CREA el comercio
 */
export async function runMiComercioPage(pageModule) {
  let currentUser = null;
  let currentComercioId = null;
  let comercioData = {};
  let userData = {};
  let isNewComercio = false;

  // ---------- AUTH ----------
  auth.onAuthStateChanged(async (user) => {
    if (!user) {
      window.location.href = '/login.html';
      return;
    }

    currentUser = user;

    try {
      await user.getIdToken();
    } catch {
      await auth.signOut();
      window.location.href = '/login.html';
      return;
    }

    await init();
  });

  // ---------- INIT ----------
  async function init() {
    try {
      showLoading('Cargando...');

      // Renderizar layout
      renderLayout();
      initNavigation();

      // Obtener datos del usuario
      const userRef = doc(db, 'usuarios', currentUser.uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        showToast('Error', 'Usuario no encontrado', 'error');
        window.location.href = '/login.html';
        return;
      }

      userData = userSnap.data();

      // Verificar que haya completado los pasos previos
      if (!userData.onboardingSteps?.usuario) {
        showToast('Error', 'Primero completá tus datos personales', 'warning');
        window.location.href = '/usuario.html';
        return;
      }

      if (!userData.onboardingSteps?.['crear-entidad'] || !userData.offerType) {
        showToast('Error', 'Primero definí qué ofrece tu negocio', 'warning');
        window.location.href = '/crear-entidad.html';
        return;
      }

      // Verificar si ya tiene comercio creado
      if (userData.comercioId) {
        // Ya existe comercio → cargar datos
        currentComercioId = userData.comercioId;
        
        const comercioRef = doc(db, 'entidades', currentComercioId);
        const comercioSnap = await getDoc(comercioRef);

        if (comercioSnap.exists()) {
          comercioData = { id: currentComercioId, ...comercioSnap.data() };
          isNewComercio = false;
          console.log('✅ Comercio existente cargado:', currentComercioId);
        } else {
          // Tiene comercioId pero el documento no existe → error de integridad
          console.error('❌ comercioId existe pero documento no encontrado');
          currentComercioId = null;
          isNewComercio = true;
        }
      } else {
        // No tiene comercio → crear nuevo
        isNewComercio = true;
        // Generar ID único para el nuevo comercio
        currentComercioId = doc(collection(db, 'entidades')).id;
        
        comercioData = {
          id: currentComercioId,
          duenoId: currentUser.uid, // ✅ CAMPO CORRECTO PARA LAS REGLAS
          plan: 'trial',
          fechaCreacion: new Date(),
          onboardingSteps: {}
        };
        
        console.log('🆕 Nuevo comercio - ID generado:', currentComercioId);
      }

      // Actualizar header
      updateHeaderInfo(
        comercioData.nombre || 'Mi Comercio',
        { nombre: 'Trial', color: '#6366f1' }
      );

      // Cargar módulo de página
      await pageModule.load({
        currentComercioId,
        comercioData,
        isNewComercio,
        userData,
        currentUser
      });

      pageModule.render();
      setupButtons();
      hideLoading();

    } catch (err) {
      console.error('❌ Error en init:', err);
      hideLoading();
      showToast('Error', err.message, 'error');
    }
  }

  // ---------- BOTONES ----------
  function setupButtons() {
    const saveBtn = document.getElementById('saveChangesBtnBottom');
    if (!saveBtn) {
      console.warn('⚠️ Botón de guardado no encontrado');
      return;
    }

    // Click en guardar
    saveBtn.addEventListener('click', async () => {
      if (saveBtn.disabled) return;

      try {
        // Ejecutar save del módulo
        await pageModule.save();

        // Redirigir después del guardado exitoso
        setTimeout(() => {
          window.location.reload(); // El flowController redirigirá al siguiente paso
        }, 1000);

      } catch (err) {
        console.error('❌ Error guardando:', err);
        // El error ya se muestra en el método save()
      }
    });

    // Validación en tiempo real
    setInterval(() => {
      if (pageModule.isFormValid) {
        saveBtn.disabled = !pageModule.isFormValid();
      }
    }, 300);
  }
}
