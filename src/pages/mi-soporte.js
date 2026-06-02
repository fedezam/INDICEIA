// ============================================================
// src/pages/mi-soporte.js
// Clonado y recortado de mi-perfil.js
// entityType: 'soporte'
// ============================================================

import { runSkeleton }             from '/src/skeleton/skeleton.js';
import { createFirebaseAdapter }   from '/src/skeleton/adapters/firebaseAdapter.js';
import { createFormField }         from '/src/skeleton/components/form-field/index.js';
import { createOnboardingButton }  from '/src/skeleton/components/onboarding-button/index.js';
import { showToast }               from '/src/skeleton/components/toast/index.js';
import { db }                      from '/src/services/firebase/firebase.js';
import {
  doc, setDoc, updateDoc,
  collection, getDoc, Timestamp
} from 'firebase/firestore';

// ============================================================
// MÓDULO DE PÁGINA
// ============================================================
const page = {
  _data: {
    nombre: '', descripcion: '', whatsapp: '', email: '', slug: null,
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
    this._data = {
      nombre:      c.nombre      || '',
      descripcion: c.descripcion || '',
      whatsapp:    c.whatsapp    || '',
      email:       c.email       || '',
      slug:        c.landing?.slug || null,
    };
    this._originalSnapshot = structuredClone(this._data);
  },

  render() {
    const root = document.getElementById('skeleton-page');
    root.innerHTML = '';
    this._refs = { fields: {}, slugInput: null, slugStatus: null, slugValidationTimer: null };

    const title = document.createElement('h2');
    title.className = 'page-title';
    title.textContent = this._isNuevo ? 'Crear asistente de soporte' : 'Editar asistente de soporte';
    root.appendChild(title);

    root.appendChild(this._renderSeccionIdentidad());
    root.appendChild(this._renderSeccionContacto());
    root.appendChild(this._renderSeccionSlug());

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
    const section = crearSeccion('¿Qué es este asistente?');

    const help = document.createElement('p');
    help.className = 'form-help';
    help.textContent = 'Estos datos definen cómo se va a presentar el asistente a los usuarios.';
    section.appendChild(help);

    this._refs.fields.nombre = createFormField({
      label: 'Nombre', name: 'nombre', required: true,
      placeholder: 'Ej: Asistente ÍndiceIA',
      helpText: 'El nombre con el que el asistente se presenta',
      value: this._data.nombre,
      actions: { onChange: (v) => { this._data.nombre = v.trim(); } }
    });

    this._refs.fields.descripcion = createFormField({
      label: 'Descripción', name: 'descripcion', type: 'textarea', rows: 3, required: true,
      placeholder: 'Ej: Asistente de soporte técnico para usuarios de ÍndiceIA.',
      helpText: 'Una o dos líneas que describan el propósito de este asistente',
      value: this._data.descripcion,
      actions: { onChange: (v) => { this._data.descripcion = v.trim(); } }
    });

    section.append(this._refs.fields.nombre, this._refs.fields.descripcion);
    return section;
  },

  // ──────────────────────────────────────────────────────────
  // SECCIÓN: CONTACTO
  // ──────────────────────────────────────────────────────────
  _renderSeccionContacto() {
    const section = crearSeccion('Contacto (opcional)');

    const help = document.createElement('p');
    help.className = 'form-help';
    help.textContent = 'Si querés que el asistente pueda derivar consultas a un canal de soporte humano.';
    section.appendChild(help);

    this._refs.fields.whatsapp = createFormField({
      label: 'WhatsApp', name: 'whatsapp',
      placeholder: 'Ej: 3412295316',
      helpText: 'Solo números, sin espacios ni guiones',
      value: this._data.whatsapp,
      actions: { onChange: (v) => { this._data.whatsapp = v.trim(); } }
    });

    this._refs.fields.email = createFormField({
      label: 'Email', name: 'email', type: 'email',
      placeholder: 'Opcional',
      value: this._data.email,
      actions: { onChange: (v) => { this._data.email = v.trim(); } }
    });

    section.append(this._refs.fields.whatsapp, this._refs.fields.email);
    return section;
  },

  // ──────────────────────────────────────────────────────────
  // SECCIÓN: SLUG
  // ──────────────────────────────────────────────────────────
  _renderSeccionSlug() {
    const section = crearSeccion('Tu dirección en ÍndiceIA');

    if (this._slugExiste) {
      section.appendChild(this._renderSlugReadonly(this._comercioData.landing.slug));
    } else {
      section.appendChild(this._renderSlugEditable());
    }

    return section;
  },

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

  _renderSlugEditable() {
    const wrapper = document.createElement('div');
    wrapper.className = 'slug-field-wrapper';

    const warning = document.createElement('p');
    warning.className   = 'form-help form-help--warning';
    warning.textContent = '⚠️ Tu link público. Elegilo con cuidado — una vez guardado no se puede cambiar.';
    wrapper.appendChild(warning);

    const slugContainer = document.createElement('div');
    slugContainer.className = 'slug-container';

    const slugPrefix = document.createElement('span');
    slugPrefix.className   = 'slug-prefix';
    slugPrefix.textContent = 'indiceia.com/';

    this._refs.slugInput = document.createElement('input');
    this._refs.slugInput.type        = 'text';
    this._refs.slugInput.className   = 'slug-input';
    this._refs.slugInput.placeholder = 'tu-asistente';
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
        document.dispatchEvent(new Event('change'));
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
        const nombre = nombreInput.value.trim();
        if (nombre.length >= 3 && this._refs.slugInput) {
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

  async _validarSlug(slug, autoGenerado) {
    if (!slug || slug.length < 3) { this._updateSlugStatus('empty', ''); this._data.slug = null; return; }
    try {
      const snap = await getDoc(doc(db, 'landings', slug));
      if (!snap.exists()) {
        this._data.slug = slug;
        this._updateSlugStatus('available', `✓ Disponible: indiceia.com/${slug}`);
        return;
      }
      if (autoGenerado) {
        for (let i = 1; i <= 3; i++) {
          const alt = `${slug}-${i}`;
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
    icon.innerHTML = icons[status] || '';
    text.textContent = message;
  },

  // ──────────────────────────────────────────────────────────
  // SAVE BUTTON
  // ──────────────────────────────────────────────────────────
  _renderSaveButton() {
    const dirtyController = this._buildDirtyController();
    return createOnboardingButton({
      stepName: 'mi-soporte',
      dirtyController: this._isEditMode ? dirtyController : undefined,
      getLabel: () => {
        if (!this._isEditMode) return 'Continuar';
        if (dirtyController.hasUnsavedChanges()) return 'Guardar y volver al dashboard';
        return 'Volver al dashboard';
      },
      validate: () => {
        return !!(
          this._data.nombre.trim() &&
          this._data.descripcion.trim() &&
          (this._slugExiste || !!this._data.slug)
        );
      },
      onSave: async ({ uid, comercioId }) => {
        const d = page._data;
        const updates = {
          nombre:      d.nombre,
          descripcion: d.descripcion,
          whatsapp:    d.whatsapp || null,
          email:       d.email    || null,
          entityType:  'soporte',
        };

        if (!page._slugExiste) {
          updates.landing = {
            activo: true, nombre: updates.nombre,
            slug: d.slug, tipo: 'soporte',
            createdAt: new Date(), updatedAt: new Date(),
          };
        } else {
          updates.landing = {
            ...page._comercioData.landing,
            nombre: updates.nombre,
            updatedAt: new Date(),
          };
        }

        if (page._isNuevo) {
          const comercioRef = comercioId
            ? doc(db, 'entidades', comercioId)
            : doc(collection(db, 'entidades'));
          const nuevoComercioId = comercioRef.id;
          const now       = Timestamp.now();
          const expiresAt = Timestamp.fromDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));

          await setDoc(comercioRef, {
            ...updates,
            duenoId:           uid,
            fechaCreacion:     new Date(),
            fechaActualizacion: new Date(),
            onboardingSteps:   { 'mi-soporte': true },
            plan: {
              type: 'trial', active: true, trial: true,
              startedAt: now, expiresAt,
              createdAt: now, updatedAt: now, source: 'system',
            },
          });

          await setDoc(doc(db, 'landings', d.slug), {
            slug: d.slug, comercioId: nuevoComercioId,
            nombre: updates.nombre, activo: true,
            createdAt: new Date(), updatedAt: new Date(),
          });

          await updateDoc(doc(db, 'usuarios', uid), { comercioId: nuevoComercioId });

        } else {
          updates['onboardingSteps.mi-soporte'] = true;
          updates.fechaActualizacion = new Date();
          await updateDoc(doc(db, 'entidades', comercioId), updates);
          if (!page._slugExiste) {
            await setDoc(doc(db, 'landings', d.slug), {
              slug: d.slug, comercioId,
              nombre: updates.nombre, activo: true,
              createdAt: new Date(), updatedAt: new Date(),
            });
          }
        }

        return { success: true, stepMarked: true };
      },
      onSuccess: () => {
        showToast('Asistente guardado correctamente', 'success');
        dirtyController.markSaved();
      },
      onError: (err) => {
        console.error('❌ Error guardando asistente de soporte:', err);
        showToast('Error al guardar: ' + err.message, 'error');
      }
    });
  }
};

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
  return text.toLowerCase().trim()
    .replace(/["'`´""'']/g, '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-').replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// ============================================================
// ARRANQUE
// ============================================================
runSkeleton({ page, adapter: createFirebaseAdapter, options: { loadingMessage: 'Cargando asistente...' } });
