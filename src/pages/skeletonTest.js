import { runSkeleton } from '../skeleton/skeleton.js';
import { createFirebaseAdapter } from '../skeleton/adapters/firebaseAdapter.js';
import { createFormField } from '../skeleton/components/form-field/index.js';
import { createOnboardingButton } from '../skeleton/components/onboarding-button/index.js';  // ← CORREGIDO
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
        const fechaISO = fechaToISO(this.fechaNacimiento.input.value);
        
        return {
          nombre: this.nombre.input.value.trim(),
          apellido: this.apellido.input.value.trim(),
          fechaNacimiento: fechaISO,
          telefono: this.telefono.input.value.trim(),
          provincia: this.provincia.input.value.trim(),
          localidad: this.localidad.input.value.trim(),
          direccion: this.direccion.input.value.trim(),
          pais: 'Argentina'
        };
      },

      validate: () => {
        const valid = (
          this.nombre.input.value.trim() !== '' &&
          this.apellido.input.value.trim() !== '' &&
          this.fechaNacimiento.input.value.trim() !== '' &&
          this.telefono.input.value.trim() !== '' &&
          this.provincia.input.value.trim() !== '' &&
          this.localidad.input.value.trim() !== '' &&
          this.direccion.input.value.trim() !== ''
        );
        
        console.log('🔍 Validación:', valid ? 'OK' : 'FALTAN DATOS');
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
