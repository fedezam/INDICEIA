// ============================================================
// src/pages/mi-perfil.js
// ============================================================

import { runSkeleton }             from '/src/skeleton/skeleton.js';
import { createFirebaseAdapter }   from '/src/skeleton/adapters/firebaseAdapter.js';
import { createFormField }         from '/src/skeleton/components/form-field/index.js';
import { createButton }            from '/src/skeleton/components/button/index.js';
import { createOnboardingButton }  from '/src/skeleton/components/onboarding-button/index.js';
import { showToast }               from '/src/skeleton/components/toast/index.js';
import { db }                      from '/src/services/firebase/firebase.js';
import { fillProvinciaSelector }   from '/src/shared/provincias.js';
import { mountCiudadAutocomplete } from '/src/shared/ciudades.js';
import {
  doc, setDoc, updateDoc,
  collection, getDoc, Timestamp
} from 'firebase/firestore';
import './mi-perfil.css';

// ============================================================
// MÓDULO DE PÁGINA
// ============================================================
const page = {

  // Estado en memoria — fuente de verdad para dirtyController
  _data: {
    nombre:              '',
    especialidad:        '',
    descripcion:         '',
    experiencia:         '',
    whatsapp:            '',
    telefono:            '',
    email:               '',
    instagram:           '',
    direccion:           '',
    localidad_principal: null,
    zona_cobertura:      [],
    slug:                null,
  },

  _originalSnapshot: null,
  _ctx:              null,
  _isEditMode:       false,
  _isNuevo:          false,
  _slugExiste:       false,
  _comercioData:     {},

  // Refs DOM — solo para escribir valores iniciales, no para leer estado
  _refs: {
    fields:              {},
    slugInput:           null,
    slugStatus:          null,
    slugValidationTimer: null,
  },

  // ──────────────────────────────────────────────────────────
  // LOAD
  // ──────────────────────────────────────────────────────────
  async load(ctx) {
    this._ctx          = ctx;
    this._isEditMode   = ctx.isEditMode === true;
    this._comercioData = ctx.comercioData || {};
    this._isNuevo      = !this._comercioData.nombre;
    this._slugExiste   = !!this._comercioData.landing?.slug;

    const c = this._comercioData;

    // Migración: cobertura[] viejo → nuevo formato
    const localidad_principal = c.localidad_principal || (
      c.cobertura?.[0] ? { ...c.cobertura[0], pais: 'Argentina' } : null
    );
    const zona_cobertura = c.zona_cobertura
      || c.cobertura?.slice(1)?.map(x => ({ ...x }))
      || [];

    this._data = {
      nombre:              c.nombre       || '',
      especialidad:        c.especialidad || '',
      descripcion:         c.descripcion  || '',
      experiencia:         c.experiencia  || '',
      whatsapp:            c.whatsapp     || '',
      telefono:            c.telefono     || '',
      email:               c.email        || '',
      instagram:           c.instagram    || '',
      direccion:           c.direccion    || '',
      localidad_principal,
      zona_cobertura,
      slug:                c.landing?.slug || null,
    };

    // Snapshot para dirty detection — igual que servicios.js
    this._originalSnapshot = structuredClone(this._data);
  },

  // ──────────────────────────────────────────────────────────
  // RENDER
  // ──────────────────────────────────────────────────────────
  render() {
    const root = document.getElementById('skeleton-page');
    root.innerHTML = '';

    // Reset refs para este render
    this._refs = {
      fields:              {},
      slugInput:           null,
      slugStatus:          null,
      slugValidationTimer: null,
    };

    const title = document.createElement('h2');
    title.className   = 'page-title';
    title.textContent = this._isNuevo ? 'Crear mi perfil' : 'Editar mi perfil';
    root.appendChild(title);

    root.appendChild(this._renderSeccionIdentidad());
    root.appendChild(this._renderSeccionUbicacion());
    root.appendChild(this._renderSeccionContacto());

    if (!this._slugExiste) {
      root.appendChild(this._renderSeccionSlug());
    }

    const btnContainer = document.createElement('div');
    btnContainer.className = 'btn-container';
    btnContainer.appendChild(this._renderSaveButton());
    root.appendChild(btnContainer);
  },

  // ──────────────────────────────────────────────────────────
  // DIRTY CONTROLLER — patrón servicios.js
  // ──────────────────────────────────────────────────────────
  _buildDirtyController() {
    return {
      hasUnsavedChanges: () =>
        JSON.stringify(this._data) !== JSON.stringify(this._originalSnapshot),
      markSaved: () => {
        this._originalSnapshot = structuredClone(this._data);
      },
    };
  },

  // ──────────────────────────────────────────────────────────
  // SAVE BUTTON
  // ──────────────────────────────────────────────────────────
  _renderSaveButton() {
    const dirtyController = this._buildDirtyController();

    return createOnboardingButton({
      stepName: 'mi-perfil',

      dirtyController: this._isEditMode ? dirtyController : undefined,

      getLabel: () => {
        if (!this._isEditMode) return 'Continuar';
        if (dirtyController.hasUnsavedChanges()) return 'Guardar y volver al dashboard';
        return 'Volver al dashboard';
      },

      validate: () => {
        const camposValidos =
          this._data.nombre.trim()       &&
          this._data.especialidad.trim() &&
          this._data.descripcion.trim()  &&
          this._data.whatsapp.trim()     &&
          !!this._data.localidad_principal;

        const slugValido = this._slugExiste || !!this._data.slug;
        return !!(camposValidos && slugValido);
      },

      async onSave({ uid, comercioId }) {
        const d = page._data;

        const updates = {
          nombre:       d.nombre,
          especialidad: d.especialidad,
          descripcion:  d.descripcion,
          experiencia:  d.experiencia || null,

          localidad_principal: d.localidad_principal,
          zona_cobertura:      d.zona_cobertura,

          // ✅ FIX: ubicacion estructurada igual que mi-comercio.js
          ubicacion: {
            pais:      d.localidad_principal?.pais || 'Argentina',
            provincia: d.localidad_principal?.provincia || '',
            localidad: {
              id:     d.localidad_principal?.id       || null,
              nombre: d.localidad_principal?.localidad || '',
              lat:    d.localidad_principal?.lat       || null,
              lng:    d.localidad_principal?.lng       || null,
            }
          },

          // legacy — mantenemos para compatibilidad con código viejo
          localidad: d.localidad_principal?.localidad || null,
          provincia: d.localidad_principal?.provincia || null,
          pais:      'Argentina',

          direccion: d.direccion || null,

          whatsapp:  d.whatsapp,
          telefono:  d.telefono  || null,
          email:     d.email     || null,
          instagram: d.instagram || null,

          entityType: 'prestador',
        };

        if (!page._slugExiste) {
          updates.landing = {
            activo: true, nombre: updates.nombre,
            slug: d.slug, tipo: 'perfil',
            createdAt: new Date(), updatedAt: new Date()
          };
        } else {
          updates.landing = {
            ...page._comercioData.landing,
            nombre: updates.nombre, updatedAt: new Date()
          };
        }

        if (page._isNuevo) {
          const comercioRef     = comercioId
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

          await setDoc(doc(db, 'landings', d.slug), {
            slug: d.slug, comercioId: nuevoComercioId,
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

          if (!page._slugExiste) {
            await setDoc(doc(db, 'landings', d.slug), {
              slug: d.slug, comercioId,
              nombre: updates.nombre, activo: true,
              createdAt: new Date(), updatedAt: new Date()
            });
          }
        }

        return { success: true, stepMarked: true };
      },

      onSuccess: () => {
        showToast('Perfil guardado correctamente', 'success');
        dirtyController.markSaved();
      },

      onError: (err) => {
        console.error('❌ Error guardando perfil:', err);
        showToast('Error al guardar: ' + err.message, 'error');
      },
    });
  },

  // ============================================================
  // SECCIÓN: IDENTIDAD
  // ============================================================
  _renderSeccionIdentidad() {
    const section = crearSeccion('¿Quién sos?');

    const help = document.createElement('p');
    help.className   = 'form-help';
    help.textContent = 'Estos datos definen cómo te va a presentar tu asistente a los clientes.';
    section.appendChild(help);

    this._refs.fields.nombre = createFormField({
      label: 'Nombre o marca', name: 'nombre', required: true,
      placeholder: 'Ej: Juan Pérez o Plomería JP',
      helpText: 'Como te conocen tus clientes — puede ser tu nombre o el nombre de tu marca',
      value: this._data.nombre,
      actions: { onChange: (v) => { this._data.nombre = v.trim(); } }
    });

    this._refs.fields.especialidad = createFormField({
      label: 'Especialidad', name: 'especialidad', required: true,
      placeholder: 'Ej: Plomero, Manicura, Profe de matemáticas',
      helpText: 'En una línea, qué hacés',
      value: this._data.especialidad,
      actions: { onChange: (v) => { this._data.especialidad = v.trim(); } }
    });

    this._refs.fields.descripcion = createFormField({
      label: 'Descripción', name: 'descripcion', type: 'textarea',
      rows: 3, required: true,
      placeholder: 'Ej: Hago instalaciones y reparaciones de cañerías en hogares y comercios.',
      helpText: 'Dos o tres líneas que expliquen qué hacés y por qué elegirte',
      value: this._data.descripcion,
      actions: { onChange: (v) => { this._data.descripcion = v.trim(); } }
    });

    this._refs.fields.experiencia = createFormField({
      label: 'Años de experiencia', name: 'experiencia', type: 'number',
      placeholder: 'Ej: 10',
      helpText: 'Opcional — ayuda a generar confianza',
      value: this._data.experiencia,
      actions: { onChange: (v) => { this._data.experiencia = v.trim(); } }
    });

    // Auto-slug desde nombre — solo si el slug todavía no existe
    if (!this._slugExiste) {
      this._refs.fields.nombre.input?.addEventListener('input', () => {
        clearTimeout(this._refs.slugValidationTimer);
        const nombre = this._data.nombre;
        if (nombre.length >= 3 && this._refs.slugInput) {
          this._refs.slugValidationTimer = setTimeout(async () => {
            const newSlug = slugify(nombre);
            this._refs.slugInput.value = newSlug;
            await this._validarSlug(newSlug, true);
          }, 500);
        }
      });
    }

    section.append(
      this._refs.fields.nombre,
      this._refs.fields.especialidad,
      this._refs.fields.descripcion,
      this._refs.fields.experiencia,
    );

    return section;
  },

  // ============================================================
  // SECCIÓN: UBICACIÓN
  // ============================================================
  _renderSeccionUbicacion() {
    const section = crearSeccion('¿Dónde trabajás?');

    const provinciaGuardada = this._data.localidad_principal?.provincia || '';

    // ── Bloque 1: localidad principal ─────────────────────────
    const subPrincipal = document.createElement('div');
    subPrincipal.className = 'ubicacion-bloque';

    const helpPrincipal = document.createElement('p');
    helpPrincipal.className   = 'form-help';
    helpPrincipal.textContent = '¿En qué localidad trabajás? Esta es tu dirección principal.';
    subPrincipal.appendChild(helpPrincipal);

    this._refs.fields.provincia = createFormField({
      label: 'Provincia', name: 'provincia', type: 'select', required: true
    });
    const optDefault = document.createElement('option');
    optDefault.value = ''; optDefault.textContent = 'Elegí una provincia...';
    this._refs.fields.provincia.input.prepend(optDefault);
    fillProvinciaSelector('Argentina', this._refs.fields.provincia.input);
    if (provinciaGuardada) this._refs.fields.provincia.input.value = provinciaGuardada;
    subPrincipal.appendChild(this._refs.fields.provincia);

    const localidadLabel = document.createElement('label');
    localidadLabel.className   = 's-label';
    localidadLabel.textContent = 'Localidad principal *';
    subPrincipal.appendChild(localidadLabel);

    const localidadContainer = document.createElement('div');
    localidadContainer.className = 'ciudad-autocomplete-container';
    subPrincipal.appendChild(localidadContainer);

    const chipPrincipalContainer = document.createElement('div');
    chipPrincipalContainer.className = 'chip-principal-container';
    subPrincipal.appendChild(chipPrincipalContainer);

    const montarLocalidadPrincipal = (provinciaVal) => {
      mountCiudadAutocomplete(provinciaVal, localidadContainer, '', (loc) => {
        // ✅ FIX: guardar objeto completo con id, lat, lng
        this._data.localidad_principal = {
          localidad: loc.nombre,
          provincia: provinciaVal,
          pais:      'Argentina',
          id:        loc.id,
          lat:       loc.lat,
          lng:       loc.lng,
        };
        renderChipPrincipal(chipPrincipalContainer, this._data, montarLocalidadPrincipal, this._refs);
        document.dispatchEvent(new Event('change'));
      });
    };

    if (provinciaGuardada) {
      const localidadGuardada = this._data.localidad_principal?.localidad || '';
      mountCiudadAutocomplete(provinciaGuardada, localidadContainer, localidadGuardada, (loc) => {
        // ✅ FIX: guardar objeto completo con id, lat, lng
        this._data.localidad_principal = {
          localidad: loc.nombre,
          provincia: provinciaGuardada,
          pais:      'Argentina',
          id:        loc.id,
          lat:       loc.lat,
          lng:       loc.lng,
        };
        renderChipPrincipal(chipPrincipalContainer, this._data, montarLocalidadPrincipal, this._refs);
        document.dispatchEvent(new Event('change'));
      });
    }

    renderChipPrincipal(chipPrincipalContainer, this._data, montarLocalidadPrincipal, this._refs);

    this._refs.fields.provincia.input.addEventListener('change', () => {
      const nuevaProvincia = this._refs.fields.provincia.input.value;
      this._data.localidad_principal = null;
      chipPrincipalContainer.innerHTML = '';
      montarLocalidadPrincipal(nuevaProvincia);
      document.dispatchEvent(new Event('change'));
    });

    section.appendChild(subPrincipal);

    // ── Bloque 2: zona de cobertura ───────────────────────────
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
    helpZona.textContent = 'Si a veces viajás a trabajar a localidades cercanas, podés agregarlas acá.';
    subZona.appendChild(helpZona);

    this._refs.fields.provinciaZona = createFormField({
      label: 'Provincia', name: 'provinciaZona', type: 'select'
    });
    const optDefaultZona = document.createElement('option');
    optDefaultZona.value = ''; optDefaultZona.textContent = 'Elegí una provincia...';
    this._refs.fields.provinciaZona.input.prepend(optDefaultZona);
    fillProvinciaSelector('Argentina', this._refs.fields.provinciaZona.input);
    if (provinciaGuardada) this._refs.fields.provinciaZona.input.value = provinciaGuardada;
    subZona.appendChild(this._refs.fields.provinciaZona);

    const localidadZonaLabel = document.createElement('label');
    localidadZonaLabel.className   = 's-label';
    localidadZonaLabel.textContent = 'Localidad';
    subZona.appendChild(localidadZonaLabel);

    const localidadZonaContainer = document.createElement('div');
    localidadZonaContainer.className = 'ciudad-autocomplete-container';
    subZona.appendChild(localidadZonaContainer);

    let localidadZonaSeleccionada = null;

    const montarLocalidadZona = (provinciaVal) => {
      localidadZonaSeleccionada = null;
      mountCiudadAutocomplete(provinciaVal, localidadZonaContainer, '', (loc) => {
        localidadZonaSeleccionada = { localidad: loc.nombre, provincia: provinciaVal };
      });
    };

    if (provinciaGuardada) montarLocalidadZona(provinciaGuardada);

    this._refs.fields.provinciaZona.input.addEventListener('change', () => {
      montarLocalidadZona(this._refs.fields.provinciaZona.input.value);
    });

    const agregarBtn = createButton({
      label: 'Agregar localidad', icon: 'fa-plus', variant: 'secondary', size: 'sm',
      onClick: () => {
        const provincia = this._refs.fields.provinciaZona.input.value;
        const localidad = localidadZonaSeleccionada?.localidad;

        if (!provincia || !localidad) {
          showToast('Elegí provincia y localidad antes de agregar', 'warning');
          return;
        }
        const esPrincipal =
          this._data.localidad_principal?.localidad === localidad &&
          this._data.localidad_principal?.provincia === provincia;
        if (esPrincipal) {
          showToast('Esa ya es tu localidad principal', 'warning');
          return;
        }
        const yaExiste = this._data.zona_cobertura.some(
          c => c.localidad === localidad && c.provincia === provincia
        );
        if (yaExiste) {
          showToast('Esa localidad ya está en tu zona', 'warning');
          return;
        }
        this._data.zona_cobertura.push({ localidad, provincia });
        renderZonaChips(zonaChipsContainer, this._data);
        document.dispatchEvent(new Event('change'));
      }
    });

    const agregarContainer = document.createElement('div');
    agregarContainer.className = 'agregar-cobertura-container';
    agregarContainer.appendChild(agregarBtn);
    subZona.appendChild(agregarContainer);

    const zonaChipsContainer = document.createElement('div');
    zonaChipsContainer.className = 'zona-chips-container';
    renderZonaChips(zonaChipsContainer, this._data);
    subZona.appendChild(zonaChipsContainer);

    section.appendChild(subZona);

    // ── Dirección opcional ────────────────────────────────────
    this._refs.fields.direccion = createFormField({
      label: 'Dirección de atención', name: 'direccion',
      placeholder: 'Ej: Av. San Martín 123, Casilda',
      helpText: 'Opcional — solo si el cliente viene a tu domicilio o local',
      value: this._data.direccion,
      actions: { onChange: (v) => { this._data.direccion = v.trim(); } }
    });
    section.appendChild(this._refs.fields.direccion);

    return section;
  },

  // ============================================================
  // SECCIÓN: CONTACTO
  // ============================================================
  _renderSeccionContacto() {
    const section = crearSeccion('¿Cómo te contactan?');

    const help = document.createElement('p');
    help.className   = 'form-help';
    help.textContent = 'El WhatsApp es obligatorio — es el canal principal para que los clientes te contacten.';
    section.appendChild(help);

    this._refs.fields.whatsapp = createFormField({
      label: 'WhatsApp', name: 'whatsapp', required: true,
      placeholder: 'Ej: 3412295316',
      helpText: 'Solo números, sin espacios ni guiones',
      value: this._data.whatsapp,
      actions: { onChange: (v) => { this._data.whatsapp = v.trim(); } }
    });

    this._refs.fields.telefono = createFormField({
      label: 'Teléfono', name: 'telefono',
      placeholder: 'Opcional',
      value: this._data.telefono,
      actions: { onChange: (v) => { this._data.telefono = v.trim(); } }
    });

    this._refs.fields.email = createFormField({
      label: 'Email', name: 'email', type: 'email',
      placeholder: 'Opcional',
      value: this._data.email,
      actions: { onChange: (v) => { this._data.email = v.trim(); } }
    });

    this._refs.fields.instagram = createFormField({
      label: 'Instagram', name: 'instagram',
      placeholder: '@tuusuario',
      value: this._data.instagram,
      actions: { onChange: (v) => { this._data.instagram = v.trim(); } }
    });

    section.append(
      this._refs.fields.whatsapp,
      this._refs.fields.telefono,
      this._refs.fields.email,
      this._refs.fields.instagram,
    );

    return section;
  },

  // ============================================================
  // SECCIÓN: SLUG
  // ============================================================
  _renderSeccionSlug() {
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
    slugInput.value       = this._data.slug || '';
    this._refs.slugInput  = slugInput;

    slugContainer.append(slugPrefix, slugInput);
    section.appendChild(slugContainer);

    const slugStatus = document.createElement('div');
    slugStatus.className  = 'slug-status';
    slugStatus.innerHTML  = '<span class="slug-icon"></span><span class="slug-text"></span>';
    this._refs.slugStatus = slugStatus;
    section.appendChild(slugStatus);

    slugInput.addEventListener('input', () => {
      clearTimeout(this._refs.slugValidationTimer);
      const slug = slugInput.value.trim().toLowerCase();
      if (!slug) {
        this._updateSlugStatus('empty', '');
        this._data.slug = null;
        document.dispatchEvent(new Event('change'));
        return;
      }
      this._updateSlugStatus('checking', 'Verificando disponibilidad...');
      this._refs.slugValidationTimer = setTimeout(async () => {
        await this._validarSlug(slug, false);
        document.dispatchEvent(new Event('change'));
      }, 800);
    });

    return section;
  },

  // ============================================================
  // SLUG HELPERS
  // ============================================================
  async _validarSlug(slug, autoGenerado) {
    if (!slug || slug.length < 3) {
      this._updateSlugStatus('empty', '');
      this._data.slug = null;
      return;
    }
    try {
      const snap = await getDoc(doc(db, 'landings', slug));
      if (!snap.exists()) {
        this._data.slug = slug;
        this._updateSlugStatus('available', `✓ Disponible: indiceia.com/${slug}`);
        return;
      }
      if (autoGenerado) {
        for (let i = 1; i <= 3; i++) {
          const alt     = `${slug}-${i}`;
          const altSnap = await getDoc(doc(db, 'landings', alt));
          if (!altSnap.exists()) {
            this._data.slug              = alt;
            this._refs.slugInput.value   = alt;
            this._updateSlugStatus('suggestion', `Ya existe. Sugerencia: indiceia.com/${alt}`);
            return;
          }
        }
      }
      this._data.slug = null;
      this._updateSlugStatus('taken', 'Este nombre ya está en uso. Probá con otro.');
    } catch (err) {
      console.error('Error validando slug:', err);
      this._data.slug = null;
      this._updateSlugStatus('error', 'Error al validar. Intentá de nuevo.');
    }
  },

  _updateSlugStatus(status, message) {
    if (!this._refs.slugStatus) return;
    const icon = this._refs.slugStatus.querySelector('.slug-icon');
    const text = this._refs.slugStatus.querySelector('.slug-text');
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
  },
};

// ============================================================
// CHIP LOCALIDAD PRINCIPAL
// ============================================================
function renderChipPrincipal(container, data, montarFn, refs) {
  container.innerHTML = '';
  if (!data.localidad_principal) return;

  const { localidad, provincia } = data.localidad_principal;

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
    data.localidad_principal = null;
    montarFn(refs.fields.provincia.input.value);
    container.innerHTML = '';
    document.dispatchEvent(new Event('change'));
  });

  chip.append(icon, texto, removeBtn);
  container.appendChild(chip);
}

// ============================================================
// CHIPS ZONA DE COBERTURA
// ============================================================
function renderZonaChips(container, data) {
  container.innerHTML = '';

  if (!data.zona_cobertura.length) {
    const empty = document.createElement('p');
    empty.className   = 'zona-chips-empty';
    empty.textContent = 'No agregaste localidades vecinas todavía.';
    container.appendChild(empty);
    return;
  }

  const label = document.createElement('p');
  label.className   = 'zona-chips-label';
  label.textContent = 'Localidades donde también trabajás:';
  container.appendChild(label);

  const list = document.createElement('div');
  list.className = 'cobertura-list';

  data.zona_cobertura.forEach((item, i) => {
    const chip = document.createElement('div');
    chip.className = 'cobertura-chip';

    const texto = document.createElement('span');
    texto.textContent = `${item.localidad}, ${item.provincia}`;

    const removeBtn = document.createElement('button');
    removeBtn.className = 'cobertura-chip-remove';
    removeBtn.innerHTML = '×';
    removeBtn.setAttribute('aria-label', 'Quitar');
    removeBtn.addEventListener('click', () => {
      data.zona_cobertura.splice(i, 1);
      renderZonaChips(container, data);
      document.dispatchEvent(new Event('change'));
    });

    chip.append(texto, removeBtn);
    list.appendChild(chip);
  });

  container.appendChild(list);
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

// ============================================================
// ARRANQUE
// ============================================================
runSkeleton({
  page,
  adapter: createFirebaseAdapter,
  options: { loadingMessage: 'Cargando perfil...' }
});
