// ============================================
// usuario-test.js
// Página de test Skeleton con datos reales
// ============================================

// Flow
import { runFlowController } from '@/controllers/flowController.js';

// Skeleton core
import { renderLayout } from '@/skeleton/layout/renderLayout.js';

// Skeleton components
import { createPageHeader } from '@/skeleton/components/page-header';
import { createFormField } from '@/skeleton/components/form-field';
import { createButton } from '@/skeleton/components/button';
import { showToast, showLoading, hideLoading } from '@/skeleton/components/toast';

// Adapter
import { createFirebaseAdapter } from '@/skeleton/adapters/firebaseAdapter';

// Firebase
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/firebase.js';

/* =========================================================
   INIT FLOW (NO REDIRIGE, SOLO AUTORIZA)
   ========================================================= */

runFlowController();

/* =========================================================
   PAGE BOOT
   ========================================================= */

const app = document.getElementById('app');

const context = await createFirebaseAdapter();

/* =========================================================
   LAYOUT
   ========================================================= */

renderLayout(app);

/* =========================================================
   HEADER
   ========================================================= */

const header = createPageHeader({
  content: {
    icon: 'fa-user',
    title: 'Datos personales (TEST)',
    subtitle: 'Página de prueba Skeleton'
  }
});

app.appendChild(header);

/* =========================================================
   FORM FIELDS
   ========================================================= */

const fields = {
  nombre: createFormField({
    content: { label: 'Nombre', id: 'nombre' },
    flags: { required: true }
  }),

  apellido: createFormField({
    content: { label: 'Apellido', id: 'apellido' },
    flags: { required: true }
  }),

  mail: createFormField({
    content: { label: 'Email', id: 'mail' },
    flags: { disabled: true }
  }),

  telefono: createFormField({
    content: { label: 'Teléfono', id: 'telefono' },
    flags: { required: true }
  })
};

Object.values(fields).forEach(f => app.appendChild(f.el));

/* =========================================================
   BUTTON
   ========================================================= */

const btnGuardar = createButton({
  content: { text: 'Guardar' },
  flags: { variant: 'primary', disabled: true },
  actions: { onClick: save }
});

app.appendChild(btnGuardar);

/* =========================================================
   DATA LOAD
   ========================================================= */

async function loadUser() {
  const uid = context.user?.uid;
  if (!uid) return;

  const ref = doc(db, 'usuarios', uid);
  const snap = await getDoc(ref);
  const data = snap.exists() ? snap.data() : {};

  fields.nombre.setValue(data.nombre || '');
  fields.apellido.setValue(data.apellido || '');
  fields.mail.setValue(data.mail || context.user.email || '');
  fields.telefono.setValue(data.telefono || '');

  validate();
}

/* =========================================================
   VALIDATION
   ========================================================= */

function validate() {
  const valid =
    fields.nombre.getValue() &&
    fields.apellido.getValue() &&
    fields.telefono.getValue();

  btnGuardar.setDisabled(!valid);
}

Object.values(fields).forEach(f =>
  f.onChange(validate)
);

/* =========================================================
   SAVE
   ========================================================= */

async function save() {
  const uid = context.user?.uid;
  if (!uid) return;

  showLoading('Guardando datos…');

  try {
    await setDoc(
      doc(db, 'usuarios', uid),
      {
        nombre: fields.nombre.getValue(),
        apellido: fields.apellido.getValue(),
        mail: fields.mail.getValue(),
        telefono: fields.telefono.getValue(),
        onboardingSteps: { usuario: true }
      },
      { merge: true }
    );

    hideLoading();
    showToast('Datos guardados', 'success');

    // siempre dashboard → flow decide
    window.location.href = '/dashboard.html';

  } catch (err) {
    console.error(err);
    hideLoading();
    showToast('Error al guardar', 'error');
  }
}

/* =========================================================
   START
   ========================================================= */

loadUser();
