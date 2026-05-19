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

const page = {
  _data: {
    serviciosAcumulados: [],
    draft: { tipo: 'simple' }
  },
  _comercioId:       null,
  _originalSnapshot: [],
  _formCard:         null,

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
      this._data.draft = { tipo: 'simple' };
      return;
    }
    try {
      const serviciosRef = collection(db, 'entidades', this._comercioId, 'servicios');
      const snapshot     = await getDocs(serviciosRef);
      this._data.serviciosAcumulados = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (err) {
      console.error('Error cargando servicios:', err);
      this._data.serviciosAcumulados = [];
    }
    this._data.draft       = { tipo: 'simple' };
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

    root.appendChild(this._renderSaveButton());
  },

  _renderFormContent() {
    const container = document.createElement('div');
    container.className = 'form-content';

    container.appendChild(this._renderTipoServicioField());
    container.appendChild(this._renderNombreField());
    container.appendChild(this._renderDescripcionField());

    this._precioContainer = document.createElement('div');
    this._precioContainer.className = 'precio-container';
    this._precioContainer.appendChild(this._renderPrecioSegunTipo());
    container.appendChild(this._precioContainer);

    container.appendChild(this._renderDuracionField());
    container.appendChild(this._renderDisponibilidadField());
    container.appendChild(this._renderImagenField());
    container.appendChild(this._renderNotasField());
    container.appendChild(this._renderSemanticNotesField()); // ← NEW

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
      orientation: 'vertical',
      options: [
        { value: 'simple',   label: 'Servicio simple',       description: 'Precio único para todos los clientes.' },
        { value: 'complejo', label: 'Servicio con opciones', description: 'El precio varía según zona, tamaño, tipo, etc.' }
      ],
      value: this._data.draft.tipo || 'simple',
      actions: {
        onChange: (value) => {
          this._data.draft.tipo = value;
          delete this._data.draft.precio;
          delete this._data.draft.items;
          delete this._data.draft.unidad;
          this._precioContainer.innerHTML = '';
          this._precioContainer.appendChild(this._renderPrecioSegunTipo());
          document.dispatchEvent(new Event('change'));
        }
      }
    });
  },

  _renderNombreField() {
    return createFormField({
      label:    '¿Cómo se llama este servicio? *',
      required: true,
      helpText: 'Ej: "Corte de pelo", "Depilación definitiva"',
      actions:  { onChange: (v) => { const t = v.trim(); t ? (this._data.draft.nombre = t) : delete this._data.draft.nombre; } }
    });
  },

  _renderDescripcionField() {
    return createFormField({
      label:    'Descripción',
      type:     'textarea',
      rows:     3,
      helpText: 'Agregá detalles que ayuden a entender mejor el servicio',
      actions:  { onChange: (v) => { const t = v.trim(); t ? (this._data.draft.descripcion = t) : delete this._data.draft.descripcion; } }
    });
  },

  _renderDuracionField() {
    return createFormField({
      label:    'Duración aproximada (minutos)',
      type:     'number',
      helpText: 'Opcional — si no podés estimarla, dejalo vacío',
      actions:  { onChange: (v) => { const n = Number(v); n > 0 ? (this._data.draft.duracion_minutos = n) : delete this._data.draft.duracion_minutos; } }
    });
  },

  _renderNotasField() {
    return createFormField({
      label:    'Notas adicionales',
      type:     'textarea',
      rows:     3,
      helpText: 'Requisitos, aclaraciones, horarios especiales, etc.',
      actions:  { onChange: (v) => { const t = v.trim(); t ? (this._data.draft.notas = t) : delete this._data.draft.notas; } }
    });
  },

  // ← NEW: Campo semántico (texto libre → array)
  _renderSemanticNotesField() {
    const draftNotes = this._data.draft.semantic_notes?.join('\n') || '';
    return createFormField({
      label:    'Aclaraciones importantes sobre este servicio',
      type:     'textarea',
      rows:     4,
      value:    draftNotes,
      helpText: 'Escribí una aclaración por línea.\nEj:\n• Requiere evaluación previa\n• Evitar exposición solar inmediata',
      actions:  {
        onChange: (v) => {
          const notes = v.split('\n').map(l => l.trim()).filter(Boolean);
          notes.length > 0
            ? (this._data.draft.semantic_notes = notes)
            : delete this._data.draft.semantic_notes;
        }
      }
    });
  },

  _renderPrecioSegunTipo() {
    return this._data.draft.tipo === 'complejo'
      ? this._renderItemsField()
      : this._renderPrecioSimpleField();
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
            delete this._data.draft.precio;
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

  _renderItemsField() {
    const wrapper = document.createElement('div');
    wrapper.className = 's-form-field campo-compuesto';

    wrapper.appendChild(createFormField({
      label:       '¿De qué depende el precio?',
      placeholder: 'Ej: zona del cuerpo, tamaño, tipo de material',
      helpText:    'Describí en pocas palabras qué define el precio de cada opción',
      value:       this._data.draft.unidad || '',
      actions:     { onChange: (v) => { const t = v.trim(); t ? (this._data.draft.unidad = t) : delete this._data.draft.unidad; } }
    }));

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
        row.appendChild(Object.assign(document.createElement('span'), { className: 'item-nombre', textContent: item.n }));
        row.appendChild(Object.assign(document.createElement('span'), { className: 'item-precio', textContent: item.p ? `$${item.p.toLocaleString('es-AR')}` : 'A consultar' }));
        const removeBtn = document.createElement('button');
        removeBtn.className = 'item-remove';
        removeBtn.innerHTML = '×';
        removeBtn.addEventListener('click', () => { this._data.draft.items.splice(i, 1); renderItems(); });
        row.appendChild(removeBtn);
        itemsContainer.appendChild(row);
      });
    };

    renderItems();
    wrapper.appendChild(itemsContainer);

    const addRow = document.createElement('div');
    addRow.className = 'item-add-row';

    const inputNombre = Object.assign(document.createElement('input'), { type: 'text',   className: 'item-input item-input--nombre', placeholder: 'Ej: Axilas' });
    const inputPrecio = Object.assign(document.createElement('input'), { type: 'number', className: 'item-input item-input--precio', placeholder: 'Precio (opcional)' });

    const addBtn = createButton({
      label: 'Agregar', variant: 'secondary', size: 'sm', icon: 'fa-plus',
      onClick: () => {
        const nombre = inputNombre.value.trim();
        if (!nombre) return showToast('Escribí el nombre de la opción', 'warning');
        const precio  = Number(inputPrecio.value);
        const newItem = { n: nombre };
        if (precio > 0) newItem.p = precio;
        this._data.draft.items.push(newItem);
        inputNombre.value = '';
        inputPrecio.value = '';
        renderItems();
      }
    });

    addRow.append(inputNombre, inputPrecio, addBtn);
    wrapper.appendChild(addRow);
    return wrapper;
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
          if (value) this._data.draft.disponibilidad = value;
          else delete this._data.draft.disponibilidad;
          document.dispatchEvent(new Event('change'));
        }
      }
    });
  },

  _renderImagenField() {
    const wrapper = document.createElement('div');
    wrapper.className = 's-form-field campo-compuesto';

    const labelEl = document.createElement('label');
    labelEl.className   = 's-label';
    labelEl.textContent = 'Foto del servicio (opcional)';
    wrapper.appendChild(labelEl);

    const help = document.createElement('small');
    help.className   = 's-help';
    help.textContent = 'Subí una foto de un trabajo realizado o pegá un link de Instagram, Google Fotos, etc.';
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

    const tags = document.createElement('div');
    tags.className = 'servicio-tags';

    tags.appendChild(createBadge({ text: esSimple ? 'Simple' : 'Con opciones', variant: esSimple ? 'info' : 'warning', size: 'small' }));

    if (servicio.disponibilidad) {
      tags.appendChild(createBadge({
        text:    servicio.disponibilidad === 'inmediata' ? 'Sin turno' : 'Con turno',
        variant: servicio.disponibilidad === 'inmediata' ? 'success' : 'info',
        size:    'small'
      }));
    }

    if (esSimple) {
      tags.appendChild(createBadge({
        text:    servicio.precio?.valor ? `$${servicio.precio.valor.toLocaleString('es-AR')}` : 'A consultar',
        variant: servicio.precio?.valor ? 'success' : 'secondary',
        size:    'small'
      }));
    }

    if (servicio.duracion_minutos) {
      tags.appendChild(createBadge({ text: `⏱️ ${servicio.duracion_minutos} min`, variant: 'secondary', size: 'small' }));
    }

    contentDiv.appendChild(tags);

    if (servicio.descripcion) {
      const desc = document.createElement('p');
      desc.className   = 'servicio-descripcion';
      desc.textContent = servicio.descripcion;
      contentDiv.appendChild(desc);
    }

    // ← NEW: Render de semantic_notes
    if (servicio.semantic_notes?.length) {
      const notesDiv = document.createElement('div');
      notesDiv.className = 'servicio-semantic-notes';
      
      const title = document.createElement('small');
      title.className = 'servicio-semantic-notes-title';
      title.textContent = '⚠️ Aclaraciones importantes:';
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
        li.textContent = item.p ? `${item.n} — $${item.p.toLocaleString('es-AR')}` : `${item.n} — A consultar`;
        ul.appendChild(li);
      });
      itemsDiv.appendChild(ul);
      contentDiv.appendChild(itemsDiv);
    }

    if (servicio.notas) {
      const notas = document.createElement('p');
      notas.className   = 'servicio-notas';
      notas.textContent = servicio.notas;
      contentDiv.appendChild(notas);
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

  _isDraftValid() {
    const d = this._data.draft;
    if (d.tipo === 'complejo') return !!d.nombre?.trim() && !!d.disponibilidad && d.items?.length > 0;
    return !!d.nombre?.trim() && !!d.disponibilidad;
  },

  _agregarServicio() {
    if (!this._isDraftValid()) {
      showToast('Campos obligatorios',
        this._data.draft.tipo === 'complejo'
          ? 'Completá: Nombre, al menos una opción y Disponibilidad'
          : 'Completá: Nombre y Disponibilidad',
        'warning'
      );
      return;
    }
    if (this._data.draft.activo === undefined) this._data.draft.activo = true;
    this._data.serviciosAcumulados.push(structuredClone(this._data.draft));
    this._data.draft = { tipo: 'simple' };
    this._limpiarFormulario();
    this._refreshLista();
    showToast('✅ Servicio agregado', 'Podés crear otro o guardar cuando termines', 'success');
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
    const newLista = createCard({ title: 'Servicios agregados', variant: 'warning', content: this._renderListaContent() });
    this._listaCard.replaceWith(newLista);
    this._listaCard = newLista;
  },

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
          batch.set(doc(collection(db, 'entidades', comercioId, 'servicios')), { ...data, fechaActualizacion: serverTimestamp() });
        });
        batch.update(comercioRef, { 'onboardingSteps.servicios': true, fechaActualizacion: serverTimestamp() });
        await batch.commit();
        return true;
      },
      onSuccess: () => showToast('💾 Servicios guardados', 'Redirigiendo...', 'success'),
      onError:   (err) => { console.error('Error guardando servicios:', err); showToast('Error al guardar', err.message, 'error'); }
    });
  }
};

runSkeleton({ page, adapter: createFirebaseAdapter, options: { loadingMessage: 'Cargando servicios...' } });
