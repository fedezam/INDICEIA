import { runSkeleton } from '../skeleton/skeleton.js';
import { createFirebaseAdapter } from '../skeleton/adapters/firebaseAdapter.js';
import { createFormField } from '../skeleton/components/form-field/index.js';
import { createButton } from '../skeleton/components/button/index.js';
import { showToast } from '../skeleton/components/toast/index.js';
import { showLoading, hideLoading } from '../skeleton/components/loading/index.js';
import { fillProvinciaSelector } from '../shared/provincias.js';

const usuarioPage = {
  async load(ctx) {
    console.group('📦 usuario.load');
    this.ctx = ctx;
    this.userData = ctx.userData || {};
    console.log('Datos de usuario recibidos:', this.userData);
    console.groupEnd();
  },

  render() {
    console.group('🎨 usuario.render - Inicio');

    const page = document.getElementById('skeleton-page');
    if (!page) {
      console.error('❌ No se encontró #skeleton-page en el DOM');
      return;
    }

    console.log('✅ #skeleton-page encontrado');

    page.innerHTML = `<h2>Datos personales</h2>`;

    console.log('Creando campos de formulario...');

    // Creamos los campos y logueamos cada uno
    this.nombre = createFormField({ label: 'Nombre', name: 'nombre', required: true, value: this.userData.nombre || '' });
    console.log('→ Nombre creado | wrapper classes:', this.nombre.className);

    this.apellido = createFormField({ label: 'Apellido', name: 'apellido', required: true, value: this.userData.apellido || '' });
    console.log('→ Apellido creado | wrapper classes:', this.apellido.className);

    this.mail = createFormField({ label: 'Email', type: 'email', name: 'mail', disabled: true, value: this.userData.mail || this.ctx.user?.email || '' });
    console.log('→ Mail creado | disabled:', this.mail.input.disabled, '| classes input:', this.mail.input?.className);

    this.fechaNacimiento = createFormField({ label: 'Fecha de nacimiento', name: 'fechaNacimiento', placeholder: 'DD/MM/AAAA', required: true, value: this.userData.fechaNacimiento ? isoToFecha(this.userData.fechaNacimiento) : '' });
    console.log('→ Fecha Nac. creada');

    this.telefono = createFormField({ label: 'Teléfono', name: 'telefono', required: true, value: this.userData.telefono || '' });
    console.log('→ Teléfono creado');

    this.provincia = createFormField({ label: 'Provincia', type: 'select', name: 'provincia', required: true });
    console.log('→ Provincia creada | tipo select');

    this.localidad = createFormField({ label: 'Localidad', name: 'localidad', required: true, value: this.userData.localidad || '' });
    console.log('→ Localidad creada');

    this.barrio = createFormField({ label: 'Barrio', name: 'barrio', value: this.userData.barrio || '' });
    console.log('→ Barrio creado');

    this.direccion = createFormField({ label: 'Dirección', name: 'direccion', required: true, value: this.userData.direccion || '' });
    console.log('→ Dirección creada');

    console.log('Todos los campos creados. Appendando al DOM...');

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

    // ──────────────────────────────────────────────
    // LOGS DE DIAGNÓSTICO FUERTE AQUÍ
    // ──────────────────────────────────────────────
    console.group('🔍 DIAGNÓSTICO CSS - Input "Nombre"');

    if (this.nombre?.input) {
      const input = this.nombre.input;
      const computed = window.getComputedStyle(input);

      console.log('Elemento input encontrado:', input.tagName, input.type);
      console.log('Clases aplicadas:', input.className);
      console.log('height:', computed.height);
      console.log('min-height:', computed.minHeight);
      console.log('padding:', computed.padding);
      console.log('border:', computed.border);
      console.log('border-color:', computed.borderColor);
      console.log('border-radius:', computed.borderRadius);
      console.log('background-color:', computed.backgroundColor);
      console.log('font-size:', computed.fontSize);
      console.log('color:', computed.color);
      console.log('box-shadow:', computed.boxShadow);
      console.log('transition:', computed.transition);
      console.log('outline on focus (simulado):', computed.outline);
    } else {
      console.error('❌ No se encontró .input en el componente "Nombre"');
    }
    console.groupEnd();

    // Hidratación provincias
    const provinciaSelect = this.provincia.input || this.provincia.querySelector('select');
    if (provinciaSelect) {
      console.log('Select de provincia encontrado → hidratando...');
      fillProvinciaSelector('Argentina', provinciaSelect);
      if (this.userData.provincia) {
        setTimeout(() => {
          provinciaSelect.value = this.userData.provincia;
          console.log('Valor provincia seteado:', provinciaSelect.value);
        }, 0);
      }
    } else {
      console.warn('No se encontró select en provincia');
    }

    // Botón
    this.btnGuardar = createButton({
      label: 'Guardar',
      variant: 'primary',
      onClick: () => this.guardar()
    });
    console.log('Botón Guardar creado | variant:', 'primary');
    page.appendChild(this.btnGuardar);

    console.groupEnd();
  },

  // ... el resto del código (guardar(), helpers) queda IGUAL ...
};

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
