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
// ELIMINADO: import { mountCiudadAutocomplete } from '/src/shared/ciudades.js'; 
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
  const isEditMode = new URLSearchParams(window.location.search).get('edit') === 'true';
  console.log(' Usuario cargado:', userData);
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
    fields: {}, // Usamos un objeto fields para consistencia con mi-comercio
    localidadSeleccionada: userData.localidad || null,
  };

  // ── Título ────────────────────────────────────────────────
  const title = document.createElement('h2');
  title.className   = 'page-title';
  title.textContent = 'Datos personales';
  page.appendChild(title);

  // ── Campos Básicos ────────────────────────────────────────
  refs.fields.nombre = createFormField({
    label: 'Nombre', name: 'nombre', required: true,
    value: userData.nombre || ''
  });

  refs.fields.apellido = createFormField({
    label: 'Apellido', name: 'apellido', required: true,
    value: userData.apellido || ''
  });

  refs.fields.mail = createFormField({
    label: 'Email', name: 'mail', type: 'email', required: false,
    value: userData.mail || '',
    disabled: true
  });

  refs.fields.fechaNacimiento = createFormField({
    label: 'Fecha de nacimiento', name: 'fechaNacimiento',
    placeholder: 'DD/MM/AAAA', required: true,
    value: userData.fechaNacimiento ? isoToFecha(userData.fechaNacimiento) : ''
  });

  refs.fields.telefono = createFormField({
    label: 'Teléfono', name: 'telefono', required: true,
    value: userData.telefono || ''
  });

  // ── PAÍS ──────────────────────────────────────────────────
  refs.fields.pais = createFormField({
    label: 'País', name: 'pais', value: 'Argentina', disabled: true
  });

  // ── PROVINCIA ─────────────────────────────────────────────
  refs.fields.provincia = createFormField({
    label: 'Provincia', type: 'select', name: 'provincia', required: true
  });
  fillProvinciaSelector('Argentina', refs.fields.provincia.input);
  
  // Setear valor inicial si existe
  if (userData.provincia) {
    refs.fields.provincia.input.value = userData.provincia;
  }
  
  page.append(
    refs.fields.nombre, 
    refs.fields.apellido, 
    refs.fields.mail, 
    refs.fields.fechaNacimiento, 
    refs.fields.telefono,
    refs.fields.pais, 
    refs.fields.provincia
  );

  // ── LOCALIDAD (AHORA USANDO CREATEFORMFIELD NATIVO) ───────
  
  // Helper para crear/actualizar el campo localidad
  const crearCampoLocalidad = (provincia, valorInicial) => {
    if (refs.fields.localidad) {
      refs.fields.localidad.remove();
    }

    refs.fields.localidad = createFormField({
      label: 'Localidad',
      name: 'localidad',
      type: 'autocomplete',       // ← Tipo especial del Skeleton
      required: true,
      provincia: provincia,       // ← Pasa la provincia para filtrar
      value: valorInicial,        // ← Soporta string u objeto {id, nombre}
      placeholder: provincia ? 'Buscá tu localidad...' : 'Primero elegí una provincia',
      onChange: (localidadObj) => {
        refs.localidadSeleccionada = localidadObj;
        document.dispatchEvent(new Event('change'));
      }
    });
    
    // Insertamos antes de Dirección
    page.insertBefore(refs.fields.localidad, refs.fields.direccion);
  };

  // Inicializar localidad si hay provincia
  const provinciaActual = userData.provincia || '';
  if (provinciaActual) {
    crearCampoLocalidad(provinciaActual, userData.localidad);
  } else {
    // Crear campo deshabilitado hasta elegir provincia
    crearCampoLocalidad(null, '');
  }

  // Listener para cuando cambia la provincia
  refs.fields.provincia.input.addEventListener('change', (e) => {
    const nuevaProvincia = e.target.value;
    refs.localidadSeleccionada = null;
    
    // Recrear el campo localidad con la nueva provincia
    crearCampoLocalidad(nuevaProvincia, '');
    
    document.dispatchEvent(new Event('change'));
  });

  // ── DIRECCIÓN ─────────────────────────────────────────────
  refs.fields.direccion = createFormField({
    label: 'Dirección', name: 'direccion', required: true,
    value: userData.direccion || ''
  });
  
  // Agregar dirección al final (ya que localidad se inserta dinámicamente antes)
  page.appendChild(refs.fields.direccion);

  // ── SNAPSHOT + getCurrentState ────────────────────────────
  const initialSnapshot = {
    nombre:          userData.nombre          || '',
    apellido:        userData.apellido        || '',
    fechaNacimiento: userData.fechaNacimiento ? isoToFecha(userData.fechaNacimiento) : '',
    telefono:        userData.telefono        || '',
    provincia:       userData.provincia       || '',
    localidad:       userData.localidad       || '', // Ojo: esto puede ser objeto o string
    direccion:       userData.direccion       || '',
  };

  function getCurrentState() {
    return {
      nombre:          refs.fields.nombre.input.value.trim(),
      apellido:        refs.fields.apellido.input.value.trim(),
      fechaNacimiento: refs.fields.fechaNacimiento.input.value.trim(),
      telefono:        refs.fields.telefono.input.value.trim(),
      provincia:       refs.fields.provincia.input.value.trim(),
      localidad:       refs.localidadSeleccionada || '', // Ahora es consistente con el objeto devuelto por autocomplete
      direccion:       refs.fields.direccion.input.value.trim(),
    };
  }

  // ── dirtyController — solo en editMode ───────────────────
  const dirtyController = {
    hasUnsavedChanges() {
      const current = getCurrentState();
      // Comparación simple para strings, para localidad podrías comparar IDs si es objeto
      return Object.keys(initialSnapshot).some(k => {
        const currVal = current[k];
        const initVal = initialSnapshot[k];
        
        // Si localidad es objeto en current pero string en initial, comparamos nombres o IDs
        if (k === 'localidad') {
            const currId = typeof currVal === 'object' ? currVal?.id : currVal;
            const initId = typeof initVal === 'object' ? initVal?.id : initVal;
            return currId !== initId;
        }
        return currVal !== initVal;
      });
    },
    markSaved() {
      const current = getCurrentState();
      Object.keys(initialSnapshot).forEach(k => {
        initialSnapshot[k] = current[k];
      });
    }
  };

  // ── Botón ────────────────────────────────────────────────
  const btnContainer = document.createElement('div');
  btnContainer.className = 'btn-container';

  btnContainer.appendChild(
    createOnboardingButton({
      stepName: 'usuario',
      dirtyController: isEditMode ? dirtyController : undefined,

      validate() {
        const current = getCurrentState();
        // Validación robusta: localidad puede ser objeto, verificamos que exista
        const localidadValida = current.localidad && (typeof current.localidad === 'object' ? current.localidad.nombre : current.localidad !== '');
        
        const valid = (
          current.nombre          !== '' &&
          current.apellido        !== '' &&
          current.fechaNacimiento !== '' &&
          current.telefono        !== '' &&
          current.provincia       !== '' &&
          localidadValida         &&
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

      async onSave({ uid, persistence }) {
        const data = {
          nombre:          refs.fields.nombre.input.value.trim(),
          apellido:        refs.fields.apellido.input.value.trim(),
          fechaNacimiento: fechaToISO(refs.fields.fechaNacimiento.input.value),
          telefono:        refs.fields.telefono.input.value.trim(),
          pais:            'Argentina',
          provincia:       refs.fields.provincia.input.value.trim(),
          // Guardamos el objeto completo de localidad si existe, sino el string
          localidad:       refs.localidadSeleccionada || '', 
          direccion:       refs.fields.direccion.input.value.trim(),
        };

        // Datos del usuario
        await persistence.updateUserData(data);

        // Step "usuario" vive en usuarios.onboardingSteps
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
