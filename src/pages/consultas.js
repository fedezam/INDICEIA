// ============================================================
// src/pages/consultas/consultas.js
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
import './consultas.css';

const adapter = (options) => createFirebaseAdapter(options);

runLifecycle({
  adapter,
  options: { loadingMessage: 'Cargando consultas...' },
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
  const consultas = ctx.comercioData?.consultas || [];
  return { consultas: structuredClone(consultas) };
}

// ============================================================
// RENDER
// ============================================================
function render(ctx, state) {
  const page = document.getElementById('skeleton-page');
  page.innerHTML = '';

  const uiState = { consultas: state.consultas, draft: {} };
  const originalSnapshot = structuredClone(state.consultas);

  const header = document.createElement('div');
  header.className = 'page-header';
  header.innerHTML = `
    <h2><i class="fas fa-calendar-check"></i> Tipos de consulta</h2>
    <p>Definí qué tipo de consultas ofrecés, con duración y precio orientativo.</p>
  `;
  page.appendChild(header);

  page.appendChild(renderFormConsulta(uiState, page));

  const listaContainer = document.createElement('div');
  listaContainer.id = 'lista-consultas';
  page.appendChild(listaContainer);
  refreshLista(uiState, page);

  const dirtyController = {
    hasUnsavedChanges: () =>
      JSON.stringify(uiState.consultas) !== JSON.stringify(originalSnapshot),
    markSaved: () => {}
  };

  const guardarBtn = createOnboardingButton({
    stepName: 'consultas',
    validate: () => {
      if (!dirtyController.hasUnsavedChanges()) return true;
      return uiState.consultas.length > 0;
    },
    getLabel: () => {
      if (!dirtyController.hasUnsavedChanges()) return 'Volver al dashboard';
      if (uiState.consultas.length === 0) return 'Agregá al menos una consulta';
      return `Guardar y continuar (${uiState.consultas.length} tipo${uiState.consultas.length > 1 ? 's' : ''})`;
    },
    dirtyController,
    onSave: async ({ persistence }) => {
      await persistence.updateData({ consultas: uiState.consultas });
      return { success: true, stepMarked: true };
    },
    onSuccess: () => showToast('Consultas guardadas', 'success'),
    onError:   (err) => showToast('Error: ' + err.message, 'error'),
  });

  const btnContainer = document.createElement('div');
  btnContainer.className = 'btn-container';
  btnContainer.appendChild(guardarBtn);
  page.appendChild(btnContainer);
}

// ============================================================
// FORMULARIO
// ============================================================
function renderFormConsulta(uiState, page) {
  const draft = uiState.draft;

  const nombre = createFormField({
    label: '¿Qué tipo de consulta es?',
    name: 'consulta-nombre',
    required: true,
    placeholder: 'Ej: Primera consulta, Consulta de seguimiento, Control anual',
    helpText: 'El nombre tal como lo vas a presentar a tus pacientes',
  });
  nombre.input?.addEventListener('input', e => { draft.nombre = e.target.value.trim(); });

  const descripcion = createFormField({
    label: 'Descripción',
    name: 'consulta-desc',
    type: 'textarea',
    rows: 2,
    placeholder: 'Ej: Incluye anamnesis, examen físico y diagnóstico inicial.',
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
      uiState.consultas.push(structuredClone(draft));
      uiState.draft = {};
      // Limpiar form
      if (nombre.input) nombre.input.value = '';
      if (descripcion.input) descripcion.input.value = '';
      if (duracion.input) duracion.input.value = '';
      radioConsultar.querySelector('input').checked = true;
      delete draft.precio;
      inputPrecio.style.display = 'none';
      refreshLista(uiState, page);
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
// LISTA
// ============================================================
function refreshLista(uiState, page) {
  const listaContainer = document.getElementById('lista-consultas');
  if (!listaContainer) return;
  listaContainer.innerHTML = '';

  if (uiState.consultas.length === 0) return;

  uiState.consultas.forEach((consulta, index) => {
    const precioTexto = consulta.precio?.tipo === 'fijo'
      ? `$${consulta.precio.valor.toLocaleString('es-AR')}`
      : 'A consultar';

    const content = document.createElement('div');
    content.innerHTML = `
      <div class="consulta-detalles">
        ${consulta.descripcion ? `<p class="consulta-desc">${consulta.descripcion}</p>` : ''}
        <div class="consulta-chips">
          ${consulta.duracion_minutos ? `<span class="chip"><i class="fas fa-clock"></i> ${consulta.duracion_minutos} min</span>` : ''}
          <span class="chip chip-precio"><i class="fas fa-dollar-sign"></i> ${precioTexto}</span>
        </div>
      </div>
    `;

    const actions = document.createElement('div');
    actions.className = 'consulta-actions';
    actions.appendChild(createButton({
      label: 'Eliminar',
      variant: 'danger',
      size: 'sm',
      icon: 'fa-trash',
      onClick: () => {
        uiState.consultas.splice(index, 1);
        refreshLista(uiState, page);
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
