import { runSkeleton } from '../skeleton/skeleton.js';
import { createFirebaseAdapter } from '../skeleton/adapters/firebaseAdapter.js';
import { createFormField } from '../skeleton/components/form-field/index.js';
import { createOnboardingButton } from '../skeleton/onboarding/button.js';
import { showToast } from '../skeleton/components/toast/index.js';
import { fillProvinciaSelector } from '../shared/provincias.js';

const usuarioPage = {
  async load(ctx) {
    this.ctx = ctx;
    this.userData = ctx.userData || {};
  },

  render() {
    const page = document.getElementById('skeleton-page');
    page.innerHTML = '';

    const title = document.createElement('h2');
    title.textContent = 'Datos personales';
    page.appendChild(title);

    this.nombre = createFormField({
      label: 'Nombre',
      required: true,
      value: this.userData.nombre || ''
    });

    this.apellido = createFormField({
      label: 'Apellido',
      required: true,
      value: this.userData.apellido || ''
    });

    this.fechaNacimiento = createFormField({
      label: 'Fecha de nacimiento',
      placeholder: 'DD/MM/AAAA',
      required: true,
      value: this.userData.fechaNacimiento
        ? isoToFecha(this.userData.fechaNacimiento)
        : ''
    });

    this.telefono = createFormField({
      label: 'Teléfono',
      required: true,
      value: this.userData.telefono || ''
    });

    this.provincia = createFormField({
      label: 'Provincia',
      type: 'select',
      required: true
    });

    this.localidad = createFormField({
      label: 'Localidad',
      required: true,
      value: this.userData.localidad || ''
    });

    this.direccion = createFormField({
      label: 'Dirección',
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

    const provinciaSelect = this.provincia.input;
    fillProvinciaSelector('Argentina', provinciaSelect);

    // 🔽 BOTÓN UNIVERSAL
    const btn = createOnboardingButton({
      stepName: 'usuario',

      getData: () => ({
        nombre: this.nombre.input.value.trim(),
        apellido: this.apellido.input.value.trim(),
        fechaNacimiento: fechaToISO(this.fechaNacimiento.input.value),
        telefono: this.telefono.input.value.trim(),
        provincia: this.provincia.input.value.trim(),
        localidad: this.localidad.input.value.trim(),
        direccion: this.direccion.input.value.trim()
      }),

      validate: () => {
        console.log('🔎 validate usuario');

        return (
          this.nombre.input.value.trim() &&
          this.apellido.input.value.trim() &&
          this.fechaNacimiento.input.value.trim() &&
          this.telefono.input.value.trim() &&
          this.provincia.input.value.trim() &&
          this.localidad.input.value.trim() &&
          this.direccion.input.value.trim()
        );
      }
    });

    page.appendChild(btn);
  }
};

/* HELPERS */
function fechaToISO(s) {
  if (!s || !s.includes('/')) return null;
  const [d, m, y] = s.split('/');
  return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
}

function isoToFecha(s) {
  if (!s) return '';
  const [y, m, d] = s.split('-');
  return `${d}/${m}/${y}`;
}

runSkeleton({
  page: usuarioPage,
  adapter: createFirebaseAdapter
});
