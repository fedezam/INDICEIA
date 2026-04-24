// ============================================================
// src/pages/usuario/usuario.js
// ============================================================

// ==================== SKELETON CORE ====================
import { runLifecycle }          from '/src/skeleton/lifecycle.js';
import { createFirebaseAdapter } from '/src/skeleton/adapters/firebaseAdapter.js';
import { mountLayout }           from '/src/skeleton/layout/index.js';

// ==================== FLOW ====================
import { runFlowController } from '/src/controllers/flowController.js';

// ==================== FIREBASE ====================
import { doc, updateDoc } from 'firebase/firestore';
import { db }             from '/src/firebase.js';

// ==================== ESTILOS ====================
import './usuario.css';

// ==================== COMPONENTES ====================
import { createFormField }        from '/src/skeleton/components/form-field/index.js';
import { createOnboardingButton } from '/src/skeleton/components/onboarding-button/index.js';
import { showToast }              from '/src/skeleton/components/toast/index.js';

// ==================== SHARED ====================
import { fillProvinciaSelector }   from '/src/shared/provincias.js';
import { mountCiudadAutocomplete } from '/src/shared/ciudades.js';
import { getCiudadesCercanas }     from '/src/shared/geo-helpers.js';

// ==================== ADAPTER ====================
const adapter = (options) => createFirebaseAdapter(options);

// ==================== LIFECYCLE ====================
runLifecycle({
  adapter,
  options: {
    loadingMessage: 'Cargando datos de usuario...',
  },

  async onReady(ctx) {
    await runFlowController(ctx.user.uid);
    mountLayout(ctx);
    const state = await load(ctx);
    render(ctx, state);
  }
});

// ============================================================
// LOAD
// ============================================================
async function load(ctx) {
  const userData   = ctx.userData || {};
  const isEditMode = window.isEditMode === true;
  console.log('📦 Usuario cargado:', userData);
  return { userData, isEditMode };
}

// ============================================================
// RENDER
// ============================================================
function render(ctx, state) {
  const { userData, isEditMode } = state;

  if (userData.localidad?.id) {
    const cercanas = getCiudadesCercanas(userData.localidad.id);
    console.log('📍 Ciudades cercanas:', cercanas);
  }

  const page = document.getElementById('skeleton-page');
  page.innerHTML = '';

  const refs = {
    localidadSeleccionada: userData.localidad || null,
  };

  // ── Título ────────────────────────────────────────────────
  const title = document.createElement('h2');
  title.className   = 'page-title';
  title.textContent = 'Datos personales';
  page.appendChild(title);

  // ── Campos ────────────────────────────────────────────────
  const nombre = createFormField({
    label: 'Nombre', name: 'nombre', required: true,
    value: userData.nombre || ''
  });

  const apellido = createFormField({
    label: 'Apellido', name: 'apellido', required: true,
    value: userData.apellido || ''
  });

  const mail = createFormField({
    label: 'Email', name: 'mail', type: 'email', required: false,
    value: userData.mail || '',
    disabled: true
  });

  const fechaNacimiento = createFormField({
    label: 'Fecha de nacimiento', name: 'fechaNacimiento',
    placeholder: 'DD/MM/AAAA', required: true,
    value: userData.fechaNacimiento ? isoToFecha(userData.fechaNacimiento) : ''
  });

  const telefono = createFormField({
    label: 'Teléfono', name: 'telefono', required: true,
    value: userData.telefono || ''
  });

  // ── PAÍS ──────────────────────────────────────────────────
  const pais = createFormField({
    label: 'País', name: 'pais', value: 'Argentina', disabled: true
  });

  // ── PROVINCIA ─────────────────────────────────────────────
  const provincia = createFormField({
    label: 'Provincia', type: 'select', name: 'provincia', required: true
  });
  fillProvinciaSelector('Argentina', provincia.input);
  if (userData.provincia) {
    setTimeout(() => { provincia.input.value = userData.provincia; }, 0);
  }

  // ── LOCALIDAD (autocomplete) ───────────────────────────────
  const localidadLabel = document.createElement('label');
  localidadLabel.className   = 'form-field-label';
  localidadLabel.textContent = 'Localidad *';

  const localidadContainer = document.createElement('div');
  localidadContainer.className = 'ciudad-autocomplete-container';

  function montarLocalidad(provinciaVal, valorActual = '') {
    mountCiudadAutocomplete(provinciaVal, localidadContainer, valorActual, (localidad) => {
      refs.localidadSeleccionada = localidad;
      document.dispatchEvent(new Event('change'));
    });
  }

  if (userData.provincia) {
    montarLocalidad(userData.provincia, userData.localidad || '');
  }

  provincia.input.addEventListener('change', () => {
    refs.localidadSeleccionada = null;
    montarLocalidad(provincia.input.value);
  });

  // ── DIRECCIÓN ─────────────────────────────────────────────
  const direccion = createFormField({
    label: 'Dirección', name: 'direccion', required: true,
    value: userData.direccion || ''
  });

  page.append(
    nombre, apellido, mail, fechaNacimiento, telefono,
    pais, provincia, localidadLabel, localidadContainer, direccion
  );

  // ── SNAPSHOT + getCurrentState ────────────────────────────
  const initialSnapshot = {
    nombre:          userData.nombre          || '',
    apellido:        userData.apellido        || '',
    fechaNacimiento: userData.fechaNacimiento ? isoToFecha(userData.fechaNacimiento) : '',
    telefono:        userData.telefono        || '',
    provincia:       userData.provincia       || '',
    localidad:       userData.localidad       || '',
    direccion:       userData.direccion       || '',
  };

  function getCurrentState() {
    return {
      nombre:          nombre.input.value.trim(),
      apellido:        apellido.input.value.trim(),
      fechaNacimiento: fechaNacimiento.input.value.trim(),
      telefono:        telefono.input.value.trim(),
      provincia:       provincia.input.value.trim(),
      localidad:       refs.localidadSeleccionada || '',
      direccion:       direccion.input.value.trim(),
    };
  }

  // ── dirtyController — solo en editMode ───────────────────
  const dirtyController = {
    hasUnsavedChanges() {
      const current = getCurrentState();
      return Object.keys(initialSnapshot).some(k => current[k] !== initialSnapshot[k]);
    },
    markSaved() {
      const current = getCurrentState();
      Object.keys(initialSnapshot).forEach(k => {
        initialSnapshot[k] = current[k];
      });
    }
  };

  // ── Botón ─────────────────────────────────────────────────
  const btnContainer = document.createElement('div');
  btnContainer.className = 'btn-container';

  btnContainer.appendChild(
    createOnboardingButton({
      stepName: 'usuario',

      // Solo en editMode el botón sabe si hay cambios o no.
      // En onboarding normal no se pasa → el botón siempre guarda.
      dirtyController: isEditMode ? dirtyController : undefined,

      validate() {
        const current = getCurrentState();
        const valid = (
          current.nombre          !== '' &&
          current.apellido        !== '' &&
          current.fechaNacimiento !== '' &&
          current.telefono        !== '' &&
          current.provincia       !== '' &&
          current.localidad       !== '' &&
          current.direccion       !== ''
        );
        console.log('🔍 Validación:', valid ? 'OK ✅' : 'FALTAN DATOS ❌');
        return valid;
      },

      getLabel() {
        if (!isEditMode) return 'Continuar';
        return dirtyController.hasUnsavedChanges()
          ? 'Guardar y volver al dashboard'
          : 'Volver al dashboard';
      },

      // FIX: usuario escribe en "usuarios", no en "entidades".
      // markStepCompleted del botón escribe en entidades → no sirve acá.
      // Hacemos todo en onSave y retornamos stepMarked: true.
      async onSave({ uid, persistence }) {
        const data = {
          nombre:          nombre.input.value.trim(),
          apellido:        apellido.input.value.trim(),
          fechaNacimiento: fechaToISO(fechaNacimiento.input.value),
          telefono:        telefono.input.value.trim(),
          pais:            'Argentina',
          provincia:       provincia.input.value.trim(),
          localidad:       refs.localidadSeleccionada || '',
          direccion:       direccion.input.value.trim(),
        };

        // Datos del usuario
        await persistence.updateUserData(data);

        // Step "usuario" vive en usuarios.onboardingSteps, no en entidades
        await updateDoc(doc(db, 'usuarios', uid), {
          'onboardingSteps.usuario': true,
        });

        return { success: true, stepMarked: true };
      },

      onSuccess: () => {
        showToast(
          isEditMode ? 'Datos actualizados' : 'Datos guardados',
          'success'
        );
      },

      onError: (err) => {
        console.error('[usuario] onSave ERROR:', err);
        showToast('Error al guardar los datos', 'error');
      },

      // Siempre intenta ir al dashboard.
      // FlowController redirige al siguiente step si el pipeline no está completo.
      redirectTo: '/dashboard.html',
    })
  );

  page.appendChild(btnContainer);
  console.log('✅ Página usuario renderizada');
}

// ============================================================
// HELPERS
// ============================================================
function fechaToISO(s) {
  if (!s || !s.includes('/')) return null;
  const [d, m, y] = s.split('/');
  if (!d || !m || !y || y.length !== 4) return null;
  return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
}

function isoToFecha(s) {
  if (!s) return '';
  const [y, m, d] = s.split('-');
  return `${d}/${m}/${y}`;
}
