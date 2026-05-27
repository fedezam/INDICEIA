// ============================================================
// src/pages/mi-perfil-profesional.js
// ============================================================
import { runSkeleton }            from '/src/skeleton/skeleton.js';
import { createFirebaseAdapter }  from '/src/skeleton/adapters/firebaseAdapter.js';
import { mountLayout }            from '/src/skeleton/layout/index.js';
import { createFormField }        from '/src/skeleton/components/form-field/index.js';
import { createOnboardingButton } from '/src/skeleton/components/onboarding-button/index.js';
import { createCard }             from '/src/skeleton/components/card/index.js';
import { showToast }              from '/src/skeleton/components/toast/index.js';
import { db }                     from '/src/services/firebase/firebase.js';
import { doc, updateDoc, collection, setDoc, Timestamp } from 'firebase/firestore';
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
// PAGE OBJECT — patrón canónico runSkeleton
// ============================================================
const page = {
  _data: {
    nombre: '', especialidad: '', descripcion: '', experiencia: '',
    titulo: '', matricula: { numero: '', organismo: '' },
    institucionFormadora: '', idiomas: [],
  },
  _originalSnapshot: null,
  _ctx:          null,
  _isEditMode:   false,
  _isNuevo:      false,
  _categoria:    'salud',
  _comercioData: {},

  // ──────────────────────────────────────────────────────────
  // LOAD
  // ──────────────────────────────────────────────────────────
  async load(ctx) {
    this._ctx          = ctx;
    this._isEditMode   = ctx.isEditMode === true;
    this._comercioData = ctx.comercioData || {};
    this._isNuevo      = !this._comercioData.nombre;
    this._categoria    = ctx.userData?.categoria || 'salud';

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
    };
    this._originalSnapshot = structuredClone(this._data);
  },

  // ──────────────────────────────────────────────────────────
  // RENDER
  // ──────────────────────────────────────────────────────────
  render() {
    const root = document.getElementById('skeleton-page');
    root.innerHTML = '';

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
    nombre.input?.addEventListener('input', e => { d.nombre = e.target.value; });

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

    // Idiomas — checkboxes manuales
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
  // SAVE BUTTON
  // ──────────────────────────────────────────────────────────
  _renderSaveButton() {
    const dirtyController = this._buildDirtyController();

    return createOnboardingButton({
      stepName: 'mi-perfil-profesional',
      dirtyController: this._isEditMode ? dirtyController : undefined,

      validate: () => !!(
        this._data.nombre?.trim()                &&
        this._data.especialidad?.trim()          &&
        this._data.matricula?.numero?.trim()     &&
        this._data.matricula?.organismo?.trim()
      ),

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

          await updateDoc(doc(db, 'usuarios', uid), {
            comercioId: nuevoComercioId,
          });

          console.log(`[mi-perfil-profesional] Nueva entidad creada: ${nuevoComercioId}`);

        } else {
          await updateDoc(doc(db, 'entidades', comercioId), updates);
          console.log(`[mi-perfil-profesional] Entidad actualizada: ${comercioId}`);
        }

        return { success: true, stepMarked: true };
      },

      onSuccess: () => {
        showToast(
          this._isEditMode ? 'Perfil actualizado' : 'Perfil guardado',
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
