// ============================================================
// src/pages/mi-perfil-profesional.js
// ============================================================
import { runSkeleton }            from '/src/skeleton/skeleton.js';
import { createFirebaseAdapter }  from '/src/skeleton/adapters/firebaseAdapter.js';
import { createFormField }        from '/src/skeleton/components/form-field/index.js';
import { createOnboardingButton } from '/src/skeleton/components/onboarding-button/index.js';
import { createCard }             from '/src/skeleton/components/card/index.js';
import { showToast }              from '/src/skeleton/components/toast/index.js';
import { db }                     from '/src/services/firebase/firebase.js';
import { doc, updateDoc, collection, setDoc, getDoc, Timestamp } from 'firebase/firestore';
import './mi-perfil-profesional.css';

// ============================================================
// DATA — especialidades por categoría
// ============================================================
const ESPECIALIDADES = {
  salud: [
    'Medicina General / Clínica Médica', 'Pediatría', 'Cardiología', 'Dermatología',
    'Ginecología y Obstetricia', 'Traumatología y Ortopedia', 'Neurología', 'Psiquiatría',
    'Oftalmología', 'Otorrinolaringología', 'Urología', 'Endocrinología', 'Gastroenterología',
    'Neumología', 'Oncología', 'Reumatología', 'Anestesiología', 'Radiología', 'Cirugía General',
    'Medicina Interna', 'Odontología General', 'Ortodoncia', 'Odontopediatría', 'Implantología',
    'Periodoncia', 'Psicología Clínica', 'Psicología Infantil', 'Psicología de Pareja',
    'Kinesiología', 'Fonoaudiología', 'Nutrición', 'Otra especialidad',
  ],
};

const ORGANISMOS_MATRICULA = {
  salud: [
    'Colegio Médico de la Provincia', 'Colegio de Médicos Distrito I (Santa Fe)',
    'Colegio de Médicos Distrito II (Rosario)', 'Colegio de Odontólogos',
    'Colegio de Psicólogos', 'Colegio de Kinesiólogos', 'Ministerio de Salud de la Nación',
    'Otro organismo',
  ],
};

const IDIOMAS = ['Español', 'Inglés', 'Portugués', 'Italiano', 'Francés', 'Alemán'];

// ============================================================
// UTILS
// ============================================================
function slugify(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/["'`´""'']/g, '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// ============================================================
// PAGE OBJECT — patrón canónico runSkeleton
// ============================================================
const page = {
  _data: {
    nombre: '', especialidad: '', descripcion: '', experiencia: '',
    titulo: '', matricula: { numero: '', organismo: '' },
    institucionFormadora: '', idiomas: [], slug: null,
  },
  _originalSnapshot:    null,
  _ctx:                 null,
  _isEditMode:          false,
  _isNuevo:             false,
  _categoria:           'salud',
  _comercioData:        {},
  _slugExiste:          false,
  _refs:                { fields: {}, slugInput: null, slugStatus: null, slugValidationTimer: null },

  // ──────────────────────────────────────────────────────────
  // LOAD
  // ──────────────────────────────────────────────────────────
  async load(ctx) {
    this._ctx          = ctx;
    this._isEditMode   = ctx.isEditMode === true;
    this._comercioData = ctx.comercioData || {};
    this._isNuevo      = !this._comercioData.nombre;
    this._categoria    = ctx.userData?.categoria || 'salud';
    this._slugExiste   = !!this._comercioData.landing?.slug;

    const c = this._comercioData;
    this._data = {
      nombre:               c.nombre               || '',
      especialidad:         c.especialidad          || '',
      descripcion:          c.descripcion           || '',
      experiencia:          c.experiencia           || '',
      titulo:               c.titulo                || '',
      matricula:            c.matricula             || { numero: '', organismo: '' },
      institucionFormadora: c.institucionFormadora  || '',
      idiomas:              c.idiomas               || [],
      slug:                 c.landing?.slug         || null,
    };
    this._originalSnapshot = structuredClone(this._data);
  },

  // ──────────────────────────────────────────────────────────
  // RENDER
  // ──────────────────────────────────────────────────────────
  render() {
    const root = document.getElementById('skeleton-page');
    root.innerHTML = '';
    this._refs = { fields: {}, slugInput: null, slugStatus: null, slugValidationTimer: null };

    const header = document.createElement('div');
    header.className = 'page-header';
    header.innerHTML = `
      <h2><i class="fas fa-user-md"></i> ${this._isNuevo ? 'Crear perfil profesional' : 'Editar perfil profesional'}</h2>
      <p>Estos datos definen cómo te va a presentar tu asistente a los pacientes o clientes.</p>
    `;
    root.appendChild(header);

    root.appendChild(this._renderSeccionIdentidad());
    root.appendChild(this._renderSeccionCredenciales());
    root.appendChild(this._renderSeccionFormacion());
    root.appendChild(this._renderSeccionSlug());

    const btnContainer = document.createElement('div');
    btnContainer.className = 'btn-container';
    btnContainer.appendChild(this._renderSaveButton());
    root.appendChild(btnContainer);
  },

  // ──────────────────────────────────────────────────────────
  // DIRTY CONTROLLER
  // ──────────────────────────────────────────────────────────
  _buildDirtyController() {
    const snapshot = () => ({
      nombre:               this._data.nombre?.trim()               || '',
      especialidad:         this._data.especialidad?.trim()         || '',
      descripcion:          this._data.descripcion?.trim()          || '',
      experiencia:          this._data.experiencia?.trim()          || '',
      titulo:               this._data.titulo?.trim()               || '',
      matricula:            JSON.stringify(this._data.matricula     || { numero: '', organismo: '' }),
      institucionFormadora: this._data.institucionFormadora?.trim() || '',
      idiomas:              JSON.stringify(this._data.idiomas       || []),
    });
    const initial = snapshot();
    return {
      hasUnsavedChanges: () => {
        const current = snapshot();
        return Object.keys(initial).some(k => current[k] !== initial[k]);
      },
      markSaved: () => {
        const current = snapshot();
        Object.keys(initial).forEach(k => { initial[k] = current[k]; });
      },
    };
  },

  // ──────────────────────────────────────────────────────────
  // SECCIÓN: IDENTIDAD
  // ──────────────────────────────────────────────────────────
  _renderSeccionIdentidad() {
    const d = this._data;
    const section = document.createElement('div');

    const nombre = createFormField({
      label: 'Nombre completo', name: 'nombre', required: true,
      placeholder: 'Dr. Juan García',
      helpText: 'Como te conocen tus pacientes o clientes',
      value: d.nombre,
    });
    nombre.input?.addEventListener('input', e => {
      d.nombre = e.target.value;
    });
    this._refs.fields.nombre = nombre;

    const especialidadOptions = (ESPECIALIDADES[this._categoria] || []).map(e => ({ value: e, label: e }));
    const especialidad = createFormField({
      label: 'Especialidad', name: 'especialidad', type: 'select', required: true,
      placeholder: 'Seleccioná tu especialidad',
      options: [{ value: '', label: 'Seleccioná tu especialidad' }, ...especialidadOptions],
      value: d.especialidad,
    });
    especialidad.input?.addEventListener('change', e => { d.especialidad = e.target.value; });

    const descripcion = createFormField({
      label: 'Descripción', name: 'descripcion', type: 'textarea', rows: 3,
      placeholder: 'Ej: Médico clínico con enfoque en medicina preventiva y atención personalizada.',
      helpText: 'Dos o tres líneas que expliquen tu enfoque y por qué elegirte',
      value: d.descripcion,
    });
    descripcion.input?.addEventListener('input', e => { d.descripcion = e.target.value; });

    const experiencia = createFormField({
      label: 'Años de experiencia', name: 'experiencia', type: 'number',
      placeholder: 'Ej: 10', helpText: 'Opcional — ayuda a generar confianza',
      value: d.experiencia,
    });
    experiencia.input?.addEventListener('input', e => { d.experiencia = e.target.value; });

    section.appendChild(createCard({
      title: '¿Quién sos?', icon: 'fa-user-md',
      content: (() => {
        const c = document.createElement('div');
        c.append(nombre, especialidad, descripcion, experiencia);
        return c;
      })()
    }));
    return section;
  },

  // ──────────────────────────────────────────────────────────
  // SECCIÓN: CREDENCIALES
  // ──────────────────────────────────────────────────────────
  _renderSeccionCredenciales() {
    const d = this._data;
    const section = document.createElement('div');

    const matriculaNumero = createFormField({
      label: 'Número de matrícula', name: 'matricula-numero',
      required: true, type: 'tel', inputmode: 'numeric', maxlength: 10,
      placeholder: 'Ej: 12345',
      helpText: 'Ingresá solo números. El prefijo (MP, MN, etc.) se genera automáticamente.',
      value: d.matricula.numero,
    });
    matriculaNumero.input?.addEventListener('input', e => {
      const clean = e.target.value.replace(/\D/g, '');
      e.target.value = clean;
      d.matricula = { ...d.matricula, numero: clean };
    });

    const organismoOptions = (ORGANISMOS_MATRICULA[this._categoria] || []).map(o => ({ value: o, label: o }));
    const matriculaOrganismo = createFormField({
      label: 'Organismo que emite la matrícula', name: 'matricula-organismo',
      type: 'select', required: true,
      options: [{ value: '', label: 'Seleccioná el organismo' }, ...organismoOptions],
      value: d.matricula.organismo,
    });
    matriculaOrganismo.input?.addEventListener('change', e => {
      d.matricula = { ...d.matricula, organismo: e.target.value };
    });

    section.appendChild(createCard({
      title: 'Matrícula profesional', icon: 'fa-id-card',
      content: (() => {
        const c = document.createElement('div');
        const help = document.createElement('p');
        help.className = 'form-help';
        help.textContent = 'La matrícula valida tu credencial ante los pacientes.';
        c.append(help, matriculaNumero, matriculaOrganismo);
        return c;
      })()
    }));
    return section;
  },

  // ──────────────────────────────────────────────────────────
  // SECCIÓN: FORMACIÓN E IDIOMAS
  // ──────────────────────────────────────────────────────────
  _renderSeccionFormacion() {
    const d = this._data;
    const section = document.createElement('div');

    const titulo = createFormField({
      label: 'Título universitario', name: 'titulo',
      placeholder: 'Ej: Médico Cirujano — UBA',
      helpText: 'Tu título de grado y la universidad donde lo obtuviste',
      value: d.titulo,
    });
    titulo.input?.addEventListener('input', e => { d.titulo = e.target.value; });

    const institucion = createFormField({
      label: 'Institución donde te formaste', name: 'institucionFormadora',
      placeholder: 'Ej: Hospital Italiano de Buenos Aires',
      helpText: 'Residencia, fellowship o especialización principal',
      value: d.institucionFormadora,
    });
    institucion.input?.addEventListener('input', e => { d.institucionFormadora = e.target.value; });

    const idiomasWrapper = document.createElement('div');
    idiomasWrapper.className = 's-form-field';
    const idiomasLabel = document.createElement('label');
    idiomasLabel.className = 's-label';
    idiomasLabel.textContent = 'Idiomas en que atendés';
    idiomasWrapper.appendChild(idiomasLabel);

    const idiomasGrid = document.createElement('div');
    idiomasGrid.className = 'idiomas-grid';
    IDIOMAS.forEach(idioma => {
      const row = document.createElement('label');
      row.className = 'idioma-row';
      const cb = document.createElement('input');
      cb.type    = 'checkbox';
      cb.value   = idioma;
      cb.checked = d.idiomas.includes(idioma);
      cb.addEventListener('change', () => {
        if (cb.checked) d.idiomas = [...d.idiomas, idioma];
        else            d.idiomas = d.idiomas.filter(i => i !== idioma);
      });
      row.appendChild(cb);
      row.appendChild(document.createTextNode(` ${idioma}`));
      idiomasGrid.appendChild(row);
    });
    idiomasWrapper.appendChild(idiomasGrid);

    section.appendChild(createCard({
      title: 'Formación e idiomas', icon: 'fa-graduation-cap',
      content: (() => {
        const c = document.createElement('div');
        c.append(titulo, institucion, idiomasWrapper);
        return c;
      })()
    }));
    return section;
  },

  // ──────────────────────────────────────────────────────────
  // SECCIÓN: SLUG
  // ──────────────────────────────────────────────────────────
  _renderSeccionSlug() {
    const section = document.createElement('div');
    section.className = 'form-section';

    const h3 = document.createElement('h3');
    h3.textContent = 'Tu dirección en ÍndiceIA';
    section.appendChild(h3);

    if (this._slugExiste) {
      section.appendChild(this._renderSlugReadonly(this._comercioData.landing.slug));
    } else {
      section.appendChild(this._renderSlugEditable());
    }

    return section;
  },

  // ──────────────────────────────────────────────────────────
  // SLUG: READONLY (cuando ya existe)
  // ──────────────────────────────────────────────────────────
  _renderSlugReadonly(slug) {
    const wrapper = document.createElement('div');
    wrapper.className = 'slug-field-wrapper';

    const display = document.createElement('div');
    display.className = 'slug-readonly';

    const prefix = document.createElement('span');
    prefix.className   = 'slug-prefix';
    prefix.textContent = 'indiceia.com/';

    const value = document.createElement('span');
    value.className   = 'slug-value';
    value.textContent = slug;

    const lock = document.createElement('span');
    lock.className = 'slug-lock';
    lock.innerHTML = '<i class="fas fa-lock"></i>';

    display.append(prefix, value, lock);

    const note = document.createElement('p');
    note.className   = 'form-help';
    note.textContent = 'Este es tu link permanente. No se puede modificar.';

    wrapper.append(display, note);
    return wrapper;
  },

  // ──────────────────────────────────────────────────────────
  // SLUG: EDITABLE (cuando es nuevo)
  // ──────────────────────────────────────────────────────────
  _renderSlugEditable() {
    const wrapper = document.createElement('div');
    wrapper.className = 'slug-field-wrapper';

    const warning = document.createElement('p');
    warning.className   = 'form-help form-help--warning';
    warning.textContent = '⚠️ Tu link público. Elegilo con cuidado — una vez guardado no se puede cambiar.';
    wrapper.appendChild(warning);

    const help = document.createElement('p');
    help.className = 'form-help';
    help.textContent = 'Se genera automáticamente a partir de tu nombre, pero podés cambiarlo.';
    wrapper.appendChild(help);

    const slugContainer = document.createElement('div');
    slugContainer.className = 'slug-container';

    const slugPrefix = document.createElement('span');
    slugPrefix.className   = 'slug-prefix';
    slugPrefix.textContent = 'indiceia.com/';

    this._refs.slugInput = document.createElement('input');
    this._refs.slugInput.type        = 'text';
    this._refs.slugInput.className   = 'slug-input';
    this._refs.slugInput.placeholder = 'dr-juan-garcia';
    this._refs.slugInput.value       = this._data.slug || '';

    slugContainer.append(slugPrefix, this._refs.slugInput);
    wrapper.appendChild(slugContainer);

    this._refs.slugStatus = document.createElement('div');
    this._refs.slugStatus.className = 'slug-status';
    this._refs.slugStatus.innerHTML = `<span class="slug-icon"></span><span class="slug-text"></span>`;
    wrapper.appendChild(this._refs.slugStatus);

    this._refs.slugInput.addEventListener('input', () => {
      clearTimeout(this._refs.slugValidationTimer);
      const slug = this._refs.slugInput.value.trim();
      if (slug.length < 3) {
        this._updateSlugStatus('empty', '');
        this._data.slug = null;
        return;
      }
      this._updateSlugStatus('checking', 'Verificando disponibilidad...');
      this._refs.slugValidationTimer = setTimeout(() => this._validarSlug(slug, false), 800);
    });

    // auto-generar slug desde nombre
    setTimeout(() => {
      const nombreInput = this._refs.fields.nombre?.input;
      if (!nombreInput) return;
      nombreInput.addEventListener('input', () => {
        clearTimeout(this._refs.slugValidationTimer);
        const nombre = this._data.nombre?.trim();
        if (nombre && nombre.length >= 3 && this._refs.slugInput) {
          this._refs.slugValidationTimer = setTimeout(async () => {
            const newSlug = slugify(nombre);
            this._refs.slugInput.value = newSlug;
            await this._validarSlug(newSlug, true);
          }, 500);
        }
      });
    }, 0);

    return wrapper;
  },

  // ──────────────────────────────────────────────────────────
  // SLUG HELPERS
  // ──────────────────────────────────────────────────────────
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
            this._data.slug = alt;
            this._refs.slugInput.value = alt;
            this._updateSlugStatus('suggestion', `Ya existe. Sugerencia: indiceia.com/${alt}`);
            return;
          }
        }
      }
      this._data.slug = null;
      this._updateSlugStatus('taken', 'Este nombre ya está en uso. Probá con otro.');
    } catch (err) {
      console.error('[mi-perfil-profesional] Error validando slug:', err);
      this._data.slug = null;
      this._updateSlugStatus('error', 'Error al validar. Intentá de nuevo.');
    }
  },

  _updateSlugStatus(status, message) {
    if (!this._refs.slugStatus) return;
    const icon  = this._refs.slugStatus.querySelector('.slug-icon');
    const text  = this._refs.slugStatus.querySelector('.slug-text');
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

  // ──────────────────────────────────────────────────────────
  // SAVE BUTTON
  // ──────────────────────────────────────────────────────────
  _renderSaveButton() {
    const dirtyController = this._buildDirtyController();

    return createOnboardingButton({
      stepName: 'mi-perfil-profesional',
      dirtyController: this._isEditMode ? dirtyController : undefined,

      validate: () => {
        const slugValido = this._slugExiste || !!this._data.slug;
        return !!(
          this._data.nombre?.trim()            &&
          this._data.especialidad?.trim()      &&
          this._data.matricula?.numero?.trim() &&
          this._data.matricula?.organismo?.trim() &&
          slugValido
        );
      },

      getLabel: () => {
        if (!this._isEditMode) return 'Continuar';
        return dirtyController.hasUnsavedChanges()
          ? 'Guardar perfil'
          : 'Volver al dashboard';
      },

      async onSave({ uid, comercioId }) {
        const d   = page._data;
        const now = new Date();

        const updates = {
          nombre:               d.nombre.trim(),
          especialidad:         d.especialidad.trim(),
          descripcion:          d.descripcion.trim(),
          experiencia:          d.experiencia.trim(),
          titulo:               d.titulo.trim(),
          matricula:            d.matricula,
          institucionFormadora: d.institucionFormadora.trim(),
          idiomas:              d.idiomas,
          entityType:           'profesional',
          categoria:            page._categoria,
          fechaActualizacion:   now,
          'onboardingSteps.mi-perfil-profesional': true,
        };

        // Landing
        if (!page._slugExiste) {
          updates.landing = {
            activo:    true,
            nombre:    d.nombre.trim(),
            slug:      d.slug,
            tipo:      'perfil',
            createdAt: now,
            updatedAt: now,
          };
        } else {
          updates.landing = {
            ...page._comercioData.landing,
            nombre:    d.nombre.trim(),
            updatedAt: now,
          };
        }

        if (page._isNuevo || !comercioId) {
          const comercioRef     = comercioId
            ? doc(db, 'entidades', comercioId)
            : doc(collection(db, 'entidades'));
          const nuevoComercioId = comercioRef.id;
          const ts              = Timestamp.now();

          await setDoc(comercioRef, {
            ...updates,
            duenoId:        uid,
            fechaCreacion:  now,
            onboardingSteps: { 'mi-perfil-profesional': true },
            plan: {
              type: 'trial', active: true, trial: true,
              startedAt: ts,
              expiresAt: Timestamp.fromDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)),
              createdAt: ts, updatedAt: ts, source: 'system',
            },
          });

          await setDoc(doc(db, 'landings', d.slug), {
            slug:       d.slug,
            comercioId: nuevoComercioId,
            nombre:     d.nombre.trim(),
            activo:     true,
            createdAt:  now,
            updatedAt:  now,
          });

          await updateDoc(doc(db, 'usuarios', uid), {
            comercioId: nuevoComercioId,
          });

          // ── Referral event ──
          const usuarioSnap = await getDoc(doc(db, 'usuarios', uid));
          const referredBy  = usuarioSnap.data()?.referredBy || null;
          if (referredBy) {
            await setDoc(doc(collection(db, 'referral_events')), {
              referrerCode:    referredBy,
              referrerType:    'usuario',
              createdUserId:   uid,
              createdEntityId: nuevoComercioId,
              valid:           false,
              timestamp:       now,
            });
          }
          // ── Fin referral event ──

        } else {
          await updateDoc(doc(db, 'entidades', comercioId), updates);
          if (!page._slugExiste) {
            await setDoc(doc(db, 'landings', d.slug), {
              slug:       d.slug,
              comercioId,
              nombre:     d.nombre.trim(),
              activo:     true,
              createdAt:  now,
              updatedAt:  now,
            });
          }
        }

        return { success: true, stepMarked: true };
      },

      onSuccess: () => {
        showToast(
          page._isEditMode ? 'Perfil actualizado' : 'Perfil guardado',
          'success'
        );
        dirtyController.markSaved();
      },

      onError: (err) => {
        console.error('[mi-perfil-profesional] onSave ERROR:', err);
        showToast('Error al guardar el perfil', 'error');
      },
    });
  },
};

// ============================================================
// ARRANQUE
// ============================================================
runSkeleton({
  page,
  adapter: createFirebaseAdapter,
  options: { loadingMessage: 'Cargando perfil profesional...' },
});
