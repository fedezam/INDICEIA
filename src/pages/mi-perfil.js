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

  // Migración: si venía con cobertura[] viejo, convertir al nuevo formato
  const uiState = {
    slug:       state.comercioData.landing?.slug || null,
    slugValido: !!state.comercioData.landing?.slug,

    // Localidad principal — objeto { localidad, provincia, pais }
    localidad_principal: state.comercioData.localidad_principal || (
      state.comercioData.cobertura?.[0]
        ? { ...state.comercioData.cobertura[0], pais: 'Argentina' }
        : null
    ),

    // Zona de cobertura — array de { localidad, provincia }
    zona_cobertura: state.comercioData.zona_cobertura
      || state.comercioData.cobertura?.slice(1)?.map(c => ({ ...c }))
      || [],
  };

  // ── Snapshot inicial para dirty detection ──────────────────
  const initialSnapshot = {
    nombre:              state.comercioData.nombre       || '',
    especialidad:        state.comercioData.especialidad || '',
    descripcion:         state.comercioData.descripcion  || '',
    experiencia:         state.comercioData.experiencia  || '',
    whatsapp:            state.comercioData.whatsapp     || '',
    telefono:            state.comercioData.telefono     || '',
    email:               state.comercioData.email        || '',
    instagram:           state.comercioData.instagram    || '',
    direccion:           state.comercioData.direccion    || '',
    localidad_principal: JSON.stringify(uiState.localidad_principal),
    zona_cobertura:      JSON.stringify(uiState.zona_cobertura),
    slug:                state.comercioData.landing?.slug || '',
  };

  function getCurrentState() {
    return {
      nombre:              refs.fields.nombre?.input?.value.trim()       || '',
      especialidad:        refs.fields.especialidad?.input?.value.trim() || '',
      descripcion:         refs.fields.descripcion?.input?.value.trim()  || '',
      experiencia:         refs.fields.experiencia?.input?.value.trim()  || '',
      whatsapp:            refs.fields.whatsapp?.input?.value.trim()     || '',
      telefono:            refs.fields.telefono?.input?.value.trim()     || '',
      email:               refs.fields.email?.input?.value.trim()        || '',
      instagram:           refs.fields.instagram?.input?.value.trim()    || '',
      direccion:           refs.fields.direccion?.input?.value.trim()    || '',
      localidad_principal: JSON.stringify(uiState.localidad_principal),
      zona_cobertura:      JSON.stringify(uiState.zona_cobertura),
      slug:                uiState.slug || '',
    };
  }

  const dirtyController = {
    hasUnsavedChanges() {
      const current = getCurrentState();
      return Object.keys(initialSnapshot).some(k => current[k] !== initialSnapshot[k]);
    },
    markSaved() {
      const current = getCurrentState();
      Object.keys(initialSnapshot).forEach(k => { initialSnapshot[k] = current[k]; });
    }
  };

  // ── Título ─────────────────────────────────────────────────
  const title = document.createElement('h2');
  title.className   = 'page-title';
  title.textContent = state.isNuevo ? 'Crear mi perfil' : 'Editar mi perfil';
  page.appendChild(title);

  // ── Secciones ──────────────────────────────────────────────
  page.appendChild(renderSeccionIdentidad(state, refs, uiState));
  page.appendChild(renderSeccionUbicacion(state, refs, uiState));
  page.appendChild(renderSeccionContacto(state, refs, uiState));

  if (!state.slugExiste) {
    page.appendChild(renderSeccionSlug(state, refs, uiState));
  }

  // ── Botón ──────────────────────────────────────────────────
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
          !!uiState.localidad_principal;

        const slugValido = state.slugExiste || uiState.slugValido;
        return !!(camposValidos && slugValido);
      },

      async onSave({ uid, comercioId }) {
        const updates = {
          nombre:       refs.fields.nombre.input.value.trim(),
          especialidad: refs.fields.especialidad.input.value.trim(),
          descripcion:  refs.fields.descripcion.input.value.trim(),
          experiencia:  refs.fields.experiencia?.input?.value.trim() || null,

          localidad_principal: uiState.localidad_principal,
          zona_cobertura:      uiState.zona_cobertura,

          // Campos planos para compatibilidad con el grafo/índice
          localidad: uiState.localidad_principal?.localidad || null,
          provincia: uiState.localidad_principal?.provincia || null,
          pais:      'Argentina',

          direccion: refs.fields.direccion?.input?.value.trim() || null,

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
// SECCIÓN: IDENTIDAD
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

// ============================================================
// SECCIÓN: UBICACIÓN (dos bloques)
// ============================================================
function renderSeccionUbicacion(state, refs, uiState) {
  const section = crearSeccion('¿Dónde trabajás?');

  // ============================================================
  // BLOQUE 1 — Localidad principal
  // ============================================================
  const subPrincipal = document.createElement('div');
  subPrincipal.className = 'ubicacion-bloque';

  const helpPrincipal = document.createElement('p');
  helpPrincipal.className   = 'form-help';
  helpPrincipal.textContent = '¿En qué localidad trabajás? Esta es tu dirección principal — donde te encontramos normalmente.';
  subPrincipal.appendChild(helpPrincipal);

  // Provincia principal
  refs.fields.provincia = createFormField({
    label: 'Provincia', name: 'provincia', type: 'select', required: true
  });
  const optDefault = document.createElement('option');
  optDefault.value = ''; optDefault.textContent = 'Elegí una provincia...';
  refs.fields.provincia.input.prepend(optDefault);
  fillProvinciaSelector('Argentina', refs.fields.provincia.input);

  const provinciaGuardada = uiState.localidad_principal?.provincia || '';
  if (provinciaGuardada) refs.fields.provincia.input.value = provinciaGuardada;

  subPrincipal.appendChild(refs.fields.provincia);

  // Localidad principal (autocomplete)
  refs.fields.localidad = createFormField({
    label: 'Localidad principal', name: 'localidad',
    type: 'autocomplete', required: true,
    provincia: provinciaGuardada,
    placeholder: provinciaGuardada ? 'Buscá tu localidad...' : 'Primero elegí una provincia',
    value: uiState.localidad_principal?.localidad || ''
  });

  refs.fields.localidad.input.addEventListener('input', () => {
    const localidad = refs.fields.localidad.input.value;
    const provincia = refs.fields.provincia.input.value;
    if (localidad && provincia) {
      uiState.localidad_principal = { localidad, provincia, pais: 'Argentina' };
    } else {
      uiState.localidad_principal = null;
    }
    renderChipPrincipal(chipPrincipalContainer, uiState, refs);
    document.dispatchEvent(new Event('change'));
  });

  subPrincipal.appendChild(refs.fields.localidad);

  // Cambio de provincia → reconstruir autocomplete
  refs.fields.provincia.input.addEventListener('change', () => {
    const nuevaProvincia = refs.fields.provincia.input.value;
    uiState.localidad_principal = null;

    const nuevoField = createFormField({
      label: 'Localidad principal', name: 'localidad',
      type: 'autocomplete', required: true,
      provincia: nuevaProvincia,
      placeholder: nuevaProvincia ? 'Buscá tu localidad...' : 'Primero elegí una provincia',
    });

    nuevoField.input.addEventListener('input', () => {
      const localidad = nuevoField.input.value;
      if (localidad && nuevaProvincia) {
        uiState.localidad_principal = { localidad, provincia: nuevaProvincia, pais: 'Argentina' };
      } else {
        uiState.localidad_principal = null;
      }
      renderChipPrincipal(chipPrincipalContainer, uiState, refs);
      document.dispatchEvent(new Event('change'));
    });

    refs.fields.localidad.replaceWith(nuevoField);
    refs.fields.localidad = nuevoField;
    renderChipPrincipal(chipPrincipalContainer, uiState, refs);
    document.dispatchEvent(new Event('change'));
  });

  // Chip localidad principal
  const chipPrincipalContainer = document.createElement('div');
  chipPrincipalContainer.className = 'chip-principal-container';
  renderChipPrincipal(chipPrincipalContainer, uiState, refs);
  subPrincipal.appendChild(chipPrincipalContainer);

  section.appendChild(subPrincipal);

  // ============================================================
  // BLOQUE 2 — Zona de cobertura (opcional)
  // ============================================================
  const subZona = document.createElement('div');
  subZona.className = 'ubicacion-bloque ubicacion-zona';

  const zonaHeader = document.createElement('div');
  zonaHeader.className = 'zona-header';

  const zonaTitle = document.createElement('h4');
  zonaTitle.className   = 'zona-title';
  zonaTitle.textContent = '¿También trabajás en otras localidades?';
  zonaHeader.appendChild(zonaTitle);

  const zonaBadge = document.createElement('span');
  zonaBadge.className   = 'zona-badge-opcional';
  zonaBadge.textContent = 'Opcional';
  zonaHeader.appendChild(zonaBadge);

  subZona.appendChild(zonaHeader);

  const helpZona = document.createElement('p');
  helpZona.className   = 'form-help';
  helpZona.textContent = 'Si a veces viajás a trabajar a localidades cercanas, podés agregarlas acá para que los clientes de esas zonas también te encuentren. Si solo trabajás en tu localidad, no hace falta completar esto.';
  subZona.appendChild(helpZona);

  // Provincia zona
  refs.fields.provinciaZona = createFormField({
    label: 'Provincia', name: 'provinciaZona', type: 'select'
  });
  const optDefaultZona = document.createElement('option');
  optDefaultZona.value = ''; optDefaultZona.textContent = 'Elegí una provincia...';
  refs.fields.provinciaZona.input.prepend(optDefaultZona);
  fillProvinciaSelector('Argentina', refs.fields.provinciaZona.input);

  // Preseleccionar con la misma provincia principal si existe
  if (provinciaGuardada) refs.fields.provinciaZona.input.value = provinciaGuardada;

  subZona.appendChild(refs.fields.provinciaZona);

  // Localidad zona (autocomplete)
  refs.fields.localidadZona = createFormField({
    label: 'Localidad', name: 'localidadZona',
    type: 'autocomplete',
    provincia: provinciaGuardada,
    placeholder: provinciaGuardada ? 'Buscá una localidad...' : 'Primero elegí una provincia',
  });
  subZona.appendChild(refs.fields.localidadZona);

  // Cambio provincia zona → reconstruir autocomplete zona
  refs.fields.provinciaZona.input.addEventListener('change', () => {
    const nuevaProvincia = refs.fields.provinciaZona.input.value;

    const nuevoField = createFormField({
      label: 'Localidad', name: 'localidadZona',
      type: 'autocomplete',
      provincia: nuevaProvincia,
      placeholder: nuevaProvincia ? 'Buscá una localidad...' : 'Primero elegí una provincia',
    });

    refs.fields.localidadZona.replaceWith(nuevoField);
    refs.fields.localidadZona = nuevoField;
  });

  // Botón agregar
  const agregarBtn = createButton({
    label: 'Agregar localidad', icon: 'fa-plus', variant: 'secondary', size: 'sm',
    onClick: () => {
      const provincia = refs.fields.provinciaZona.input.value;
      const localidad = refs.fields.localidadZona.input.value;

      if (!provincia || !localidad) {
        showToast('Elegí provincia y localidad antes de agregar', 'warning');
        return;
      }

      // No duplicar la localidad principal
      const esPrincipal =
        uiState.localidad_principal?.localidad === localidad &&
        uiState.localidad_principal?.provincia === provincia;
      if (esPrincipal) {
        showToast('Esa ya es tu localidad principal', 'warning');
        return;
      }

      const yaExiste = uiState.zona_cobertura.some(
        c => c.localidad === localidad && c.provincia === provincia
      );
      if (yaExiste) {
        showToast('Esa localidad ya está en tu zona', 'warning');
        return;
      }

      uiState.zona_cobertura.push({ localidad, provincia });
      renderZonaChips(zonaChipsContainer, uiState);
      document.dispatchEvent(new Event('change'));
    }
  });

  const agregarContainer = document.createElement('div');
  agregarContainer.className = 'agregar-cobertura-container';
  agregarContainer.appendChild(agregarBtn);
  subZona.appendChild(agregarContainer);

  // Chips zona
  const zonaChipsContainer = document.createElement('div');
  zonaChipsContainer.className = 'zona-chips-container';
  renderZonaChips(zonaChipsContainer, uiState);
  subZona.appendChild(zonaChipsContainer);

  section.appendChild(subZona);

  // ── Dirección (opcional) ───────────────────────────────────
  refs.fields.direccion = createFormField({
    label: 'Dirección de atención', name: 'direccion',
    placeholder: 'Ej: Av. San Martín 123, Casilda',
    helpText: 'Opcional — solo si el cliente viene a tu domicilio o local',
    value: state.comercioData.direccion || ''
  });
  section.appendChild(refs.fields.direccion);

  return section;
}

// ── Chip localidad principal ───────────────────────────────
function renderChipPrincipal(container, uiState, refs) {
  container.innerHTML = '';
  if (!uiState.localidad_principal) return;

  const { localidad, provincia } = uiState.localidad_principal;

  const chip = document.createElement('div');
  chip.className = 'chip-principal';

  const icon = document.createElement('i');
  icon.className = 'fas fa-map-marker-alt';

  const texto = document.createElement('span');
  texto.textContent = `${localidad}, ${provincia}`;

  const removeBtn = document.createElement('button');
  removeBtn.className = 'chip-remove';
  removeBtn.innerHTML = '×';
  removeBtn.setAttribute('aria-label', 'Quitar localidad principal');
  removeBtn.addEventListener('click', () => {
    uiState.localidad_principal = null;
    // Limpiar el autocomplete visible
    const visibleInput = refs.fields.localidad?.querySelector('input[type="text"]');
    if (visibleInput) visibleInput.value = '';
    if (refs.fields.localidad?.input) refs.fields.localidad.input.value = '';
    container.innerHTML = '';
    document.dispatchEvent(new Event('change'));
  });

  chip.append(icon, texto, removeBtn);
  container.appendChild(chip);
}

// ── Chips zona de cobertura ────────────────────────────────
function renderZonaChips(container, uiState) {
  container.innerHTML = '';

  if (!uiState.zona_cobertura.length) {
    const empty = document.createElement('p');
    empty.className   = 'zona-chips-empty';
    empty.textContent = 'No agregaste localidades vecinas todavía — y está perfecto si solo trabajás en tu localidad.';
    container.appendChild(empty);
    return;
  }

  const label = document.createElement('p');
  label.className   = 'zona-chips-label';
  label.textContent = 'Localidades donde también trabajás:';
  container.appendChild(label);

  const list = document.createElement('div');
  list.className = 'cobertura-list';

  uiState.zona_cobertura.forEach((item, i) => {
    const chip = document.createElement('div');
    chip.className = 'cobertura-chip';

    const texto = document.createElement('span');
    texto.textContent = `${item.localidad}, ${item.provincia}`;

    const removeBtn = document.createElement('button');
    removeBtn.className = 'cobertura-chip-remove';
    removeBtn.innerHTML = '×';
    removeBtn.setAttribute('aria-label', 'Quitar');
    removeBtn.addEventListener('click', () => {
      uiState.zona_cobertura.splice(i, 1);
      renderZonaChips(container, uiState);
      document.dispatchEvent(new Event('change'));
    });

    chip.append(texto, removeBtn);
    list.appendChild(chip);
  });

  container.appendChild(list);
}

// ============================================================
// SECCIÓN: CONTACTO
// ============================================================
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

// ============================================================
// SECCIÓN: SLUG
// ============================================================
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
// SLUG HELPERS
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
