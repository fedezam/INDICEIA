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
import { fillProvinciaSelector } from '/src/shared/provincias.js';
import { mountCiudadAutocomplete } from '/src/shared/ciudades.js';
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
    fields:              {},
    guardarBtn:          null,
    slugInput:           null,
    slugStatus:          null,
    slugValidationTimer: null,
    coberturaList:       null,   // contenedor de chips de ciudades
  };

  const uiState = {
    slug:        state.comercioData.landing?.slug || null,
    slugValido:  !!state.comercioData.landing?.slug,
    cobertura:   state.comercioData.cobertura || [],  // [{ ciudad, provincia }]
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
  help.textContent = 'Agregá las ciudades donde prestás servicio. Podés agregar más de una.';
  section.appendChild(help);

  // ── PROVINCIA ─────────────────────────────────────────────
  const provinciaLabel = document.createElement('label');
  provinciaLabel.className   = 'form-field-label';
  provinciaLabel.textContent = 'Provincia';
  section.appendChild(provinciaLabel);

  const provinciaSelect = document.createElement('select');
  provinciaSelect.className = 'form-field-input';
  const optDefault = document.createElement('option');
  optDefault.value       = '';
  optDefault.textContent = 'Elegí una provincia...';
  provinciaSelect.appendChild(optDefault);
  fillProvinciaSelector('Argentina', provinciaSelect);

  // Restaurar valor guardado si existe
  const provinciaGuardada = state.comercioData.cobertura?.[0]?.provincia || '';
  if (provinciaGuardada) provinciaSelect.value = provinciaGuardada;

  section.appendChild(provinciaSelect);

  // ── CIUDAD AUTOCOMPLETE ────────────────────────────────────
  const ciudadLabel = document.createElement('label');
  ciudadLabel.className   = 'form-field-label';
  ciudadLabel.textContent = 'Ciudad';
  section.appendChild(ciudadLabel);

  const ciudadContainer = document.createElement('div');
  ciudadContainer.className = 'ciudad-autocomplete-container';
  section.appendChild(ciudadContainer);

  let ciudadSeleccionada = null;

  function montarCiudad(provincia) {
    mountCiudadAutocomplete(provincia, ciudadContainer, '', (ciudad) => {
      ciudadSeleccionada = ciudad;
    });
  }

  if (provinciaGuardada) montarCiudad(provinciaGuardada);

  provinciaSelect.addEventListener('change', () => {
    ciudadSeleccionada = null;
    montarCiudad(provinciaSelect.value);
  });

  // ── BOTÓN AGREGAR ──────────────────────────────────────────
  const agregarBtn = createButton({
    label:   'Agregar ciudad',
    icon:    'fa-plus',
    variant: 'secondary',
    size:    'sm',
    onClick: () => {
      const provincia = provinciaSelect.value;
      if (!provincia || !ciudadSeleccionada) {
        showToast('Elegí provincia y ciudad', 'warning');
        return;
      }
      const yaExiste = uiState.cobertura.some(
        c => c.ciudad === ciudadSeleccionada && c.provincia === provincia
      );
      if (yaExiste) {
        showToast('Esa ciudad ya está en tu cobertura', 'warning');
        return;
      }
      uiState.cobertura.push({ ciudad: ciudadSeleccionada, provincia });
      renderCobertura(coberturaContainer, uiState, state, refs);
      validarFormulario(state, refs, uiState);
      ciudadSeleccionada = null;
      montarCiudad(provincia);
    }
  });

  const agregarContainer = document.createElement('div');
  agregarContainer.style.marginTop = '8px';
  agregarContainer.appendChild(agregarBtn);
  section.appendChild(agregarContainer);

  // ── LISTA DE CIUDADES AGREGADAS ────────────────────────────
  const coberturaContainer = document.createElement('div');
  coberturaContainer.className = 'cobertura-list';
  coberturaContainer.style.marginTop = '12px';
  refs.coberturaList = coberturaContainer;
  renderCobertura(coberturaContainer, uiState, state, refs);
  section.appendChild(coberturaContainer);

  // ── DIRECCIÓN ──────────────────────────────────────────────
  refs.fields.direccion = createFormField({
    label:       'Dirección de atención',
    name:        'direccion',
    placeholder: 'Ej: Av. San Martín 123, Casilda',
    helpText:    'Opcional — solo si el cliente viene a tu domicilio o local',
    value:       state.comercioData.direccion || ''
  });

  refs.fields.direccion.input?.addEventListener('input', () => validarFormulario(state, refs, uiState));
  section.appendChild(refs.fields.direccion);

  return section;
}

// ── RENDER CHIPS DE COBERTURA ──────────────────────────────
function renderCobertura(container, uiState, state, refs) {
  container.innerHTML = '';
  if (!uiState.cobertura.length) {
    const empty = document.createElement('p');
    empty.className   = 'form-help';
    empty.textContent = 'Todavía no agregaste ninguna ciudad.';
    container.appendChild(empty);
    return;
  }

  uiState.cobertura.forEach((item, i) => {
    const chip = document.createElement('div');
    chip.className  = 'cobertura-chip';
    chip.style.cssText = `
      display: inline-flex; align-items: center; gap: 6px;
      background: var(--s-primary-light, #f0fdf4);
      border: 1px solid var(--s-primary, #16a34a);
      border-radius: 20px; padding: 4px 10px; margin: 4px;
      font-size: 0.85rem;
    `;

    const texto = document.createElement('span');
    texto.textContent = `${item.ciudad}, ${item.provincia}`;

    const removeBtn = document.createElement('button');
    removeBtn.innerHTML   = '×';
    removeBtn.style.cssText = 'background:none;border:none;cursor:pointer;font-size:1rem;color:#666;padding:0;line-height:1;';
    removeBtn.addEventListener('click', () => {
      uiState.cobertura.splice(i, 1);
      renderCobertura(container, uiState, state, refs);
      validarFormulario(state, refs, uiState);
    });

    chip.append(texto, removeBtn);
    container.appendChild(chip);
  });
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
// VALIDACIÓN
// ============================================================
function validarFormulario(state, refs, uiState) {
  const camposValidos =
    refs.fields.nombre?.input?.value.trim()       &&
    refs.fields.especialidad?.input?.value.trim() &&
    refs.fields.descripcion?.input?.value.trim()  &&
    refs.fields.whatsapp?.input?.value.trim()     &&
    uiState.cobertura.length > 0;                  // al menos una ciudad

  const slugValido       = state.slugExiste || uiState.slugValido;
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

      // Ubicación estructurada
      cobertura:  uiState.cobertura,           // [{ ciudad, provincia }]
      provincia:  uiState.cobertura[0]?.provincia || null,  // para index.builder
      ciudad:     uiState.cobertura[0]?.ciudad    || null,  // para index.builder
      pais:       'Argentina',
      direccion:  refs.fields.direccion?.input?.value.trim() || null,

      // Contacto
      whatsapp:  refs.fields.whatsapp.input.value.trim(),
      telefono:  refs.fields.telefono?.input?.value.trim()  || null,
      email:     refs.fields.email?.input?.value.trim()     || null,
      instagram: refs.fields.instagram?.input?.value.trim() || null,

      // Tipo de entidad
      entityType: 'prestador',
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
      const comercioRef = ctx.comercioId
        ? doc(db, 'entidades', ctx.comercioId)
        : doc(collection(db, 'entidades'));
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

      await updateDoc(doc(db, 'entidades', ctx.comercioId), updates);

      if (!state.slugExiste) {
        await setDoc(doc(db, 'landings', uiState.slug), {
          slug:       uiState.slug,
          comercioId: ctx.comercioId,
          nombre:     updates.nombre,
          activo:     true,
          createdAt:  new Date(),
          updatedAt:  new Date()
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
