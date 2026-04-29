// ============================================================
// src/pages/servicios/servicios.js
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
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { 
  writeBatch, 
  doc, 
  collection, 
  getDocs,
  serverTimestamp 
} from 'firebase/firestore';

// ==================== ESTILOS ====================
import './servicios.css';

const storage = getStorage();

// ============================================================
// MÓDULO DE PÁGINA
// ============================================================
const page = {
  _data: {
    serviciosAcumulados: [],
    draft: {}
  },

  _comercioId: null,
  _originalSnapshot: [],

  // ──────────────────────────────────────────────────────────
  // UPLOAD IMAGEN
  // ──────────────────────────────────────────────────────────
  async _subirImagenServicio(file) {
    if (!this._comercioId) throw new Error('Sin comercioId');
    const filename = `${Date.now()}-${file.name.replace(/\s+/g, '_')}`;
    const ref = storageRef(storage, `entidades/${this._comercioId}/servicios/${filename}`);
    await uploadBytes(ref, file);
    return getDownloadURL(ref);
  },

  // ──────────────────────────────────────────────────────────
  // LOAD
  // ──────────────────────────────────────────────────────────
  async load(ctx) {
    this._comercioId = ctx.comercioId;

    if (!this._comercioId) {
      this._data.serviciosAcumulados = [];
      this._data.draft = {};
      return;
    }

    try {
      const serviciosRef = collection(db, 'entidades', this._comercioId, 'servicios');
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
    this._originalSnapshot = structuredClone(this._data.serviciosAcumulados);
  },

  // ──────────────────────────────────────────────────────────
  // RENDER
  // ──────────────────────────────────────────────────────────
  render() {
    const root = document.getElementById('skeleton-page');
    root.innerHTML = '';

    const title = document.createElement('h2');
    title.textContent = 'Servicios';
    root.appendChild(title);

    const hint = document.createElement('p');
    hint.className = 'page-hint';
    hint.textContent = 'Definí todos los servicios que ofrecés. Podés crear varios y después guardarlos todos juntos.';
    root.appendChild(hint);

    const formCard = createCard({
      title: 'Crear nuevo servicio',
      variant: 'primary',
      noHeader: false,
      content: this._renderFormContent()
    });
    root.appendChild(formCard);

    // FIX: guardar referencia al card de lista para poder reemplazarlo correctamente
    this._listaCard = createCard({
      title: 'Servicios agregados',
      variant: 'warning',
      content: this._renderListaContent()
    });
    root.appendChild(this._listaCard);

    root.appendChild(this._renderSaveButton());
  },

  // ──────────────────────────────────────────────────────────
  // FORM CONTENT
  // ──────────────────────────────────────────────────────────
  _renderFormContent() {
    const container = document.createElement('div');
    container.className = 'form-content';

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

    const modalidad     = this._renderModalidadField();
    const precio        = this._renderPrecioField();
    const disponibilidad = this._renderDisponibilidadField();
    const imagen        = this._renderImagenField();

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

    const btnAgregar = createButton({
      label: 'Agregar este servicio',
      variant: 'success',
      icon: 'fa-plus',
      block: true,
      onClick: () => this._agregarServicio()
    });

    container.append(nombre, descripcion, modalidad, precio, disponibilidad, imagen, duracion, variantes, notas, btnAgregar);

    this._formRefs = { nombre, descripcion, duracion, variantes, notas };

    return container;
  },

  // ──────────────────────────────────────────────────────────
  // CAMPO IMAGEN
  // ──────────────────────────────────────────────────────────
  _renderImagenField() {
    const wrapper = document.createElement('div');
    wrapper.className = 's-form-field campo-compuesto';

    const label = document.createElement('label');
    label.className = 's-label';
    label.textContent = 'Foto del servicio (opcional)';
    wrapper.appendChild(label);

    const help = document.createElement('small');
    help.className = 's-help';
    help.textContent = 'Subí una foto de un trabajo realizado o pegá un link de Instagram, Google Fotos, etc.';
    wrapper.appendChild(help);

    // Preview
    const preview = document.createElement('div');
    preview.className = 'imagen-preview' + (this._data.draft.imagen ? ' imagen-preview--visible' : '');
    if (this._data.draft.imagen) {
      preview.innerHTML = `<img src="${this._data.draft.imagen}" alt="preview" style="max-width:100%;border-radius:8px;margin-bottom:8px;"/><button class="imagen-preview-remove" title="Quitar imagen" style="display:block;margin-bottom:8px"><i class="fas fa-times"></i> Quitar foto</button>`;
      preview.querySelector('.imagen-preview-remove').addEventListener('click', () => {
        this._data.draft.imagen = '';
        this.render();
      });
    }
    wrapper.appendChild(preview);

    // Botón subir desde dispositivo
    const fileInput = document.createElement('input');
    fileInput.type   = 'file';
    fileInput.accept = 'image/*';
    fileInput.style.display = 'none';
    wrapper.appendChild(fileInput);

    const btnSubir = document.createElement('button');
    btnSubir.type      = 'button';
    btnSubir.className = 'imagen-upload-btn';
    btnSubir.style.cssText = 'display:flex;align-items:center;gap:8px;padding:8px 16px;border:1px dashed #ccc;border-radius:8px;background:none;cursor:pointer;font-size:14px;margin-bottom:8px;';
    btnSubir.innerHTML = `<i class="fas fa-camera"></i> Subir foto desde mi dispositivo`;
    btnSubir.addEventListener('click', () => fileInput.click());
    wrapper.appendChild(btnSubir);

    fileInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      btnSubir.disabled  = true;
      btnSubir.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Subiendo...`;
      try {
        const url = await this._subirImagenServicio(file);
        this._data.draft.imagen = url;
        showToast('Foto cargada', 'La imagen se guardó correctamente', 'success');
        this.render();
      } catch (err) {
        console.error(err);
        showToast('Error', 'No se pudo subir la imagen', 'error');
        btnSubir.disabled  = false;
        btnSubir.innerHTML = `<i class="fas fa-camera"></i> Subir foto desde mi dispositivo`;
      }
    });

    // Separador
    const sep = document.createElement('div');
    sep.style.cssText = 'text-align:center;color:#999;font-size:12px;margin:4px 0';
    sep.textContent = 'o pegá un link directo';
    wrapper.appendChild(sep);

    // Campo URL
    const urlInput = document.createElement('input');
    urlInput.type        = 'url';
    urlInput.className   = 'imagen-url-input';
    urlInput.placeholder = 'https://...';
    urlInput.value       = this._data.draft.imagen || '';
    urlInput.style.cssText = 'width:100%;padding:8px 12px;border:1px solid #ddd;border-radius:8px;font-size:14px;';
    urlInput.addEventListener('input', () => {
      this._data.draft.imagen = urlInput.value.trim();
    });
    wrapper.appendChild(urlInput);

    this._imagenUrlInput = urlInput;

    return wrapper;
  },

  // ──────────────────────────────────────────────────────────
  // CAMPOS COMPUESTOS
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
      { value: 'presencial',  label: 'Presencial',      help: 'El cliente viene a tu local' },
      { value: 'a_domicilio', label: 'A domicilio',      help: 'Vos vas al domicilio del cliente' },
      { value: 'remoto',      label: 'Remoto (online)',  help: 'Por videollamada o internet' }
    ];

    this._modalidadCheckboxes = [];

    opciones.forEach(opt => {
      const row = document.createElement('label');
      row.className = 'checkbox-con-explicacion';
      row.innerHTML = `
        <input type="checkbox" value="${opt.value}">
        <div><strong>${opt.label}</strong><span>${opt.help}</span></div>
      `;
      const cb = row.querySelector('input');
      this._modalidadCheckboxes.push(cb);
      cb.addEventListener('change', () => this._updateModalidad());
      wrapper.appendChild(row);
    });

    return wrapper;
  },

  _updateModalidad() {
    const vals = this._modalidadCheckboxes.filter(cb => cb.checked).map(cb => cb.value);
    if (vals.length === 0) delete this._data.draft.modalidad;
    else this._data.draft.modalidad = vals;
  },

  _renderPrecioField() {
    const wrapper = document.createElement('div');
    wrapper.className = 's-form-field campo-compuesto';

    const label = document.createElement('label');
    label.className = 's-label';
    label.textContent = 'Precio';
    wrapper.appendChild(label);

    const radioConsultarWrapper = document.createElement('label');
    radioConsultarWrapper.className = 'radio-option';
    radioConsultarWrapper.innerHTML = `
      <input type="radio" name="svc-precio" value="consultar" checked>
      <div><strong>A consultar</strong><span>El precio se define con cada cliente</span></div>
    `;
    const radioConsultar = radioConsultarWrapper.querySelector('input');

    const radioFijoWrapper = document.createElement('label');
    radioFijoWrapper.className = 'radio-option';
    radioFijoWrapper.innerHTML = `
      <input type="radio" name="svc-precio" value="fijo">
      <div><strong>Precio fijo</strong><span>Siempre tiene el mismo precio</span></div>
    `;
    const radioFijo = radioFijoWrapper.querySelector('input');

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
      { value: 'inmediata',   label: 'Inmediata',    help: 'Sin turno, por orden de llegada' },
      { value: 'a_coordinar', label: 'A coordinar',  help: 'Requiere turno o agenda previa' }
    ];

    this._disponibilidadCheckboxes = [];

    opciones.forEach(opt => {
      const row = document.createElement('label');
      row.className = 'checkbox-con-explicacion';
      row.innerHTML = `
        <input type="checkbox" name="disponibilidad" value="${opt.value}">
        <div><strong>${opt.label}</strong><span>${opt.help}</span></div>
      `;
      const cb = row.querySelector('input');
      this._disponibilidadCheckboxes.push(cb);
      cb.addEventListener('change', (e) => {
        this._disponibilidadCheckboxes.forEach(other => { if (other !== e.target) other.checked = false; });
        if (e.target.checked) this._data.draft.disponibilidad = e.target.value;
        else delete this._data.draft.disponibilidad;
      });
      wrapper.appendChild(row);
    });

    return wrapper;
  },

  // ──────────────────────────────────────────────────────────
  // LISTA
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
      container.appendChild(this._renderServicioCard(servicio, index));
    });

    return container;
  },

  _renderServicioCard(servicio, index) {
    const activo = servicio.activo !== false;
    const modalidadTexto = Array.isArray(servicio.modalidad)
      ? servicio.modalidad.join(' + ')
      : servicio.modalidad || '—';
    const disponibilidadTexto = servicio.disponibilidad === 'inmediata'
      ? 'Inmediata (sin turno)' : 'A coordinar (con turno)';
    const precioTexto = servicio.precio ? `$${servicio.precio.valor}` : 'A consultar';
    const duracionTexto = servicio.duracion_minutos ? `${servicio.duracion_minutos} min` : null;

    const contentDiv = document.createElement('div');

    // Imagen si existe
    if (servicio.imagen) {
      const img = document.createElement('img');
      img.src   = servicio.imagen;
      img.alt   = servicio.nombre;
      img.style.cssText = 'width:100%;max-height:180px;object-fit:cover;border-radius:8px;margin-bottom:12px;';
      contentDiv.appendChild(img);
    }

    contentDiv.innerHTML += `
      <div class="servicio-detalles">
        <div class="detalle-item"><span class="detalle-label">Modalidad:</span><span class="detalle-valor">${modalidadTexto}</span></div>
        <div class="detalle-item"><span class="detalle-label">Disponibilidad:</span><span class="detalle-valor">${disponibilidadTexto}</span></div>
        <div class="detalle-item"><span class="detalle-label">Precio:</span><span class="detalle-valor">${precioTexto}</span></div>
        ${duracionTexto ? `<div class="detalle-item"><span class="detalle-label">Duración:</span><span class="detalle-valor">${duracionTexto}</span></div>` : ''}
      </div>
      ${servicio.descripcion ? `<p class="servicio-descripcion">${servicio.descripcion}</p>` : ''}
      ${servicio.variantes?.length > 0 ? `<div class="servicio-extra"><strong>Variantes:</strong><ul>${servicio.variantes.map(v => `<li>${v}</li>`).join('')}</ul></div>` : ''}
      ${servicio.notas ? `<div class="servicio-extra"><strong>Notas:</strong><p>${servicio.notas}</p></div>` : ''}
    `;

    const actionsWrapper = document.createElement('div');
    actionsWrapper.className = 'servicio-acciones';
    actionsWrapper.append(
      createButton({ label: 'Editar',   variant: 'primary', size: 'sm', icon: 'fa-pencil', onClick: () => this._editarServicio(index) }),
      createButton({ label: activo ? 'Pausar' : 'Activar', variant: activo ? 'warning' : 'success', size: 'sm', icon: activo ? 'fa-pause' : 'fa-play', onClick: () => this._toggleServicio(index) }),
      createButton({ label: 'Eliminar', variant: 'danger',  size: 'sm', icon: 'fa-trash',  onClick: () => this._eliminarServicio(index) })
    );
    contentDiv.appendChild(actionsWrapper);

    return createCard({
      title: `${servicio.nombre} ${activo ? '' : '(Pausado)'}`,
      variant: activo ? 'success' : 'secondary',
      compact: true,
      content: contentDiv
    });
  },

  // ──────────────────────────────────────────────────────────
  // ACCIONES
  // ──────────────────────────────────────────────────────────
  _agregarServicio() {
    if (!this._isDraftValid()) {
      showToast('Campos obligatorios', 'Completá: Nombre, Modalidad y Disponibilidad', 'warning');
      return;
    }
    if (this._data.draft.activo === undefined) this._data.draft.activo = true;
    this._data.serviciosAcumulados.push(structuredClone(this._data.draft));
    this._data.draft = {};
    this._limpiarFormulario();
    this._refreshLista();
    showToast('✅ Servicio agregado', 'Podés crear otro o guardar cuando termines', 'success');
  },

  _isDraftValid() {
    return !!(
      this._data.draft.nombre?.trim() &&
      this._data.draft.modalidad?.length > 0 &&
      this._data.draft.disponibilidad
    );
  },

  _limpiarFormulario() {
    if (this._formRefs) {
      Object.values(this._formRefs).forEach(field => { if (field?.setValue) field.setValue(''); });
    }
    if (this._modalidadCheckboxes) this._modalidadCheckboxes.forEach(cb => cb.checked = false);
    if (this._precioRefs) {
      this._precioRefs.radioConsultar.checked = true;
      this._precioRefs.radioFijo.checked = false;
      this._precioRefs.inputPrecio.setValue('');
      this._precioRefs.inputPrecio.disable();
    }
    if (this._disponibilidadCheckboxes) this._disponibilidadCheckboxes.forEach(cb => cb.checked = false);
    if (this._imagenUrlInput) this._imagenUrlInput.value = '';
    this._data.draft.imagen = '';
  },

  _editarServicio(index) {
    const servicio = this._data.serviciosAcumulados[index];
    this._data.draft = structuredClone(servicio);
    this._cargarDraftEnFormulario();
    this._data.serviciosAcumulados.splice(index, 1);
    this._refreshLista();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    showToast('Modo edición', 'Modificá los campos y agregá el servicio nuevamente', 'info');
  },

  _cargarDraftEnFormulario() {
    const d = this._data.draft;
    if (this._formRefs.nombre)      this._formRefs.nombre.setValue(d.nombre || '');
    if (this._formRefs.descripcion) this._formRefs.descripcion.setValue(d.descripcion || '');
    if (this._formRefs.duracion)    this._formRefs.duracion.setValue(d.duracion_minutos || '');
    if (this._formRefs.variantes)   this._formRefs.variantes.setValue(d.variantes?.join('\n') || '');
    if (this._formRefs.notas)       this._formRefs.notas.setValue(d.notas || '');
    if (this._imagenUrlInput)       this._imagenUrlInput.value = d.imagen || '';

    if (this._modalidadCheckboxes) {
      const vals = Array.isArray(d.modalidad) ? d.modalidad : (d.modalidad ? [d.modalidad] : []);
      this._modalidadCheckboxes.forEach(cb => { cb.checked = vals.includes(cb.value); });
    }
    if (d.precio?.tipo === 'fijo' && this._precioRefs) {
      this._precioRefs.radioFijo.checked = true;
      this._precioRefs.radioConsultar.checked = false;
      this._precioRefs.inputPrecio.setValue(d.precio.valor);
      this._precioRefs.inputPrecio.enable();
    }
    if (this._disponibilidadCheckboxes && d.disponibilidad) {
      this._disponibilidadCheckboxes.forEach(cb => { cb.checked = cb.value === d.disponibilidad; });
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

  // FIX: reemplaza el card raíz usando la referencia guardada en render()
  // Se eliminó _renderListaContentReal() — era duplicado exacto de _renderListaContent()
  _refreshLista() {
    const newLista = createCard({
      title: 'Servicios agregados',
      variant: 'warning',
      content: this._renderListaContent()
    });
    this._listaCard.replaceWith(newLista);
    this._listaCard = newLista;
  },

  // ──────────────────────────────────────────────────────────
  // SAVE BUTTON
  // ──────────────────────────────────────────────────────────
  _renderSaveButton() {
    const dirtyController = {
      hasUnsavedChanges: () =>
        JSON.stringify(this._data.serviciosAcumulados) !== JSON.stringify(this._originalSnapshot),
      markSaved: () => {
        this._originalSnapshot = structuredClone(this._data.serviciosAcumulados);
      }
    };

    return createOnboardingButton({
      stepName: 'servicios',

      validate: () => {
        if (!dirtyController.hasUnsavedChanges()) return true;
        return this._data.serviciosAcumulados.length > 0;
      },

      dirtyController,

      getLabel: () => {
        if (!dirtyController.hasUnsavedChanges()) return 'Volver al dashboard';
        const n = this._data.serviciosAcumulados.length;
        if (n === 0) return 'Agregá al menos un servicio';
        if (n === 1) return 'Guardar y continuar (1 servicio)';
        return `Guardar y continuar (${n} servicios)`;
      },

      onSave: async ({ uid, comercioId }) => {
        if (!comercioId) throw new Error('No hay comercioId para guardar servicios');

        const batch = writeBatch(db);
        const comercioRef  = doc(db, 'entidades', comercioId);
        const serviciosRef = collection(db, 'entidades', comercioId, 'servicios');
        const existentes   = await getDocs(serviciosRef);

        existentes.docs.forEach(docSnap => { batch.delete(docSnap.ref); });

        this._data.serviciosAcumulados.forEach(servicio => {
          const { id, ...servicioData } = servicio;
          const nuevoRef = doc(collection(db, 'entidades', comercioId, 'servicios'));
          batch.set(nuevoRef, { ...servicioData, fechaActualizacion: serverTimestamp() });
        });

        batch.update(comercioRef, {
          'onboardingSteps.servicios': true,
          fechaActualizacion: serverTimestamp()
        });

        await batch.commit();
        console.log(`✅ Guardados ${this._data.serviciosAcumulados.length} servicios`);
        return true;
      },

      onSuccess: () => { showToast('💾 Servicios guardados', 'Redirigiendo...', 'success'); },
      onError:   (err) => {
        console.error('Error guardando servicios:', err);
        showToast('Error al guardar', err.message, 'error');
      }
    });
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
