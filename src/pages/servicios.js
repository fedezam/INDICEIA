// ============================================================
// src/pages/servicios.js
// ============================================================

import { runSkeleton }             from '/src/skeleton/skeleton.js';
import { createFirebaseAdapter }   from '/src/skeleton/adapters/firebaseAdapter.js';
import { createFormField }         from '/src/skeleton/components/form-field/index.js';
import { createButton }            from '/src/skeleton/components/button/index.js';
import { createCard }              from '/src/skeleton/components/card/index.js';
import { createCheckboxGroup }     from '/src/skeleton/components/checkbox-group/index.js';
import { createBadge }             from '/src/skeleton/components/badge/index.js';
import { createOnboardingButton }  from '/src/skeleton/components/onboarding-button/index.js';
import { showToast }               from '/src/skeleton/components/toast/index.js';

import { db }                      from '/src/services/firebase/firebase.js';
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import {
  writeBatch,
  doc,
  collection,
  getDocs,
  serverTimestamp
} from 'firebase/firestore';

import './servicios.css';

const storage = getStorage();
const XLSX = window.XLSX;
const TEMPLATE_FIRMA = 'indiceia_servicios_v1';

// ============================================================
// MODELO DRAFT
// {
//   tipo: 'simple' | 'complejo'
//   nombre: string
//   descripcion: string
//   disponibilidad: 'inmediata' | 'a_coordinar' | null
//   semantic_notes: string[]
//   imagen: string
//
//   // solo tipo simple:
//   precio: { tipo: 'fijo'|'consultar', valor?: number } | null
//   duracion: number | null
//
//   // solo tipo complejo:
//   items: [{ nombre, precio, duracion }]
// }
// ============================================================

const _draftVacio = () => ({
  tipo:           'simple',
  nombre:         '',
  descripcion:    '',
  disponibilidad: null,
  semantic_notes: [],
  imagen:         '',
  precio:         null,
  duracion:       null,
  items:          [],
});

const page = {
  _data: {
    serviciosAcumulados: [],
    draft: _draftVacio(),
  },
  _comercioId:       null,
  _originalSnapshot: [],
  _formCard:         null,
  _listaCard:        null,

  async _subirImagenServicio(file) {
    if (!this._comercioId) throw new Error('Sin comercioId');
    const filename = `${Date.now()}-${file.name.replace(/\s+/g, '_')}`;
    const ref = storageRef(storage, `entidades/${this._comercioId}/servicios/${filename}`);
    await uploadBytes(ref, file);
    return getDownloadURL(ref);
  },

  async load(ctx) {
    this._comercioId = ctx.comercioId;
    if (!this._comercioId) {
      this._data.serviciosAcumulados = [];
      this._data.draft = _draftVacio();
      return;
    }
    try {
      const serviciosRef = collection(db, 'entidades', this._comercioId, 'servicios');
      const snapshot     = await getDocs(serviciosRef);
      this._data.serviciosAcumulados = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (err) {
      console.error('Error cargando servicios:', err);
      this._data.serviciosAcumulados = [];
    }
    this._data.draft       = _draftVacio();
    this._originalSnapshot = structuredClone(this._data.serviciosAcumulados);
  },

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

    this._formCard = createCard({
      title:   'Crear nuevo servicio',
      variant: 'primary',
      content: this._renderFormContent()
    });
    root.appendChild(this._formCard);

    this._listaCard = createCard({
      title:   'Servicios agregados',
      variant: 'warning',
      content: this._renderListaContent()
    });
    root.appendChild(this._listaCard);

    root.appendChild(this._renderImportCard());
    root.appendChild(this._renderSaveButton());
  },

  // ──────────────────────────────────────────────────────────
  // FORM PRINCIPAL
  // ──────────────────────────────────────────────────────────
  _renderFormContent() {
    const container = document.createElement('div');
    container.className = 'form-content';

    // 1. Tipo de servicio
    container.appendChild(this._renderTipoServicioField());

    // 2. Nombre + descripción + disponibilidad (siempre visibles)
    container.appendChild(this._renderNombreField());
    container.appendChild(this._renderDescripcionField());
    container.appendChild(this._renderDisponibilidadField());

    // 3. Sección variable según tipo
    const variableContainer = document.createElement('div');
    variableContainer.className = 'variable-container';
    variableContainer.appendChild(
      this._data.draft.tipo === 'complejo'
        ? this._renderItemsSection()
        : this._renderSimpleFields()
    );
    container.appendChild(variableContainer);

    // 4. Opcionales comunes
    container.appendChild(this._renderUrgenciasField());
    container.appendChild(this._renderImagenField());
    container.appendChild(this._renderSemanticNotesField());

    // 5. Botón agregar
    container.appendChild(createButton({
      label:   'Agregar este servicio',
      variant: 'success',
      icon:    'fa-plus',
      block:   true,
      onClick: () => this._agregarServicio()
    }));

    return container;
  },

  _renderTipoServicioField() {
    return createCheckboxGroup({
      label:       '¿Qué tipo de servicio es? *',
      name:        'svc-tipo',
      required:    true,
      mode:        'single',
      orientation: 'horizontal',
      options: [
        { value: 'simple',   label: '⚡ Servicio simple',   description: 'Un precio, una duración.' },
        { value: 'complejo', label: '🔀 Con variantes',     description: 'Depilación, tintura... tiene opciones.' }
      ],
      value: this._data.draft.tipo || 'simple',
      actions: {
        onChange: (value) => {
          this._data.draft.tipo    = value;
          this._data.draft.precio  = null;
          this._data.draft.duracion = null;
          this._data.draft.items   = [];
          const vc = this._formCard?.querySelector('.variable-container');
          if (vc) vc.replaceWith((() => {
            const d = document.createElement('div');
            d.className = 'variable-container';
            d.appendChild(value === 'complejo' ? this._renderItemsSection() : this._renderSimpleFields());
            return d;
          })());
          document.dispatchEvent(new Event('change'));
        }
      }
    });
  },

  _renderNombreField() {
    return createFormField({
      label:    '¿Cómo se llama este servicio? *',
      required: true,
      helpText: 'Ej: "Corte de pelo", "Depilación definitiva", "Tintura"',
      value:    this._data.draft.nombre,
      actions:  { onChange: (v) => { this._data.draft.nombre = v.trim(); } }
    });
  },

  _renderDescripcionField() {
    return createFormField({
      label:    'Descripción',
      type:     'textarea',
      rows:     2,
      helpText: 'Breve descripción del servicio',
      value:    this._data.draft.descripcion,
      actions:  { onChange: (v) => { this._data.draft.descripcion = v.trim(); } }
    });
  },

  _renderDisponibilidadField() {
    return createCheckboxGroup({
      label:    '¿Cuándo está disponible? *',
      name:     'disponibilidad',
      required: true,
      mode:     'single',
      options: [
        { value: 'inmediata',   label: 'Inmediata',   description: 'Sin turno, por orden de llegada' },
        { value: 'a_coordinar', label: 'A coordinar', description: 'Requiere turno o agenda previa'  }
      ],
      value: this._data.draft.disponibilidad || null,
      actions: {
        onChange: (value) => {
          this._data.draft.disponibilidad = value || null;
          document.dispatchEvent(new Event('change'));
        }
      }
    });
  },

  // ──────────────────────────────────────────────────────────
  // SERVICIO SIMPLE — precio + duración directos
  // ──────────────────────────────────────────────────────────
  _renderSimpleFields() {
    const wrapper = document.createElement('div');
    wrapper.className = 'simple-fields';

    wrapper.appendChild(this._renderPrecioSimpleField());
    wrapper.appendChild(this._renderDuracionField());

    return wrapper;
  },

  _renderPrecioSimpleField() {
    const wrapper = document.createElement('div');
    wrapper.className = 's-form-field campo-compuesto';

    const label = document.createElement('label');
    label.className   = 's-label';
    label.textContent = 'Precio';
    wrapper.appendChild(label);

    const precioGroup = createCheckboxGroup({
      name:        'svc-precio',
      mode:        'single',
      orientation: 'horizontal',
      options: [
        { value: 'consultar', label: 'A consultar' },
        { value: 'fijo',      label: 'Precio fijo'  }
      ],
      value: this._data.draft.precio?.tipo || 'consultar',
      actions: {
        onChange: (val) => {
          if (val === 'fijo') {
            this._data.draft.precio = { tipo: 'fijo', valor: Number(this._precioInput?.getValue() || 0) };
            this._precioInput?.enable();
          } else {
            this._data.draft.precio = null;
            this._precioInput?.disable();
            this._precioInput?.setValue('');
          }
          document.dispatchEvent(new Event('change'));
        }
      }
    });

    this._precioInput = createFormField({
      type:        'number',
      placeholder: 'Ej: 5000',
      disabled:    this._data.draft.precio?.tipo !== 'fijo',
      value:       this._data.draft.precio?.valor || '',
      actions: {
        onChange: (v) => {
          if (this._data.draft.precio?.tipo === 'fijo') {
            this._data.draft.precio.valor = Number(v);
          }
        }
      }
    });

    wrapper.appendChild(precioGroup);
    wrapper.appendChild(this._precioInput);
    return wrapper;
  },

  _renderDuracionField() {
    return createFormField({
      label:    'Duración aproximada (minutos)',
      type:     'number',
      helpText: 'Opcional',
      value:    this._data.draft.duracion || '',
      actions:  { onChange: (v) => { const n = Number(v); this._data.draft.duracion = n > 0 ? n : null; } }
    });
  },

  // ──────────────────────────────────────────────────────────
  // SERVICIO COMPLEJO — items con herencia
  // ──────────────────────────────────────────────────────────
  _renderItemsSection() {
    const wrapper = document.createElement('div');
    wrapper.className = 'items-section';

    const sectionTitle = document.createElement('p');
    sectionTitle.className = 'items-section-title';
    sectionTitle.textContent = 'Variantes del servicio';
    wrapper.appendChild(sectionTitle);

    const help = document.createElement('small');
    help.className   = 's-help';
    help.textContent = 'Cada variante puede tener su propio precio y duración. Lo que no completes se muestra como "a consultar".';
    wrapper.appendChild(help);

    // Lista de items ya cargados
    const itemsContainer = document.createElement('div');
    itemsContainer.className = 'items-list';

    const renderItems = () => {
      itemsContainer.innerHTML = '';
      if (!this._data.draft.items.length) {
        const empty = document.createElement('p');
        empty.className   = 'items-empty';
        empty.textContent = 'Todavía no agregaste variantes.';
        itemsContainer.appendChild(empty);
        return;
      }
      this._data.draft.items.forEach((item, i) => {
        const row = document.createElement('div');
        row.className = 'item-row';

        const info = document.createElement('div');
        info.className = 'item-info';

        const nombre = document.createElement('span');
        nombre.className   = 'item-nombre';
        nombre.textContent = item.nombre;
        info.appendChild(nombre);

        const meta = document.createElement('span');
        meta.className = 'item-meta';
        const partes = [];
        if (item.precio)   partes.push(`$${item.precio.toLocaleString('es-AR')}`);
        else               partes.push('A consultar');
        if (item.duracion) partes.push(`${item.duracion} min`);
        meta.textContent = partes.join(' · ');
        info.appendChild(meta);

        row.appendChild(info);

        const removeBtn = document.createElement('button');
        removeBtn.type      = 'button';
        removeBtn.className = 'item-remove';
        removeBtn.innerHTML = '×';
        removeBtn.addEventListener('click', () => {
          this._data.draft.items.splice(i, 1);
          renderItems();
        });
        row.appendChild(removeBtn);
        itemsContainer.appendChild(row);
      });
    };

    renderItems();
    wrapper.appendChild(itemsContainer);

    // Mini-form para agregar item
    const addForm = document.createElement('div');
    addForm.className = 'item-add-form';

    const inputNombre = document.createElement('input');
    inputNombre.type        = 'text';
    inputNombre.className   = 'item-input item-input--nombre';
    inputNombre.placeholder = 'Nombre de la variante *  (ej: Axilas)';

    const inputPrecio = document.createElement('input');
    inputPrecio.type        = 'number';
    inputPrecio.className   = 'item-input item-input--precio';
    inputPrecio.placeholder = 'Precio (opcional)';

    const inputDuracion = document.createElement('input');
    inputDuracion.type        = 'number';
    inputDuracion.className   = 'item-input item-input--duracion';
    inputDuracion.placeholder = 'Duración en min (opcional)';

    const addBtn = createButton({
      label:   'Agregar variante',
      variant: 'secondary',
      size:    'sm',
      icon:    'fa-plus',
      onClick: () => {
        const nombre   = inputNombre.value.trim();
        const precio   = Number(inputPrecio.value) || null;
        const duracion = Number(inputDuracion.value) || null;

        if (!nombre) {
          showToast('Falta el nombre de la variante', 'warning');
          return;
        }

        this._data.draft.items.push({ nombre, precio, duracion });
        inputNombre.value   = '';
        inputPrecio.value   = '';
        inputDuracion.value = '';
        inputNombre.focus();
        renderItems();
      }
    });

    // Agregar con Enter en el campo nombre
    inputNombre.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); addBtn.click(); }
    });

    addForm.appendChild(inputNombre);
    addForm.appendChild(inputPrecio);
    addForm.appendChild(inputDuracion);
    addForm.appendChild(addBtn);
    wrapper.appendChild(addForm);

    return wrapper;
  },

  // ──────────────────────────────────────────────────────────
  // URGENCIAS
  // ──────────────────────────────────────────────────────────
  _renderUrgenciasField() {
    return createCheckboxGroup({
      label: 'Urgencias', name: 'atiende_urgencias',
      value: this._data.draft.atiende_urgencias ? ['si'] : [],
      options: [{
        value: 'si', label: 'Atiendo emergencias fuera de horario',
        description: 'Si marcás esta opción, tu asistente les avisará a los clientes que pueden contactarte ante una urgencia...'
      }],
      actions: { onChange: (values) => { this._data.draft.atiende_urgencias = values.includes('si'); } }
    });
  },

  // ──────────────────────────────────────────────────────────
  // IMAGEN
  // ──────────────────────────────────────────────────────────
  _renderImagenField() {
    const wrapper = document.createElement('div');
    wrapper.className = 's-form-field campo-compuesto';

    const labelEl = document.createElement('label');
    labelEl.className   = 's-label';
    labelEl.textContent = 'Foto del servicio (opcional)';
    wrapper.appendChild(labelEl);

    const help = document.createElement('small');
    help.className   = 's-help';
    help.textContent = 'Subí una foto de un trabajo realizado o pegá un link.';
    wrapper.appendChild(help);

    const preview = document.createElement('div');
    preview.className = 'imagen-preview' + (this._data.draft.imagen ? ' imagen-preview--visible' : '');
    if (this._data.draft.imagen) {
      preview.innerHTML = `<img src="${this._data.draft.imagen}" alt="preview" style="max-width:100%;border-radius:var(--s-radius);margin-bottom:8px;"/>
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
    btnSubir.innerHTML = '<i class="fas fa-camera"></i> Subir foto desde mi dispositivo';
    btnSubir.addEventListener('click', () => fileInput.click());
    wrapper.appendChild(btnSubir);

    fileInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      btnSubir.disabled  = true;
      btnSubir.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Subiendo...';
      try {
        this._data.draft.imagen = await this._subirImagenServicio(file);
        showToast('Foto cargada correctamente', 'success');
        this.render();
      } catch (err) {
        console.error(err);
        showToast('No se pudo subir la imagen', 'error');
        btnSubir.disabled  = false;
        btnSubir.innerHTML = '<i class="fas fa-camera"></i> Subir foto desde mi dispositivo';
      }
    });

    const sep = document.createElement('div');
    sep.className   = 'imagen-sep';
    sep.textContent = 'o pegá un link directo';
    wrapper.appendChild(sep);

    this._imagenUrlInput             = document.createElement('input');
    this._imagenUrlInput.type        = 'url';
    this._imagenUrlInput.className   = 'imagen-url-input';
    this._imagenUrlInput.placeholder = 'https://...';
    this._imagenUrlInput.value       = this._data.draft.imagen || '';
    this._imagenUrlInput.addEventListener('input', () => { this._data.draft.imagen = this._imagenUrlInput.value.trim(); });
    wrapper.appendChild(this._imagenUrlInput);

    return wrapper;
  },

  // ──────────────────────────────────────────────────────────
  // SEMANTIC NOTES
  // ──────────────────────────────────────────────────────────
  _renderSemanticNotesField() {
    const wrapper = document.createElement('div');
    wrapper.className = 's-form-field campo-compuesto';

    const label = document.createElement('label');
    label.className   = 's-label';
    label.textContent = 'Aclaraciones para la IA (opcionales)';
    wrapper.appendChild(label);

    const help = document.createElement('small');
    help.className   = 's-help';
    help.textContent = 'Detalles que ayuden a responder mejor preguntas sobre este servicio.';
    wrapper.appendChild(help);

    const list = document.createElement('ul');
    list.className = 'semantic-notes-list';

    const renderList = () => {
      list.innerHTML = '';
      const notes = this._data.draft.semantic_notes || [];
      notes.forEach((note, i) => {
        const li = document.createElement('li');
        li.className = 'semantic-note-item';
        const text = document.createElement('span');
        text.textContent = note;
        li.appendChild(text);
        const removeBtn = document.createElement('button');
        removeBtn.type      = 'button';
        removeBtn.className = 'semantic-note-remove';
        removeBtn.innerHTML = '×';
        removeBtn.addEventListener('click', () => {
          this._data.draft.semantic_notes.splice(i, 1);
          if (!this._data.draft.semantic_notes.length) delete this._data.draft.semantic_notes;
          renderList();
        });
        li.appendChild(removeBtn);
        list.appendChild(li);
      });
    };

    renderList();
    wrapper.appendChild(list);

    const addRow = document.createElement('div');
    addRow.className = 'semantic-note-add-row';

    const input = document.createElement('input');
    input.type        = 'text';
    input.className   = 'semantic-note-input';
    input.placeholder = 'Ej: Evitar exposición solar 72hs después del tratamiento';

    const addBtn = createButton({
      label: 'Agregar', variant: 'secondary', size: 'sm', icon: 'fa-plus',
      onClick: () => {
        const val = input.value.trim();
        if (!val) return;
        if (!this._data.draft.semantic_notes) this._data.draft.semantic_notes = [];
        this._data.draft.semantic_notes.push(val);
        input.value = '';
        input.focus();
        renderList();
      }
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); addBtn.click(); }
    });

    addRow.appendChild(input);
    addRow.appendChild(addBtn);
    wrapper.appendChild(addRow);

    return wrapper;
  },

  // ──────────────────────────────────────────────────────────
  // VALIDACIÓN Y AGREGAR
  // ──────────────────────────────────────────────────────────
  _isDraftValid() {
    const d = this._data.draft;
    if (!d.nombre?.trim())    return false;
    if (!d.disponibilidad)    return false;
    if (d.tipo === 'complejo') return d.items.length > 0;
    return true;
  },

  _agregarServicio() {
    if (!this._isDraftValid()) {
      const msg = this._data.draft.tipo === 'complejo'
        ? 'Completá: Nombre, Disponibilidad y al menos una variante'
        : 'Completá: Nombre y Disponibilidad';
      showToast(msg, 'warning');
      return;
    }

    const servicio = structuredClone(this._data.draft);
    servicio.activo = true;

    // Para servicio simple, normalizamos precio
    if (servicio.tipo === 'simple' && !servicio.precio) {
      servicio.precio = { tipo: 'consultar' };
    }

    this._data.serviciosAcumulados.push(servicio);
    this._data.draft = _draftVacio();
    this._limpiarFormulario();
    this._refreshLista();
    showToast('✅ Servicio agregado. Podés crear otro o guardar cuando termines.', 'success');
  },

  // ──────────────────────────────────────────────────────────
  // LISTA DE SERVICIOS
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
    const activo    = servicio.activo !== false;
    const esComplejo = servicio.tipo === 'complejo';

    const contentDiv = document.createElement('div');

    if (servicio.imagen) {
      const img     = document.createElement('img');
      img.src       = servicio.imagen;
      img.alt       = servicio.nombre;
      img.className = 'servicio-imagen';
      contentDiv.appendChild(img);
    }

    const tags = document.createElement('div');
    tags.className = 'servicio-tags';

    tags.appendChild(createBadge({
      text:    esComplejo ? 'Con variantes' : 'Simple',
      variant: esComplejo ? 'warning' : 'info',
      size:    'small'
    }));

    if (servicio.disponibilidad) {
      tags.appendChild(createBadge({
        text:    servicio.disponibilidad === 'inmediata' ? 'Sin turno' : 'Con turno',
        variant: servicio.disponibilidad === 'inmediata' ? 'success' : 'info',
        size:    'small'
      }));
    }

    if (!esComplejo) {
      tags.appendChild(createBadge({
        text:    servicio.precio?.valor ? `$${servicio.precio.valor.toLocaleString('es-AR')}` : 'A consultar',
        variant: servicio.precio?.valor ? 'success' : 'secondary',
        size:    'small'
      }));
      if (servicio.duracion) {
        tags.appendChild(createBadge({ text: `⏱️ ${servicio.duracion} min`, variant: 'secondary', size: 'small' }));
      }
    }

    contentDiv.appendChild(tags);

    if (servicio.descripcion) {
      const desc = document.createElement('p');
      desc.className   = 'servicio-descripcion';
      desc.textContent = servicio.descripcion;
      contentDiv.appendChild(desc);
    }

    // Items del servicio complejo
    if (esComplejo && servicio.items?.length) {
      const itemsDiv = document.createElement('div');
      itemsDiv.className = 'servicio-items-lista';

      const ul = document.createElement('ul');
      servicio.items.forEach(item => {
        const li = document.createElement('li');
        const partes = [item.nombre];
        if (item.precio)   partes.push(`$${item.precio.toLocaleString('es-AR')}`);
        else               partes.push('A consultar');
        if (item.duracion) partes.push(`${item.duracion} min`);
        li.textContent = partes.join(' · ');
        ul.appendChild(li);
      });
      itemsDiv.appendChild(ul);
      contentDiv.appendChild(itemsDiv);
    }

    if (servicio.semantic_notes?.length) {
      const notesDiv = document.createElement('div');
      notesDiv.className = 'servicio-semantic-notes';
      const title = document.createElement('small');
      title.className   = 'servicio-semantic-notes-title';
      title.textContent = '🧠 Aclaraciones para la IA:';
      notesDiv.appendChild(title);
      const ul = document.createElement('ul');
      ul.className = 'servicio-semantic-notes-list';
      servicio.semantic_notes.forEach(note => {
        const li = document.createElement('li');
        li.textContent = note;
        ul.appendChild(li);
      });
      notesDiv.appendChild(ul);
      contentDiv.appendChild(notesDiv);
    }

    const actionsWrapper = document.createElement('div');
    actionsWrapper.className = 'servicio-acciones';
    actionsWrapper.append(
      createButton({ label: 'Editar',   variant: 'primary', size: 'sm', icon: 'fa-pencil', onClick: () => this._editarServicio(index) }),
      createButton({ label: activo ? 'Pausar' : 'Activar', variant: activo ? 'warning' : 'success', size: 'sm', icon: activo ? 'fa-pause' : 'fa-play', onClick: () => this._toggleServicio(index) }),
      createButton({ label: 'Eliminar', variant: 'danger',  size: 'sm', icon: 'fa-trash',  onClick: () => this._eliminarServicio(index) })
    );
    contentDiv.appendChild(actionsWrapper);

    return createCard({
      title:   `${servicio.nombre}${activo ? '' : ' (Pausado)'}`,
      variant: activo ? 'success' : 'secondary',
      compact: true,
      content: contentDiv
    });
  },

  _limpiarFormulario() {
    const formContent = this._formCard?.querySelector('.form-content');
    if (formContent) formContent.replaceWith(this._renderFormContent());
  },

  _editarServicio(index) {
    this._data.draft = structuredClone(this._data.serviciosAcumulados[index]);
    this._data.serviciosAcumulados.splice(index, 1);
    this._refreshLista();
    const formContent = this._formCard?.querySelector('.form-content');
    if (formContent) formContent.replaceWith(this._renderFormContent());
    window.scrollTo({ top: 0, behavior: 'smooth' });
    showToast('Modo edición — modificá y volvé a agregar el servicio', 'info');
  },

  _toggleServicio(index) {
    this._data.serviciosAcumulados[index].activo = !this._data.serviciosAcumulados[index].activo;
    this._refreshLista();
  },

  _eliminarServicio(index) {
    this._data.serviciosAcumulados.splice(index, 1);
    this._refreshLista();
    showToast('Servicio eliminado de la lista', 'info');
  },

  _refreshLista() {
    const newLista = createCard({ title: 'Servicios agregados', variant: 'warning', content: this._renderListaContent() });
    this._listaCard.replaceWith(newLista);
    this._listaCard = newLista;
  },

  // ──────────────────────────────────────────────────────────
  // IMPORT CARD
  // ──────────────────────────────────────────────────────────
  _renderImportCard() {
    const container = document.createElement('div');

    const instrucciones = document.createElement('div');
    instrucciones.className = 'import-instrucciones';
    instrucciones.innerHTML = `
      <p>Para cargar varios servicios a la vez:</p>
      <ol>
        <li>Descargá la plantilla según el tipo de servicio</li>
        <li>Completá tus servicios en el archivo</li>
        <li>Subí el archivo completado</li>
      </ol>
      <p class="import-hint"><i class="fas fa-info-circle"></i> Podés agregar columnas extra a la derecha — se guardan como atributos semánticos y el asistente las usa para responder preguntas.</p>
    `;
    container.appendChild(instrucciones);

    // ── Botones de descarga ────────────────────────────────
    const btnsContainer = document.createElement('div');
    btnsContainer.className = 'import-btns';

    const tieneSimples   = this._data.serviciosAcumulados.some(s => s.tipo !== 'complejo');
    const tieneComplejos = this._data.serviciosAcumulados.some(s => s.tipo === 'complejo');

    btnsContainer.appendChild(createButton({
      label:   tieneSimples   ? 'Exportar mis servicios simples'   : 'Descargar plantilla — Servicios simples',
      variant: 'secondary',
      icon:    'fa-download',
      onClick: () => tieneSimples ? this._exportarSimples() : this._descargarPlantillaSimples()
    }));

    btnsContainer.appendChild(createButton({
      label:   tieneComplejos ? 'Exportar mis servicios complejos' : 'Descargar plantilla — Servicios complejos',
      variant: 'secondary',
      icon:    'fa-download',
      onClick: () => tieneComplejos ? this._exportarComplejos() : this._descargarPlantillaComplejos()
    }));

    container.appendChild(btnsContainer);

    // ── Upload zone ────────────────────────────────────────
    const sep = document.createElement('div');
    sep.className = 'import-separator';
    sep.innerHTML = '<span>Una vez completada, subí la plantilla acá</span>';
    container.appendChild(sep);

    const uploadZone = document.createElement('div');
    uploadZone.className = 'upload-zone';
    uploadZone.innerHTML = `
      <div class="upload-icon"><i class="fas fa-cloud-upload-alt"></i></div>
      <p class="upload-text"><strong>Arrastrá tu plantilla aquí</strong></p>
      <p class="upload-subtext">o hacé clic para seleccionar</p>
      <div class="upload-formats"><span class="format-badge">.xlsx</span></div>
    `;

    const fileInput = document.createElement('input');
    fileInput.type    = 'file';
    fileInput.accept  = '.xlsx';
    fileInput.style.display = 'none';

    uploadZone.addEventListener('click',     () => fileInput.click());
    uploadZone.addEventListener('dragover',  e  => { e.preventDefault(); uploadZone.classList.add('dragover'); });
    uploadZone.addEventListener('dragleave', ()  => uploadZone.classList.remove('dragover'));
    uploadZone.addEventListener('drop', e => {
      e.preventDefault();
      uploadZone.classList.remove('dragover');
      const file = e.dataTransfer.files[0];
      if (file) this._parseFile(file);
    });
    fileInput.addEventListener('change', e => {
      const file = e.target.files[0];
      if (file) this._parseFile(file);
    });

    container.append(uploadZone, fileInput);
    return createCard({ title: 'Importar desde Excel', icon: 'fa-file-excel', content: container });
  },

  // ──────────────────────────────────────────────────────────
  // EXPORT — plantillas vacías
  // ──────────────────────────────────────────────────────────
  _descargarPlantillaSimples() {
    if (!XLSX) { showToast('Librería XLSX no cargada', 'error'); return; }
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([
      ['codigo','nombre','descripcion','disponibilidad','precio_tipo','precio_valor','duracion','semantic_notes'],
      ['','Corte de pelo','Corte y secado clásico','a_coordinar','fijo','5000','30',''],
    ]);
    this._agregarValidaciones(ws, 2, 100);
    ws['!cols'] = [{ wch:14 },{ wch:28 },{ wch:40 },{ wch:16 },{ wch:14 },{ wch:14 },{ wch:12 },{ wch:50 }];
    XLSX.utils.book_append_sheet(wb, ws, 'servicios_simples');
    this._agregarMeta(wb);
    XLSX.writeFile(wb, 'plantilla_servicios_simples.xlsx');
  },

  _descargarPlantillaComplejos() {
    if (!XLSX) { showToast('Librería XLSX no cargada', 'error'); return; }
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([
      ['codigo','nombre','descripcion','disponibilidad','item_nombre','item_precio','item_duracion','semantic_notes'],
      ['SVC001','Depilación definitiva','Láser diodo...','a_coordinar','Axilas','5000','30','Rasurar zona antes de la sesión'],
      ['SVC001','','','','Rostro','8000','60',''],
      ['SVC001','','','','Piernas','','90',''],
    ]);
    ws['!cols'] = [{ wch:14 },{ wch:28 },{ wch:40 },{ wch:16 },{ wch:22 },{ wch:14 },{ wch:14 },{ wch:50 }];
    this._agregarMeta(wb);
    XLSX.utils.book_append_sheet(wb, ws, 'servicios_complejos');
    XLSX.writeFile(wb, 'plantilla_servicios_complejos.xlsx');
  },

  // ──────────────────────────────────────────────────────────
  // EXPORT — con datos existentes
  // ──────────────────────────────────────────────────────────
  _exportarSimples() {
    if (!XLSX) { showToast('Librería XLSX no cargada', 'error'); return; }
    const simples = this._data.serviciosAcumulados.filter(s => s.tipo !== 'complejo');
    const CAMPOS  = ['codigo','nombre','descripcion','disponibilidad','precio_tipo','precio_valor','duracion','semantic_notes'];

    const rows = simples.map(s => {
      const row = {
        codigo:         s.codigo        || this._generateCodigo(),
        nombre:         s.nombre        || '',
        descripcion:    s.descripcion   || '',
        disponibilidad: s.disponibilidad || '',
        precio_tipo:    s.precio?.tipo  || 'consultar',
        precio_valor:   s.precio?.valor || '',
        duracion:       s.duracion      || '',
        semantic_notes: (s.semantic_notes || []).join(' | '),
      };
      // Atributos extra
      if (s.atributos) Object.entries(s.atributos).forEach(([k, v]) => { row[k] = v; });
      return row;
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows, { header: CAMPOS });
    this._agregarValidaciones(ws, 2, rows.length + 1);
    ws['!cols'] = [{ wch:14 },{ wch:28 },{ wch:40 },{ wch:16 },{ wch:14 },{ wch:14 },{ wch:12 },{ wch:50 }];
    XLSX.utils.book_append_sheet(wb, ws, 'servicios_simples');
    this._agregarMeta(wb);
    XLSX.writeFile(wb, 'mis_servicios_simples.xlsx');
    showToast(`${simples.length} servicios simples exportados`, 'success');
  },

  _exportarComplejos() {
    if (!XLSX) { showToast('Librería XLSX no cargada', 'error'); return; }
    const complejos = this._data.serviciosAcumulados.filter(s => s.tipo === 'complejo');
    const rows = [];

    complejos.forEach(s => {
      const codigo = s.codigo || this._generateCodigo();
      const items  = s.items || [];
      items.forEach((item, i) => {
        const row = {
          codigo,
          nombre:         i === 0 ? (s.nombre        || '') : '',
          descripcion:    i === 0 ? (s.descripcion   || '') : '',
          disponibilidad: i === 0 ? (s.disponibilidad || '') : '',
          item_nombre:    item.nombre   || '',
          item_precio:    item.precio   || '',
          item_duracion:  item.duracion || '',
          semantic_notes: i === 0 ? (s.semantic_notes || []).join(' | ') : '',
        };
        if (s.atributos && i === 0) Object.entries(s.atributos).forEach(([k, v]) => { row[k] = v; });
        rows.push(row);
      });
    });

    const CAMPOS = ['codigo','nombre','descripcion','disponibilidad','item_nombre','item_precio','item_duracion','semantic_notes'];
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows, { header: CAMPOS });
    ws['!cols'] = [{ wch:14 },{ wch:28 },{ wch:40 },{ wch:16 },{ wch:22 },{ wch:14 },{ wch:14 },{ wch:50 }];
    this._agregarMeta(wb);
    XLSX.utils.book_append_sheet(wb, ws, 'servicios_complejos');
    XLSX.writeFile(wb, 'mis_servicios_complejos.xlsx');
    showToast(`${complejos.length} servicios complejos exportados`, 'success');
  },

  // ──────────────────────────────────────────────────────────
  // PARSE — lee el xlsx y detecta duplicados
  // ──────────────────────────────────────────────────────────
  _parseFile(file) {
    if (!XLSX) { showToast('Librería XLSX no cargada', 'error'); return; }
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target.result, { type: 'binary' });

        // Validar firma
        const metaSheet = wb.Sheets['_indiceia_meta'];
        if (!metaSheet) { showToast('Usá la plantilla oficial de ÍndiceIA', 'error'); return; }
        const firma = XLSX.utils.sheet_to_json(metaSheet, { header: 1 });
        if (firma?.[0]?.[0] !== TEMPLATE_FIRMA) { showToast('Usá la plantilla oficial de ÍndiceIA', 'error'); return; }

        const importados = [];

        // ── Simples ──────────────────────────────────────
        const wsSimples = wb.Sheets['servicios_simples'];
        if (wsSimples) {
          const CAMPOS_BASE = ['codigo','nombre','descripcion','disponibilidad','precio_tipo','precio_valor','duracion','semantic_notes'];
          const rows = XLSX.utils.sheet_to_json(wsSimples, { defval: '' });
          rows.forEach(row => {
            if (!row.nombre?.trim()) return;
            const s = {
              codigo:         String(row.codigo || this._generateCodigo()),
              tipo:           'simple',
              nombre:         String(row.nombre).trim(),
              descripcion:    String(row.descripcion || '').trim(),
              disponibilidad: ['inmediata','a_coordinar'].includes(row.disponibilidad) ? row.disponibilidad : 'a_coordinar',
              precio: row.precio_tipo === 'fijo' && row.precio_valor
                ? { tipo: 'fijo', valor: Number(row.precio_valor) || 0 }
                : { tipo: 'consultar' },
              duracion:       Number(row.duracion) || null,
              semantic_notes: row.semantic_notes ? String(row.semantic_notes).split('|').map(n => n.trim()).filter(Boolean) : [],
              atributos:      {},
              activo:         true,
            };
            Object.keys(row).forEach(col => {
              if (!CAMPOS_BASE.includes(col) && row[col] !== '') s.atributos[col] = String(row[col]).trim();
            });
            importados.push(s);
          });
        }

        // ── Complejos ─────────────────────────────────────
        const wsComplejos = wb.Sheets['servicios_complejos'];
        if (wsComplejos) {
          const CAMPOS_BASE = ['codigo','nombre','descripcion','disponibilidad','item_nombre','item_precio','item_duracion','semantic_notes'];
          const rows = XLSX.utils.sheet_to_json(wsComplejos, { defval: '' });
          const grupos = new Map();
          rows.forEach(row => {
            if (!row.codigo) return;
            const codigo = String(row.codigo).trim();
            if (!grupos.has(codigo)) {
              grupos.set(codigo, {
                codigo,
                tipo:           'complejo',
                nombre:         String(row.nombre || '').trim(),
                descripcion:    String(row.descripcion || '').trim(),
                disponibilidad: ['inmediata','a_coordinar'].includes(row.disponibilidad) ? row.disponibilidad : 'a_coordinar',
                semantic_notes: row.semantic_notes ? String(row.semantic_notes).split('|').map(n => n.trim()).filter(Boolean) : [],
                atributos:      {},
                items:          [],
                activo:         true,
              });
              Object.keys(row).forEach(col => {
                if (!CAMPOS_BASE.includes(col) && row[col] !== '') grupos.get(codigo).atributos[col] = String(row[col]).trim();
              });
            }
            if (row.item_nombre?.trim()) {
              grupos.get(codigo).items.push({
                nombre:   String(row.item_nombre).trim(),
                precio:   Number(row.item_precio)   || null,
                duracion: Number(row.item_duracion) || null,
              });
            }
          });
          grupos.forEach(s => { if (s.nombre && s.items.length) importados.push(s); });
        }

        if (!importados.length) { showToast('No se encontraron servicios válidos en el archivo', 'warning'); return; }

        // ── Detectar duplicados ───────────────────────────
        const nombresExistentes = new Set(this._data.serviciosAcumulados.map(s => s.nombre.toLowerCase()));
        const duplicados = importados.filter(s => nombresExistentes.has(s.nombre.toLowerCase()));
        const nuevos     = importados.filter(s => !nombresExistentes.has(s.nombre.toLowerCase()));

        if (!duplicados.length) {
          // Sin duplicados — agregar directo
          this._data.serviciosAcumulados.push(...nuevos);
          this._refreshLista();
          showToast(`${nuevos.length} servicios importados`, 'success');
          return;
        }

        // ── Modal de duplicados ───────────────────────────
        this._mostrarModalDuplicados({ duplicados, nuevos, importados });

      } catch (err) {
        console.error('[servicios] _parseFile() ERROR:', err);
        showToast('No se pudo leer el archivo', 'error');
      }
    };
    reader.readAsBinaryString(file);
  },

  // ──────────────────────────────────────────────────────────
  // MODAL DUPLICADOS
  // ──────────────────────────────────────────────────────────
  _mostrarModalDuplicados({ duplicados, nuevos, importados }) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';

    const modal = document.createElement('div');
    modal.className = 'modal-duplicados';

    const title = document.createElement('h3');
    title.textContent = 'Servicios duplicados encontrados';
    modal.appendChild(title);

    if (nuevos.length) {
      const nuevosList = document.createElement('p');
      nuevosList.className = 'modal-nuevos';
      nuevosList.innerHTML = `<strong>${nuevos.length} nuevos</strong> (se van a agregar): ${nuevos.map(s => s.nombre).join(', ')}`;
      modal.appendChild(nuevosList);
    }

    const dupList = document.createElement('div');
    dupList.className = 'modal-duplicados-lista';
    dupList.innerHTML = `<p><strong>${duplicados.length} ya existen:</strong></p>`;
    const ul = document.createElement('ul');
    duplicados.forEach(s => {
      const li = document.createElement('li');
      li.textContent = s.nombre;
      ul.appendChild(li);
    });
    dupList.appendChild(ul);
    modal.appendChild(dupList);

    const pregunta = document.createElement('p');
    pregunta.className = 'modal-pregunta';
    pregunta.textContent = '¿Qué querés hacer con los duplicados?';
    modal.appendChild(pregunta);

    const btns = document.createElement('div');
    btns.className = 'modal-btns';

    const cerrar = () => document.body.removeChild(overlay);

    btns.appendChild(createButton({
      label:   'Sobreescribir duplicados',
      variant: 'warning',
      icon:    'fa-sync',
      onClick: () => {
        // Reemplazar existentes + agregar nuevos
        duplicados.forEach(dup => {
          const idx = this._data.serviciosAcumulados.findIndex(s => s.nombre.toLowerCase() === dup.nombre.toLowerCase());
          if (idx >= 0) this._data.serviciosAcumulados[idx] = dup;
        });
        this._data.serviciosAcumulados.push(...nuevos);
        this._refreshLista();
        showToast(`${duplicados.length} sobreescritos, ${nuevos.length} nuevos agregados`, 'success');
        cerrar();
      }
    }));

    btns.appendChild(createButton({
      label:   'Agregar como nuevos',
      variant: 'primary',
      icon:    'fa-plus',
      onClick: () => {
        this._data.serviciosAcumulados.push(...importados);
        this._refreshLista();
        showToast(`${importados.length} servicios agregados`, 'success');
        cerrar();
      }
    }));

    btns.appendChild(createButton({
      label:   'Cancelar',
      variant: 'secondary',
      icon:    'fa-times',
      onClick: cerrar
    }));

    modal.appendChild(btns);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
  },

  // ──────────────────────────────────────────────────────────
  // HELPERS
  // ──────────────────────────────────────────────────────────
  _generateCodigo() {
    return `SVC${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).substring(2, 5).toUpperCase()}`;
  },

  _agregarMeta(wb) {
    const metaWs = XLSX.utils.aoa_to_sheet([[TEMPLATE_FIRMA]]);
    XLSX.utils.book_append_sheet(wb, metaWs, '_indiceia_meta');
  },

  // Agrega validación de dropdown en columna disponibilidad (col D = índice 3)
  // y precio_tipo (col E = índice 4) para servicios simples
  _agregarValidaciones(ws, rowStart, rowEnd) {
    if (!ws['!dataValidations']) ws['!dataValidations'] = [];
    // disponibilidad — col D
    ws['!dataValidations'].push({
      sqref: `D${rowStart}:D${rowEnd}`,
      type: 'list',
      formula1: '"inmediata,a_coordinar"',
      showDropDown: false,
    });
    // precio_tipo — col E
    ws['!dataValidations'].push({
      sqref: `E${rowStart}:E${rowEnd}`,
      type: 'list',
      formula1: '"consultar,fijo"',
      showDropDown: false,
    });
  },

  // ──────────────────────────────────────────────────────────
  // SAVE BUTTON
  // ──────────────────────────────────────────────────────────
  _renderSaveButton() {
    const dirtyController = {
      hasUnsavedChanges: () => JSON.stringify(this._data.serviciosAcumulados) !== JSON.stringify(this._originalSnapshot),
      markSaved:         () => { this._originalSnapshot = structuredClone(this._data.serviciosAcumulados); }
    };

    return createOnboardingButton({
      stepName:        'servicios',
      validate:        () => !dirtyController.hasUnsavedChanges() || this._data.serviciosAcumulados.length > 0,
      dirtyController,
      getLabel: () => {
        if (!dirtyController.hasUnsavedChanges()) return 'Volver al dashboard';
        const n = this._data.serviciosAcumulados.length;
        return n === 0 ? 'Agregá al menos un servicio'
          : n === 1   ? 'Guardar y continuar (1 servicio)'
          :             `Guardar y continuar (${n} servicios)`;
      },
      onSave: async ({ uid, comercioId }) => {
        if (!comercioId) throw new Error('No hay comercioId para guardar servicios');
        const batch        = writeBatch(db);
        const comercioRef  = doc(db, 'entidades', comercioId);
        const serviciosRef = collection(db, 'entidades', comercioId, 'servicios');
        const existentes   = await getDocs(serviciosRef);
        existentes.docs.forEach(docSnap => batch.delete(docSnap.ref));
        this._data.serviciosAcumulados.forEach(servicio => {
          const { id, ...data } = servicio;
          batch.set(doc(collection(db, 'entidades', comercioId, 'servicios')), {
            ...data,
            fechaActualizacion: serverTimestamp()
          });
        });
        batch.update(comercioRef, { 'onboardingSteps.servicios': true, fechaActualizacion: serverTimestamp() });
        await batch.commit();
        return true;
      },
      onSuccess: () => showToast('💾 Servicios guardados', 'success'),
      onError:   (err) => { console.error('Error guardando servicios:', err); showToast('Error al guardar: ' + err.message, 'error'); }
    });
  }
};

runSkeleton({ page, adapter: createFirebaseAdapter, options: { loadingMessage: 'Cargando servicios...' } });
