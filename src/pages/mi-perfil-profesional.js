// ============================================================
// src/pages/mi-perfil-profesional.js
// ============================================================
import { runLifecycle }          from '/src/skeleton/lifecycle.js';
import { createFirebaseAdapter } from '/src/skeleton/adapters/firebaseAdapter.js';
import { mountLayout }           from '/src/skeleton/layout/index.js';
import { runFlowController }     from '/src/controllers/flowController.js';
import { createFormField }       from '/src/skeleton/components/form-field/index.js';
import { createButton }          from '/src/skeleton/components/button/index.js';
import { createCard }            from '/src/skeleton/components/card/index.js';
import { createOnboardingButton } from '/src/skeleton/components/onboarding-button/index.js';
import { showToast }             from '/src/skeleton/components/toast/index.js';
import { 
  db, 
  doc, 
  updateDoc, 
  collection, 
  setDoc, 
  Timestamp 
} from '/src/services/firebase/firebase.js'; // Ajusta según tu export real de firebase
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
const adapter = (options) => createFirebaseAdapter(options);

runLifecycle({
  adapter,
  options: { loadingMessage: 'Cargando perfil profesional...' },
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
  const data       = ctx.comercioData || {};
  const isNuevo    = !data.nombre;
  const categoria  = ctx.userData?.categoria || 'salud';
  const isEditMode = window.isEditMode === true;
  return {
    isNuevo,
    isEditMode,
    categoria,
    data: {
      nombre:        data.nombre        || '',
      especialidad:  data.especialidad  || '',
      descripcion:   data.descripcion   || '',
      experiencia:   data.experiencia   || '',
      titulo:        data.titulo        || '',
      matricula:     data.matricula     || { numero: '', organismo: '' },
      institucionFormadora: data.institucionFormadora || '',
      idiomas:       data.idiomas       || [],
    }
  };
}

// ============================================================
// RENDER
// ============================================================
function render(ctx, state) {
  const { data, isEditMode } = state;
  const page = document.getElementById('skeleton-page');
  page.innerHTML = '';
  const uiState = structuredClone(data);

  // Header
  const header = document.createElement('div');
  header.className = 'page-header';
  header.innerHTML = `<h2><i class="fas fa-user-md"></i> ${state.isNuevo ? 'Crear perfil profesional' : 'Editar perfil profesional'}</h2><p>Estos datos definen cómo te va a presentar tu asistente a los pacientes o clientes.</p>`;
  page.appendChild(header);

  page.appendChild(renderSeccionIdentidad(state, uiState));
  page.appendChild(renderSeccionCredenciales(state, uiState));
  page.appendChild(renderSeccionFormacion(state, uiState));

  // ── Snapshot inicial para dirty detection ─────────────────
  const initialSnapshot = {
    nombre:       uiState.nombre || '',
    especialidad: uiState.especialidad || '',
    descripcion:  uiState.descripcion || '',
    experiencia:  uiState.experiencia || '',
    titulo:       uiState.titulo || '',
    matricula:    JSON.stringify(uiState.matricula || { numero: '', organismo: '' }),
    institucionFormadora: uiState.institucionFormadora || '',
    idiomas:      JSON.stringify(uiState.idiomas || [])
  };

  // ── getCurrentState ───────────────────────────────────────
  function getCurrentState() {
    return {
      nombre:       uiState.nombre?.trim() || '',
      especialidad: uiState.especialidad?.trim() || '',
      descripcion:  uiState.descripcion?.trim() || '',
      experiencia:  uiState.experiencia?.trim() || '',
      titulo:       uiState.titulo?.trim() || '',
      matricula:    JSON.stringify(uiState.matricula || { numero: '', organismo: '' }),
      institucionFormadora: uiState.institucionFormadora?.trim() || '',
      idiomas:      JSON.stringify(uiState.idiomas || [])
    };
  }

  // ── dirtyController ───────────────────────────────────────
  const dirtyController = {
    hasUnsavedChanges() {
      const current = getCurrentState();
      return Object.keys(initialSnapshot).some(k => current[k] !== initialSnapshot[k]);
    },
    markSaved() {
      const current = getCurrentState();
      Object.keys(initialSnapshot).forEach(k => initialSnapshot[k] = current[k]);
    }
  };

  // ── Botón guardar ─────────────────────────────────────────
  const btnContainer = document.createElement('div');
  btnContainer.className = 'btn-container';
  btnContainer.appendChild(
    createOnboardingButton({
      stepName: 'mi-perfil-profesional',
      dirtyController: isEditMode ? dirtyController : undefined,

      validate() {
        return !!(
          uiState.nombre?.trim() &&
          uiState.especialidad?.trim() &&
          uiState.matricula?.numero?.trim() &&
          uiState.matricula?.organismo?.trim()
        );
      },

      getLabel() {
        if (!isEditMode) return 'Continuar';
        return dirtyController.hasUnsavedChanges()
          ? 'Guardar perfil'
          : 'Volver al dashboard';
      },

      async onSave({ uid, comercioId }) {
        const d = uiState;
        const now = new Date();

        const updates = {
          nombre:              d.nombre.trim(),
          especialidad:        d.especialidad.trim(),
          descripcion:         d.descripcion.trim(),
          experiencia:         d.experiencia.trim(),
          titulo:              d.titulo.trim(),
          matricula:           d.matricula,
          institucionFormadora: d.institucionFormadora.trim(),
          idiomas:             d.idiomas,
          entityType:          'profesional',
          categoria:           state.categoria,
          fechaActualizacion:  now,
          'onboardingSteps.mi-perfil-profesional': true
        };

        try {
          let targetComercioId = comercioId;

          if (state.isNuevo || !targetComercioId) {
            // ── CREACIÓN: Generar nuevo documento si no hay comercioId ──
            const comercioRef = doc(collection(db, 'entidades'));
            targetComercioId = comercioRef.id;

            await setDoc(comercioRef, {
              ...updates,
              duenoId: uid,
              fechaCreacion: now,
              plan: { 
                type: 'trial', 
                active: true, 
                trial: true, 
                startedAt: Timestamp.now(),
                expiresAt: Timestamp.fromDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)),
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now(),
                source: 'system'
              }
            });

            // Vincular usuario al nuevo comercio
            await updateDoc(doc(db, 'usuarios', uid), {
              comercioId: targetComercioId
            });

            console.log(`[mi-perfil-profesional] Nueva entidad creada: ${targetComercioId}`);

          } else {
            // ── ACTUALIZACIÓN: Usar comercioId existente ──
            await updateDoc(doc(db, 'entidades', targetComercioId), updates);
            console.log(`[mi-perfil-profesional] Entidad actualizada: ${targetComercioId}`);
          }

          return { success: true, stepMarked: true };

        } catch (err) {
          console.error('[mi-perfil-profesional] Error en persistencia:', err);
          throw err;
        }
      },

      onSuccess: () => showToast(
        isEditMode ? 'Perfil actualizado' : 'Perfil guardado',
        'success'
      ),

      onError: (err) => {
        console.error('[mi-perfil-profesional] onSave ERROR:', err);
        showToast('Error al guardar el perfil', 'error');
      },
    })
  );
  page.appendChild(btnContainer);
}

// ============================================================
// SECCIÓN: IDENTIDAD
// ============================================================
function renderSeccionIdentidad(state, uiState) {
  const section = document.createElement('div');
  const nombre = createFormField({
    label: 'Nombre completo', name: 'nombre', required: true,
    placeholder: 'Dr. Juan García', helpText: 'Como te conocen tus pacientes o clientes',
    value: uiState.nombre,
  });
  nombre.input?.addEventListener('input', e => { uiState.nombre = e.target.value; });

  const especialidadOptions = (ESPECIALIDADES[state.categoria] || []).map(e => ({ value: e, label: e }));
  const especialidad = createFormField({
    label: 'Especialidad', name: 'especialidad', type: 'select', required: true,
    placeholder: 'Seleccioná tu especialidad',
    options: [{ value: '', label: 'Seleccioná tu especialidad' }, ...especialidadOptions],
    value: uiState.especialidad,
  });
  especialidad.input?.addEventListener('change', e => { uiState.especialidad = e.target.value; });

  const descripcion = createFormField({
    label: 'Descripción', name: 'descripcion', type: 'textarea', rows: 3, required: false,
    placeholder: 'Ej: Médico clínico con enfoque en medicina preventiva y atención personalizada.',
    helpText: 'Dos o tres líneas que expliquen tu enfoque y por qué elegirte',
    value: uiState.descripcion,
  });
  descripcion.input?.addEventListener('input', e => { uiState.descripcion = e.target.value; });

  const experiencia = createFormField({
    label: 'Años de experiencia', name: 'experiencia', type: 'number', required: false,
    placeholder: 'Ej: 10', helpText: 'Opcional — ayuda a generar confianza',
    value: uiState.experiencia,
  });
  experiencia.input?.addEventListener('input', e => { uiState.experiencia = e.target.value; });

  section.append(
    createCard({
      title: '¿Quién sos?', icon: 'fa-user-md',
      content: (() => {
        const c = document.createElement('div');
        c.append(nombre, especialidad, descripcion, experiencia);
        return c;
      })()
    })
  );
  return section;
}

// ============================================================
// SECCIÓN: CREDENCIALES
// ============================================================
function renderSeccionCredenciales(state, uiState) {
  const section = document.createElement('div');

  const matriculaNumero = createFormField({
    label: 'Número de matrícula',
    name: 'matricula-numero',
    required: true,
    type: 'tel',
    inputmode: 'numeric',
    maxlength: 10,
    placeholder: 'Ej: 12345',
    helpText: 'Ingresá solo números. El prefijo (MP, MN, etc.) se genera automáticamente.',
    value: uiState.matricula.numero,
  });

  matriculaNumero.input?.addEventListener('input', e => {
    const clean = e.target.value.replace(/\D/g, '');
    e.target.value = clean;
    uiState.matricula = { ...uiState.matricula, numero: clean };
  });

  const organismoOptions = (ORGANISMOS_MATRICULA[state.categoria] || []).map(o => ({ value: o, label: o }));
  const matriculaOrganismo = createFormField({
    label: 'Organismo que emite la matrícula',
    name: 'matricula-organismo',
    type: 'select',
    required: true,
    options: [{ value: '', label: 'Seleccioná el organismo' }, ...organismoOptions],
    value: uiState.matricula.organismo,
  });

  matriculaOrganismo.input?.addEventListener('change', e => {
    uiState.matricula = { ...uiState.matricula, organismo: e.target.value };
  });

  section.append(
    createCard({
      title: 'Matrícula profesional',
      icon: 'fa-id-card',
      content: (() => {
        const c = document.createElement('div');
        const help = document.createElement('p');
        help.className = 'form-help';
        help.textContent = 'La matrícula valida tu credencial ante los pacientes.';
        c.append(help, matriculaNumero, matriculaOrganismo);
        return c;
      })()
    })
  );
  return section;
}

// ============================================================
// SECCIÓN: FORMACIÓN E IDIOMAS
// ============================================================
function renderSeccionFormacion(state, uiState) {
  const section = document.createElement('div');
  const titulo = createFormField({
    label: 'Título universitario', name: 'titulo', required: false,
    placeholder: 'Ej: Médico Cirujano — UBA',
    helpText: 'Tu título de grado y la universidad donde lo obtuviste',
    value: uiState.titulo,
  });
  titulo.input?.addEventListener('input', e => { uiState.titulo = e.target.value; });

  const institucion = createFormField({
    label: 'Institución donde te formaste', name: 'institucionFormadora', required: false,
    placeholder: 'Ej: Hospital Italiano de Buenos Aires',
    helpText: 'Residencia, fellowship o especialización principal',
    value: uiState.institucionFormadora,
  });
  institucion.input?.addEventListener('input', e => { uiState.institucionFormadora = e.target.value; });

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
    cb.checked = uiState.idiomas.includes(idioma);
    cb.addEventListener('change', () => {
      if (cb.checked) uiState.idiomas = [...uiState.idiomas, idioma];
      else            uiState.idiomas = uiState.idiomas.filter(i => i !== idioma);
    });
    row.appendChild(cb);
    row.appendChild(document.createTextNode(` ${idioma}`));
    idiomasGrid.appendChild(row);
  });
  idiomasWrapper.appendChild(idiomasGrid);

  section.append(
    createCard({
      title: 'Formación e idiomas', icon: 'fa-graduation-cap',
      content: (() => {
        const c = document.createElement('div');
        c.append(titulo, institucion, idiomasWrapper);
        return c;
      })()
    })
  );
  return section;
}
