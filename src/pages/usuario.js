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
import { fillProvinciaSelector } from '/src/shared/provincias.js';

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

  const provincia = createFormField({
    label: 'Provincia', type: 'select', name: 'provincia', required: true
  });

  const localidad = createFormField({
    label: 'Localidad', name: 'localidad', required: true,
    value: userData.localidad || ''
  });

  const direccion = createFormField({
    label: 'Dirección', name: 'direccion', required: true,
    value: userData.direccion || ''
  });

  page.append(nombre, apellido, mail, fechaNacimiento, telefono, provincia, localidad, direccion);

  fillProvinciaSelector('Argentina', provincia.input);

  if (userData.provincia) {
    setTimeout(() => { provincia.input.value = userData.provincia; }, 0);
  }

  const btnGuardar = createOnboardingButton({
    stepName: 'usuario',

    onSave: async ({ persistence }) => {
      const data = {
        nombre:          nombre.input.value.trim(),
        apellido:        apellido.input.value.trim(),
        fechaNacimiento: fechaToISO(fechaNacimiento.input.value),
        telefono:        telefono.input.value.trim(),
        provincia:       provincia.input.value.trim(),
        localidad:       localidad.input.value.trim(),
        direccion:       direccion.input.value.trim(),
        pais:            'Argentina'
      };
      await persistence.updateUserData(data);
      return true;
    },

    validate: () => {
      if (!nombre?.input || !apellido?.input || !fechaNacimiento?.input ||
          !telefono?.input || !provincia?.input || !localidad?.input || !direccion?.input) {
        console.log('⏳ Inputs aún no inicializados');
        return false;
      }

      const valid = (
        nombre.input.value.trim()          !== '' &&
        apellido.input.value.trim()        !== '' &&
        fechaNacimiento.input.value.trim() !== '' &&
        telefono.input.value.trim()        !== '' &&
        provincia.input.value.trim()       !== '' &&
        localidad.input.value.trim()       !== '' &&
        direccion.input.value.trim()       !== ''
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
