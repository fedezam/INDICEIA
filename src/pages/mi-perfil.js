// ============================================================
// src/pages/mi-perfil.js
// ============================================================

import { runSkeleton }             from '/src/skeleton/skeleton.js';
import { createFirebaseAdapter }   from '/src/skeleton/adapters/firebaseAdapter.js';
import { createFormField }         from '/src/skeleton/components/form-field/index.js';
import { createCheckboxGroup }     from '/src/skeleton/components/checkbox-group/index.js';
import { createButton }            from '/src/skeleton/components/button/index.js';
import { createOnboardingButton }  from '/src/skeleton/components/onboarding-button/index.js';
import { createChip }              from '/src/skeleton/components/chip/index.js';
import { createAutocomplete }      from '/src/skeleton/components/autocomplete/index.js';
import { showToast }               from '/src/skeleton/components/toast/index.js';
import { db }                      from '/src/services/firebase/firebase.js';
import { fillProvinciaSelector }   from '/src/shared/provincias.js';
import { getLocalidades }          from '/src/shared/ciudades.js';
import { rubroFromForm }           from '/src/shared/entity-context.js';
import {
  doc, setDoc, updateDoc,
  collection, getDoc, Timestamp
} from 'firebase/firestore';
import './mi-perfil.css';

// ============================================================
// MÓDULO DE PÁGINA
// ============================================================
const page = {
  _data: {
    nombre: '', especialidad: '', descripcion: '', experiencia: '',
    modalidad_trabajo: null, atiende_urgencias: false,
    whatsapp: '', telefono: '', email: '', instagram: '',
    direccion: '', localidad_principal: null, zona_cobertura: [], slug: null,
  },
  _originalSnapshot: null, _ctx: null, _isEditMode: false,
  _isNuevo: false, _slugExiste: false, _comercioData: {},
  _refs: { fields: {}, slugInput: null, slugStatus: null, slugValidationTimer: null },

  async load(ctx) {
    this._ctx = ctx;
    this._isEditMode = ctx.isEditMode === true;
    this._comercioData = ctx.comercioData || {};
    this._isNuevo = !this._comercioData.nombre;
    this._slugExiste = !!this._comercioData.landing?.slug;

    const c = this._comercioData;
    const localidad_principal = c.localidad_principal || (c.cobertura?.[0] ? { ...c.cobertura[0], pais: 'Argentina' } : null);
    const zona_cobertura = c.zona_cobertura || c.cobertura?.slice(1)?.map(x => ({ ...x })) || [];

    this._data = {
      nombre: c.nombre || '', especialidad: c.especialidad || '', descripcion: c.descripcion || '',
      experiencia: c.experiencia || '', modalidad_trabajo: c.modalidad_trabajo || null,
      atiende_urgencias: c.atiende_urgencias === true, whatsapp: c.whatsapp || '',
      telefono: c.telefono || '', email: c.email || '', instagram: c.instagram || '',
      direccion: c.direccion || '', localidad_principal, zona_cobertura,
      slug: c.landing?.slug || null,
    };
    this._originalSnapshot = structuredClone(this._data);
  },

  render() {
    const root = document.getElementById('skeleton-page');
    root.innerHTML = '';
    this._refs = { fields: {}, slugInput: null, slugStatus: null, slugValidationTimer: null };

    const title = document.createElement('h2');
    title.className = 'page-title';
    title.textContent = this._isNuevo ? 'Crear mi perfil' : 'Editar mi perfil';
    root.appendChild(title);

    root.appendChild(this._renderSeccionIdentidad());
    root.appendChild(this._renderSeccionModalidadTrabajo());
    root.appendChild(this._renderSeccionUbicacion());
    root.appendChild(this._renderSeccionContacto());
    if (!this._slugExiste) root.appendChild(this._renderSeccionSlug());

    const btnContainer = document.createElement('div');
    btnContainer.className = 'btn-container';
    btnContainer.appendChild(this._renderSaveButton());
    root.appendChild(btnContainer);
  },

  _buildDirtyController() {
    return {
      hasUnsavedChanges: () => JSON.stringify(this._data) !== JSON.stringify(this._originalSnapshot),
      markSaved: () => { this._originalSnapshot = structuredClone(this._data); }
    };
  },

  // ──────────────────────────────────────────────────────────
  // SECCIÓN: IDENTIDAD
  // ──────────────────────────────────────────────────────────
  _renderSeccionIdentidad() {
    const section = crearSeccion('¿Quién sos?');
    const help = document.createElement('p');
    help.className = 'form-help';
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
      label: 'Descripción', name: 'descripcion', type: 'textarea', rows: 3, required: true,
      placeholder: 'Ej: Hago instalaciones y reparaciones de cañerías en hogares y comercios.',
      helpText: 'Dos o tres líneas que expliquen qué hacés y por qué elegirte',
      value: this._data.descripcion,
      actions: { onChange: (v) => { this._data.descripcion = v.trim(); } }
    });
    this._refs.fields.experiencia = createFormField({
      label: 'Años de experiencia', name: 'experiencia', type: 'number',
      placeholder: 'Ej: 10', helpText: 'Opcional — ayuda a generar confianza',
      value: this._data.experiencia,
      actions: { onChange: (v) => { this._data.experiencia = v.trim(); } }
    });

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
      this._refs.fields.nombre, this._refs.fields.especialidad,
      this._refs.fields.descripcion, this._refs.fields.experiencia,
      this._renderUrgenciasField()
    );
    return section;
  },

  // ──────────────────────────────────────────────────────────
  // SECCIÓN: MODALIDAD DE TRABAJO
  // ──────────────────────────────────────────────────────────
  _renderSeccionModalidadTrabajo() {
    const section = crearSeccion('¿Cómo trabajás?');
    section.classList.add('seccion-modalidad-trabajo');

    const help = document.createElement('p');
    help.className = 'form-help';
    help.textContent = 'Esto define qué información le mostramos a tus clientes sobre dónde y cómo atendés.';
    section.appendChild(help);

    const opciones = [
      { value: 'domicilio', label: 'Voy al domicilio del cliente', icon: '🏠', help: 'Plomero, electricista, manicura a domicilio...' },
      { value: 'local', label: 'Tengo local / taller / consultorio', icon: '🏪', help: 'Estética, mecánico, reparación de PC...' }
    ];

    const radioGroup = createCheckboxGroup({
      label: '', name: 'modalidad_trabajo', required: true, mode: 'single', orientation: 'vertical',
      options: opciones.map(opt => ({ value: opt.value, label: `${opt.icon} ${opt.label}`, description: opt.help })),
      value: this._data.modalidad_trabajo,
      actions: {
        onChange: (value) => {
          this._data.modalidad_trabajo = value;
          const old = document.querySelector('.seccion-ubicacion');
          if (old) old.replaceWith(this._renderSeccionUbicacion());
        }
      }
    });
    section.appendChild(radioGroup);
    return section;
  },

  // ──────────────────────────────────────────────────────────
  // SECCIÓN: UBICACIÓN (con Autocomplete + Chip del skeleton)
  // ──────────────────────────────────────────────────────────
  _renderSeccionUbicacion() {
    const tieneLocal = this._data.modalidad_trabajo === 'local';
    const section = crearSeccion(tieneLocal ? '¿Dónde está tu local?' : '¿Desde dónde trabajás?');
    section.classList.add('seccion-ubicacion');

    const provinciaGuardada = this._data.localidad_principal?.provincia || '';
    const subPrincipal = document.createElement('div');
    subPrincipal.className = 'ubicacion-bloque';

    const helpPrincipal = document.createElement('p');
    helpPrincipal.className = 'form-help';
    helpPrincipal.textContent = tieneLocal ? '¿En qué localidad está tu local?' : '¿En qué localidad estás basado?';
    subPrincipal.appendChild(helpPrincipal);

    // Selector de provincia
    this._refs.fields.provincia = createFormField({
      label: 'Provincia', name: 'provincia', type: 'select', required: true
    });
    const optDefault = document.createElement('option');
    optDefault.value = ''; optDefault.textContent = 'Elegí una provincia...';
    this._refs.fields.provincia.input.prepend(optDefault);
    fillProvinciaSelector('Argentina', this._refs.fields.provincia.input);
    if (provinciaGuardada) this._refs.fields.provincia.input.value = provinciaGuardada;
    subPrincipal.appendChild(this._refs.fields.provincia);

    // Autocomplete de localidad (usando componente skeleton)
    const localidadLabel = document.createElement('label');
    localidadLabel.className = 's-label';
    localidadLabel.textContent = 'Localidad principal *';
    subPrincipal.appendChild(localidadLabel);

    const autocompleteField = createAutocomplete({
      placeholder: 'Escribí el nombre de la localidad...',
      minChars: 2, debounceMs: 400, maxResults: 8, required: true,
      
      fetchOptions: async (query) => {
        const provincia = this._refs.fields.provincia.input.value;
        if (!provincia) return [];
        return getLocalidades(provincia).filter(l =>
          l.nombre.toLowerCase().includes(query.toLowerCase())
       );
     },
      formatOption: (loc) => loc.nombre,
      getValue: (loc) => loc,
      onSelect: (loc) => {
        if (!loc) return;
        this._data.localidad_principal = {
          localidad: loc.nombre, provincia: this._refs.fields.provincia.input.value,
          pais: 'Argentina', id: loc.id, lat: loc.lat, lng: loc.lng
        };
        renderChipPrincipal(chipPrincipalContainer, this._data);
        document.dispatchEvent(new Event('change'));
      }
    });
    subPrincipal.appendChild(autocompleteField);

    // Chip de localidad principal (usando componente skeleton)
    const chipPrincipalContainer = document.createElement('div');
    chipPrincipalContainer.className = 'chip-principal-container';
    subPrincipal.appendChild(chipPrincipalContainer);
    renderChipPrincipal(chipPrincipalContainer, this._data);

    // Re-render al cambiar provincia
    this._refs.fields.provincia.input.addEventListener('change', () => {
      const nuevaProvincia = this._refs.fields.provincia.input.value;
      this._data.localidad_principal = null;
      chipPrincipalContainer.innerHTML = '';
      renderChipPrincipal(chipPrincipalContainer, this._data);
      autocompleteField.setValue(null);
      document.dispatchEvent(new Event('change'));
    });

    section.appendChild(subPrincipal);

    // Dirección (solo si tiene local)
    if (tieneLocal) {
      this._refs.fields.direccion = createFormField({
        label: 'Dirección del local', name: 'direccion', required: true,
        placeholder: 'Ej: Av. San Martín 123',
        helpText: 'La dirección exacta donde te atienden los clientes',
        value: this._data.direccion,
        actions: { onChange: (v) => { this._data.direccion = v.trim(); } }
      });
      section.appendChild(this._refs.fields.direccion);
    }

    // Zona de cobertura (solo si va a domicilio)
    if (!tieneLocal) section.appendChild(this._renderZonaCobertura(provinciaGuardada));

    return section;
  },

  // ──────────────────────────────────────────────────────────
  // ZONA DE COBERTURA (con createChip)
  // ──────────────────────────────────────────────────────────
  _renderZonaCobertura(provinciaGuardada) {
    const subZona = document.createElement('div');
    subZona.className = 'ubicacion-bloque ubicacion-zona';

    const zonaHeader = document.createElement('div');
    zonaHeader.className = 'zona-header';
    const zonaTitle = document.createElement('h4');
    zonaTitle.className = 'zona-title';
    zonaTitle.textContent = '¿También trabajás en otras localidades?';
    zonaHeader.appendChild(zonaTitle);
    const zonaBadge = document.createElement('span');
    zonaBadge.className = 'zona-badge-opcional';
    zonaBadge.textContent = 'Opcional';
    zonaHeader.appendChild(zonaBadge);
    subZona.appendChild(zonaHeader);

    const helpZona = document.createElement('p');
    helpZona.className = 'form-help';
    helpZona.textContent = 'Si a veces viajás a trabajar a localidades cercanas, podés agregarlas acá.';
    subZona.appendChild(helpZona);

    // Selector provincia zona
    this._refs.fields.provinciaZona = createFormField({
      label: 'Provincia', name: 'provinciaZona', type: 'select'
    });
    const optDefaultZona = document.createElement('option');
    optDefaultZona.value = ''; optDefaultZona.textContent = 'Elegí una provincia...';
    this._refs.fields.provinciaZona.input.prepend(optDefaultZona);
    fillProvinciaSelector('Argentina', this._refs.fields.provinciaZona.input);
    if (provinciaGuardada) this._refs.fields.provinciaZona.input.value = provinciaGuardada;
    subZona.appendChild(this._refs.fields.provinciaZona);

    // Autocomplete localidad zona
    const localidadZonaLabel = document.createElement('label');
    localidadZonaLabel.className = 's-label';
    localidadZonaLabel.textContent = 'Localidad';
    subZona.appendChild(localidadZonaLabel);

    let localidadZonaSeleccionada = null;
    const autocompleteZona = createAutocomplete({
      placeholder: 'Escribí el nombre de la localidad...',
      minChars: 2, debounceMs: 400, maxResults: 8,
      fetchOptions: async (query) => {
        const provincia = this._refs.fields.provinciaZona.input.value;
        if (!provincia) return [];
        return getLocalidades(provincia).filter(l =>
          l.nombre.toLowerCase().includes(query.toLowerCase())
        );
    },
      formatOption: (loc) => loc.nombre,
      getValue: (loc) => loc,
      onSelect: (loc) => { localidadZonaSeleccionada = loc; }
    });
    subZona.appendChild(autocompleteZona);

    // Botón agregar
    const agregarBtn = createButton({
      label: 'Agregar localidad', icon: 'fa-plus', variant: 'secondary', size: 'sm',
      onClick: () => {
        const provincia = this._refs.fields.provinciaZona.input.value;
        const loc = localidadZonaSeleccionada;
        if (!provincia || !loc?.nombre) {
          showToast('Elegí provincia y localidad antes de agregar', 'warning'); return;
        }
        const esPrincipal = this._data.localidad_principal?.localidad === loc.nombre &&
                           this._data.localidad_principal?.provincia === provincia;
        if (esPrincipal) { showToast('Esa ya es tu localidad principal', 'warning'); return; }
        const yaExiste = this._data.zona_cobertura.some(c => c.localidad === loc.nombre && c.provincia === provincia);
        if (yaExiste) { showToast('Esa localidad ya está en tu zona', 'warning'); return; }

        this._data.zona_cobertura.push({ localidad: loc.nombre, provincia, id: loc.id, lat: loc.lat, lng: loc.lng });
        renderZonaChips(zonaChipsContainer, this._data);
        autocompleteZona.setValue(null);
        localidadZonaSeleccionada = null;
        document.dispatchEvent(new Event('change'));
      }
    });
    const agregarContainer = document.createElement('div');
    agregarContainer.className = 'agregar-cobertura-container';
    agregarContainer.appendChild(agregarBtn);
    subZona.appendChild(agregarContainer);

    // Contenedor de chips
    const zonaChipsContainer = document.createElement('div');
    zonaChipsContainer.className = 'zona-chips-container';
    renderZonaChips(zonaChipsContainer, this._data);
    subZona.appendChild(zonaChipsContainer);

    // Re-render al cambiar provincia zona
    this._refs.fields.provinciaZona.input.addEventListener('change', () => {
      autocompleteZona.setValue(null);
      localidadZonaSeleccionada = null;
    });

    return subZona;
  },

  // ──────────────────────────────────────────────────────────
  // CAMPO: URGENCIAS
  // ──────────────────────────────────────────────────────────
  _renderUrgenciasField() {
    return createCheckboxGroup({
      label: 'Urgencias', name: 'atiende_urgencias',
      value: this._data.atiende_urgencias ? ['si'] : [],
      options: [{
        value: 'si', label: 'Atiendo emergencias fuera de horario',
        description: 'Si marcás esta opción, tu asistente les avisará a los clientes que pueden contactarte ante una urgencia...'
      }],
      actions: { onChange: (values) => { this._data.atiende_urgencias = values.includes('si'); } }
    });
  },

  // ──────────────────────────────────────────────────────────
  // SECCIÓN: CONTACTO
  // ──────────────────────────────────────────────────────────
  _renderSeccionContacto() {
    const section = crearSeccion('¿Cómo te contactan?');
    const help = document.createElement('p');
    help.className = 'form-help';
    help.textContent = 'El WhatsApp es obligatorio — es el canal principal para que los clientes te contacten.';
    section.appendChild(help);

    this._refs.fields.whatsapp = createFormField({
      label: 'WhatsApp', name: 'whatsapp', required: true,
      placeholder: 'Ej: 3412295316', helpText: 'Solo números, sin espacios ni guiones',
      value: this._data.whatsapp, actions: { onChange: (v) => { this._data.whatsapp = v.trim(); } }
    });
    this._refs.fields.telefono = createFormField({
      label: 'Teléfono', name: 'telefono', placeholder: 'Opcional',
      value: this._data.telefono, actions: { onChange: (v) => { this._data.telefono = v.trim(); } }
    });
    this._refs.fields.email = createFormField({
      label: 'Email', name: 'email', type: 'email', placeholder: 'Opcional',
      value: this._data.email, actions: { onChange: (v) => { this._data.email = v.trim(); } }
    });
    this._refs.fields.instagram = createFormField({
      label: 'Instagram', name: 'instagram', placeholder: '@tuusuario',
      value: this._data.instagram, actions: { onChange: (v) => { this._data.instagram = v.trim(); } }
    });

    section.append(this._refs.fields.whatsapp, this._refs.fields.telefono, this._refs.fields.email, this._refs.fields.instagram);
    return section;
  },

  // ──────────────────────────────────────────────────────────
  // SECCIÓN: SLUG
  // ──────────────────────────────────────────────────────────
  _renderSeccionSlug() {
    const section = crearSeccion('Tu dirección en ÍndiceIA');
    const help = document.createElement('p');
    help.className = 'form-help';
    help.textContent = 'Esta es la dirección única donde tus clientes van a encontrarte. Se genera automáticamente pero podés cambiarla.';
    section.appendChild(help);

    const slugContainer = document.createElement('div');
    slugContainer.className = 'slug-container';
    const slugPrefix = document.createElement('span');
    slugPrefix.className = 'slug-prefix';
    slugPrefix.textContent = 'indiceia.com/';
    const slugInput = document.createElement('input');
    slugInput.type = 'text'; slugInput.className = 'slug-input';
    slugInput.placeholder = 'tu-nombre'; slugInput.value = this._data.slug || '';
    this._refs.slugInput = slugInput;
    slugContainer.append(slugPrefix, slugInput);
    section.appendChild(slugContainer);

    const slugStatus = document.createElement('div');
    slugStatus.className = 'slug-status';
    slugStatus.innerHTML = '<span class="slug-icon"></span><span class="slug-text"></span>';
    this._refs.slugStatus = slugStatus;
    section.appendChild(slugStatus);

    slugInput.addEventListener('input', () => {
      clearTimeout(this._refs.slugValidationTimer);
      const slug = slugInput.value.trim().toLowerCase();
      if (!slug) { this._updateSlugStatus('empty', ''); this._data.slug = null; document.dispatchEvent(new Event('change')); return; }
      this._updateSlugStatus('checking', 'Verificando disponibilidad...');
      this._refs.slugValidationTimer = setTimeout(async () => {
        await this._validarSlug(slug, false);
        document.dispatchEvent(new Event('change'));
      }, 800);
    });
    return section;
  },

  // ──────────────────────────────────────────────────────────
  // SLUG HELPERS
  // ──────────────────────────────────────────────────────────
  async _validarSlug(slug, autoGenerado) {
    if (!slug || slug.length < 3) { this._updateSlugStatus('empty', ''); this._data.slug = null; return; }
    try {
      const snap = await getDoc(doc(db, 'landings', slug));
      if (!snap.exists()) { this._data.slug = slug; this._updateSlugStatus('available', `✓ Disponible: indiceia.com/${slug}`); return; }
      if (autoGenerado) {
        for (let i = 1; i <= 3; i++) {
          const alt = `${slug}-${i}`;
          const altSnap = await getDoc(doc(db, 'landings', alt));
          if (!altSnap.exists()) {
            this._data.slug = alt; this._refs.slugInput.value = alt;
            this._updateSlugStatus('suggestion', `Ya existe. Sugerencia: indiceia.com/${alt}`); return;
          }
        }
      }
      this._data.slug = null; this._updateSlugStatus('taken', 'Este nombre ya está en uso. Probá con otro.');
    } catch (err) { console.error('Error validando slug:', err); this._data.slug = null; this._updateSlugStatus('error', 'Error al validar. Intentá de nuevo.'); }
  },

  _updateSlugStatus(status, message) {
    if (!this._refs.slugStatus) return;
    const icon = this._refs.slugStatus.querySelector('.slug-icon');
    const text = this._refs.slugStatus.querySelector('.slug-text');
    const icons = {
      checking: '<i class="fas fa-spinner fa-spin"></i>',
      available: '<i class="fas fa-check-circle" style="color:var(--s-success)"></i>',
      suggestion: '<i class="fas fa-info-circle" style="color:var(--s-info)"></i>',
      taken: '<i class="fas fa-times-circle" style="color:var(--s-danger)"></i>',
      error: '<i class="fas fa-exclamation-triangle" style="color:var(--s-warning)"></i>',
      empty: ''
    };
    icon.innerHTML = icons[status] || ''; text.textContent = message;
  },

  // ──────────────────────────────────────────────────────────
  // SAVE BUTTON
  // ──────────────────────────────────────────────────────────
  _renderSaveButton() {
    const dirtyController = this._buildDirtyController();
    return createOnboardingButton({
      stepName: 'mi-perfil', dirtyController: this._isEditMode ? dirtyController : undefined,
      getLabel: () => {
        if (!this._isEditMode) return 'Continuar';
        if (dirtyController.hasUnsavedChanges()) return 'Guardar y volver al dashboard';
        return 'Volver al dashboard';
      },
      validate: () => {
        const tieneLocal = this._data.modalidad_trabajo === 'local';
        const camposBase = this._data.nombre.trim() && this._data.especialidad.trim() && this._data.descripcion.trim() && this._data.whatsapp.trim() && !!this._data.localidad_principal && !!this._data.modalidad_trabajo;
        const camposModalidad = tieneLocal ? !!this._data.direccion?.trim() : true;
        const slugValido = this._slugExiste || !!this._data.slug;
        return !!(camposBase && camposModalidad && slugValido);
      },
      onSave: async ({ uid, comercioId }) => {
        const d = page._data; const tieneLocal = d.modalidad_trabajo === 'local';
        const updates = {
          nombre: d.nombre, especialidad: d.especialidad, rubro: rubroFromForm([d.especialidad]),
          descripcion: d.descripcion, experiencia: d.experiencia || null,
          modalidad_trabajo: d.modalidad_trabajo,
          ...(d.atiende_urgencias === true && { atiende_urgencias: true }),
          localidad_principal: d.localidad_principal,
          ubicacion: { pais: d.localidad_principal?.pais || 'Argentina', provincia: d.localidad_principal?.provincia || '', localidad: { id: d.localidad_principal?.id || null, nombre: d.localidad_principal?.localidad || '', lat: d.localidad_principal?.lat || null, lng: d.localidad_principal?.lng || null } },
          localidad: d.localidad_principal?.localidad || null, provincia: d.localidad_principal?.provincia || null, pais: 'Argentina',
          ...(tieneLocal && d.direccion ? { direccion: d.direccion } : {}),
          ...(!tieneLocal && d.zona_cobertura.length > 0 ? { zona_cobertura: d.zona_cobertura } : {}),
          whatsapp: d.whatsapp, telefono: d.telefono || null, email: d.email || null, instagram: d.instagram || null, entityType: 'prestador'
        };
        if (!page._slugExiste) updates.landing = { activo: true, nombre: updates.nombre, slug: d.slug, tipo: 'perfil', createdAt: new Date(), updatedAt: new Date() };
        else updates.landing = { ...page._comercioData.landing, nombre: updates.nombre, updatedAt: new Date() };

        if (page._isNuevo) {
          const comercioRef = comercioId ? doc(db, 'entidades', comercioId) : doc(collection(db, 'entidades'));
          const nuevoComercioId = comercioRef.id;
          const now = Timestamp.now(); const expiresAt = Timestamp.fromDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));
          await setDoc(comercioRef, { ...updates, duenoId: uid, fechaCreacion: new Date(), fechaActualizacion: new Date(), onboardingSteps: { 'mi-perfil': true }, plan: { type: 'trial', active: true, trial: true, startedAt: now, expiresAt, createdAt: now, updatedAt: now, source: 'system' } });
          await setDoc(doc(db, 'landings', d.slug), { slug: d.slug, comercioId: nuevoComercioId, nombre: updates.nombre, activo: true, createdAt: new Date(), updatedAt: new Date() });
          await updateDoc(doc(db, 'usuarios', uid), { comercioId: nuevoComercioId });
        } else {
          updates['onboardingSteps.mi-perfil'] = true; updates.fechaActualizacion = new Date();
          await updateDoc(doc(db, 'entidades', comercioId), updates);
          if (!page._slugExiste) await setDoc(doc(db, 'landings', d.slug), { slug: d.slug, comercioId, nombre: updates.nombre, activo: true, createdAt: new Date(), updatedAt: new Date() });
        }
        return { success: true, stepMarked: true };
      },
      onSuccess: () => { showToast('Perfil guardado correctamente', 'success'); dirtyController.markSaved(); },
      onError: (err) => { console.error('❌ Error guardando perfil:', err); showToast('Error al guardar: ' + err.message, 'error'); }
    });
  }
};

// ============================================================
// CHIP HELPERS (usando createChip del skeleton)
// ============================================================
function renderChipPrincipal(container, data) {
  container.innerHTML = '';
  if (!data.localidad_principal) return;
  const { localidad, provincia } = data.localidad_principal;

  const chip = createChip({
    icon: 'fa-map-marker-alt', text: `${localidad}, ${provincia}`,
    variant: 'primary', size: 'medium', removable: true,
    onRemove: () => {
      data.localidad_principal = null;
      container.innerHTML = '';
      document.dispatchEvent(new Event('change'));
    }
  });
  container.appendChild(chip);
}

function renderZonaChips(container, data) {
  container.innerHTML = '';
  if (!data.zona_cobertura.length) {
    const empty = document.createElement('p');
    empty.className = 'zona-chips-empty';
    empty.textContent = 'No agregaste localidades vecinas todavía.';
    container.appendChild(empty);
    return;
  }
  const label = document.createElement('p');
  label.className = 'zona-chips-label';
  label.textContent = 'Localidades donde también trabajás:';
  container.appendChild(label);

  const list = document.createElement('div');
  list.className = 'cobertura-list';
  data.zona_cobertura.forEach((item) => {
    const chip = createChip({
      text: `${item.localidad}, ${item.provincia}`,
      variant: 'info', size: 'small', removable: true,
      onRemove: () => {
        data.zona_cobertura = data.zona_cobertura.filter(c => c.id !== item.id && !(c.localidad === item.localidad && c.provincia === item.provincia));
        renderZonaChips(container, data);
        document.dispatchEvent(new Event('change'));
      }
    });
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
  const h3 = document.createElement('h3'); h3.textContent = titulo;
  section.appendChild(h3); return section;
}
function slugify(text) {
  return text.toLowerCase().trim().replace(/["'`´""'']/g, '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-+|-+$/g, '');
}

// ============================================================
// ARRANQUE
// ============================================================
runSkeleton({ page, adapter: createFirebaseAdapter, options: { loadingMessage: 'Cargando perfil...' } });
