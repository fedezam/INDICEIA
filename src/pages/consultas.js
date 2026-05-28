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
  // _editingId: null si estamos creando, string si estamos editando
  const uiState = {
    consultas: structuredClone(initialConsultas),
    draft: { _editingId: null } 
  };
  const originalSnapshot = structuredClone(initialConsultas);

  const header = document.createElement('div');
  header.className = 'page-header';
  header.innerHTML = `
    <h2><i class="fas fa-calendar-check"></i> Tipos de consulta</h2>
    <p>Definí qué tipo de consultas ofrecés, con duración y precio.</p>
  `;
  page.appendChild(header);

  // Formulario de carga/edición
  page.appendChild(renderFormConsulta(uiState));

  // Lista de consultas cargadas (borrador local)
  const listaContainer = document.createElement('div');
  listaContainer.id = 'lista-consultas';
  listaContainer.className = 'lista-consultas-container';
  page.appendChild(listaContainer);
  refreshLista(uiState);

  // Botón dinámico de guardado final
  const btnContainer = document.createElement('div');
  btnContainer.className = 'btn-container';
  btnContainer.appendChild(_renderSaveButton(uiState, originalSnapshot));
  page.appendChild(btnContainer);
}

// ============================================================
// SAVE BUTTON FINAL (DB)
// ============================================================
function _renderSaveButton(uiState, originalSnapshot) {
  const hasChanges = () => JSON.stringify(uiState.consultas) !== JSON.stringify(originalSnapshot);

  return createOnboardingButton({
    stepName: 'consultas',
    validate: () => true,
    getLabel: () => {
      if (uiState.consultas.length === 0) return 'Agregá al menos una consulta';
      if (!hasChanges()) return 'Volver al dashboard';
      return `Guardar y continuar (${uiState.consultas.length} tipo${uiState.consultas.length > 1 ? 's' : ''})`;
    },
    dirtyController: {
      hasUnsavedChanges: () => hasChanges() && uiState.consultas.length > 0,
      markSaved: () => {}
    },
    onSave: async ({ uid, comercioId }) => {
      if (!comercioId) throw new Error('No hay comercioId');
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
// FORMULARIO DE CARGA / EDICIÓN
// ============================================================
function renderFormConsulta(uiState) {
  const draft = uiState.draft;
  const isEditing = !!draft._editingId;

  const nombre = createFormField({
    label: '¿Qué tipo de consulta es?',
    name: 'consulta-nombre',
    required: true,
    placeholder: 'Ej: Primera consulta, Consulta de seguimiento',
    helpText: 'El nombre tal como lo vas a presentar a tus pacientes',
    value: draft.nombre || '',
  });
  nombre.input?.addEventListener('input', e => { draft.nombre = e.target.value.trim(); });

  const descripcion = createFormField({
    label: 'Descripción',
    name: 'consulta-desc',
    type: 'textarea',
    rows: 2,
    placeholder: 'Ej: Incluye anamnesis y diagnóstico inicial.',
    value: draft.descripcion || '',
  });
  descripcion.input?.addEventListener('input', e => { draft.descripcion = e.target.value.trim(); });

  const duracion = createFormField({
    label: 'Duración aproximada (minutos)',
    name: 'consulta-duracion',
    type: 'number',
    placeholder: 'Ej: 30',
    helpText: 'Ayuda al paciente a organizarse',
    value: draft.duracion_minutos || '',
  });
  duracion.input?.addEventListener('input', e => {
    const n = parseInt(e.target.value);
    draft.duracion_minutos = n > 0 ? n : null;
  });

  // Precio con Semántica Corregida
  const precioWrapper = document.createElement('div');
  precioWrapper.className = 's-form-field';
  const precioLabel = document.createElement('label');
  precioLabel.className = 's-label';
  precioLabel.textContent = 'Precio'; // ← Cambio semántico
  precioWrapper.appendChild(precioLabel);

  const radioConsultar = document.createElement('label');
  radioConsultar.className = 'radio-option';
  radioConsultar.innerHTML = `<input type="radio" name="consulta-precio" value="consultar"><div><strong>A consultar</strong><span>El precio se define al coordinar el turno</span></div>`;

  const radioFijo = document.createElement('label');
  radioFijo.className = 'radio-option';
  radioFijo.innerHTML = `<input type="radio" name="consulta-precio" value="fijo"><div><strong>Precio fijo</strong><span>Valor establecido (ej. por colegio médico)</span></div>`;

  const inputPrecio = createFormField({
    label: 'Monto',
    name: 'consulta-precio-valor',
    type: 'number',
    placeholder: 'Ej: 5000',
  });
  
  // Determinar estado inicial de los radios
  const isFijo = draft.precio?.tipo === 'fijo';
  if (isFijo) {
    radioFijo.querySelector('input').checked = true;
    inputPrecio.style.display = 'block';
    inputPrecio.input.value = draft.precio.valor || '';
  } else {
    radioConsultar.querySelector('input').checked = true;
    inputPrecio.style.display = 'none';
  }

  radioConsultar.querySelector('input').addEventListener('change', () => {
    delete draft.precio;
    inputPrecio.style.display = 'none';
  });
  
  radioFijo.querySelector('input').addEventListener('change', () => {
    draft.precio = { tipo: 'fijo', valor: parseInt(inputPrecio.input.value) || 0, moneda: 'ARS' };
    inputPrecio.style.display = 'block';
  });
  
  inputPrecio.input?.addEventListener('input', e => {
    if (draft.precio && draft.precio.tipo === 'fijo') {
      draft.precio.valor = parseInt(e.target.value) || 0;
    }
  });

  precioWrapper.append(radioConsultar, radioFijo, inputPrecio);

  const btnAction = createButton({
    label: isEditing ? 'Actualizar consulta' : 'Agregar tipo de consulta',
    variant: isEditing ? 'primary' : 'success',
    icon: isEditing ? 'fa-check' : 'fa-plus',
    block: true,
    onClick: () => {
      if (!draft.nombre) {
        showToast('Ingresá el nombre de la consulta', 'warning');
        return;
      }
      
      // Normalizar precio si está vacío
      if (!draft.precio) {
        draft.precio = { tipo: 'consultar', moneda: 'ARS' };
      }

      if (isEditing) {
        // Actualizar existente
        const idx = uiState.consultas.findIndex(c => c.id === draft._editingId);
        if (idx >= 0) {
          // Mantener el ID original
          const updated = { ...draft, id: draft._editingId };
          delete updated._editingId;
          uiState.consultas[idx] = updated;
          showToast('Consulta actualizada', 'success');
        }
      } else {
        // Crear nueva
        const nuevaConsulta = {
          id: crypto.randomUUID(),
          ...structuredClone(draft)
        };
        delete nuevaConsulta._editingId;
        uiState.consultas.push(nuevaConsulta);
        showToast('Tipo de consulta agregado', 'success');
      }

      // Resetear draft
      uiState.draft = { _editingId: null };
      refreshLista(uiState);
      
      // Re-renderizar formulario para limpiarlo y volver a modo "Agregar"
      const formCard = document.querySelector('.s-card--primary'); // Asumiendo que es la primera card primary
      if (formCard) {
         // Una forma simple es re-renderizar todo el form content
         const newForm = renderFormConsulta(uiState);
         formCard.replaceWith(newForm);
      }
    }
  });

  let content = document.createElement('div');
  content.append(nombre, descripcion, duracion, precioWrapper, btnAction);

  if (isEditing) {
    const btnCancel = createButton({
      label: 'Cancelar edición',
      variant: 'secondary',
      icon: 'fa-times',
      block: true,
      onClick: () => {
        uiState.draft = { _editingId: null };
        const formCard = document.querySelector('.s-card--primary');
        if (formCard) formCard.replaceWith(renderFormConsulta(uiState));
      }
    });
    content.appendChild(btnCancel);
  }

  return createCard({
    title: isEditing ? 'Editando consulta' : 'Agregar tipo de consulta',
    icon: isEditing ? 'fa-pencil' : 'fa-plus-circle',
    variant: 'primary',
    content,
  });
}

// ============================================================
// LISTA DE CONSULTAS (Con Editar/Eliminar)
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

  uiState.consultas.forEach((consulta) => {
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
    
    // Botón Editar
    actions.appendChild(createButton({
      label: 'Editar',
      variant: 'primary',
      size: 'sm',
      icon: 'fa-pencil',
      onClick: () => {
        // Cargar en draft para editar
        uiState.draft = {
          ...structuredClone(consulta),
          _editingId: consulta.id
        };
        
        // Re-renderizar formulario arriba
        const formCard = document.querySelector('.s-card--primary');
        if (formCard) formCard.replaceWith(renderFormConsulta(uiState));
        
        window.scrollTo({ top: 0, behavior: 'smooth' });
        showToast('Modo edición activado', 'info');
      }
    }));

    // Botón Eliminar
    actions.appendChild(createButton({
      label: 'Eliminar',
      variant: 'danger',
      size: 'sm',
      icon: 'fa-trash',
      onClick: () => {
        uiState.consultas = uiState.consultas.filter(c => c.id !== consulta.id);
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
