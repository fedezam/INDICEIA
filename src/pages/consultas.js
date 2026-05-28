// ============================================================
// src/pages/consultas.js
// ============================================================

import { runLifecycle }           from '/src/skeleton/lifecycle.js';
import { createFirebaseAdapter }  from '/src/skeleton/adapters/firebaseAdapter.js';
import { mountLayout }            from '/src/skeleton/layout/index.js';
import { runFlowController }      from '/src/controllers/flowController.js';
import { createFormField }        from '/src/skeleton/components/form-field/index.js';
import { createButton }           from '/src/skeleton/components/button/index.js';
import { createCard }             from '/src/skeleton/components/card/index.js';
import { createOnboardingButton } from '/src/skeleton/components/onboarding-button/index.js';
import { showToast }              from '/src/skeleton/components/toast/index.js';

// Firebase imports necesarios para el batch atómico
import { db }                     from '/src/services/firebase/firebase.js';
import { writeBatch, doc, serverTimestamp } from 'firebase/firestore';

import './consultas.css';

const adapter = (options) => createFirebaseAdapter(options);

runLifecycle({
  adapter,
  options: { loadingMessage: 'Cargando consultas...' },
  async onReady(ctx) {
    await runFlowController(ctx.user.uid);
    mountLayout(ctx);
    
    // Cargar datos iniciales
    const consultas = ctx.comercioData?.consultas || [];
    render(ctx, consultas);
  }
});

// ============================================================
// RENDER & STATE MANAGEMENT
// ============================================================
function render(ctx, initialConsultas) {
  const page = document.getElementById('skeleton-page');
  page.innerHTML = '';

  // Estado reactivo local
  const uiState = {
    consultas: structuredClone(initialConsultas),
    draft: {}
  };
  const originalSnapshot = structuredClone(initialConsultas);

  const header = document.createElement('div');
  header.className = 'page-header';
  header.innerHTML = `
    <h2><i class="fas fa-calendar-check"></i> Tipos de consulta</h2>
    <p>Definí qué tipo de consultas ofrecés, con duración y precio orientativo.</p>
  `;
  page.appendChild(header);

  // Formulario de carga
  page.appendChild(renderFormConsulta(uiState));

  // Lista de consultas cargadas
  const listaContainer = document.createElement('div');
  listaContainer.id = 'lista-consultas';
  listaContainer.className = 'lista-consultas-container';
  page.appendChild(listaContainer);
  refreshLista(uiState);

  // Botón dinámico de guardado
  const btnContainer = document.createElement('div');
  btnContainer.className = 'btn-container';
  btnContainer.appendChild(_renderSaveButton(uiState, originalSnapshot));
  page.appendChild(btnContainer);
}

// ============================================================
// SAVE BUTTON (Dinámico y Atómico)
// ============================================================
function _renderSaveButton(uiState, originalSnapshot) {
  const hasChanges = () => JSON.stringify(uiState.consultas) !== JSON.stringify(originalSnapshot);
  const isValid = () => uiState.consultas.length > 0;

  return createOnboardingButton({
    stepName: 'consultas',
    validate: isValid,
    getLabel: () => {
      if (!hasChanges()) return 'Volver al dashboard';
      if (uiState.consultas.length === 0) return 'Agregá al menos una consulta';
      return `Guardar y continuar (${uiState.consultas.length} tipo${uiState.consultas.length > 1 ? 's' : ''})`;
    },
    onSave: async ({ uid, comercioId }) => {
      if (!comercioId) throw new Error('No hay comercioId');

      // Guardado atómico con Batch
      const batch = writeBatch(db);
      const ref = doc(db, 'entidades', comercioId);
      
      batch.update(ref, {
        consultas: uiState.consultas,
        'onboardingSteps.consultas': true,
        fechaActualizacion: serverTimestamp()
      });
      
      await batch.commit();
      return true;
    },
    onSuccess: () => showToast('💾 Consultas guardadas', 'success'),
    onError: (err) => {
      console.error('[consultas] Error:', err);
      showToast('Error al guardar: ' + err.message, 'error');
    }
  });
}

// ============================================================
// FORMULARIO DE CARGA
// ============================================================
function renderFormConsulta(uiState) {
  const draft = uiState.draft;

  const nombre = createFormField({
    label: '¿Qué tipo de consulta es?',
    name: 'consulta-nombre',
    required: true,
    placeholder: 'Ej: Primera consulta, Consulta de seguimiento',
    helpText: 'El nombre tal como lo vas a presentar a tus pacientes',
  });
  nombre.input?.addEventListener('input', e => { draft.nombre = e.target.value.trim(); });

  const descripcion = createFormField({
    label: 'Descripción',
    name: 'consulta-desc',
    type: 'textarea',
    rows: 2,
    placeholder: 'Ej: Incluye anamnesis y diagnóstico inicial.',
  });
  descripcion.input?.addEventListener('input', e => { draft.descripcion = e.target.value.trim(); });

  const duracion = createFormField({
    label: 'Duración aproximada (minutos)',
    name: 'consulta-duracion',
    type: 'number',
    placeholder: 'Ej: 30',
    helpText: 'Ayuda al paciente a organizarse',
  });
  duracion.input?.addEventListener('input', e => {
    const n = parseInt(e.target.value);
    draft.duracion_minutos = n > 0 ? n : null;
  });

  // Precio
  const precioWrapper = document.createElement('div');
  precioWrapper.className = 's-form-field';
  const precioLabel = document.createElement('label');
  precioLabel.className = 's-label';
  precioLabel.textContent = 'Precio';
  precioWrapper.appendChild(precioLabel);

  const radioConsultar = document.createElement('label');
  radioConsultar.className = 'radio-option';
  radioConsultar.innerHTML = `<input type="radio" name="consulta-precio" value="consultar" checked><div><strong>A consultar</strong><span>Depende de la cobertura o se define al turno</span></div>`;

  const radioFijo = document.createElement('label');
  radioFijo.className = 'radio-option';
  radioFijo.innerHTML = `<input type="radio" name="consulta-precio" value="fijo"><div><strong>Precio orientativo</strong><span>Para pacientes particulares</span></div>`;

  const inputPrecio = createFormField({
    label: 'Precio orientativo',
    name: 'consulta-precio-valor',
    type: 'number',
    placeholder: 'Ej: 5000',
  });
  inputPrecio.style.display = 'none';

  radioConsultar.querySelector('input').addEventListener('change', () => {
    delete draft.precio;
    inputPrecio.style.display = 'none';
  });
  radioFijo.querySelector('input').addEventListener('change', () => {
    draft.precio = { tipo: 'fijo', valor: 0 };
    inputPrecio.style.display = 'block';
  });
  inputPrecio.input?.addEventListener('input', e => {
    if (draft.precio) draft.precio.valor = parseInt(e.target.value) || 0;
  });

  precioWrapper.append(radioConsultar, radioFijo, inputPrecio);

  const btnAgregar = createButton({
    label: 'Agregar tipo de consulta',
    variant: 'success',
    icon: 'fa-plus',
    block: true,
    onClick: () => {
      if (!draft.nombre) {
        showToast('Ingresá el nombre de la consulta', 'warning');
        return;
      }
      // Normalizar precio si está vacío
      if (!draft.precio) draft.precio = { tipo: 'consultar' };
      
      uiState.consultas.push(structuredClone(draft));
      uiState.draft = {};
      
      // Limpiar form visualmente
      if (nombre.input) nombre.input.value = '';
      if (descripcion.input) descripcion.input.value = '';
      if (duracion.input) duracion.input.value = '';
      radioConsultar.querySelector('input').checked = true;
      inputPrecio.style.display = 'none';
      
      refreshLista(uiState);
      showToast('Tipo de consulta agregado', 'success');
    }
  });

  const content = document.createElement('div');
  content.append(nombre, descripcion, duracion, precioWrapper, btnAgregar);

  return createCard({
    title: 'Agregar tipo de consulta',
    icon: 'fa-plus-circle',
    variant: 'primary',
    content,
  });
}

// ============================================================
// LISTA DE CONSULTAS
// ============================================================
function refreshLista(uiState) {
  const listaContainer = document.getElementById('lista-consultas');
  if (!listaContainer) return;
  listaContainer.innerHTML = '';

  if (uiState.consultas.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'lista-vacia';
    empty.textContent = 'No hay tipos de consulta definidos aún.';
    listaContainer.appendChild(empty);
    return;
  }

  uiState.consultas.forEach((consulta, index) => {
    const precioTexto = consulta.precio?.tipo === 'fijo' && consulta.precio.valor
      ? `$${consulta.precio.valor.toLocaleString('es-AR')}`
      : 'A consultar';

    const content = document.createElement('div');
    
    if (consulta.descripcion) {
      const desc = document.createElement('p');
      desc.className = 'consulta-desc';
      desc.textContent = consulta.descripcion;
      content.appendChild(desc);
    }

    const chips = document.createElement('div');
    chips.className = 'consulta-chips';
    
    if (consulta.duracion_minutos) {
      chips.innerHTML += `<span class="chip"><i class="fas fa-clock"></i> ${consulta.duracion_minutos} min</span>`;
    }
    chips.innerHTML += `<span class="chip chip-precio"><i class="fas fa-dollar-sign"></i> ${precioTexto}</span>`;
    
    content.appendChild(chips);

    const actions = document.createElement('div');
    actions.className = 'consulta-actions';
    actions.appendChild(createButton({
      label: 'Eliminar',
      variant: 'danger',
      size: 'sm',
      icon: 'fa-trash',
      onClick: () => {
        uiState.consultas.splice(index, 1);
        refreshLista(uiState);
        showToast('Eliminado', 'info');
      }
    }));
    content.appendChild(actions);

    listaContainer.appendChild(createCard({
      title: consulta.nombre,
      icon: 'fa-calendar-check',
      variant: 'success',
      compact: true,
      content,
    }));
  });
}
