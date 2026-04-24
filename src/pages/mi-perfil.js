// ============================================================
// src/pages/mi-perfil.js
// ============================================================

import { runLifecycle }           from '/src/skeleton/lifecycle.js';
import { createFirebaseAdapter }  from '/src/skeleton/adapters/firebaseAdapter.js';
import { mountLayout }            from '/src/skeleton/layout/index.js';
import { runFlowController }      from '/src/controllers/flowController.js';
import { createFormField }        from '/src/skeleton/components/form-field/index.js';
import { createButton }           from '/src/skeleton/components/button/index.js';
import { createOnboardingButton } from '/src/skeleton/components/onboarding-button/index.js';
import { showToast }              from '/src/skeleton/components/toast/index.js';
import { db }                     from '/src/services/firebase/firebase.js';
import { fillProvinciaSelector }  from '/src/shared/provincias.js';
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
  const isEditMode   = window.isEditMode === true;
  const isNuevo      = !ctx.comercioData || !ctx.comercioData.nombre;
  const comercioData = ctx.comercioData || {};
  const slugExiste   = !!comercioData.landing?.slug;
  return { isEditMode, isNuevo, comercioData, slugExiste };
}

// ============================================================
// RENDER
// ============================================================
function render(ctx, state) {
  const { isEditMode } = state;
  const page = document.getElementById('skeleton-page');
  page.innerHTML = '';

  const refs = {
    fields:              {},
    slugInput:           null,
    slugStatus:          null,
    slugValidationTimer: null,
  };

  const uiState = {
    slug:       state.comercioData.landing?.slug || null,
    slugValido: !!state.comercioData.landing?.slug,
    cobertura:  state.comercioData.cobertura
                  ? state.comercioData.cobertura.map(c => ({ ...c }))
                  : [],
  };

  // ── Snapshot inicial para dirty detection ─────────────────
  // Se captura DESPUÉS del load, ANTES de que el usuario toque nada.
  // Se serializa a JSON para comparación estable.
  const initialSnapshot = {
    nombre:       state.comercioData.nombre       || '',
    especialidad: state.comercioData.especialidad || '',
    descripcion:  state.comercioData.descripcion  || '',
    experiencia:  state.comercioData.experiencia  || '',
    whatsapp:     state.comercioData.whatsapp     || '',
    telefono:     state.comercioData.telefono     || '',
    email:        state.comercioData.email        || '',
    instagram:    state.comercioData.instagram    || '',
    direccion:    state.comercioData.direccion    || '',
    cobertura:    JSON.stringify(state.comercioData.cobertura || []),
    slug:         state.comercioData.landing?.slug || '',
  };

  // ── getCurrentState: lee el DOM en tiempo real ─────────────
  function getCurrentState() {
    return {
      nombre:       refs.fields.nombre?.input?.value.trim()       || '',
      especialidad: refs.fields.especialidad?.input?.value.trim() || '',
      descripcion:  refs.fields.descripcion?.input?.value.trim()  || '',
      experiencia:  refs.fields.experiencia?.input?.value.trim()  || '',
      whatsapp:     refs.fields.whatsapp?.input?.value.trim()     || '',
      telefono:     refs.fields.telefono?.input?.value.trim()     || '',
      email:        refs.fields.email?.input?.value.trim()        || '',
      instagram:    refs.fields.instagram?.input?.value.trim()    || '',
      direccion:    refs.fields.direccion?.input?.value.trim()    || '',
      cobertura:    JSON.stringify(uiState.cobertura),
      slug:         uiState.slug || '',
    };
  }

  // ── dirtyController ───────────────────────────────────────
  const dirtyController = {
    hasUnsavedChanges() {
      const current = getCurrentState();
      return Object.keys(initialSnapshot).some(k => current[k] !== initialSnapshot[k]);
    },
    // El botón llama a markSaved() después de guardar con éxito.
    // Actualizamos el snapshot para que si el usuario vuelve a la
    // página sin recargar, el estado vuelva a estar "limpio".
    markSaved() {
      const current = getCurrentState();
      Object.keys(initialSnapshot).forEach(k => {
        initialSnapshot[k] = current[k];
      });
    }
  };

  // ── Título ────────────────────────────────────────────────
  const title = document.createElement('h2');
  title.className   = 'page-title';
  title.textContent = state.isNuevo ? 'Crear mi perfil' : 'Editar mi perfil';
  page.appendChild(title);

  // ── Secciones ─────────────────────────────────────────────
  page.appendChild(renderSeccionIdentidad(state, refs, uiState));
  page.appendChild(renderSeccionUbicacion(state, refs, uiState));
  page.appendChild(renderSeccionContacto(state, refs, uiState));

  if (!state.slugExiste) {
    page.appendChild(renderSeccionSlug(state, refs, uiState));
  }

  // ── Botón ─────────────────────────────────────────────────
  const btnContainer = document.createElement('div');
  btnContainer.className = 'btn-container';

  btnContainer.appendChild(
    createOnboardingButton({
      stepName: 'mi-perfil',

      dirtyController: isEditMode ? dirtyController : undefined,

      getLabel() {
        if (!isEditMode) return 'Continuar';
        if (isEditMode && dirtyController.hasUnsavedChanges()) return 'Guardar y volver al dashboard';
        return 'Volver al dashboard';
      },

      validate() {
        const camposValidos =
          refs.fields.nombre?.input?.value.trim()       &&
          refs.fields.especialidad?.input?.value.trim() &&
          refs.fields.descripcion?.input?.value.trim()  &&
          refs.fields.whatsapp?.input?.value.trim()     &&
          uiState.cobertura.length > 0;

        const slugValido = state.slugExiste || uiState.slugValido;
        return !!(camposValidos && slugValido);
      },

      async onSave({ uid, comercioId, persistence }) {
        const updates = {
            nombre:       refs.fields.nombre.input.value.trim(),
            especialidad: refs.fields.especialidad.input.value.trim(),
            descripcion:  refs.fields.descripcion.input.value.trim(),
            experiencia:  refs.fields.experiencia?.input?.value.trim() || null,

            cobertura:  uiState.cobertura,
            provincia:  uiState.cobertura[0]?.provincia || null,
            localidad:  uiState.cobertura[0]?.localidad || null,
            pais:       'Argentina',
            direccion:  refs.fields.direccion?.input?.value.trim() || null,

            whatsapp:  refs.fields.whatsapp.input.value.trim(),
            telefono:  refs.fields.telefono?.input?.value.trim()  || null,
            email:     refs.fields.email?.input?.value.trim()     || null,
            instagram: refs.fields.instagram?.input?.value.trim() || null,

            entityType: 'prestador',
          };

          if (!state.slugExiste) {
            updates.landing = {
              activo: true, nombre: updates.nombre,
              slug: uiState.slug, tipo: 'perfil',
              createdAt: new Date(), updatedAt: new Date()
            };
          } else {
            updates.landing = {
              ...state.comercioData.landing,
              nombre: updates.nombre, updatedAt: new Date()
            };
          }

          if (state.isNuevo) {
            const comercioRef = comercioId
              ? doc(db, 'entidades', comercioId)
              : doc(collection(db, 'entidades'));
            const nuevoComercioId = comercioRef.id;

            const now       = Timestamp.now();
            const expiresAt = Timestamp.fromDate(
              new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
            );

            await setDoc(comercioRef, {
              ...updates,
              duenoId: uid,
              fechaCreacion: new Date(), fechaActualizacion: new Date(),
              onboardingSteps: { 'mi-perfil': true },
              plan: {
                type: 'trial', active: true, trial: true,
                startedAt: now, expiresAt, createdAt: now,
                updatedAt: now, source: 'system'
              }
            });

            await setDoc(doc(db, 'landings', uiState.slug), {
              slug: uiState.slug, comercioId: nuevoComercioId,
              nombre: updates.nombre, activo: true,
              createdAt: new Date(), updatedAt: new Date()
            });

            await updateDoc(doc(db, 'usuarios', uid), {
              comercioId: nuevoComercioId,
            });

          } else {
            updates['onboardingSteps.mi-perfil'] = true;
            updates.fechaActualizacion           = new Date();
            await updateDoc(doc(db, 'entidades', comercioId), updates);

            if (!state.slugExiste) {
              await setDoc(doc(db, 'landings', uiState.slug), {
                slug: uiState.slug, comercioId,
                nombre: updates.nombre, activo: true,
                createdAt: new Date(), updatedAt: new Date()
              });
            }
          }

          return { success: true, stepMarked: true };
      },

      onSuccess: () => showToast('Perfil guardado correctamente', 'success'),

      onError: (err) => {
        console.error('❌ Error guardando perfil:', err);
        showToast('Error al guardar: ' + err.message, 'error');
      },
    })
  );

  page.appendChild(btnContainer);
}

// ============================================================
// SECCIONES
// ============================================================
function renderSeccionIdentidad(state, refs, uiState) {
  const section = crearSeccion('¿Quién sos?');

  const help = document.createElement('p');
  help.className   = 'form-help';
  help.textContent = 'Estos datos definen cómo te va a presentar tu asistente a los clientes.';
  section.appendChild(help);

  refs.fields.nombre = createFormField({
    label: 'Nombre o marca', name: 'nombre', required: true,
    placeholder: 'Ej: Juan Pérez o Plomería JP',
    helpText: 'Como te conocen tus clientes — puede ser tu nombre o el nombre de tu marca',
    value: state.comercioData.nombre || ''
  });

  refs.fields.especialidad = createFormField({
    label: 'Especialidad', name: 'especialidad', required: true,
    placeholder: 'Ej: Plomero, Manicura, Profe de matemáticas',
    helpText: 'En una línea, qué hacés',
    value: state.comercioData.especialidad || ''
  });

  refs.fields.descripcion = createFormField({
    label: 'Descripción', name: 'descripcion', type: 'textarea',
    rows: 3, required: true,
    placeholder: 'Ej: Hago instalaciones y reparaciones de cañerías en hogares y comercios.',
    helpText: 'Dos o tres líneas que expliquen qué hacés y por qué elegirte',
    value: state.comercioData.descripcion || ''
  });

  refs.fields.experiencia = createFormField({
    label: 'Años de experiencia', name: 'experiencia', type: 'number',
    placeholder: 'Ej: 10',
    helpText: 'Opcional — ayuda a generar confianza',
    value: state.comercioData.experiencia || ''
  });

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
    refs.fields.nombre, refs.fields.especialidad,
    refs.fields.descripcion, refs.fields.experiencia
  );

  return section;
}

function renderSeccionUbicacion(state, refs, uiState) {
  const section = crearSeccion('¿Dónde trabajás?');

  const help = document.createElement('p');
  help.className   = 'form-help';
  help.textContent = 'Agregá las localidades donde prestás servicio. Podés agregar más de una.';
  section.appendChild(help);

  refs.fields.provincia = createFormField({
    label: 'Provincia', name: 'provincia', type: 'select', required: true
  });
  const optDefault = document.createElement('option');
  optDefault.value = ''; optDefault.textContent = 'Elegí una provincia...';
  refs.fields.provincia.input.prepend(optDefault);
  fillProvinciaSelector('Argentina', refs.fields.provincia.input);

  const provinciaGuardada = state.comercioData.cobertura?.[0]?.provincia || '';
  if (provinciaGuardada) refs.fields.provincia.input.value = provinciaGuardada;

  section.appendChild(refs.fields.provincia);

  refs.fields.localidad = createFormField({
    label: 'Localidad', name: 'localidad', type: 'autocomplete',
    provincia: provinciaGuardada,
    placeholder: provinciaGuardada ? 'Buscá tu localidad...' : 'Primero elegí una provincia',
  });
  section.appendChild(refs.fields.localidad);

  refs.fields.provincia.input.addEventListener('change', () => {
    const nuevaProvincia = refs.fields.provincia.input.value;
    const localidadField = createFormField({
      label: 'Localidad', name: 'localidad', type: 'autocomplete',
      provincia: nuevaProvincia,
      placeholder: nuevaProvincia ? 'Buscá tu localidad...' : 'Primero elegí una provincia',
    });
    refs.fields.localidad.replaceWith(localidadField);
    refs.fields.localidad = localidadField;
  });

  // ── Botón agregar ──────────────────────────────────────────
  const agregarBtn = createButton({
    label: 'Agregar localidad', icon: 'fa-plus', variant: 'secondary', size: 'sm',
    onClick: () => {
      const provincia = refs.fields.provincia.input.value;
      const localidad = refs.fields.localidad.getValue();
      if (!provincia || !localidad) {
        showToast('Elegí provincia y localidad', 'warning');
        return;
      }
      const yaExiste = uiState.cobertura.some(
        c => c.localidad === localidad && c.provincia === provincia
      );
      if (yaExiste) {
        showToast('Esa localidad ya está en tu cobertura', 'warning');
        return;
      }
      uiState.cobertura.push({ localidad, provincia });
      renderCobertura(coberturaContainer, uiState);
      // Disparar change para que updateState del botón recalcule
      document.dispatchEvent(new Event('change'));
    }
  });

  const agregarContainer = document.createElement('div');
  agregarContainer.className = 'agregar-cobertura-container';
  agregarContainer.appendChild(agregarBtn);
  section.appendChild(agregarContainer);

  const coberturaContainer = document.createElement('div');
  coberturaContainer.className = 'cobertura-list';
  renderCobertura(coberturaContainer, uiState);
  section.appendChild(coberturaContainer);

  refs.fields.direccion = createFormField({
    label: 'Dirección de atención', name: 'direccion',
    placeholder: 'Ej: Av. San Martín 123, Casilda',
    helpText: 'Opcional — solo si el cliente viene a tu domicilio o local',
    value: state.comercioData.direccion || ''
  });
  section.appendChild(refs.fields.direccion);

  return section;

  function renderCobertura(container, uiState) {
    container.innerHTML = '';
    if (!uiState.cobertura.length) {
      const empty = document.createElement('p');
      empty.className   = 'form-help';
      empty.textContent = 'Todavía no agregaste ninguna localidad.';
      container.appendChild(empty);
      return;
    }
    uiState.cobertura.forEach((item, i) => {
      const chip = document.createElement('div');
      chip.className = 'cobertura-chip';

      const texto = document.createElement('span');
      texto.textContent = `${item.localidad || item.ciudad || '(sin nombre)'}, ${item.provincia}`;

      const removeBtn = document.createElement('button');
      removeBtn.className = 'cobertura-chip-remove';
      removeBtn.innerHTML = '×';
      removeBtn.setAttribute('aria-label', 'Quitar');
      removeBtn.addEventListener('click', () => {
        uiState.cobertura.splice(i, 1);
        renderCobertura(container, uiState);
        document.dispatchEvent(new Event('change'));
      });

      chip.append(texto, removeBtn);
      container.appendChild(chip);
    });
  }
}

function renderSeccionContacto(state, refs, uiState) {
  const section = crearSeccion('¿Cómo te contactan?');

  const help = document.createElement('p');
  help.className   = 'form-help';
  help.textContent = 'El WhatsApp es obligatorio — es el canal principal para que los clientes te contacten.';
  section.appendChild(help);

  refs.fields.whatsapp = createFormField({
    label: 'WhatsApp', name: 'whatsapp', required: true,
    placeholder: 'Ej: 3412295316',
    helpText: 'Solo números, sin espacios ni guiones',
    value: state.comercioData.whatsapp || ''
  });

  refs.fields.telefono = createFormField({
    label: 'Teléfono', name: 'telefono',
    placeholder: 'Opcional',
    value: state.comercioData.telefono || ''
  });

  refs.fields.email = createFormField({
    label: 'Email', name: 'email', type: 'email',
    placeholder: 'Opcional',
    value: state.comercioData.email || ''
  });

  refs.fields.instagram = createFormField({
    label: 'Instagram', name: 'instagram',
    placeholder: '@tuusuario',
    value: state.comercioData.instagram || ''
  });

  section.append(
    refs.fields.whatsapp, refs.fields.telefono,
    refs.fields.email, refs.fields.instagram
  );

  return section;
}

function renderSeccionSlug(state, refs, uiState) {
  const section = crearSeccion('Tu dirección en ÍndiceIA');

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
      document.dispatchEvent(new Event('change'));
      return;
    }
    updateSlugStatus(refs, 'checking', 'Verificando disponibilidad...');
    refs.slugValidationTimer = setTimeout(async () => {
      await validarSlug(slug, refs, uiState, false);
      document.dispatchEvent(new Event('change'));
    }, 800);
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
          uiState.slug         = alt;
          uiState.slugValido   = true;
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
  icon.innerHTML   = icons[status] || '';
  text.textContent = message;
}

// ============================================================
// UTILS
// ============================================================
function crearSeccion(titulo) {
  const section = document.createElement('div');
  section.className = 'form-section';
  const h3 = document.createElement('h3');
  h3.textContent = titulo;
  section.appendChild(h3);
  return section;
}
