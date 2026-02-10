import { runSkeleton } from '../skeleton/skeleton.js';
import { createFirebaseAdapter } from '../skeleton/adapters/firebaseAdapter.js';
import { createFormField } from '../skeleton/components/form-field/index.js';
import { createOnboardingButton } from '../skeleton/components/onboarding-button/index.js';
import { showToast } from '../skeleton/components/toast/index.js';
import { fillProvinciaSelector } from '../shared/provincias.js';

const usuarioPage = {
  async load(ctx) {
    this.ctx = ctx;
    this.userData = ctx.userData || {};
    console.log('📦 Usuario cargado:', this.userData);
  },

  render() {
    const page = document.getElementById('skeleton-page');
    page.innerHTML = '';

    const title = document.createElement('h2');
    title.textContent = 'Datos personales';
    page.appendChild(title);

    this.nombre = createFormField({
      label: 'Nombre',
      name: 'nombre',
      required: true,
      value: this.userData.nombre || ''
    });

    this.apellido = createFormField({
      label: 'Apellido',
      name: 'apellido',
      required: true,
      value: this.userData.apellido || ''
    });

    this.fechaNacimiento = createFormField({
      label: 'Fecha de nacimiento',
      name: 'fechaNacimiento',
      placeholder: 'DD/MM/AAAA',
      required: true,
      value: this.userData.fechaNacimiento
        ? isoToFecha(this.userData.fechaNacimiento)
        : ''
    });

    this.telefono = createFormField({
      label: 'Teléfono',
      name: 'telefono',
      required: true,
      value: this.userData.telefono || ''
    });

    this.provincia = createFormField({
      label: 'Provincia',
      type: 'select',
      name: 'provincia',
      required: true
    });

    this.localidad = createFormField({
      label: 'Localidad',
      name: 'localidad',
      required: true,
      value: this.userData.localidad || ''
    });

    this.direccion = createFormField({
      label: 'Dirección',
      name: 'direccion',
      required: true,
      value: this.userData.direccion || ''
    });

    page.append(
      this.nombre,
      this.apellido,
      this.fechaNacimiento,
      this.telefono,
      this.provincia,
      this.localidad,
      this.direccion
    );

    // Llenar provincias
    const provinciaSelect = this.provincia.input;
    fillProvinciaSelector('Argentina', provinciaSelect);
    
    // Restaurar valor si existe
    if (this.userData.provincia) {
      setTimeout(() => {
        provinciaSelect.value = this.userData.provincia;
      }, 0);
    }

    // 🔽 BOTÓN UNIVERSAL DE ONBOARDING
    const btnGuardar = createOnboardingButton({
      stepName: 'usuario',

      getData: () => {
        // ✅ Usar usuarioPage en vez de this
        const fechaISO = fechaToISO(usuarioPage.fechaNacimiento.input.value);
        
        return {
          nombre: usuarioPage.nombre.input.value.trim(),
          apellido: usuarioPage.apellido.input.value.trim(),
          fechaNacimiento: fechaISO,
          telefono: usuarioPage.telefono.input.value.trim(),
          provincia: usuarioPage.provincia.input.value.trim(),
          localidad: usuarioPage.localidad.input.value.trim(),
          direccion: usuarioPage.direccion.input.value.trim(),
          pais: 'Argentina'
        };
      },

      validate: () => {
        // ✅ Usar usuarioPage en vez de this
        // Validación defensiva: Verificar que los inputs existan primero
        if (!usuarioPage.nombre?.input || 
            !usuarioPage.apellido?.input || 
            !usuarioPage.fechaNacimiento?.input || 
            !usuarioPage.telefono?.input || 
            !usuarioPage.provincia?.input || 
            !usuarioPage.localidad?.input || 
            !usuarioPage.direccion?.input) {
          console.log('⏳ Inputs aún no inicializados');
          return false;
        }

        const valid = (
          usuarioPage.nombre.input.value.trim() !== '' &&
          usuarioPage.apellido.input.value.trim() !== '' &&
          usuarioPage.fechaNacimiento.input.value.trim() !== '' &&
          usuarioPage.telefono.input.value.trim() !== '' &&
          usuarioPage.provincia.input.value.trim() !== '' &&
          usuarioPage.localidad.input.value.trim() !== '' &&
          usuarioPage.direccion.input.value.trim() !== ''
        );
        
        console.log('🔍 Validación:', valid ? 'OK ✅' : 'FALTAN DATOS ❌');
        return valid;
      }
    });

    page.appendChild(btnGuardar);
    
    console.log('✅ Página usuario renderizada');
  }
};

/* ============================
   HELPERS
============================ */
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

/* ============================
   RUN
============================ */
runSkeleton({
  page: usuarioPage,
  adapter: createFirebaseAdapter,
  options: {
    debug: true,
    loadingMessage: 'Cargando datos de usuario...'
  }
});
