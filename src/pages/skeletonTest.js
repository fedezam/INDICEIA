console.log('🧪 skeletonUsuarioComponentsTest iniciado');
import { runSkeleton } from '../skeleton/skeleton.js';
import { createFirebaseAdapter } from '../skeleton/adapters/firebaseAdapter.js';
import { Card } from '../skeleton/components/card/index.js';
import { FormField } from '../skeleton/components/form-field/index.js';
import { Button } from '../skeleton/components/button/index.js';
import { Toast } from '../skeleton/components/toast/index.js';
import { showLoading, hideLoading } from '../skeleton/components/loading/index.js';
import { fillProvinciaSelector } from '../shared/provincias.js';

const pageTest = {
  async load(context) {
    console.group('📦 load(context)');
    console.log(context);
    this.ctx = context;
    console.groupEnd();
  },
  render() {
    console.group('🎨 render()');
    const page = document.getElementById('skeleton-page');
    if (!page) {
      console.error('❌ skeleton-page no existe');
      return;
    }
    page.innerHTML = `<h2>🧪 Usuario – Componentes</h2>`;
    /* ============================
       FORM
    ============================ */
    console.group('📝 FormFields');
    const nombre = FormField({
      label: 'Nombre',
      name: 'nombre',
      required: true,
      value: this.ctx.userData?.nombre || ''
    });
    const apellido = FormField({
      label: 'Apellido',
      name: 'apellido',
      required: true,
      value: this.ctx.userData?.apellido || ''
    });
    const email = FormField({
      label: 'Email',
      type: 'email',
      name: 'mail',
      disabled: true,
      value: this.ctx.user?.email || ''
    });
    const provincia = FormField({
      label: 'Provincia',
      type: 'select',
      name: 'provincia',
      required: true
    });
    page.append(
      nombre,
      apellido,
      email,
      provincia
    );
    console.log('✔ FormFields renderizados');
    // 🔑 HIDRATACIÓN EXTERNA (CLAVE)
    const provinciaSelect =
      provincia.input || provincia.querySelector('select');
    console.log('🌎 Hidratando provincias...');
    fillProvinciaSelector('Argentina', provinciaSelect);
    console.groupEnd();
    /* ============================
       CARD
    ============================ */
    console.group('🧱 Card');
    const card = Card({
      title: 'Datos personales',
      content: 'Completá tu información básica',
      icon: 'user',
      highlight: true
    });
    page.appendChild(card);
    console.log('✔ Card OK');
    console.groupEnd();
    /* ============================
       BUTTON
    ============================ */
    console.group('🔘 Button');
    const btnGuardar = Button({
      label: 'Guardar',
      variant: 'primary',
      onClick: () => {
        console.log('💾 Click Guardar');
        showLoading('Guardando datos...');
        setTimeout(() => {
          hideLoading();
          Toast({ message: 'Datos guardados correctamente', type: 'success' });
        }, 1200);
      }
    });
    page.appendChild(btnGuardar);
    console.log('✔ Button OK');
    console.groupEnd();
    console.groupEnd();
  }
};

runSkeleton({
  page: pageTest,
  adapter: createFirebaseAdapter,
  options: {
    debug: true,
    loadingMessage: '🧪 Cargando test usuario'
  }
});
