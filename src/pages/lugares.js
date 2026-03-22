// ============================================================
// src/pages/lugares/lugares.js
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
import './lugares.css';

const DIAS = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];
const DIAS_LABELS = {
  lunes: 'Lun', martes: 'Mar', miercoles: 'Mié',
  jueves: 'Jue', viernes: 'Vie', sabado: 'Sáb', domingo: 'Dom'
};

const adapter = (options) => createFirebaseAdapter(options);

runLifecycle({
  adapter,
  options: { loadingMessage: 'Cargando lugares...' },
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
  const lugares = ctx.comercioData?.lugares || [];
  return { lugares: structuredClone(lugares) };
}

// ============================================================
// RENDER
// ============================================================
function render(ctx, state) {
  const page = document.getElementById('skeleton-page');
  page.innerHTML = '';

  const uiState = { lugares: state.lugares, draft: {} };

  const header = document.createElement('div');
  header.className = 'page-header';
  header.innerHTML = `
    <h2><i class="fas fa-map-marker-alt"></i> Lugares de atención</h2>
    <p>Indicá dónde atendés y en qué días y horarios. Podés agregar varios lugares.</p>
  `;
  page.appendChild(header);

  // Formulario nuevo lugar
  page.appendChild(renderFormLugar(uiState, () => refreshLista(page, uiState, ctx)));

  // Lista de lugares
  const listaContainer = document.createElement('div');
  listaContainer.id = 'lista-lugares';
  page.appendChild(listaContainer);
  refreshLista(page, uiState, ctx);

  // Botón guardar
  const guardarBtn = createOnboardingButton({
    stepName: 'lugares',
    validate: () => uiState.lugares.length > 0,
    getLabel: () => {
      if (uiState.lugares.length === 0) return 'Agregá al menos un lugar';
      return `Guardar y continuar (${uiState.lugares.length} lugar${uiState.lugares.length > 1 ? 'es' : ''})`;
    },
    onSave: async ({ persistence }) => {
      await persistence.updateData({ lugares: uiState.lugares });
      return { success: true, stepMarked: true };
    },
    onSuccess: () => showToast('Lugares guardados', 'success'),
    onError:   (err) => showToast('Error: ' + err.message, 'error'),
  });

  const btnContainer = document.createElement('div');
  btnContainer.className = 'btn-container';
  btnContainer.appendChild(guardarBtn);
  page.appendChild(btnContainer);
}

// ============================================================
// FORMULARIO NUEVO LUGAR
// ============================================================
function renderFormLugar(uiState, onAdd) {
  const draft = uiState.draft;

  const nombre = createFormField({
    label: 'Nombre del lugar',
    name: 'lugar-nombre',
    required: true,
    placeholder: 'Ej: Consultorio propio, Clínica San José',
    helpText: 'Como lo conocen tus pacientes',
  });
  nombre.input?.addEventListener('input', e => { draft.nombre = e.target.value.trim(); });

  const direccion = createFormField({
    label: 'Dirección',
    name: 'lugar-direccion',
    required: true,
    placeholder: 'Ej: Belgrano 1234, Casilda',
  });
  direccion.input?.addEventListener('input', e => { draft.direccion = e.target.value.trim(); });

  // Días
  const diasWrapper = document.createElement('div');
  diasWrapper.className = 's-form-field';
  const diasLabel = document.createElement('label');
  diasLabel.className = 's-label';
  diasLabel.textContent = 'Días que atendés en este lugar *';
  diasWrapper.appendChild(diasLabel);

  const diasGrid = document.createElement('div');
  diasGrid.className = 'dias-grid';
  const diasCheckboxes = {};

  DIAS.forEach(dia => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'dia-btn';
    btn.textContent = DIAS_LABELS[dia];
    btn.dataset.dia = dia;
    btn.addEventListener('click', () => {
      btn.classList.toggle('active');
      diasCheckboxes[dia] = btn.classList.contains('active');
      draft.dias = DIAS.filter(d => diasCheckboxes[d]);
    });
    diasCheckboxes[dia] = false;
    diasGrid.appendChild(btn);
  });

  diasWrapper.appendChild(diasGrid);

  // Horario
  const horarioWrapper = document.createElement('div');
  horarioWrapper.className = 's-form-field horario-wrapper';
  const horarioLabel = document.createElement('label');
  horarioLabel.className = 's-label';
  horarioLabel.textContent = 'Horario de atención';
  horarioWrapper.appendChild(horarioLabel);

  const horarioRow = document.createElement('div');
  horarioRow.className = 'horario-row';

  const horarioDesde = createFormField({
    label: 'Desde',
    name: 'lugar-desde',
    type: 'time',
    value: '09:00',
  });
  horarioDesde.input?.addEventListener('change', e => {
    draft.horario = { ...draft.horario, desde: e.target.value };
  });
  draft.horario = { desde: '09:00', hasta: '13:00' };

  const horarioHasta = createFormField({
    label: 'Hasta',
    name: 'lugar-hasta',
    type: 'time',
    value: '13:00',
  });
  horarioHasta.input?.addEventListener('change', e => {
    draft.horario = { ...draft.horario, hasta: e.target.value };
  });

  horarioRow.append(horarioDesde, horarioHasta);
  horarioWrapper.appendChild(horarioRow);

  const btnAgregar = createButton({
    label: 'Agregar lugar',
    variant: 'success',
    icon: 'fa-plus',
    block: true,
    onClick: () => {
      if (!draft.nombre || !draft.direccion || !draft.dias?.length) {
        showToast('Completá nombre, dirección y al menos un día', 'warning');
        return;
      }
      uiState.lugares.push(structuredClone(draft));
      uiState.draft = {};
      // Limpiar form
      if (nombre.input) nombre.input.value = '';
      if (direccion.input) direccion.input.value = '';
      diasGrid.querySelectorAll('.dia-btn').forEach(b => b.classList.remove('active'));
      DIAS.forEach(d => { diasCheckboxes[d] = false; });
      onAdd();
      showToast('Lugar agregado', 'success');
    }
  });

  const content = document.createElement('div');
  content.append(nombre, direccion, diasWrapper, horarioWrapper, btnAgregar);

  return createCard({
    title: 'Agregar lugar de atención',
    icon: 'fa-plus-circle',
    variant: 'primary',
    content,
  });
}

// ============================================================
// LISTA DE LUGARES
// ============================================================
function refreshLista(page, uiState, ctx) {
  let listaContainer = document.getElementById('lista-lugares');
  if (!listaContainer) return;

  listaContainer.innerHTML = '';

  if (uiState.lugares.length === 0) return;

  uiState.lugares.forEach((lugar, index) => {
    const diasTexto = (lugar.dias || [])
      .map(d => DIAS_LABELS[d] || d)
      .join(', ');

    const horarioTexto = lugar.horario
      ? `${lugar.horario.desde} – ${lugar.horario.hasta}`
      : 'Sin horario';

    const content = document.createElement('div');
    content.innerHTML = `
      <div class="lugar-info">
        <div class="lugar-detalle"><i class="fas fa-map-marker-alt"></i> ${lugar.direccion}</div>
        <div class="lugar-detalle"><i class="fas fa-calendar-alt"></i> ${diasTexto || '—'}</div>
        <div class="lugar-detalle"><i class="fas fa-clock"></i> ${horarioTexto}</div>
      </div>
    `;

    const actions = document.createElement('div');
    actions.className = 'lugar-actions';

    actions.appendChild(createButton({
      label: 'Eliminar',
      variant: 'danger',
      size: 'sm',
      icon: 'fa-trash',
      onClick: () => {
        uiState.lugares.splice(index, 1);
        refreshLista(page, uiState, ctx);
        showToast('Lugar eliminado', 'info');
      }
    }));

    content.appendChild(actions);

    listaContainer.appendChild(createCard({
      title: lugar.nombre,
      icon: 'fa-hospital',
      variant: 'success',
      compact: true,
      content,
    }));
  });
}
