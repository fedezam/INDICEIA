// ============================================================
// src/pages/usuario/usuario.js
// ============================================================

// ==================== SKELETON CORE ====================
import { runLifecycle }          from '/src/skeleton/lifecycle.js';
import { createFirebaseAdapter } from '/src/skeleton/adapters/firebaseAdapter.js';
import { mountLayout }           from '/src/skeleton/layout/index.js';

// ==================== FLOW ====================
import { runFlowController } from '/src/controllers/flowController.js';

// ==================== ESTILOS ====================
import './usuario.css';

// ==================== COMPONENTES ====================
import { createFormField }        from '/src/skeleton/components/form-field/index.js';
import { createOnboardingButton } from '/src/skeleton/components/onboarding-button/index.js';
import { showToast }              from '/src/skeleton/components/toast/index.js';

// ==================== SHARED ====================
import { fillProvinciaSelector }   from '/src/shared/provincias.js';
import { mountCiudadAutocomplete } from '/src/shared/ciudades.js';

// ==================== ADAPTER ====================
const adapter = (options) => createFirebaseAdapter(options);

// ==================== LIFECYCLE ====================
runLifecycle({
  adapter,
  options: {
    loadingMessage: 'Cargando datos de usuario...',
  },

  async onReady(ctx) {
    // 1️⃣ FLOW
    await runFlowController(ctx.user.uid);

    // 2️⃣ LAYOUT
    mountLayout(ctx);

    // 3️⃣ LOAD
    const state = await load(ctx);

    // 4️⃣ RENDER
    render(ctx, state);
  }
});

// ============================================================
// LOAD
// ============================================================
async function load(ctx) {
  const userData = ctx.userData || {};
  console.log('📦 Usuario cargado:', userData);
  return { userData };
}

// ============================================================
// RENDER
// ============================================================
function render(ctx, state) {
  const { userData } = state;

  const page = document.getElementById('skeleton-page');
  page.innerHTML = '';

  const refs = {
    localidadSeleccionada: userData.localidad || null,
  };

  const title = document.createElement('h2');
  title.textContent = 'Datos personales';
  page.appendChild(title);

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

  // ── DIRTY STATE ────────────────────────────────────────────
  const initialState = {
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

  function isDirty() {
    const current = getCurrentState();
    return Object.keys(initialState).some(k => current[k] !== initialState[k]);
  }

  // ──────────────────────────────────────────────────────────
  const btnGuardar = createOnboardingButton({
    stepName: 'usuario',

    onSave: async ({ persistence }) => {
      if (!isDirty()) {
        window.location.href = '/dashboard.html';
        return false;
      }
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
      await persistence.updateUserData(data);
      return true;
    },

    validate: () => {
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
    }
  });

  page.appendChild(btnGuardar);
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
