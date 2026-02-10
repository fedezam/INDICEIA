import { runSkeleton } from '../skeleton/skeleton.js';
import { createFirebaseAdapter } from '../skeleton/adapters/firebaseAdapter.js';
import { createFormField } from '../skeleton/components/form-field/index.js';
import { createOnboardingButton } from '../skeleton/components/onboarding-button/index.js';
import { fillProvinciaSelector } from '../shared/provincias.js';

/* ============================
   PAGE
============================ */

const usuarioPage = {
  async load(ctx) {
    console.group('📦 usuario.load');
    this.ctx = ctx;
    this.userData = ctx.userData || {};
    console.log('Datos de usuario recibidos:', this.userData);
    console.groupEnd();
  },

  render() {
    console.group('🎨 usuario.render');

    const page = document.getElementById('skeleton-page');
    if (!page) {
      console.error('❌ No se encontró #skeleton-page');
      console.groupEnd();
      return;
    }

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

    this.mail = createFormField({
      label: 'Email',
      type: 'email',
      name: 'mail',
      disabled: true,
      value: this.userData.mail || this.ctx.user?.email || ''
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

    this.barrio = createFormField({
      label: 'Barrio',
      name: 'barrio',
      value: this.userData.barrio || ''
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
      this.mail,
      this.fechaNacimiento,
      this.telefono,
      this.provincia,
      this.localidad,
      this.barrio,
      this.direccion
    );

    // 🔽 Provincias
    const provinciaSelect =
      this.provincia.input || this.provincia.querySelector('select');

    if (provinciaSelect) {
      fillProvinciaSelector('Argentina', provinciaSelect);
      if (this.userData.provincia) {
        setTimeout(() => {
          provinciaSelect.value = this.userData.provincia;
        }, 0);
      }
    }

    /* ============================
       BOTÓN UNIVERSAL
    ============================ */

    this.btnGuardar = createOnboardingButton({
      stepName: 'usuario',

      getData: () => {
        console.log('📤 usuario.getData()');
        return {
          nombre: this.nombre.value.trim(),
          apellido: this.apellido.value.trim(),
          mail: this.mail.value.trim(),
          fechaNacimiento: fechaToISO(this.fechaNacimiento.value),
          telefono: this.telefono.value.trim(),
          pais: 'Argentina',
          provincia: this.provincia.value.trim(),
          localidad: this.localidad.value.trim(),
          barrio: this.barrio.value.trim() || null,
          direccion: this.direccion.value.trim()
        };
      },

      validate: () => {
        const ok =
          this.nombre.value.trim() &&
          this.apellido.value.trim() &&
          this.fechaNacimiento.value.includes('/') &&
          this.telefono.value.trim() &&
          this.provincia.value.trim() &&
          this.localidad.value.trim() &&
          this.direccion.value.trim();

        console.log('🧪 usuario.validate():', !!ok);
        return !!ok;
      }
    });

    page.appendChild(this.btnGuardar);

    console.groupEnd();
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
