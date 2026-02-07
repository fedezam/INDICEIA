// src/pages/usuario.js

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

    // Datos previos del usuario (si existen)
    this.userData = ctx.userData || {};
    console.log(this.userData);

    console.groupEnd();
  },

  render() {
    console.group('🎨 usuario.render');

    const page = document.getElementById('skeleton-page');
    if (!page) {
      console.error('❌ skeleton-page no existe');
      return;
    }

    page.innerHTML = `<h2>Datos personales</h2>`;

    /* ============================
       CAMPOS
    ============================ */

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

    // Hidratación provincias
    const provinciaSelect =
      this.provincia.input || this.provincia.querySelector('select');
    fillProvinciaSelector('Argentina', provinciaSelect);
    provinciaSelect.value = this.userData.provincia || '';

    /* ============================
       BOTÓN
    ============================ */

    this.btnGuardar = createButton({
      label: 'Guardar',
      variant: 'primary',
      onClick: () => this.guardar()
    });

    page.appendChild(this.btnGuardar);

    console.groupEnd();
  },

  async guardar() {
    console.group('💾 Guardar usuario');

    const uid = this.ctx.user?.uid;
    if (!uid) {
      showToast('No autenticado', 'error');
      return;
    }

    const fechaISO = fechaToISO(this.fechaNacimiento.value);
    if (!fechaISO) {
      showToast('Fecha inválida', 'error');
      return;
    }

    showLoading('Guardando...');
    this.btnGuardar.disabled = true;

    try {
      await this.ctx.adapter.saveUserData(uid, {
        nombre: this.nombre.value.trim(),
        apellido: this.apellido.value.trim(),
        mail: this.mail.value.trim(),
        fechaNacimiento: fechaISO,
        telefono: this.telefono.value.trim(),
        pais: 'Argentina',
        provincia: this.provincia.value.trim(),
        localidad: this.localidad.value.trim(),
        barrio: this.barrio.value.trim() || null,
        direccion: this.direccion.value.trim(),
        onboardingSteps: {
          usuario: true
        }
      });

      hideLoading();
      showToast('Datos guardados correctamente', 'success');

      this.ctx.navigate('/dashboard');

    } catch (err) {
      console.error(err);
      hideLoading();
      showToast('Error al guardar', 'error');
      this.btnGuardar.disabled = false;
    }

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
