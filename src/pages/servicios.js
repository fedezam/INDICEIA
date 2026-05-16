// ============================================================
// src/pages/servicios.js
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

  _comercioId:       null,
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
      const snapshot     = await getDocs(serviciosRef);
      this._data.serviciosAcumulados = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (err) {
      if (err.code === 'permission-denied') {
        this._data.serviciosAcumulados = [];
      } else {
        console.error('Error cargando servicios:', err);
        this._data.serviciosAcumulados = [];
      }
    }

    this._data.draft       = {};
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
    hint.className   = 'page-hint';
    hint.textContent = 'Definí todos los servicios que ofrecés. Podés crear varios y después guardarlos todos juntos.';
    root.appendChild(hint);

    const formCard = createCard({
      title:   'Crear nuevo servicio',
      variant: 'primary',
      content: this._renderFormContent()
    });
    root.appendChild(formCard);

    this._listaCard = createCard({
      title:   'Servicios agregados',
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

    // ── Tipo de servicio (pivote) ─────────────────────────────
    container.appendChild(this._renderTipoServicioField());

    // ── Nombre ───────────────────────────────────────────────
    this._formRefs = this._formRefs || {};

    this._formRefs.nombre = createFormField({
      id:       'svc-nombre',
      label:    '¿Cómo se llama este servicio? *',
      helpText: 'El nombre tal como lo conocen tus clientes. Ej: "Corte de pelo", "Depilación definitiva"',
      required: true,
      actions: {
        onChange: (v) => {
          const trimmed = v.trim();
          trimmed ? (this._data.draft.nombre = trimmed) : delete this._data.draft.nombre;
        }
      }
    });
    container.appendChild(this._formRefs.nombre);

    // ── Descripción ──────────────────────────────────────────
    this._formRefs.descripcion = createFormField({
      id:       'svc-descripcion',
      label:    'Descripción',
      type:     'textarea',
      rows:     3,
      helpText: 'Agregá detalles que ayuden a entender mejor el servicio',
      actions: {
        onChange: (v) => {
          const trimmed = v.trim();
          trimmed ? (this._data.draft.descripcion = trimmed) : delete this._data.draft.descripcion;
        }
      }
    });
    container.appendChild(this._formRefs.descripcion);

    // ── Precio / Items — se renderiza según tipo ──────────────
    this._precioContainer = document.createElement('div');
    this._precioContainer.className = 'precio-container';
    this._precioContainer.appendChild(this._renderPrecioSegunTipo());
    container.appendChild(this._precioContainer);

    // ── Duración ─────────────────────────────────────────────
    this._formRefs.duracion = createFormField({
      id:       'svc-duracion',
      label:    'Duración aproximada (minutos)',
      type:     'number',
      helpText: 'Opcional — si no podés estimarla, dejalo vacío',
      actions: {
        onChange: (v) => {
          const num = Number(v);
          num > 0 ? (this._data.draft.duracion_minutos = num) : delete this._data.draft.duracion_minutos;
        }
      }
    });
    container.appendChild(this._formRefs.duracion);

    // ── Disponibilidad ───────────────────────────────────────
    container.appendChild(this._renderDisponibilidadField());

    // ── Imagen ───────────────────────────────────────────────
    container.appendChild(this._renderImagenField());

    // ── Notas ────────────────────────────────────────────────
    this._formRefs.notas = createFormField({
      id:       'svc-notas',
      label:    'Notas adicionales',
      type:     'textarea',
      rows:     3,
      helpText: 'Requisitos, aclaraciones, horarios especiales, etc.',
      actions: {
        onChange: (v) => {
          const trimmed = v.trim();
          trimmed ? (this._data.draft.notas = trimmed) : delete this._data.draft.notas;
        }
      }
    });
    container.appendChild(this._formRefs.notas);

    // ── Botón agregar ────────────────────────────────────────
    container.appendChild(createButton({
      label:   'Agregar este servicio',
      variant: 'success',
      icon:    'fa-plus',
      block:   true,
      onClick: () => this._agregarServicio()
    }));

    return container;
  },

  // ──────────────────────────────────────────────────────────
  // TIPO DE SERVICIO (pivote simple / complejo)
  // ──────────────────────────────────────────────────────────
  _renderTipoServicioField() {
    const wrapper = document.createElement('div');
    wrapper.className = 's-form-field campo-compuesto';

    const label = document.createElement('label');
    label.className   = 's-label';
    label.textContent = '¿Qué tipo de servicio es? *';
    wrapper.appendChild(label);

    const opciones = [
      {
        value: 'simple',
        label: 'Servicio simple',
        help:  'Precio único para todos los clientes. Ej: Corte de pelo, Consulta, Cavitación.',
      },
      {
        value: 'complejo',
        label: 'Servicio con opciones',
        help:  'El precio varía según lo que elija el cliente — por zona, tamaño, tipo, etc. Ej: Depilación definitiva.',
      },
    ];

    this._tipoCheckboxes = [];

    opciones.forEach(opt => {
      const row = document.createElement('label');
      row.className = 'radio-tipo-servicio';
      row.innerHTML = `
        <input type="radio" name="svc-tipo" value="${opt.value}"
          ${(this._data.draft.tipo || 'simple') === opt.value ? 'checked' : ''}>
        <div>
          <strong>${opt.label}</strong>
          <span>${opt.help}</span>
        </div>
      `;
      const radio = row.querySelector('input');
      radio.addEventListener('change', () => {
        this._data.draft.tipo = opt.value;
        // Limpiar precio/items al cambiar tipo
        delete this._data.draft.precio;
        delete this._data.draft.items;
        delete this._data.draft.unidad;
        // Re-render solo el bloque de precio/items
        this._precioContainer.innerHTML = '';
        this._precioContainer.appendChild(this._renderPrecioSegunTipo());
      });
      this._tipoCheckboxes = this._tipoCheckboxes || [];
      wrapper.appendChild(row);
    });

    return wrapper;
  },

  // ──────────────────────────────────────────────────────────
  // PRECIO SEGÚN TIPO
  // ──────────────────────────────────────────────────────────
  _renderPrecioSegunTipo() {
    const tipo = this._data.draft.tipo || 'simple';
    return tipo === 'complejo'
      ? this._renderItemsField()
      : this._renderPrecioSimpleField();
  },

  // ── Precio simple ─────────────────────────────────────────
  _renderPrecioSimpleField() {
    const wrapper = document.createElement('div');
    wrapper.className = 's-form-field campo-compuesto';

    const label = document.createElement('label');
    label.className   = 's-label';
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
      id:   'svc-precio-valor',
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

    // Restaurar estado del draft si existe
    if (this._data.draft.precio?.tipo === 'fijo') {
      radioFijo.checked     = true;
      radioConsultar.checked = false;
      inputPrecio.setValue(this._data.draft.precio.valor || '');
      inputPrecio.enable();
    }

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

  // ── Items (servicio complejo) ─────────────────────────────
  _renderItemsField() {
    const wrapper = document.createElement('div');
    wrapper.className = 's-form-field campo-compuesto';

    const label = document.createElement('label');
    label.className   = 's-label';
    label.textContent = 'Opciones y precios';
    wrapper.appendChild(label);

    // Unidad
    const unidadField = createFormField({
      id:          'svc-unidad',
      label:       '¿De qué depende el precio?',
      placeholder: 'Ej: zona del cuerpo, tamaño, tipo de material',
      helpText:    'Describí en pocas palabras qué define el precio de cada opción',
      value:       this._data.draft.unidad || '',
      actions: {
        onChange: (v) => {
          const trimmed = v.trim();
          trimmed ? (this._data.draft.unidad = trimmed) : delete this._data.draft.unidad;
        }
      }
    });
    wrapper.appendChild(unidadField);

    // Lista de items
    if (!this._data.draft.items) this._data.draft.items = [];

    const itemsContainer = document.createElement('div');
    itemsContainer.className = 'items-list';

    const renderItems = () => {
      itemsContainer.innerHTML = '';

      if (!this._data.draft.items.length) {
        const empty = document.createElement('p');
        empty.className   = 'items-empty';
        empty.textContent = 'Todavía no agregaste opciones.';
        itemsContainer.appendChild(empty);
        return;
      }

      this._data.draft.items.forEach((item, i) => {
        const row = document.createElement('div');
        row.className = 'item-row';

        const nombreSpan = document.createElement('span');
        nombreSpan.className   = 'item-nombre';
        nombreSpan.textContent = item.n;

        const precioSpan = document.createElement('span');
        precioSpan.className   = 'item-precio';
        precioSpan.textContent = item.p ? `$${item.p.toLocaleString('es-AR')}` : 'A consultar';

        const removeBtn = document.createElement('button');
        removeBtn.className = 'item-remove';
        removeBtn.innerHTML = '×';
        removeBtn.addEventListener('click', () => {
          this._data.draft.items.splice(i, 1);
          renderItems();
        });

        row.append(nombreSpan, precioSpan, removeBtn);
        itemsContainer.appendChild(row);
      });
    };

    renderItems();
    wrapper.appendChild(itemsContainer);

    // Agregar item
    const addRow = document.createElement('div');
    addRow.className = 'item-add-row';

    const inputNombre = document.createElement('input');
    inputNombre.type        = 'text';
    inputNombre.className   = 'item-input item-input--nombre';
    inputNombre.placeholder = 'Ej: Axilas';

    const inputPrecio = document.createElement('input');
    inputPrecio.type        = 'number';
    inputPrecio.className   = 'item-input item-input--precio';
    inputPrecio.placeholder = 'Precio (opcional)';

    const addBtn = createButton({
      label:   'Agregar',
      variant: 'secondary',
      size:    'sm',
      icon:    'fa-plus',
      onClick: () => {
        const nombre = inputNombre.value.trim();
        if (!nombre) {
          showToast('Escribí el nombre de la opción', 'warning');
          return;
        }
        const precio = Number(inputPrecio.value);
        const newItem = { n: nombre };
        if (precio > 0) newItem.p = precio;
        this._data.draft.items.push(newItem);
        inputNombre.value  = '';
        inputPrecio.value  = '';
        renderItems();
      }
    });

    addRow.append(inputNombre, inputPrecio, addBtn);
    wrapper.appendChild(addRow);

    return wrapper;
  },

  // ──────────────────────────────────────────────────────────
  // DISPONIBILIDAD
  // ──────────────────────────────────────────────────────────
  _renderDisponibilidadField() {
    const wrapper = document.createElement('div');
    wrapper.className = 's-form-field campo-compuesto';

    const label = document.createElement('label');
    label.className   = 's-label';
    label.textContent = '¿Cuándo está disponible? *';
    wrapper.appendChild(label);

    const help = document.createElement('small');
    help.className   = 's-help';
    help.textContent = 'Seleccioná solo una opción';
    wrapper.appendChild(help);

    const opciones = [
      { value: 'inmediata',   label: 'Inmediata',   help: 'Sin turno, por orden de llegada' },
      { value: 'a_coordinar', label: 'A coordinar', help: 'Requiere turno o agenda previa'  },
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
  // IMAGEN
  // ──────────────────────────────────────────────────────────
  _renderImagenField() {
    const wrapper = document.createElement('div');
    wrapper.className = 's-form-field campo-compuesto';

    const label = document.createElement('label');
    label.className   = 's-label';
    label.textContent = 'Foto del servicio (opcional)';
    wrapper.appendChild(label);

    const help = document.createElement('small');
    help.className   = 's-help';
    help.textContent = 'Subí una foto de un trabajo realizado o pegá un link de Instagram, Google Fotos, etc.';
    wrapper.appendChild(help);

    const preview = document.createElement('div');
    preview.className = 'imagen-preview' + (this._data.draft.imagen ? ' imagen-preview--visible' : '');
    if (this._data.draft.imagen) {
      preview.innerHTML = `<img src="${this._data.draft.imagen}" alt="preview" style="max-width:100%;border-radius:8px;margin-bottom:8px;"/>
        <button class="imagen-preview-remove"><i class="fas fa-times"></i> Quitar foto</button>`;
      preview.querySelector('.imagen-preview-remove').addEventListener('click', () => {
        this._data.draft.imagen = '';
        this.render();
      });
    }
    wrapper.appendChild(preview);

    const fileInput = document.createElement('input');
    fileInput.type    = 'file';
    fileInput.accept  = 'image/*';
    fileInput.style.display = 'none';
    wrapper.appendChild(fileInput);

    const btnSubir = document.createElement('button');
    btnSubir.type      = 'button';
    btnSubir.className = 'imagen-upload-btn';
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
        showToast('Foto cargada correctamente', 'success');
        this.render();
      } catch (err) {
        console.error(err);
        showToast('No se pudo subir la imagen', 'error');
        btnSubir.disabled  = false;
        btnSubir.innerHTML = `<i class="fas fa-camera"></i> Subir foto desde mi dispositivo`;
      }
    });

    const sep = document.createElement('div');
    sep.className   = 'imagen-sep';
    sep.textContent = 'o pegá un link directo';
    wrapper.appendChild(sep);

    const urlInput = document.createElement('input');
    urlInput.type        = 'url';
    urlInput.className   = 'imagen-url-input';
    urlInput.placeholder = 'https://...';
    urlInput.value       = this._data.draft.imagen || '';
    urlInput.addEventListener('input', () => {
      this._data.draft.imagen = urlInput.value.trim();
    });
    wrapper.appendChild(urlInput);

    this._imagenUrlInput = urlInput;
    return wrapper;
  },

  // ──────────────────────────────────────────────────────────
  // LISTA
  // ──────────────────────────────────────────────────────────
  _renderListaContent() {
    const container = document.createElement('div');
    container.id = 'lista-servicios-container';

    if (!this._data.serviciosAcumulados.length) {
      const empty = document.createElement('p');
      empty.className   = 'lista-vacia';
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
    const activo   = servicio.activo !== false;
    const esSimple = servicio.tipo !== 'complejo';

    const contentDiv = document.createElement('div');

    if (servicio.imagen) {
      const img     = document.createElement('img');
      img.src       = servicio.imagen;
      img.alt       = servicio.nombre;
      img.className = 'servicio-imagen';
      contentDiv.appendChild(img);
    }

    // Tags
    const tags = document.createElement('div');
    tags.className = 'servicio-tags';

    // Tipo
    const tagTipo = document.createElement('span');
    tagTipo.className   = `servicio-tag servicio-tag--${esSimple ? 'simple' : 'complejo'}`;
    tagTipo.textContent = esSimple ? 'Simple' : 'Con opciones';
    tags.appendChild(tagTipo);

    // Disponibilidad
    if (servicio.disponibilidad) {
      const tagDisp = document.createElement('span');
      tagDisp.className   = 'servicio-tag servicio-tag--disp';
      tagDisp.textContent = servicio.disponibilidad === 'inmediata' ? 'Sin turno' : 'Con turno';
      tags.appendChild(tagDisp);
    }

    // Precio (solo simple)
    if (esSimple) {
      const tagPrecio = document.createElement('span');
      tagPrecio.className   = 'servicio-tag servicio-tag--precio';
      tagPrecio.textContent = servicio.precio?.valor
        ? `$${servicio.precio.valor.toLocaleString('es-AR')}`
        : 'A consultar';
      tags.appendChild(tagPrecio);
    }

    // Duración
    if (servicio.duracion_minutos) {
      const tagDur = document.createElement('span');
      tagDur.className   = 'servicio-tag servicio-tag--dur';
      tagDur.textContent = `${servicio.duracion_minutos} min`;
      tags.appendChild(tagDur);
    }

    contentDiv.appendChild(tags);

    // Descripción
    if (servicio.descripcion) {
      const desc = document.createElement('p');
      desc.className   = 'servicio-descripcion';
      desc.textContent = servicio.descripcion;
      contentDiv.appendChild(desc);
    }

    // Items (complejo)
    if (!esSimple && servicio.items?.length) {
      const itemsDiv = document.createElement('div');
      itemsDiv.className = 'servicio-items';

      if (servicio.unidad) {
        const unidadP = document.createElement('p');
        unidadP.className   = 'servicio-unidad';
        unidadP.textContent = `Varía según: ${servicio.unidad}`;
        itemsDiv.appendChild(unidadP);
      }

      const ul = document.createElement('ul');
      servicio.items.forEach(item => {
        const li = document.createElement('li');
        li.textContent = item.p
          ? `${item.n} — $${item.p.toLocaleString('es-AR')}`
          : `${item.n} — A consultar`;
        ul.appendChild(li);
      });
      itemsDiv.appendChild(ul);
      contentDiv.appendChild(itemsDiv);
    }

    // Notas
    if (servicio.notas) {
      const notas = document.createElement('p');
      notas.className   = 'servicio-notas';
      notas.textContent = servicio.notas;
      contentDiv.appendChild(notas);
    }

    // Acciones
    const actionsWrapper = document.createElement('div');
    actionsWrapper.className = 'servicio-acciones';
    actionsWrapper.append(
      createButton({ label: 'Editar',   variant: 'primary', size: 'sm', icon: 'fa-pencil', onClick: () => this._editarServicio(index) }),
      createButton({ label: activo ? 'Pausar' : 'Activar', variant: activo ? 'warning' : 'success', size: 'sm', icon: activo ? 'fa-pause' : 'fa-play', onClick: () => this._toggleServicio(index) }),
      createButton({ label: 'Eliminar', variant: 'danger',  size: 'sm', icon: 'fa-trash',  onClick: () => this._eliminarServicio(index) })
    );
    contentDiv.appendChild(actionsWrapper);

    return createCard({
      title:   `${servicio.nombre} ${activo ? '' : '(Pausado)'}`,
      variant: activo ? 'success' : 'secondary',
      compact: true,
      content: contentDiv
    });
  },

  // ──────────────────────────────────────────────────────────
  // VALIDACIÓN DRAFT
  // ──────────────────────────────────────────────────────────
  _isDraftValid() {
    const d        = this._data.draft;
    const tieneNombre = !!d.nombre?.trim();
    const tieneDisp   = !!d.disponibilidad;

    if (d.tipo === 'complejo') {
      return tieneNombre && tieneDisp && d.items?.length > 0;
    }

    return tieneNombre && tieneDisp;
  },

  // ──────────────────────────────────────────────────────────
  // ACCIONES
  // ──────────────────────────────────────────────────────────
  _agregarServicio() {
    if (!this._isDraftValid()) {
      const msg = this._data.draft.tipo === 'complejo'
        ? 'Completá: Nombre, al menos una opción y Disponibilidad'
        : 'Completá: Nombre y Disponibilidad';
      showToast('Campos obligatorios', msg, 'warning');
      return;
    }
    if (this._data.draft.activo === undefined) this._data.draft.activo = true;
    this._data.serviciosAcumulados.push(structuredClone(this._data.draft));
    this._data.draft = {};
    this._limpiarFormulario();
    this._refreshLista();
    showToast('✅ Servicio agregado', 'Podés crear otro o guardar cuando termines', 'success');
  },

  _limpiarFormulario() {
    if (this._formRefs) {
      Object.values(this._formRefs).forEach(field => { if (field?.setValue) field.setValue(''); });
    }
    if (this._precioRefs) {
      this._precioRefs.radioConsultar.checked = true;
      this._precioRefs.radioFijo.checked      = false;
      this._precioRefs.inputPrecio.setValue('');
      this._precioRefs.inputPrecio.disable();
    }
    if (this._disponibilidadCheckboxes) {
      this._disponibilidadCheckboxes.forEach(cb => cb.checked = false);
    }
    if (this._imagenUrlInput) this._imagenUrlInput.value = '';
    this._data.draft.imagen = '';
    // Reset tipo a simple
    this._data.draft.tipo = 'simple';
    // Re-render form para resetear precio container
    const formCard = document.querySelector('.s-card--primary');
    if (formCard) {
      const content = formCard.querySelector('.form-content');
      if (content) content.replaceWith(this._renderFormContent());
    }
  },

  _editarServicio(index) {
    const servicio = this._data.serviciosAcumulados[index];
    this._data.draft = structuredClone(servicio);
    this._data.serviciosAcumulados.splice(index, 1);
    this._refreshLista();
    // Re-render form completo para cargar draft
    const formCard = document.querySelector('.s-card--primary');
    if (formCard) {
      const content = formCard.querySelector('.form-content');
      if (content) content.replaceWith(this._renderFormContent());
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
    showToast('Modo edición', 'Modificá los campos y agregá el servicio nuevamente', 'info');
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
    const newLista = createCard({
      title:   'Servicios agregados',
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

        const batch        = writeBatch(db);
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
