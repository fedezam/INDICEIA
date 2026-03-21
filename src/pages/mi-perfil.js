// ============================================================
// src/pages/mi-perfil/mi-perfil.js
// ============================================================

import { runLifecycle }          from '/src/skeleton/lifecycle.js';
import { createFirebaseAdapter } from '/src/skeleton/adapters/firebaseAdapter.js';
import { mountLayout }           from '/src/skeleton/layout/index.js';
import { runFlowController }     from '/src/controllers/flowController.js';
import { createFormField }       from '/src/skeleton/components/form-field/index.js';
import { createButton }          from '/src/skeleton/components/button/index.js';
import { showToast }             from '/src/skeleton/components/toast/index.js';
import { db }                    from '/src/services/firebase/firebase.js';
import {
  doc, setDoc, updateDoc,
  collection, getDoc, Timestamp
} from 'firebase/firestore';
import './mi-perfil.css';

const adapter = (options) => createFirebaseAdapter(options);

runLifecycle({
  adapter,
  options: { loadingMessage: 'Cargando perfil...' },
  async onReady(ctx) {
    await runFlowController(ctx.user.uid);
    mountLayout(ctx);
    const state = await load(ctx);
    render(ctx, state);
  }
});

// ============================================================
// LOAD
// ============================================================
async function load(ctx) {
  const isNuevo      = !ctx.comercioData || !ctx.comercioData.nombre;
  const comercioData = ctx.comercioData || {};
  const slugExiste   = !!comercioData.landing?.slug;

  return { isNuevo, comercioData, slugExiste };
}

// ============================================================
// RENDER
// ============================================================
function render(ctx, state) {
  const page = document.getElementById('skeleton-page');
  page.innerHTML = '';

  const refs = {
    fields:               {},
    guardarBtn:           null,
    slugInput:            null,
    slugStatus:           null,
    slugValidationTimer:  null,
  };

  const uiState = {
    slug:          state.comercioData.landing?.slug || null,
    slugValido:    !!state.comercioData.landing?.slug,
  };

  const title = document.createElement('h2');
  title.className   = 'page-title';
  title.textContent = state.isNuevo ? 'Crear mi perfil' : 'Editar mi perfil';
  page.appendChild(title);

  page.appendChild(renderSeccionIdentidad(state, refs, uiState));
  page.appendChild(renderSeccionUbicacion(state, refs, uiState));
  page.appendChild(renderSeccionContacto(state, refs, uiState));

  if (!state.slugExiste) {
    page.appendChild(renderSeccionSlug(state, refs, uiState));
  }

  refs.guardarBtn = createButton({
    label:   'Guardar perfil',
    icon:    'fa-save',
    variant: 'success',
    size:    'lg',
    block:   true,
    onClick: () => handleGuardar(ctx, state, refs, uiState)
  });

  const btnContainer = document.createElement('div');
  btnContainer.className = 'btn-container';
  btnContainer.appendChild(refs.guardarBtn);
  page.appendChild(btnContainer);

  validarFormulario(state, refs, uiState);
}

// ============================================================
// SECCIONES
// ============================================================
function renderSeccionIdentidad(state, refs, uiState) {
  const section = document.createElement('div');
  section.className = 'form-section';

  const h3 = document.createElement('h3');
  h3.textContent = '¿Quién sos?';
  section.appendChild(h3);

  const help = document.createElement('p');
  help.className   = 'form-help';
  help.textContent = 'Estos datos definen cómo te va a presentar tu asistente a los clientes.';
  section.appendChild(help);

  refs.fields.nombre = createFormField({
    label:       'Nombre o marca',
    name:        'nombre',
    required:    true,
    placeholder: 'Ej: Juan Pérez o Plomería JP',
    helpText:    'Como te conocen tus clientes — puede ser tu nombre o el nombre de tu marca',
    value:       state.comercioData.nombre || ''
  });

  refs.fields.especialidad = createFormField({
    label:       'Especialidad',
    name:        'especialidad',
    required:    true,
    placeholder: 'Ej: Plomero, Manicura, Profe de matemáticas',
    helpText:    'En una línea, qué hacés',
    value:       state.comercioData.especialidad || ''
  });

  refs.fields.descripcion = createFormField({
    label:       'Descripción',
    name:        'descripcion',
    type:        'textarea',
    rows:        3,
    required:    true,
    placeholder: 'Ej: Hago instalaciones y reparaciones de cañerías en hogares y comercios. Más de 10 años de experiencia.',
    helpText:    'Dos o tres líneas que expliquen qué hacés y por qué elegirte',
    value:       state.comercioData.descripcion || ''
  });

  refs.fields.experiencia = createFormField({
    label:       'Años de experiencia',
    name:        'experiencia',
    type:        'number',
    placeholder: 'Ej: 10',
    helpText:    'Opcional — ayuda a generar confianza',
    value:       state.comercioData.experiencia || ''
  });

  [refs.fields.nombre, refs.fields.especialidad, refs.fields.descripcion, refs.fields.experiencia]
    .forEach(f => f.input?.addEventListener('input', () => validarFormulario(state, refs, uiState)));

  // Autogenerar slug desde nombre
  if (!uiState.slug) {
    refs.fields.nombre.input?.addEventListener('input', () => {
      clearTimeout(refs.slugValidationTimer);
      const nombre = refs.fields.nombre.input.value.trim();
      if (nombre.length >= 3 && refs.slugInput) {
        refs.slugValidationTimer = setTimeout(async () => {
          const newSlug = slugify(nombre);
          refs.slugInput.value = newSlug;
          await validarSlug(newSlug, refs, uiState, true);
        }, 500);
      }
    });
  }

  section.append(
    refs.fields.nombre,
    refs.fields.especialidad,
    refs.fields.descripcion,
    refs.fields.experiencia
  );

  return section;
}

function renderSeccionUbicacion(state, refs, uiState) {
  const section = document.createElement('div');
  section.className = 'form-section';

  const h3 = document.createElement('h3');
  h3.textContent = '¿Dónde trabajás?';
  section.appendChild(h3);

  const help = document.createElement('p');
  help.className   = 'form-help';
  help.textContent = 'Si vas al domicilio del cliente, indicá en qué zona trabajás. Si el cliente viene a vos, podés agregar tu dirección.';
  section.appendChild(help);

  refs.fields.zona = createFormField({
    label:       'Zona de cobertura',
    name:        'zona',
    required:    true,
    placeholder: 'Ej: Casilda y alrededores, Rosario zona norte',
    helpText:    'En qué zona o ciudad trabajás',
    value:       state.comercioData.zona || ''
  });

  refs.fields.direccion = createFormField({
    label:       'Dirección de atención',
    name:        'direccion',
    placeholder: 'Ej: Av. San Martín 123, Casilda',
    helpText:    'Opcional — solo si el cliente viene a tu domicilio o local',
    value:       state.comercioData.direccion || ''
  });

  [refs.fields.zona, refs.fields.direccion]
    .forEach(f => f.input?.addEventListener('input', () => validarFormulario(state, refs, uiState)));

  section.append(refs.fields.zona, refs.fields.direccion);
  return section;
}

function renderSeccionContacto(state, refs, uiState) {
  const section = document.createElement('div');
  section.className = 'form-section';

  const h3 = document.createElement('h3');
  h3.textContent = '¿Cómo te contactan?';
  section.appendChild(h3);

  const help = document.createElement('p');
  help.className   = 'form-help';
  help.textContent = 'El WhatsApp es obligatorio — es el canal principal para que los clientes te contacten.';
  section.appendChild(help);

  refs.fields.whatsapp = createFormField({
    label:       'WhatsApp',
    name:        'whatsapp',
    required:    true,
    placeholder: 'Ej: 3412295316',
    helpText:    'Solo números, sin espacios ni guiones',
    value:       state.comercioData.whatsapp || ''
  });

  refs.fields.telefono = createFormField({
    label:       'Teléfono',
    name:        'telefono',
    placeholder: 'Opcional',
    value:       state.comercioData.telefono || ''
  });

  refs.fields.email = createFormField({
    label:       'Email',
    name:        'email',
    type:        'email',
    placeholder: 'Opcional',
    value:       state.comercioData.email || ''
  });

  refs.fields.instagram = createFormField({
    label:       'Instagram',
    name:        'instagram',
    placeholder: '@tuusuario',
    value:       state.comercioData.instagram || ''
  });

  [refs.fields.whatsapp, refs.fields.telefono, refs.fields.email, refs.fields.instagram]
    .forEach(f => f.input?.addEventListener('input', () => validarFormulario(state, refs, uiState)));

  section.append(
    refs.fields.whatsapp,
    refs.fields.telefono,
    refs.fields.email,
    refs.fields.instagram
  );

  return section;
}

function renderSeccionSlug(state, refs, uiState) {
  const section = document.createElement('div');
  section.className = 'form-section';

  const h3 = document.createElement('h3');
  h3.textContent = 'Tu dirección en ÍndiceIA';
  section.appendChild(h3);

  const help = document.createElement('p');
  help.className   = 'form-help';
  help.textContent = 'Esta es la dirección única donde tus clientes van a encontrarte. Se genera automáticamente pero podés cambiarla.';
  section.appendChild(help);

  const slugContainer = document.createElement('div');
  slugContainer.className = 'slug-container';

  const slugPrefix = document.createElement('span');
  slugPrefix.className   = 'slug-prefix';
  slugPrefix.textContent = 'indiceia.com/';

  const slugInput = document.createElement('input');
  slugInput.type        = 'text';
  slugInput.className   = 'slug-input';
  slugInput.placeholder = 'tu-nombre';
  slugInput.value       = uiState.slug || '';

  refs.slugInput = slugInput;

  slugContainer.append(slugPrefix, slugInput);
  section.appendChild(slugContainer);

  const slugStatus = document.createElement('div');
  slugStatus.className = 'slug-status';
  slugStatus.innerHTML = '<span class="slug-icon"></span><span class="slug-text"></span>';
  refs.slugStatus = slugStatus;
  section.appendChild(slugStatus);

  slugInput.addEventListener('input', () => {
    clearTimeout(refs.slugValidationTimer);
    const slug = slugInput.value.trim().toLowerCase();
    if (!slug) {
      updateSlugStatus(refs, 'empty', '');
      uiState.slugValido = false;
      uiState.slug       = null;
      validarFormulario(state, refs, uiState);
      return;
    }
    updateSlugStatus(refs, 'checking', 'Verificando disponibilidad...');
    refs.slugValidationTimer = setTimeout(() => validarSlug(slug, refs, uiState, false), 800);
  });

  return section;
}

// ============================================================
// SLUG
// ============================================================
function slugify(text) {
  return text
    .toLowerCase().trim()
    .replace(/["'`´""'']/g, '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function validarSlug(slug, refs, uiState, autoGenerado) {
  if (!slug || slug.length < 3) {
    updateSlugStatus(refs, 'empty', '');
    uiState.slugValido = false;
    uiState.slug       = null;
    return;
  }

  try {
    const snap = await getDoc(doc(db, 'landings', slug));

    if (!snap.exists()) {
      uiState.slug       = slug;
      uiState.slugValido = true;
      updateSlugStatus(refs, 'available', `✓ Disponible: indiceia.com/${slug}`);
      return;
    }

    if (autoGenerado) {
      for (let i = 1; i <= 3; i++) {
        const alt     = `${slug}-${i}`;
        const altSnap = await getDoc(doc(db, 'landings', alt));
        if (!altSnap.exists()) {
          uiState.slug       = alt;
          uiState.slugValido = true;
          refs.slugInput.value = alt;
          updateSlugStatus(refs, 'suggestion', `Ya existe. Sugerencia: indiceia.com/${alt}`);
          return;
        }
      }
    }

    uiState.slugValido = false;
    uiState.slug       = null;
    updateSlugStatus(refs, 'taken', 'Este nombre ya está en uso. Probá con otro.');

  } catch (err) {
    console.error('Error validando slug:', err);
    uiState.slugValido = false;
    uiState.slug       = null;
    updateSlugStatus(refs, 'error', 'Error al validar. Intentá de nuevo.');
  }
}

function updateSlugStatus(refs, status, message) {
  if (!refs.slugStatus) return;
  const icon = refs.slugStatus.querySelector('.slug-icon');
  const text = refs.slugStatus.querySelector('.slug-text');
  const icons = {
    checking:   '<i class="fas fa-spinner fa-spin"></i>',
    available:  '<i class="fas fa-check-circle" style="color:var(--s-success)"></i>',
    suggestion: '<i class="fas fa-info-circle" style="color:var(--s-info)"></i>',
    taken:      '<i class="fas fa-times-circle" style="color:var(--s-danger)"></i>',
    error:      '<i class="fas fa-exclamation-triangle" style="color:var(--s-warning)"></i>',
    empty:      ''
  };
  icon.innerHTML  = icons[status] || '';
  text.textContent = message;
}

// ============================================================
// VALIDACIÓN
// ============================================================
function validarFormulario(state, refs, uiState) {
  const camposValidos =
    refs.fields.nombre?.input?.value.trim()       &&
    refs.fields.especialidad?.input?.value.trim() &&
    refs.fields.descripcion?.input?.value.trim()  &&
    refs.fields.zona?.input?.value.trim()         &&
    refs.fields.whatsapp?.input?.value.trim();

  const slugValido = state.slugExiste || uiState.slugValido;
  const formularioValido = camposValidos && slugValido;

  if (refs.guardarBtn) {
    formularioValido ? refs.guardarBtn.enable() : refs.guardarBtn.disable();
  }

  return formularioValido;
}

// ============================================================
// GUARDAR
// ============================================================
async function handleGuardar(ctx, state, refs, uiState) {
  if (!validarFormulario(state, refs, uiState)) {
    showToast('Completá todos los campos requeridos', 'warning');
    return;
  }

  refs.guardarBtn.setLoading(true);

  try {
    const updates = {
      // Identidad
      nombre:       refs.fields.nombre.input.value.trim(),
      especialidad: refs.fields.especialidad.input.value.trim(),
      descripcion:  refs.fields.descripcion.input.value.trim(),
      experiencia:  refs.fields.experiencia?.input?.value.trim() || null,

      // Ubicación
      zona:      refs.fields.zona.input.value.trim(),
      direccion: refs.fields.direccion?.input?.value.trim() || null,

      // Contacto
      whatsapp:  refs.fields.whatsapp.input.value.trim(),
      telefono:  refs.fields.telefono?.input?.value.trim()  || null,
      email:     refs.fields.email?.input?.value.trim()     || null,
      instagram: refs.fields.instagram?.input?.value.trim() || null,

      // Tipo de entidad — para que el entity-factory sepa cómo construir el context
      entityType: 'prestador',
      pais:       'Argentina',
    };

    if (!state.slugExiste) {
      updates.landing = {
        activo:    true,
        nombre:    updates.nombre,
        slug:      uiState.slug,
        tipo:      'perfil',
        createdAt: new Date(),
        updatedAt: new Date()
      };
    } else {
      updates.landing = {
        ...state.comercioData.landing,
        nombre:    updates.nombre,
        updatedAt: new Date()
      };
    }

    if (state.isNuevo) {
      // Crear doc en comercios (mismo patrón que mi-comercio)
      const comercioRef = ctx.comercioId
        ? doc(db, 'comercios', ctx.comercioId)
        : doc(collection(db, 'comercios'));
      const comercioId = comercioRef.id;

      const now       = Timestamp.now();
      const expiresAt = Timestamp.fromDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));

      await setDoc(comercioRef, {
        ...updates,
        duenoId:            ctx.user.uid,
        fechaCreacion:      new Date(),
        fechaActualizacion: new Date(),
        onboardingSteps:    { 'mi-perfil': true },
        plan: {
          type: 'trial', active: true, trial: true,
          startedAt: now, expiresAt, createdAt: now, updatedAt: now, source: 'system'
        }
      });

      await setDoc(doc(db, 'landings', uiState.slug), {
        slug:      uiState.slug,
        comercioId,
        nombre:    updates.nombre,
        activo:    true,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      await updateDoc(doc(db, 'usuarios', ctx.user.uid), {
        comercioId,
        'onboardingSteps.mi-perfil': true
      });

    } else {
      updates['onboardingSteps.mi-perfil'] = true;
      updates.fechaActualizacion           = new Date();

      await updateDoc(doc(db, 'comercios', ctx.comercioId), updates);

      if (!state.slugExiste) {
        await setDoc(doc(db, 'landings', uiState.slug), {
          slug:      uiState.slug,
          comercioId: ctx.comercioId,
          nombre:    updates.nombre,
          activo:    true,
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }
    }

    showToast('Perfil guardado correctamente', 'success');
    await new Promise(r => setTimeout(r, 500));
    window.location.href = '/src/pages/dashboard.html';

  } catch (err) {
    console.error('❌ Error guardando perfil:', err);
    showToast('Error al guardar: ' + err.message, 'error');
  } finally {
    refs.guardarBtn.setLoading(false);
  }
}
