// ============================================================
// src/pages/servicios/servicios.js
// ============================================================
// Página de servicios usando skeleton COMPLETO con onboarding-button extendido
// Patrón: Draft local + Lista acumulada + onSave custom para batch de subcolección
// ============================================================

// ==================== SKELETON CORE ====================
import { runSkeleton }             from '/src/skeleton/skeleton.js';
import { createFirebaseAdapter }   from '/src/skeleton/adapters/firebaseAdapter.js';

// ==================== COMPONENTES ====================
import { createFormField }        from '/src/skeleton/components/form-field/index.js';
import { createButton }           from '/src/skeleton/components/button/index.js';
import { createCard }             from '/src/skeleton/components/card/index.js';
import { createOnboardingButton } from '/src/skeleton/components/onboarding-button/index.js';
import { showToast }              from '/src/skeleton/components/toast/index.js';

// ==================== FIREBASE ====================
import { db }                     from '/src/services/firebase/firebase.js';
import { 
  writeBatch, 
  doc, 
  collection, 
  getDocs,
  serverTimestamp 
} from 'firebase/firestore';

// ==================== ESTILOS ====================
import './servicios.css';

// ============================================================
// MÓDULO DE PÁGINA
// ============================================================
const page = {
  _data: {
    serviciosAcumulados: [],
    draft: {}
  },

  // ──────────────────────────────────────────────────────────
  // LOAD — solo datos
  // ──────────────────────────────────────────────────────────
  async load(ctx) {
    const comercioId = ctx.comercioId;
    
    if (!comercioId) {
      this._data.serviciosAcumulados = [];
      this._data.draft = {};
      return;
    }

    try {
      // Cargar servicios existentes de la subcolección
      const serviciosRef = collection(db, 'comercios', comercioId, 'servicios');
      const snapshot = await getDocs(serviciosRef);
      
      this._data.serviciosAcumulados = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (err) {
      if (err.code === 'permission-denied') {
        console.log('Sin servicios previos, iniciando vacío.');
        this._data.serviciosAcumulados = [];
      } else {
        console.error('Error cargando servicios:', err);
        this._data.serviciosAcumulados = [];
      }
    }
    
    this._data.draft = {};
  },

  // ──────────────────────────────────────────────────────────
  // RENDER — solo DOM, usando componentes
  // ──────────────────────────────────────────────────────────
  render() {
    const root = document.getElementById('skeleton-page');
    root.innerHTML = '';

    // Título
    const title = document.createElement('h2');
    title.textContent = 'Servicios';
    root.appendChild(title);

    // Hint
    const hint = document.createElement('p');
    hint.className = 'page-hint';
    hint.textContent = 'Definí todos los servicios que ofrecés. Podés crear varios y después guardarlos todos juntos.';
    root.appendChild(hint);

    // Card del formulario
    const formCard = createCard({
      title: 'Crear nuevo servicio',
      variant: 'primary',
      noHeader: false,
      content: this._renderFormContent()
    });
    root.appendChild(formCard);

    // Card de la lista
    const listaCard = createCard({
      title: 'Servicios agregados',
      variant: 'warning',
      content: this._renderListaContent()
    });
    root.appendChild(listaCard);

    // Botón onboarding (MODO CUSTOM con onSave)
    const saveBtn = this._renderSaveButton();
    root.appendChild(saveBtn);
  },

  // ──────────────────────────────────────────────────────────
  // FORM CONTENT — composición de campos
  // ──────────────────────────────────────────────────────────
  _renderFormContent() {
    const container = document.createElement('div');
    container.className = 'form-content';

    // Nombre (obligatorio)
    const nombre = createFormField({
      id: 'svc-nombre',
      label: '¿Qué servicio ofrecés? *',
      helpText: 'El nombre tal como lo conocen tus clientes. Ej: "Corte de pelo", "Consulta médica"',
      required: true,
      actions: {
        onChange: (v) => {
          const trimmed = v.trim();
          trimmed ? (this._data.draft.nombre = trimmed) : delete this._data.draft.nombre;
        }
      }
    });

    // Descripción (opcional)
    const descripcion = createFormField({
      id: 'svc-descripcion',
      label: 'Descripción',
      type: 'textarea',
      rows: 3,
      helpText: 'Agregá detalles que ayuden a entender mejor el servicio',
      actions: {
        onChange: (v) => {
          const trimmed = v.trim();
          trimmed ? (this._data.draft.descripcion = trimmed) : delete this._data.draft.descripcion;
        }
      }
    });

    // Modalidad (obligatorio) - campo compuesto
    const modalidad = this._renderModalidadField();

    // Precio (opcional) - campo compuesto
    const precio = this._renderPrecioField();

    // Disponibilidad (obligatorio) - campo compuesto
    const disponibilidad = this._renderDisponibilidadField();

    // Duración (opcional)
    const duracion = createFormField({
      id: 'svc-duracion',
      label: 'Duración aproximada (minutos)',
      type: 'number',
      helpText: 'Si no podés estimarla, dejalo vacío',
      actions: {
        onChange: (v) => {
          const num = Number(v);
          num > 0 ? (this._data.draft.duracion_minutos = num) : delete this._data.draft.duracion_minutos;
        }
      }
    });

    // Variantes (opcional)
    const variantes = createFormField({
      id: 'svc-variantes',
      label: 'Variantes del servicio',
      type: 'textarea',
      rows: 4,
      helpText: 'Una por línea. Ej: Básico 30min $500',
      actions: {
        onChange: (v) => {
          const lineas = v.split('\n').map(l => l.trim()).filter(Boolean);
          lineas.length > 0 ? (this._data.draft.variantes = lineas) : delete this._data.draft.variantes;
        }
      }
    });

    // Notas (opcional)
    const notas = createFormField({
      id: 'svc-notas',
      label: 'Notas adicionales',
      type: 'textarea',
      rows: 4,
      helpText: 'Requisitos, URLs, direcciones, horarios especiales, etc.',
      actions: {
        onChange: (v) => {
          const trimmed = v.trim();
          trimmed ? (this._data.draft.notas = trimmed) : delete this._data.draft.notas;
        }
      }
    });

    // Botón agregar (genérico, no guarda en DB)
    const btnAgregar = createButton({
      label: 'Agregar este servicio',
      variant: 'success',
      icon: 'fa-plus',
      block: true,
      onClick: () => this._agregarServicio()
    });

    container.append(nombre, descripcion, modalidad, precio, disponibilidad, duracion, variantes, notas, btnAgregar);
    
    // Guardar refs para edición
    this._formRefs = { nombre, descripcion, duracion, variantes, notas };
    
    return container;
  },

  // ──────────────────────────────────────────────────────────
  // CAMPOS COMPUESTOS (no hay componente nativo en skeleton)
  // ──────────────────────────────────────────────────────────
  _renderModalidadField() {
    const wrapper = document.createElement('div');
    wrapper.className = 's-form-field campo-compuesto';
    
    const label = document.createElement('label');
    label.className = 's-label';
    label.textContent = '¿Cómo se presta este servicio? *';
    wrapper.appendChild(label);
    
    const help = document.createElement('small');
    help.className = 's-help';
    help.textContent = 'Podés marcar más de una opción';
    wrapper.appendChild(help);

    const opciones = [
      { value: 'presencial', label: 'Presencial', help: 'El cliente viene a tu local' },
      { value: 'a_domicilio', label: 'A domicilio', help: 'Vos vas al domicilio del cliente' },
      { value: 'remoto', label: 'Remoto (online)', help: 'Por videollamada o internet' }
    ];

    this._modalidadCheckboxes = [];

    opciones.forEach(opt => {
      const row = document.createElement('label');
      row.className = 'checkbox-con-explicacion';
      row.innerHTML = `
        <input type="checkbox" value="${opt.value}">
        <div>
          <strong>${opt.label}</strong>
          <span>${opt.help}</span>
        </div>
      `;
      const cb = row.querySelector('input');
      this._modalidadCheckboxes.push(cb);
      cb.addEventListener('change', () => this._updateModalidad());
      wrapper.appendChild(row);
    });

    return wrapper;
  },

  _updateModalidad() {
    const vals = this._modalidadCheckboxes
      .filter(cb => cb.checked)
      .map(cb => cb.value);
    
    if (vals.length === 0) {
      delete this._data.draft.modalidad;
      delete this._data.draft.modalidades;
    } else if (vals.length === 1) {
      this._data.draft.modalidad = vals[0];
      delete this._data.draft.modalidades;
    } else {
      this._data.draft.modalidad = 'mixto';
      this._data.draft.modalidades = vals;
    }
  },

  _renderPrecioField() {
    const wrapper = document.createElement('div');
    wrapper.className = 's-form-field campo-compuesto';
    
    const label = document.createElement('label');
    label.className = 's-label';
    label.textContent = 'Precio';
    wrapper.appendChild(label);

    // Radio "A consultar"
    const radioConsultarWrapper = document.createElement('label');
    radioConsultarWrapper.className = 'radio-option';
    radioConsultarWrapper.innerHTML = `
      <input type="radio" name="svc-precio" value="consultar" checked>
      <div>
        <strong>A consultar</strong>
        <span>El precio se define con cada cliente</span>
      </div>
    `;
    const radioConsultar = radioConsultarWrapper.querySelector('input');
    
    // Radio "Precio fijo"
    const radioFijoWrapper = document.createElement('label');
    radioFijoWrapper.className = 'radio-option';
    radioFijoWrapper.innerHTML = `
      <input type="radio" name="svc-precio" value="fijo">
      <div>
        <strong>Precio fijo</strong>
        <span>Siempre tiene el mismo precio</span>
      </div>
    `;
    const radioFijo = radioFijoWrapper.querySelector('input');

    // Input de precio (desactivado por defecto)
    const inputPrecio = createFormField({
      id: 'svc-precio-valor',
      type: 'number',
      placeholder: 'Ej: 5000',
      actions: {
        onChange: (v) => {
          const num = Number(v);
          if (num > 0 && this._data.draft.precio?.tipo === 'fijo') {
            this._data.draft.precio.valor = num;
          }
        }
      }
    });
    inputPrecio.disable();

    // Eventos de radio
    radioConsultar.addEventListener('change', () => {
      if (radioConsultar.checked) {
        delete this._data.draft.precio;
        inputPrecio.setValue('');
        inputPrecio.disable();
      }
    });
    
    radioFijo.addEventListener('change', () => {
      if (radioFijo.checked) {
        this._data.draft.precio = { tipo: 'fijo', valor: 0 };
        inputPrecio.enable();
        const val = inputPrecio.getValue();
        if (val) this._data.draft.precio.valor = Number(val);
      }
    });

    wrapper.append(radioConsultarWrapper, radioFijoWrapper, inputPrecio);
    
    this._precioRefs = { radioConsultar, radioFijo, inputPrecio };
    
    return wrapper;
  },

  _renderDisponibilidadField() {
    const wrapper = document.createElement('div');
    wrapper.className = 's-form-field campo-compuesto campo-obligatorio';
    
    const label = document.createElement('label');
    label.className = 's-label';
    label.textContent = '¿Cuándo está disponible? *';
    wrapper.appendChild(label);
    
    const help = document.createElement('small');
    help.className = 's-help';
    help.textContent = 'Seleccioná solo UNA opción';
    wrapper.appendChild(help);

    const opciones = [
      { value: 'inmediata', label: 'Inmediata', help: 'Sin turno, por orden de llegada' },
      { value: 'a_coordinar', label: 'A coordinar', help: 'Requiere turno o agenda previa' }
    ];

    this._disponibilidadCheckboxes = [];

    opciones.forEach(opt => {
      const row = document.createElement('label');
      row.className = 'checkbox-con-explicacion';
      row.innerHTML = `
        <input type="checkbox" name="disponibilidad" value="${opt.value}">
        <div>
          <strong>${opt.label}</strong>
          <span>${opt.help}</span>
        </div>
      `;
      const cb = row.querySelector('input');
      this._disponibilidadCheckboxes.push(cb);
      
      cb.addEventListener('change', (e) => {
        // Solo uno puede estar marcado (radio-like behavior con checkboxes)
        this._disponibilidadCheckboxes.forEach(other => {
          if (other !== e.target) other.checked = false;
        });
        
        if (e.target.checked) {
          this._data.draft.disponibilidad = e.target.value;
        } else {
          delete this._data.draft.disponibilidad;
        }
      });
      
      wrapper.appendChild(row);
    });

    return wrapper;
  },

  // ──────────────────────────────────────────────────────────
  // LISTA CONTENT — servicios acumulados
  // ──────────────────────────────────────────────────────────
  _renderListaContent() {
    const container = document.createElement('div');
    container.id = 'lista-servicios-container';

    if (this._data.serviciosAcumulados.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'lista-vacia';
      empty.textContent = 'No hay servicios agregados aún';
      container.appendChild(empty);
      return container;
    }

    this._data.serviciosAcumulados.forEach((servicio, index) => {
      const item = this._renderServicioCard(servicio, index);
      container.appendChild(item);
    });

    return container;
  },

  _renderServicioCard(servicio, index) {
    const activo = servicio.activo !== false;
    const modalidadTexto = servicio.modalidades?.join(' + ') || servicio.modalidad || '—';
    const disponibilidadTexto = servicio.disponibilidad === 'inmediata' 
      ? 'Inmediata (sin turno)' 
      : 'A coordinar (con turno)';
    const precioTexto = servicio.precio ? `$${servicio.precio.valor}` : 'A consultar';
    const duracionTexto = servicio.duracion_minutos ? `${servicio.duracion_minutos} min` : null;

    // Construir contenido HTML para la card
    let contentHtml = `
      <div class="servicio-detalles">
        <div class="detalle-item">
          <span class="detalle-label">Modalidad:</span>
          <span class="detalle-valor">${modalidadTexto}</span>
        </div>
        <div class="detalle-item">
          <span class="detalle-label">Disponibilidad:</span>
          <span class="detalle-valor">${disponibilidadTexto}</span>
        </div>
        <div class="detalle-item">
          <span class="detalle-label">Precio:</span>
          <span class="detalle-valor">${precioTexto}</span>
        </div>
        ${duracionTexto ? `
          <div class="detalle-item">
            <span class="detalle-label">Duración:</span>
            <span class="detalle-valor">${duracionTexto}</span>
          </div>
        ` : ''}
      </div>
    `;

    if (servicio.descripcion) {
      contentHtml += `<p class="servicio-descripcion">${servicio.descripcion}</p>`;
    }

    if (servicio.variantes?.length > 0) {
      contentHtml += `
        <div class="servicio-extra">
          <strong>Variantes:</strong>
          <ul>${servicio.variantes.map(v => `<li>${v}</li>`).join('')}</ul>
        </div>
      `;
    }

    if (servicio.notas) {
      contentHtml += `
        <div class="servicio-extra">
          <strong>Notas:</strong>
          <p>${servicio.notas}</p>
        </div>
      `;
    }

    // Crear wrapper para acciones (no es string, es DOM)
    const actionsWrapper = document.createElement('div');
    actionsWrapper.className = 'servicio-acciones';

    const btnEditar = createButton({
      label: 'Editar',
      variant: 'primary',
      size: 'sm',
      icon: 'fa-pencil',
      onClick: () => this._editarServicio(index)
    });

    const btnToggle = createButton({
      label: activo ? 'Pausar' : 'Activar',
      variant: activo ? 'warning' : 'success',
      size: 'sm',
      icon: activo ? 'fa-pause' : 'fa-play',
      onClick: () => this._toggleServicio(index)
    });

    const btnEliminar = createButton({
      label: 'Eliminar',
      variant: 'danger',
      size: 'sm',
      icon: 'fa-trash',
      onClick: () => this._eliminarServicio(index)
    });

    actionsWrapper.append(btnEditar, btnToggle, btnEliminar);

    // Usar content como elemento DOM para poder appendear acciones después
    const contentDiv = document.createElement('div');
    contentDiv.innerHTML = contentHtml;
    contentDiv.appendChild(actionsWrapper);

    const card = createCard({
      title: `${servicio.nombre} ${activo ? '' : '(Pausado)'}`,
      variant: activo ? 'success' : 'secondary',
      compact: true,
      content: contentDiv
    });

    return card;
  },

  // ──────────────────────────────────────────────────────────
  // ACCIONES
  // ──────────────────────────────────────────────────────────
  _agregarServicio() {
    if (!this._isDraftValid()) {
      showToast('Campos obligatorios', 'Completá: Nombre, Modalidad y Disponibilidad', 'warning');
      return;
    }

    // Default activo
    if (this._data.draft.activo === undefined) {
      this._data.draft.activo = true;
    }

    // Agregar a lista
    this._data.serviciosAcumulados.push(structuredClone(this._data.draft));
    
    // Limpiar draft y formulario
    this._data.draft = {};
    this._limpiarFormulario();
    
    // Re-renderizar solo la lista (optimización: no todo el page)
    this._refreshLista();
    
    showToast('✅ Servicio agregado', 'Podés crear otro o guardar cuando termines', 'success');
  },

  _isDraftValid() {
    return !!(
      this._data.draft.nombre?.trim() && 
      this._data.draft.modalidad && 
      this._data.draft.disponibilidad
    );
  },

  _limpiarFormulario() {
    // Limpiar form-fields
    if (this._formRefs) {
      Object.values(this._formRefs).forEach(field => {
        if (field && field.setValue) field.setValue('');
      });
    }
    
    // Limpiar checkboxes modalidad
    if (this._modalidadCheckboxes) {
      this._modalidadCheckboxes.forEach(cb => cb.checked = false);
    }
    
    // Reset precio
    if (this._precioRefs) {
      this._precioRefs.radioConsultar.checked = true;
      this._precioRefs.radioFijo.checked = false;
      this._precioRefs.inputPrecio.setValue('');
      this._precioRefs.inputPrecio.disable();
    }
    
    // Limpiar disponibilidad
    if (this._disponibilidadCheckboxes) {
      this._disponibilidadCheckboxes.forEach(cb => cb.checked = false);
    }
  },

  _editarServicio(index) {
    const servicio = this._data.serviciosAcumulados[index];
    
    // Cargar en draft
    this._data.draft = structuredClone(servicio);
    
    // Cargar en formulario
    this._cargarDraftEnFormulario();
    
    // Eliminar de lista temporalmente
    this._data.serviciosAcumulados.splice(index, 1);
    this._refreshLista();
    
    // Scroll arriba
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    showToast('Modo edición', 'Modificá los campos y agregá el servicio nuevamente', 'info');
  },

  _cargarDraftEnFormulario() {
    const d = this._data.draft;
    
    // Campos simples
    if (this._formRefs.nombre) this._formRefs.nombre.setValue(d.nombre || '');
    if (this._formRefs.descripcion) this._formRefs.descripcion.setValue(d.descripcion || '');
    if (this._formRefs.duracion) this._formRefs.duracion.setValue(d.duracion_minutos || '');
    if (this._formRefs.variantes) this._formRefs.variantes.setValue(d.variantes?.join('\n') || '');
    if (this._formRefs.notas) this._formRefs.notas.setValue(d.notas || '');
    
    // Modalidad
    if (this._modalidadCheckboxes) {
      const vals = d.modalidades || [d.modalidad].filter(Boolean);
      this._modalidadCheckboxes.forEach(cb => {
        cb.checked = vals.includes(cb.value);
      });
    }
    
    // Precio
    if (d.precio?.tipo === 'fijo' && this._precioRefs) {
      this._precioRefs.radioFijo.checked = true;
      this._precioRefs.radioConsultar.checked = false;
      this._precioRefs.inputPrecio.setValue(d.precio.valor);
      this._precioRefs.inputPrecio.enable();
    }
    
    // Disponibilidad
    if (this._disponibilidadCheckboxes && d.disponibilidad) {
      this._disponibilidadCheckboxes.forEach(cb => {
        cb.checked = cb.value === d.disponibilidad;
      });
    }
  },

  _toggleServicio(index) {
    this._data.serviciosAcumulados[index].activo = !this._data.serviciosAcumulados[index].activo;
    this._refreshLista();
  },

  _eliminarServicio(index) {
    this._data.serviciosAcumulados.splice(index, 1);
    this._refreshLista();
    showToast('Eliminado', 'Servicio eliminado de la lista', 'info');
  },

  _refreshLista() {
    // Re-renderizar solo la card de lista
    const root = document.getElementById('skeleton-page');
    const oldLista = root.querySelector('#lista-servicios-container').parentElement;
    
    const newLista = createCard({
      title: 'Servicios agregados',
      variant: 'warning',
      content: this._renderListaContentReal()
    });
    
    oldLista.replaceWith(newLista);
  },

  _renderListaContentReal() {
    // Versión que retorna el div container, no lo appendea
    const container = document.createElement('div');
    container.id = 'lista-servicios-container';

    if (this._data.serviciosAcumulados.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'lista-vacia';
      empty.textContent = 'No hay servicios agregados aún';
      container.appendChild(empty);
      return container;
    }

    this._data.serviciosAcumulados.forEach((servicio, index) => {
      const item = this._renderServicioCard(servicio, index);
      container.appendChild(item);
    });

    return container;
  },

  // ──────────────────────────────────────────────────────────
  // SAVE BUTTON — onboarding-button con onSave custom
  // ──────────────────────────────────────────────────────────
  _renderSaveButton() {
    return createOnboardingButton({
      stepName: 'servicios',
      
      validate: () => {
        const valid = this._data.serviciosAcumulados.length > 0;
        if (!valid) {
          showToast('Error', 'Agregá al menos un servicio', 'warning');
        }
        return valid;
      },
      
      // MODO CUSTOM: batch write de subcolección
      onSave: async ({ uid, comercioId }) => {
        if (!comercioId) {
          throw new Error('No hay comercioId para guardar servicios');
        }
        
        if (this._data.serviciosAcumulados.length === 0) {
          throw new Error('No hay servicios para guardar');
        }

        const batch = writeBatch(db);
        const comercioRef = doc(db, 'comercios', comercioId);

        // 1. Obtener y borrar servicios existentes
        const serviciosRef = collection(db, 'comercios', comercioId, 'servicios');
        const existentes = await getDocs(serviciosRef);
        
        existentes.docs.forEach(docSnap => {
          batch.delete(docSnap.ref);
        });

        // 2. Crear nuevos servicios (sin IDs, Firestore genera nuevos)
        this._data.serviciosAcumulados.forEach(servicio => {
          // Limpiar ID temporal si existe
          const { id, ...servicioData } = servicio;
          
          const nuevoRef = doc(collection(db, 'comercios', comercioId, 'servicios'));
          batch.set(nuevoRef, {
            ...servicioData,
            fechaActualizacion: serverTimestamp()
          });
        });

        // 3. Marcar paso en comercio (onboarding-button también lo haría, pero redundancia no daña)
        batch.update(comercioRef, {
          ['onboardingSteps.servicios']: true,
          fechaActualizacion: serverTimestamp()
        });

        // 4. Commit
        await batch.commit();
        
        console.log(`✅ Guardados ${this._data.serviciosAcumulados.length} servicios`);
        return true; // Éxito
      },
      
      onSuccess: () => {
        showToast('💾 Servicios guardados', 'Redirigiendo...', 'success');
      },
      
      onError: (err) => {
        console.error('Error guardando servicios:', err);
        showToast('Error al guardar', err.message, 'error');
      }
    });
  },

  // ──────────────────────────────────────────────────────────
  // DIRTY STATE CONTRACT (opcional - para integración con skeleton)
  // ──────────────────────────────────────────────────────────
  getCurrentData() {
    return { 
      serviciosAcumulados: structuredClone(this._data.serviciosAcumulados),
      draft: structuredClone(this._data.draft)
    };
  },

  isFormValid() {
    return this._data.serviciosAcumulados.length > 0;
  }
};

// ============================================================
// ARRANQUE
// ============================================================
runSkeleton({
  page,
  adapter: createFirebaseAdapter,
  options: { loadingMessage: 'Cargando servicios...' }
});
