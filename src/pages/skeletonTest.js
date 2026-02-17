// ============================================================
// src/pages/usuario/usuario.js
// ============================================================
// 🧠 CONTRATO DE CONTEXTO (ctx)
//   ctx.userData  → doc de Firestore: /usuarios/{uid}
// ============================================================

// ==================== SKELETON CORE ====================
import { runLifecycle }          from '/src/skeleton/lifecycle.js';
import { createFirebaseAdapter } from '/src/skeleton/adapters/firebaseAdapter.js';
import { mountLayout }           from '/src/skeleton/layout/index.js';

// ==================== ESTILOS ====================
import './skeletonTest.css';

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
    // 1️⃣ LAYOUT
    mountLayout(ctx);

    // 2️⃣ LOAD
    const state = await load(ctx);

    // 3️⃣ RENDER
    render(ctx, state);
  }
});

// ============================================================
// LOAD — solo datos, sin tocar el DOM
// ============================================================
async function load(ctx) {
  const userData = ctx.userData || {};
  console.log('📦 Usuario cargado:', userData);
  return { userData };
}

// ============================================================
// RENDER — solo DOM, sin lógica de negocio
// ============================================================
function render(ctx, state) {
  const { userData } = state;

  const page = document.getElementById('skeleton-page');
  page.innerHTML = '';

  // ==================== TÍTULO ====================
  const title = document.createElement('h2');
  title.textContent = 'Datos personales';
  page.appendChild(title);

  // ==================== CAMPOS ====================
  const nombre = createFormField({
    label: 'Nombre',
    name: 'nombre',
    required: true,
    value: userData.nombre || ''
  });

  const apellido = createFormField({
    label: 'Apellido',
    name: 'apellido',
    required: true,
    value: userData.apellido || ''
  });

  const fechaNacimiento = createFormField({
    label: 'Fecha de nacimiento',
    name: 'fechaNacimiento',
    placeholder: 'DD/MM/AAAA',
    required: true,
    value: userData.fechaNacimiento ? isoToFecha(userData.fechaNacimiento) : ''
  });

  const telefono = createFormField({
    label: 'Teléfono',
    name: 'telefono',
    required: true,
    value: userData.telefono || ''
  });

  const provincia = createFormField({
    label: 'Provincia',
    type: 'select',
    name: 'provincia',
    required: true
  });

  const localidad = createFormField({
    label: 'Localidad',
    name: 'localidad',
    required: true,
    value: userData.localidad || ''
  });

  const direccion = createFormField({
    label: 'Dirección',
    name: 'direccion',
    required: true,
    value: userData.direccion || ''
  });

  page.append(nombre, apellido, fechaNacimiento, telefono, provincia, localidad, direccion);

  // Llenar provincias
  fillProvinciaSelector('Argentina', provincia.input);

  // Restaurar valor si existe
  if (userData.provincia) {
    setTimeout(() => {
      provincia.input.value = userData.provincia;
    }, 0);
  }

  // ==================== BOTÓN ONBOARDING ====================
  const btnGuardar = createOnboardingButton({
    stepName: 'usuario',

    getData: () => ({
      nombre:          nombre.input.value.trim(),
      apellido:        apellido.input.value.trim(),
      fechaNacimiento: fechaToISO(fechaNacimiento.input.value),
      telefono:        telefono.input.value.trim(),
      provincia:       provincia.input.value.trim(),
      localidad:       localidad.input.value.trim(),
      direccion:       direccion.input.value.trim(),
      pais:            'Argentina'
    }),

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
