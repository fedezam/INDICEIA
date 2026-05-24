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

// ============================================================
// MODELO DRAFT
// ============================================================

const _draftVacio = () => ({
  tipo:               'simple',
  nombre:             '',
  descripcion:        '',
  disponibilidad:     null,
  semantic_notes:     [],
  imagen:             '',
  atiende_urgencias:  false,
  precio:             null,
  duracion:           null,
  _variantes:         [],
  _varianteFormOpen:  false,
  _editingParentRef:  null, // ID (real o temp) del padre que se está editando
  _editingChildRef:   false, // Boolean: ¿estamos editando un hijo?
  _parentTempId:      null,  // Solo usado si el draft actual ES un hijo en edición
});

const _draftVarianteVacio = (parentRef) => ({
  tipo:               'simple',
  nombre:             '',
  descripcion:        '',
  disponibilidad:     null,
  semantic_notes:     [],
  precio:             null,
  duracion:           null,
  _parentTempId:      parentRef, // Referencia al padre (temp o real)
});

const _varianteInlineVacia = () => ({
  nombre:         '',
  descripcion:    '',
  disponibilidad: null,
  precio:         null,
  duracion:       null,
  semantic_notes: [],
});

const _generarTempId = () => `tmp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

// ============================================================
// PAGE
// ============================================================
const page = {
  _data: {
    serviciosAcumulados: [],
    draft:               _draftVacio(),
    draftVariante:       null,
  },
  _comercioId:       null,
  _originalSnapshot: [],
  _formCard:         null,
  _listaCard:        null,

  // ──────────────────────────────────────────────────────────
  // HELPERS DE ACCESO
  // ──────────────────────────────────────────────────────────
  _getPadres() {
    return this._data.serviciosAcumulados.filter(s => !s._parentTempId && !s.parent_id);
  },

  _getHijos(parentRef) {
    // Un hijo pertenece a un padre si su _parentTempId (memoria) o parent_id (DB) coincide
    return this._data.serviciosAcumulados.filter(
      s => (s._parentTempId === parentRef || s.parent_id === parentRef)
    );
  },

  // ──────────────────────────────────────────────────────────
  // CARGA
  // ──────────────────────────────────────────────────────────
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
      // Mapeamos asegurando que los campos existan
      this._data.serviciosAcumulados = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (err) {
      console.error('Error cargando servicios:', err);
      this._data.serviciosAcumulados = [];
    }
    this._data.draft               = _draftVacio();
    this._data.draftVariante       = null;
    this._originalSnapshot         = structuredClone(this._data.serviciosAcumulados);
  },

  // ──────────────────────────────────────────────────────────
  // RENDER PRINCIPAL
  // ──────────────────────────────────────────────────────────
  render() {
    const root = document.getElementById('skeleton-page');
    if (!root) return; 
    root.innerHTML = '';

    const title = document.createElement('h2');
    title.textContent = 'Servicios';
    root.appendChild(title);

    const hint = document.createElement('p');
    hint.className   = 'page-hint';
    hint.textContent = 'Definí todos los servicios que ofrecés.';
    root.appendChild(hint);

    root.appendChild(this._renderImportCard());

    const sep = document.createElement('p');
    sep.className       = 'page-hint';
    sep.textContent     = 'O cargá servicios de a uno manualmente:';
    sep.style.marginTop = 'var(--s-spacing-lg)';
    root.appendChild(sep);

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

  // ──────────────────────────────────────────────────────────
  // FORM PRINCIPAL
  // ──────────────────────────────────────────────────────────
  _renderFormContent() {
    const container = document.createElement('div');
    container.className = 'form-content';

    const esComplejo    = this._data.draft.tipo === 'complejo';
    const editandoPadre = !!this._data.draft._editingParentRef;
    const editandoHijo  = !!this._data.draft._editingChildRef;
    const editando      = editandoPadre || editandoHijo;

    // ── Banner de modo edición ──
    if (editando) {
      const banner = document.createElement('div');
      banner.className = 'edit-banner';
      if (editandoHijo) {
        // Buscar el nombre del padre para mostrarlo
        const parentRef = this._data.draft._parentTempId || this._data.draft.parent_id;
        const padre = this._data.serviciosAcumulados.find(
          s => (s._tempId === parentRef || s.id === parentRef)
        );
        banner.innerHTML = `<i class="fas fa-pencil"></i> Editando variante${padre ? ` de <strong>${padre.nombre}</strong>` : ''}. Los cambios se aplican al guardar.`;
      } else {
        banner.innerHTML = `<i class="fas fa-pencil"></i> Editando <strong>${this._data.draft.nombre || 'servicio'}</strong>. Los cambios se aplican al guardar.`;
      }
      container.appendChild(banner);
    }

    // ── Tipo (ocultar en modo edición para evitar cambios de estructura drásticos) ──
    if (!editando) {
      container.appendChild(this._renderTipoServicioField());
    }

    container.appendChild(this._renderNombreField());
    container.appendChild(this._renderDescripcionField());
    container.appendChild(this._renderDisponibilidadField());

    if (!esComplejo) {
      const variableContainer = document.createElement('div');
      variableContainer.className = 'variable-container';
      variableContainer.appendChild(this._renderSimpleFields());
      container.appendChild(variableContainer);
    }

    container.appendChild(this._renderSemanticNotesField());
    container.appendChild(this._renderUrgenciasField());
    container.appendChild(this._renderImagenField());

    // ── Variantes inline (solo complejos) ──
    if (esComplejo) {
      container.appendChild(this._renderVariantesInlineSection());
    }

    // ── Botón contextual ──
    if (esComplejo) {
      const cantVariantes = this._data.draft._variantes.length;

      let label, variant;
      if (editandoPadre) {
        label   = cantVariantes > 0
          ? `Guardar cambios (+ ${cantVariantes} variante${cantVariantes > 1 ? 's' : ''} nueva${cantVariantes > 1 ? 's' : ''})`
          : 'Guardar cambios';
        variant = 'success';
      } else {
        label   = cantVariantes > 0
          ? `Crear servicio con ${cantVariantes} variante${cantVariantes > 1 ? 's' : ''}`
          : 'Crear servicio con variantes';
        variant = cantVariantes > 0 ? 'success' : 'secondary';
      }

      container.appendChild(createButton({
        label,
        variant,
        icon:  'fa-check',
        block: true,
        onClick: () => this._agregarServicio()
      }));

    } else {
      container.appendChild(createButton({
        label:   editando ? 'Guardar cambios' : 'Agregar este servicio',
        variant: 'success',
        icon:    editando ? 'fa-check' : 'fa-plus',
        block:   true,
        onClick: () => this._agregarServicio()
      }));
    }

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
        { value: 'simple',   label: '⚡ Servicio simple',  description: 'Un precio, una duración.' },
        { value: 'complejo', label: '🔀 Con variantes',    description: 'Depilación, tintura... tiene opciones.' }
      ],
      value: this._data.draft.tipo || 'simple',
      actions: {
        onChange: (value) => {
          this._data.draft.tipo     = value;
          this._data.draft.precio   = null;
          this._data.draft.duracion = null;
          if (value === 'complejo') {
            this._data.draft.disponibilidad = 'a_coordinar';
          } else {
            this._data.draft._variantes = [];
            this._data.draft._varianteFormOpen = false;
          }
          this._rebuildFormContent();
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

  _renderDescripcionField(draft = null) {
    const d = draft || this._data.draft;
    return createFormField({
      label:    'Descripción',
      type:     'textarea',
      rows:     2,
      helpText: 'Breve descripción del servicio',
      value:    d.descripcion,
      actions:  { onChange: (v) => { d.descripcion = v.trim(); } }
    });
  },

  _renderDisponibilidadField(draft = null) {
    const d = draft || this._data.draft;
    return createCheckboxGroup({
      label:    '¿Cuándo está disponible? *',
      name:     'disponibilidad',
      required: true,
      mode:     'single',
      options: [
        { value: 'inmediata',   label: 'Inmediata',   description: 'Sin turno, por orden de llegada' },
        { value: 'a_coordinar', label: 'A coordinar', description: 'Requiere turno o agenda previa'  }
      ],
      value: d.disponibilidad || null,
      actions: {
        onChange: (value) => {
          d.disponibilidad = value || null;
          document.dispatchEvent(new Event('change'));
        }
      }
    });
  },

  // ──────────────────────────────────────────────────────────
  // SERVICIO SIMPLE — precio + duración
  // ──────────────────────────────────────────────────────────
  _renderSimpleFields(draft = null) {
    const d = draft || this._data.draft;
    const wrapper = document.createElement('div');
    wrapper.className = 'simple-fields';
    wrapper.appendChild(this._renderPrecioSimpleField(d));
    wrapper.appendChild(this._renderDuracionField(d));
    return wrapper;
  },

  _renderPrecioSimpleField(draft = null) {
    const d = draft || this._data.draft;
    const wrapper = document.createElement('div');
    wrapper.className = 's-form-field campo-compuesto';

    const label = document.createElement('label');
    label.className   = 's-label';
    label.textContent = 'Precio';
    wrapper.appendChild(label);

    let precioInput;

    const precioGroup = createCheckboxGroup({
      name:        'svc-precio',
      mode:        'single',
      orientation: 'horizontal',
      options: [
        { value: 'consultar', label: 'A consultar' },
        { value: 'fijo',      label: 'Precio fijo'  }
      ],
      value: d.precio?.tipo || 'consultar',
      actions: {
        onChange: (val) => {
          if (val === 'fijo') {
            d.precio = { tipo: 'fijo', valor: Number(precioInput?.getValue() || 0) };
            precioInput?.enable();
          } else {
            d.precio = null;
            precioInput?.disable();
            precioInput?.setValue('');
          }
          document.dispatchEvent(new Event('change'));
        }
      }
    });

    precioInput = createFormField({
      type:        'number',
      placeholder: 'Ej: 5000',
      disabled:    d.precio?.tipo !== 'fijo',
      value:       d.precio?.valor || '',
      actions: {
        onChange: (v) => {
          if (d.precio?.tipo === 'fijo') d.precio.valor = Number(v);
        }
      }
    });

    wrapper.appendChild(precioGroup);
    wrapper.appendChild(precioInput);
    return wrapper;
  },

  _renderDuracionField(draft = null) {
    const d = draft || this._data.draft;
    return createFormField({
      label:    'Duración aproximada (minutos)',
      type:     'number',
      helpText: 'Opcional',
      value:    d.duracion || '',
      actions:  { onChange: (v) => { const n = Number(v); d.duracion = n > 0 ? n : null; } }
    });
  },

  // ──────────────────────────────────────────────────────────
  // SEMANTIC NOTES
  // ──────────────────────────────────────────────────────────
  _renderSemanticNotesField(draft = null) {
    const d = draft || this._data.draft;

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
      const notes = d.semantic_notes || [];
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
          d.semantic_notes.splice(i, 1);
          if (!d.semantic_notes.length) d.semantic_notes = [];
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
        if (!d.semantic_notes) d.semantic_notes = [];
        d.semantic_notes.push(val);
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
  // URGENCIAS + IMAGEN
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

    const imagenUrlInput             = document.createElement('input');
    imagenUrlInput.type        = 'url';
    imagenUrlInput.className   = 'imagen-url-input';
    imagenUrlInput.placeholder = 'https://...';
    imagenUrlInput.value       = this._data.draft.imagen || '';
    imagenUrlInput.addEventListener('input', () => { this._data.draft.imagen = imagenUrlInput.value.trim(); });
    wrapper.appendChild(imagenUrlInput);

    return wrapper;
  },

  // ──────────────────────────────────────────────────────────
  // VARIANTES INLINE (dentro del form)
  // ──────────────────────────────────────────────────────────
  _renderVariantesInlineSection() {
    const section = document.createElement('div');
    section.className = 'variantes-inline-section';
    section.id = 'variantes-inline-section';

    // ── Encabezado ──
    const header = document.createElement('div');
    header.className = 'variantes-inline-header';

    const headerTitle = document.createElement('label');
    headerTitle.className   = 's-label';
    headerTitle.textContent = 'Variantes de este servicio *';
    header.appendChild(headerTitle);

    const cant = this._data.draft._variantes.length;
    if (cant > 0) {
      const counter = document.createElement('span');
      counter.className   = 'variantes-inline-counter';
      counter.textContent = `${cant} variante${cant > 1 ? 's' : ''}`;
      header.appendChild(counter);
    }

    section.appendChild(header);

    const help = document.createElement('small');
    help.className   = 's-help';
    help.textContent = 'Cada variante puede tener su propio precio, duración y aclaraciones. Ej: "Axilas", "Piernas completas", "Con gorra".';
    section.appendChild(help);

    // ── Lista de variantes ya agregadas ──
    if (cant > 0) {
      const list = document.createElement('div');
      list.className = 'variantes-inline-list';

      this._data.draft._variantes.forEach((variante, i) => {
        const item = document.createElement('div');
        item.className = 'variante-inline-item';

        const info = document.createElement('div');
        info.className = 'variante-inline-info';

        const nombre = document.createElement('strong');
        nombre.textContent = variante.nombre;
        info.appendChild(nombre);

        const badges = document.createElement('div');
        badges.className = 'variante-inline-badges';

        if (variante.precio?.tipo === 'fijo' && variante.precio.valor) {
          badges.appendChild(createBadge({
            text: `$${Number(variante.precio.valor).toLocaleString('es-AR')}`,
            variant: 'success', size: 'small'
          }));
        } else {
          badges.appendChild(createBadge({
            text: 'A consultar', variant: 'secondary', size: 'small'
          }));
        }

        if (variante.duracion) {
          badges.appendChild(createBadge({
            text: `⏱️ ${variante.duracion} min`, variant: 'secondary', size: 'small'
          }));
        }

        if (variante.disponibilidad) {
          badges.appendChild(createBadge({
            text:    variante.disponibilidad === 'inmediata' ? 'Sin turno' : 'Con turno',
            variant: variante.disponibilidad === 'inmediata' ? 'success' : 'info',
            size:    'small'
          }));
        }

        info.appendChild(badges);

        if (variante.descripcion) {
          const desc = document.createElement('small');
          desc.className   = 'variante-inline-desc';
          desc.textContent = variante.descripcion;
          info.appendChild(desc);
        }

        if (variante.semantic_notes?.length) {
          const sn = document.createElement('small');
          sn.className   = 'variante-inline-desc';
          sn.textContent = `🧠 ${variante.semantic_notes.join(' · ')}`;
          info.appendChild(sn);
        }

        item.appendChild(info);

        const removeBtn = document.createElement('button');
        removeBtn.type      = 'button';
        removeBtn.className = 'variante-inline-remove';
        removeBtn.innerHTML = '<i class="fas fa-trash"></i>';
        removeBtn.title     = 'Eliminar variante';
        removeBtn.addEventListener('click', () => {
          this._data.draft._variantes.splice(i, 1);
          this._rebuildVariantesSection();
        });
        item.appendChild(removeBtn);

        list.appendChild(item);
      });

      section.appendChild(list);
    }

    // ── Formulario inline de nueva variante ──
    if (this._data.draft._varianteFormOpen) {
      section.appendChild(this._renderInlineVarianteForm());
    } else {
      const btnAgregar = createButton({
        label:   '+ Agregar variante',
        variant: cant > 0 ? 'secondary' : 'primary',
        icon:    'fa-plus',
        size:    'sm',
        onClick: () => {
          this._data.draft._varianteFormOpen = true;
          this._rebuildVariantesSection();
        }
      });
      const btnWrapper = document.createElement('div');
      btnWrapper.className = 'variantes-inline-add-btn';
      btnWrapper.appendChild(btnAgregar);
      section.appendChild(btnWrapper);
    }

    return section;
  },

  _renderInlineVarianteForm() {
    const draft = _varianteInlineVacia();

    const form = document.createElement('div');
    form.className = 'variante-inline-form';

    // Nombre
    form.appendChild(createFormField({
      label:    'Nombre de la variante *',
      required: true,
      helpText: 'Ej: "Axilas", "Piernas completas", "Con tiritas"',
      value:    '',
      actions:  { onChange: (v) => { draft.nombre = v.trim(); } }
    }));

    // Descripción
    form.appendChild(createFormField({
      label:    'Descripción',
      type:     'textarea',
      rows:     1,
      helpText: 'Opcional',
      value:    '',
      actions:  { onChange: (v) => { draft.descripcion = v.trim(); } }
    }));

    // Disponibilidad
    form.appendChild(createCheckboxGroup({
      label:    '¿Cuándo está disponible?',
      name:     'variante-disponibilidad',
      mode:     'single',
      options: [
        { value: 'inmediata',   label: 'Inmediata',   description: 'Sin turno' },
        { value: 'a_coordinar', label: 'A coordinar', description: 'Requiere turno'  }
      ],
      value: null,
      actions: {
        onChange: (value) => { draft.disponibilidad = value || null; }
      }
    }));

    // Precio
    const precioWrap = document.createElement('div');
    precioWrap.className = 's-form-field campo-compuesto';

    const precioLabel = document.createElement('label');
    precioLabel.className   = 's-label';
    precioLabel.textContent = 'Precio';
    precioWrap.appendChild(precioLabel);

    let precioInput;

    precioWrap.appendChild(createCheckboxGroup({
      name:        'variante-precio',
      mode:        'single',
      orientation: 'horizontal',
      options: [
        { value: 'consultar', label: 'A consultar' },
        { value: 'fijo',      label: 'Precio fijo'  }
      ],
      value: 'consultar',
      actions: {
        onChange: (val) => {
          if (val === 'fijo') {
            draft.precio = { tipo: 'fijo', valor: Number(precioInput?.getValue() || 0) };
            precioInput?.enable();
          } else {
            draft.precio = null;
            precioInput?.disable();
            precioInput?.setValue('');
          }
        }
      }
    }));

    precioInput = createFormField({
      type:        'number',
      placeholder: 'Ej: 5000',
      disabled:    true,
      value:       '',
      actions:     { onChange: (v) => { if (draft.precio?.tipo === 'fijo') draft.precio.valor = Number(v); } }
    });

    precioWrap.appendChild(precioInput);
    form.appendChild(precioWrap);

    // Duración
    form.appendChild(createFormField({
      label:    'Duración (minutos)',
      type:     'number',
      helpText: 'Opcional',
      value:    '',
      actions:  { onChange: (v) => { const n = Number(v); draft.duracion = n > 0 ? n : null; } }
    }));

    // Semantic notes
    form.appendChild(this._renderSemanticNotesField(draft));

    // Botones
    const btns = document.createElement('div');
    btns.className = 'variante-inline-btns';

    btns.appendChild(createButton({
      label:   'Agregar variante',
      variant: 'success',
      icon:    'fa-plus',
      size:    'sm',
      onClick: () => {
        if (!draft.nombre?.trim()) {
          showToast('El nombre de la variante es obligatorio', 'warning');
          return;
        }
        if (!draft.disponibilidad) {
          draft.disponibilidad = this._data.draft.disponibilidad || 'a_coordinar';
        }
        if (!draft.precio) draft.precio = { tipo: 'consultar' };
        this._data.draft._variantes.push(structuredClone(draft));
        this._data.draft._varianteFormOpen = false;
        this._rebuildVariantesSection();
        showToast(`✅ "${draft.nombre}" agregada como variante`, 'success');
      }
    }));

    btns.appendChild(createButton({
      label:   'Cancelar',
      variant: 'secondary',
      icon:    'fa-times',
      size:    'sm',
      onClick: () => {
        this._data.draft._varianteFormOpen = false;
        this._rebuildVariantesSection();
      }
    }));

    form.appendChild(btns);
    return form;
  },

  // ── Rebuild helpers ──
  _rebuildFormContent() {
    const formContent = this._formCard?.querySelector('.form-content');
    if (formContent) formContent.replaceWith(this._renderFormContent());
  },

  _rebuildVariantesSection() {
    const section = document.getElementById('variantes-inline-section');
    if (section) {
      section.replaceWith(this._renderVariantesInlineSection());
    } else {
      this._rebuildFormContent();
    }
  },

  // ──────────────────────────────────────────────────────────
  // VALIDACIÓN Y AGREGAR SERVICIO
  // ──────────────────────────────────────────────────────────
  _isDraftValid() {
    const d = this._data.draft;
    if (!d.nombre?.trim())  return false;
    if (!d.disponibilidad)  return false;
    return true;
  },

  _agregarServicio() {
    if (!this._isDraftValid()) {
      showToast('Completá: Nombre y Disponibilidad', 'warning');
      return;
    }

    const esComplejo    = this._data.draft.tipo === 'complejo';
    const editandoPadre = !!this._data.draft._editingParentRef;
    const editandoHijo  = !!this._data.draft._editingChildRef;

    // Solo exigir variantes al CREAR un complejo nuevo
    if (esComplejo && !editandoPadre && this._data.draft._variantes.length === 0) {
      showToast('Agregá al menos una variante antes de crear el servicio', 'warning');
      return;
    }

    const servicio = structuredClone(this._data.draft);
    servicio.activo = true;

    if (esComplejo) {
      // Preservar _tempId al editar (mantiene vínculo con hijos existentes)
      if (editandoPadre) {
        servicio._tempId = this._data.draft._editingParentRef;
      } else {
        servicio._tempId = _generarTempId();
      }

      const variantes = servicio._variantes || [];
      
      // Limpieza estricta antes de pushear
      delete servicio._variantes;
      delete servicio._varianteFormOpen;
      delete servicio._editingParentRef;
      delete servicio._editingChildRef;
      delete servicio._parentTempId; // No debería tener, pero por seguridad

      // Push padre
      this._data.serviciosAcumulados.push(servicio);

      // Push cada variante nueva como hijo
      variantes.forEach(v => {
        this._data.serviciosAcumulados.push({
          tipo:           'simple',
          nombre:         v.nombre,
          descripcion:    v.descripcion || '',
          disponibilidad: v.disponibilidad || servicio.disponibilidad,
          precio:         v.precio || { tipo: 'consultar' },
          duracion:       v.duracion || null,
          semantic_notes: v.semantic_notes || [],
          _parentTempId:  servicio._tempId, // Vinculación temporal
          activo:         true,
        });
      });

      if (editandoPadre) {
        showToast(variantes.length
          ? `✅ Servicio actualizado con ${variantes.length} variante${variantes.length > 1 ? 's' : ''} nueva${variantes.length > 1 ? 's' : ''}`
          : '✅ Servicio actualizado', 'success');
      } else {
        showToast(`✅ Servicio con ${variantes.length} variante${variantes.length > 1 ? 's' : ''} creado`, 'success');
      }

    } else {
      // Lógica para Servicio Simple (o Hijo editado como simple)
      if (!servicio.precio) servicio.precio = { tipo: 'consultar' };
      
      // Limpieza
      delete servicio._variantes;
      delete servicio._varianteFormOpen;
      delete servicio._editingParentRef;
      delete servicio._editingChildRef;
      // Mantener _parentTempId si es un hijo
      
      this._data.serviciosAcumulados.push(servicio);
      showToast(editandoHijo
        ? '✅ Variante actualizada'
        : '✅ Servicio agregado. Podés crear otro o guardar cuando termines.', 'success');
    }

    this._data.draft = _draftVacio();
    this._rebuildFormContent();
    this._refreshLista();
  },

  // ──────────────────────────────────────────────────────────
  // FORM DE VARIANTE (lista — agregar a servicios ya guardados)
  // ──────────────────────────────────────────────────────────
  _renderVarianteForm(parentRef, refreshCallback) {
    const draft = _draftVarianteVacio(parentRef);

    const wrapper = document.createElement('div');
    wrapper.className = 'variante-form';

    const titulo = document.createElement('p');
    titulo.className   = 'variante-form-title';
    titulo.textContent = 'Nueva variante';
    wrapper.appendChild(titulo);

    wrapper.appendChild(createFormField({
      label:    '¿Cómo se llama esta variante? *',
      required: true,
      helpText: 'Ej: "Axilas", "Piernas completas", "Con tiritas"',
      value:    draft.nombre,
      actions:  { onChange: (v) => { draft.nombre = v.trim(); } }
    }));

    wrapper.appendChild(this._renderDescripcionField(draft));
    wrapper.appendChild(this._renderDisponibilidadField(draft));
    wrapper.appendChild(this._renderSimpleFields(draft));
    wrapper.appendChild(this._renderSemanticNotesField(draft));

    const btns = document.createElement('div');
    btns.className = 'variante-form-btns';

    btns.appendChild(createButton({
      label:   'Agregar variante',
      variant: 'success',
      icon:    'fa-plus',
      onClick: () => {
        if (!draft.nombre?.trim()) {
          showToast('El nombre de la variante es obligatorio', 'warning');
          return;
        }
        if (!draft.disponibilidad) {
          const padre = this._data.serviciosAcumulados.find(
            s => (s._tempId === parentRef || s.id === parentRef)
          );
          draft.disponibilidad = padre?.disponibilidad || 'a_coordinar';
        }
        if (!draft.precio) draft.precio = { tipo: 'consultar' };
        draft.activo = true;
        this._data.serviciosAcumulados.push(structuredClone(draft));
        this._data.draftVariante = null;
        refreshCallback();
        showToast('✅ Variante agregada', 'success');
      }
    }));

    btns.appendChild(createButton({
      label:   'Cancelar',
      variant: 'secondary',
      icon:    'fa-times',
      onClick: () => {
        this._data.draftVariante = null;
        refreshCallback();
      }
    }));

    wrapper.appendChild(btns);
    return wrapper;
  },

  // ──────────────────────────────────────────────────────────
  // LISTA DE SERVICIOS
  // ──────────────────────────────────────────────────────────
  _renderListaContent() {
    const container = document.createElement('div');
    container.id = 'lista-servicios-container';

    const padres = this._getPadres();

    if (!padres.length) {
      const empty = document.createElement('p');
      empty.className   = 'lista-vacia';
      empty.textContent = 'No hay servicios agregados aún';
      container.appendChild(empty);
      return container;
    }

    padres.forEach((servicio) => {
      const idx = this._data.serviciosAcumulados.indexOf(servicio);
      container.appendChild(this._renderServicioCard(servicio, idx));
    });

    return container;
  },

  _renderServicioCard(servicio, index) {
    const activo     = servicio.activo !== false;
    const esComplejo = servicio.tipo === 'complejo';
    const parentRef  = servicio._tempId || servicio.id;
    const hijos      = esComplejo ? this._getHijos(parentRef) : [];

    const contentDiv = document.createElement('div');

    if (servicio.imagen) {
      const img     = document.createElement('img');
      img.src       = servicio.imagen;
      img.alt       = servicio.nombre;
      img.className = 'servicio-imagen';
      contentDiv.appendChild(img);
    }

    // Badges
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

    // ── Hijos del servicio complejo ──
    if (esComplejo) {
      const hijosContainer = document.createElement('div');
      hijosContainer.className = 'servicio-hijos';

      const renderHijos = () => {
        hijosContainer.innerHTML = '';

        const hijosActuales = this._getHijos(parentRef);

        if (hijosActuales.length) {
          const hijosList = document.createElement('div');
          hijosList.className = 'hijos-list';

          hijosActuales.forEach((hijo) => {
            const hijoIdx = this._data.serviciosAcumulados.indexOf(hijo);
            const hijoRow = document.createElement('div');
            hijoRow.className = 'hijo-row';

            const hijoInfo = document.createElement('div');
            hijoInfo.className = 'hijo-info';

            const hijoBadges = document.createElement('div');
            hijoBadges.className = 'hijo-badges';

            hijoBadges.appendChild(createBadge({
              text:    hijo.precio?.valor ? `$${hijo.precio.valor.toLocaleString('es-AR')}` : 'A consultar',
              variant: hijo.precio?.valor ? 'success' : 'secondary',
              size:    'small'
            }));
            if (hijo.duracion) {
              hijoBadges.appendChild(createBadge({ text: `⏱️ ${hijo.duracion} min`, variant: 'secondary', size: 'small' }));
            }
            if (hijo.disponibilidad) {
              hijoBadges.appendChild(createBadge({
                text:    hijo.disponibilidad === 'inmediata' ? 'Sin turno' : 'Con turno',
                variant: hijo.disponibilidad === 'inmediata' ? 'success' : 'info',
                size:    'small'
              }));
            }

            hijoInfo.appendChild(hijoBadges);

            if (hijo.descripcion) {
              const hijoDesc = document.createElement('p');
              hijoDesc.className   = 'hijo-descripcion';
              hijoDesc.textContent = hijo.descripcion;
              hijoInfo.appendChild(hijoDesc);
            }

            if (hijo.semantic_notes?.length) {
              const sn = document.createElement('small');
              sn.className   = 'hijo-semantic';
              sn.textContent = `🧠 ${hijo.semantic_notes.join(' · ')}`;
              hijoInfo.appendChild(sn);
            }

            const hijoAcciones = document.createElement('div');
            hijoAcciones.className = 'hijo-acciones';
            hijoAcciones.appendChild(createButton({
              label: 'Editar', variant: 'primary', size: 'sm', icon: 'fa-pencil',
              onClick: () => this._editarServicio(hijoIdx)
            }));
            hijoAcciones.appendChild(createButton({
              label:   hijo.activo !== false ? 'Pausar' : 'Activar',
              variant: hijo.activo !== false ? 'warning' : 'success',
              size:    'sm',
              icon:    hijo.activo !== false ? 'fa-pause' : 'fa-play',
              onClick: () => { this._toggleServicio(hijoIdx); renderHijos(); }
            }));
            hijoAcciones.appendChild(createButton({
              label: 'Eliminar', variant: 'danger', size: 'sm', icon: 'fa-trash',
              onClick: () => { this._eliminarServicio(hijoIdx); renderHijos(); }
            }));

            hijoRow.appendChild(hijoInfo);
            hijoRow.appendChild(hijoAcciones);

            hijosList.appendChild(createCard({
              title:   hijo.nombre + (hijo.activo === false ? ' (Pausado)' : ''),
              variant: hijo.activo !== false ? 'success' : 'secondary',
              compact: true,
              content: hijoRow
            }));
          });

          hijosContainer.appendChild(hijosList);
        } else {
          const emptyHijos = document.createElement('p');
          emptyHijos.className   = 'hijos-empty';
          emptyHijos.textContent = 'Este servicio todavía no tiene variantes.';
          hijosContainer.appendChild(emptyHijos);
        }

        // Form inline de nueva variante (para servicios ya guardados)
        const dv = this._data.draftVariante;
        if (dv && dv.parentRef === parentRef) {
          hijosContainer.appendChild(
            this._renderVarianteForm(parentRef, () => renderHijos())
          );
        } else {
          const btnAgregar = createButton({
            label:   '+ Agregar variante',
            variant: 'primary',
            size:    'sm',
            icon:    'fa-plus',
            onClick: () => {
              this._data.draftVariante = { parentRef };
              renderHijos();
            }
          });
          const btnWrapper = document.createElement('div');
          btnWrapper.className = 'hijos-add-btn';
          btnWrapper.appendChild(btnAgregar);
          hijosContainer.appendChild(btnWrapper);
        }
      };

      renderHijos();
      contentDiv.appendChild(hijosContainer);
    }

    // Semantic notes del padre
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

    // Acciones del padre
    const actionsWrapper = document.createElement('div');
    actionsWrapper.className = 'servicio-acciones';
    actionsWrapper.append(
      createButton({ label: 'Editar',   variant: 'primary', size: 'sm', icon: 'fa-pencil', onClick: () => this._editarServicio(index) }),
      createButton({
        label:   activo ? 'Pausar' : 'Activar',
        variant: activo ? 'warning' : 'success',
        size:    'sm',
        icon:    activo ? 'fa-pause' : 'fa-play',
        onClick: () => this._toggleServicio(index)
      }),
      createButton({ label: 'Eliminar', variant: 'danger',  size: 'sm', icon: 'fa-trash',  onClick: () => this._eliminarServicioConHijos(index, parentRef) })
    );
    contentDiv.appendChild(actionsWrapper);

    return createCard({
      title:   `${servicio.nombre}${activo ? '' : ' (Pausado)'}`,
      variant: activo ? 'success' : 'secondary',
      compact: true,
      content: contentDiv
    });
  },

  // ──────────────────────────────────────────────────────────
  // ACCIONES LISTA
  // ──────────────────────────────────────────────────────────
  _editarServicio(index) {
    const servicio = this._data.serviciosAcumulados[index];
    const esHijo   = servicio._parentTempId || servicio.parent_id;

    this._data.draft = structuredClone(servicio);

    // Marcar modo edición y preservar referencias
    if (esHijo) {
      this._data.draft._editingChildRef = true;
      // Asegurar que el draft tenga la referencia al padre correcta
      this._data.draft._parentTempId = servicio._parentTempId || servicio.parent_id;
    } else if (servicio.tipo === 'complejo') {
      this._data.draft._editingParentRef = servicio._tempId || servicio.id;
    }

    // Inicializar arrays si faltan
    if (!this._data.draft._variantes) this._data.draft._variantes = [];
    if (!this._data.draft._varianteFormOpen) this._data.draft._varianteFormOpen = false;

    // Eliminar de la lista temporalmente para que no aparezca duplicado mientras se edita
    this._data.serviciosAcumulados.splice(index, 1);
    this._refreshLista();
    this._rebuildFormContent();

    window.scrollTo({ top: 0, behavior: 'smooth' });

    if (esHijo) {
      const parentRef = servicio._parentTempId || servicio.parent_id;
      const padre = this._data.serviciosAcumulados.find(
        s => (s._tempId === parentRef || s.id === parentRef)
      );
      showToast(`Editando variante de "${padre?.nombre || 'servicio'}" — modificá y guardá`, 'info');
    } else {
      showToast('Modo edición — modificá y guardá', 'info');
    }
  },

  _toggleServicio(index) {
    this._data.serviciosAcumulados[index].activo = !this._data.serviciosAcumulados[index].activo;
    this._refreshLista();
  },

  _eliminarServicio(index) {
    this._data.serviciosAcumulados.splice(index, 1);
    this._refreshLista();
    showToast('Variante eliminada', 'info');
  },

  _eliminarServicioConHijos(index, parentRef) {
    // 1. Eliminar hijos asociados
    const hijos = this._getHijos(parentRef);
    // Iterar al revés o filtrar para evitar problemas de índices al eliminar
    hijos.forEach(hijo => {
      const hi = this._data.serviciosAcumulados.indexOf(hijo);
      if (hi >= 0) this._data.serviciosAcumulados.splice(hi, 1);
    });

    // 2. Eliminar padre
    // Recalcular índice del padre porque pudo cambiar al borrar hijos
    const padreIdx = this._data.serviciosAcumulados.findIndex(
      s => (s._tempId === parentRef) || (s.id === parentRef)
    );
    
    if (padreIdx >= 0) {
      this._data.serviciosAcumulados.splice(padreIdx, 1);
    }
    
    this._refreshLista();
    showToast('Servicio y sus variantes eliminados', 'info');
  },

  _refreshLista() {
    const newLista = createCard({ title: 'Servicios agregados', variant: 'warning', content: this._renderListaContent() });
    if (this._listaCard) {
      this._listaCard.replaceWith(newLista);
      this._listaCard = newLista;
    }
  },

  // ──────────────────────────────────────────────────────────
  // IMPORT CARD
  // ──────────────────────────────────────────────────────────
  _renderImportCard() {
    const container = document.createElement('div');

    const instrucciones = document.createElement('div');
    instrucciones.className = 'import-instrucciones';
    instrucciones.innerHTML = `
      <p>Si tenés muchos servicios, la forma más rápida es cargarlos desde Excel:</p>
      <ol>
        <li>Descargá la plantilla según el tipo de servicio</li>
        <li>Completá tus servicios en el archivo</li>
        <li>Subí el archivo completado</li>
      </ol>
      <p class="import-hint"><i class="fas fa-info-circle"></i> Podés agregar columnas extra a la derecha — se guardan como atributos semánticos y el asistente las usa para responder preguntas.</p>
    `;
    container.appendChild(instrucciones);

    const btnsContainer = document.createElement('div');
    btnsContainer.className = 'import-btns';

    const tieneSimples   = this._data.serviciosAcumulados.some(s => s.tipo !== 'complejo' && !s._parentTempId && !s.parent_id);
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
  // EXPORT
  // ──────────────────────────────────────────────────────────
  _descargarPlantillaSimples() {
    if (!XLSX) { showToast('Librería XLSX no cargada', 'error'); return; }
    const wb = XLSX.utils.book_new();
    const wsInstr = XLSX.utils.aoa_to_sheet([
      ['📋 PLANTILLA DE SERVICIOS SIMPLES — ÍndiceIA'],
      [''],
      ['Un servicio simple tiene un único precio y duración.'],
      ['Ejemplos: Corte de pelo, Consulta médica, Limpieza de cutis.'],
      [''],
      ['COLUMNAS:'],
      ['  nombre        → Nombre del servicio (obligatorio)'],
      ['  descripcion   → Descripción breve (opcional)'],
      ['  disponibilidad → "inmediata" o "a_coordinar" (obligatorio)'],
      ['  precio_tipo   → "consultar" o "fijo" (obligatorio)'],
      ['  precio_valor  → Solo si precio_tipo es "fijo". Ej: 5000'],
      ['  duracion_min  → Duración en minutos (opcional). Dejar vacío si no aplica.'],
      ['  nota_1, nota_2, ... → Aclaraciones para la IA (opcional, una por columna)'],
      [''],
      ['Completá tus servicios en la hoja "servicios" y subí el archivo.'],
    ]);
    wsInstr['!cols'] = [{ wch: 70 }];
    XLSX.utils.book_append_sheet(wb, wsInstr, '📖 Instrucciones');
    const headers = ['nombre','descripcion','disponibilidad','precio_tipo','precio_valor','duracion_min','nota_1','nota_2'];
    const ejemplo = ['Corte de pelo','Corte y secado clásico','a_coordinar','fijo','5000','30','Incluye lavado',''];
    const ws = XLSX.utils.aoa_to_sheet([headers, ejemplo]);
    this._agregarValidacionesSimples(ws, 2, 100);
    ws['!cols'] = [{ wch:28 },{ wch:38 },{ wch:16 },{ wch:14 },{ wch:14 },{ wch:13 },{ wch:35 },{ wch:35 }];
    XLSX.utils.book_append_sheet(wb, ws, 'servicios');
    this._agregarMeta(wb, 'simples');
    XLSX.writeFile(wb, 'plantilla_servicios_simples.xlsx');
    showToast('Plantilla descargada', 'success');
  },

  _descargarPlantillaComplejos() {
    if (!XLSX) { showToast('Librería XLSX no cargada', 'error'); return; }
    const wb = XLSX.utils.book_new();
    const wsInstr = XLSX.utils.aoa_to_sheet([
      ['📋 PLANTILLA DE SERVICIOS CON VARIANTES — ÍndiceIA'],
      [''],
      ['Un servicio con variantes tiene múltiples opciones, cada una con su precio y duración.'],
      ['Ejemplos: Depilación definitiva (Axilas, Rostro, Piernas), Tintura (Con gorra, Con tiritas).'],
      [''],
      ['CÓMO COMPLETAR:'],
      ['  → Fila de SERVICIO: completá nombre, descripcion y disponibilidad. Dejá variante/precio/duracion vacíos.'],
      ['  → Fila de VARIANTE: dejá nombre/descripcion/disponibilidad vacíos. Completá variante, precio y duracion.'],
      ['  → Las variantes que siguen a un servicio pertenecen a ese servicio.'],
      [''],
      ['COLUMNAS:'],
      ['  nombre        → Nombre del servicio padre (solo en la fila del servicio)'],
      ['  descripcion   → Descripción del servicio (solo en la fila del servicio)'],
      ['  disponibilidad → "inmediata" o "a_coordinar" (solo en la fila del servicio)'],
      ['  variante      → Nombre de la variante (solo en filas de variante). Ej: Axilas'],
      ['  precio        → Precio de la variante (opcional). Dejar vacío = "a consultar"'],
      ['  duracion_min  → Duración en minutos de la variante (opcional)'],
      ['  nota_1, nota_2, ... → Aclaraciones para la IA del servicio (solo en fila del servicio)'],
      [''],
      ['Completá tus servicios en la hoja "servicios" y subí el archivo.'],
    ]);
    wsInstr['!cols'] = [{ wch: 80 }];
    XLSX.utils.book_append_sheet(wb, wsInstr, '📖 Instrucciones');
    const headers = ['nombre','descripcion','disponibilidad','variante','precio','duracion_min','nota_1','nota_2'];
    const rows = [
      headers,
      ['Depilación definitiva','Láser diodo. Requiere múltiples sesiones.','a_coordinar','','','','Rasurar la zona antes de la sesión','No aplicar sobre tatuajes'],
      ['','','','Entrecejo','7500','5','',''],
      ['','','','Bozo','7500','5','',''],
      ['','','','Piernas completas','','60','',''],
      ['Tintura','Coloración completa con productos profesionales.','a_coordinar','','','','',''],
      ['','','','Con gorra','5000','60','',''],
      ['','','','Con tiritas','6500','90','',''],
    ];
    const ws = XLSX.utils.aoa_to_sheet(rows);
    this._agregarValidacionesComplejos(ws, 2, 100);
    ws['!cols'] = [{ wch:28 },{ wch:38 },{ wch:16 },{ wch:22 },{ wch:12 },{ wch:13 },{ wch:35 },{ wch:35 }];
    XLSX.utils.book_append_sheet(wb, ws, 'servicios');
    this._agregarMeta(wb, 'complejos');
    XLSX.writeFile(wb, 'plantilla_servicios_complejos.xlsx');
    showToast('Plantilla descargada', 'success');
  },

  // ──────────────────────────────────────────────────────────
// EXPORT / IMPORT CORREGIDO (N notas, descripcion en hijos)
// ──────────────────────────────────────────────────────────
_exportarSimples() {
  if (!XLSX) { showToast('Librería XLSX no cargada', 'error'); return; }
  const simples = this._data.serviciosAcumulados.filter(s => s.tipo !== 'complejo' && !s._parentTempId && !s.parent_id);

  let maxNotas = 0;
  simples.forEach(s => {
    if (s.semantic_notes?.length > maxNotas) maxNotas = s.semantic_notes.length;
  });

  const CAMPOS_BASE = ['nombre','descripcion','disponibilidad','precio_tipo','precio_valor','duracion_min'];
  const headersNotas = Array.from({ length: Math.max(maxNotas, 1) }, (_, i) => `nota_${i + 1}`);
  const HEADERS = [...CAMPOS_BASE, ...headersNotas];

  const rows = simples.map(s => {
    const row = {
      nombre:         s.nombre         || '',
      descripcion:    s.descripcion    || '',
      disponibilidad: s.disponibilidad || '',
      precio_tipo:    s.precio?.tipo   || 'consultar',
      precio_valor:   s.precio?.valor  || '',
      duracion_min:   s.duracion       || '',
    };
    (s.semantic_notes || []).forEach((nota, i) => { row[`nota_${i + 1}`] = nota; });
    if (s.atributos) Object.entries(s.atributos).forEach(([k, v]) => { row[k] = v; });
    return row;
  });

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows, { header: HEADERS });
  this._agregarValidacionesSimples(ws, 2, rows.length + 1);
  const colWidths = [{ wch:28 },{ wch:38 },{ wch:16 },{ wch:14 },{ wch:14 },{ wch:13 }];
  headersNotas.forEach(() => colWidths.push({ wch: 35 }));
  ws['!cols'] = colWidths;
  XLSX.utils.book_append_sheet(wb, ws, 'servicios');
  this._agregarMeta(wb, 'simples');
  XLSX.writeFile(wb, 'mis_servicios_simples.xlsx');
  showToast(`${simples.length} servicios simples exportados`, 'success');
},

_exportarComplejos() {
  if (!XLSX) { showToast('Librería XLSX no cargada', 'error'); return; }
  const padres = this._data.serviciosAcumulados.filter(s => s.tipo === 'complejo');

  let maxNotasPadre = 0;
  let maxNotasHijo  = 0;

  padres.forEach(p => {
    if (p.semantic_notes?.length > maxNotasPadre) maxNotasPadre = p.semantic_notes.length;
    this._getHijos(p._tempId || p.id).forEach(h => {
      if (h.semantic_notes?.length > maxNotasHijo) maxNotasHijo = h.semantic_notes.length;
    });
  });

  const headersNotasPadre = Array.from({ length: Math.max(maxNotasPadre, 1) }, (_, i) => `nota_padre_${i + 1}`);
  const headersNotasHijo  = Array.from({ length: Math.max(maxNotasHijo,  1) }, (_, i) => `nota_variante_${i + 1}`);

  const HEADERS = [
    'nombre', 'descripcion', 'disponibilidad',
    ...headersNotasPadre,
    'variante', 'descripcion_variante', 'precio', 'duracion_min',
    ...headersNotasHijo
  ];

  const rows = [];
  padres.forEach(s => {
    const parentRef = s._tempId || s.id;

    const filaPadre = {
      nombre:               s.nombre         || '',
      descripcion:          s.descripcion    || '',
      disponibilidad:       s.disponibilidad || '',
      variante:             '',
      descripcion_variante: '',
      precio:               '',
      duracion_min:         '',
    };
    (s.semantic_notes || []).forEach((nota, i) => { filaPadre[`nota_padre_${i + 1}`] = nota; });
    if (s.atributos) Object.entries(s.atributos).forEach(([k, v]) => { filaPadre[k] = v; });
    rows.push(filaPadre);

    this._getHijos(parentRef).forEach(hijo => {
      const filaHijo = {
        nombre:               '',
        descripcion:          '',
        disponibilidad:       '',
        variante:             hijo.nombre        || '',
        descripcion_variante: hijo.descripcion   || '',
        precio:               hijo.precio?.valor || '',
        duracion_min:         hijo.duracion      || '',
      };
      (hijo.semantic_notes || []).forEach((nota, i) => { filaHijo[`nota_variante_${i + 1}`] = nota; });
      rows.push(filaHijo);
    });
  });

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows, { header: HEADERS });
  this._agregarValidacionesComplejos(ws, 2, rows.length + 1);
  const colWidths = [{ wch:28 },{ wch:38 },{ wch:16 }];
  headersNotasPadre.forEach(() => colWidths.push({ wch: 30 }));
  colWidths.push({ wch:22 },{ wch:38 },{ wch:12 },{ wch:13 });
  headersNotasHijo.forEach(() => colWidths.push({ wch: 30 }));
  ws['!cols'] = colWidths;
  XLSX.utils.book_append_sheet(wb, ws, 'servicios');
  this._agregarMeta(wb, 'complejos');
  XLSX.writeFile(wb, 'mis_servicios_complejos.xlsx');
  showToast(`${padres.length} servicios complejos exportados`, 'success');
},

_parseFile(file) {
  if (!XLSX) { showToast('Librería XLSX no cargada', 'error'); return; }
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const wb = XLSX.read(e.target.result, { type: 'binary' });

      const metaSheet = wb.Sheets['_indiceia_meta'];
      if (!metaSheet) { showToast('Usá la plantilla oficial de ÍndiceIA', 'error'); return; }
      const firma = XLSX.utils.sheet_to_json(metaSheet, { header: 1 });
      const tipoPlantilla = firma?.[0]?.[0];
      if (!tipoPlantilla?.startsWith('indiceia_servicios_')) {
        showToast('Usá la plantilla oficial de ÍndiceIA', 'error'); return;
      }

      const ws = wb.Sheets['servicios'];
      if (!ws) { showToast('No se encontró la hoja "servicios" en el archivo', 'error'); return; }

      const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
      if (!rows.length) { showToast('La plantilla está vacía', 'warning'); return; }

      const importados  = [];
      const esComplejo  = tipoPlantilla.includes('complejos');

      if (!esComplejo) {
        const CAMPOS_BASE = ['nombre','descripcion','disponibilidad','precio_tipo','precio_valor','duracion_min'];
        rows.forEach(row => {
          if (!String(row.nombre || '').trim()) return;
          const notas = [];
          const atributos = {};
          Object.keys(row).forEach(col => {
            if (CAMPOS_BASE.includes(col)) return;
            const val = String(row[col] || '').trim();
            if (!val) return;
            if (/^nota_\d+$/i.test(col)) { notas.push(val); }
            else { atributos[col] = val; }
          });
          importados.push({
            tipo:           'simple',
            nombre:         String(row.nombre).trim(),
            descripcion:    String(row.descripcion || '').trim(),
            disponibilidad: ['inmediata','a_coordinar'].includes(row.disponibilidad) ? row.disponibilidad : 'a_coordinar',
            precio:         row.precio_tipo === 'fijo' && row.precio_valor
                              ? { tipo: 'fijo', valor: Number(row.precio_valor) || 0 }
                              : { tipo: 'consultar' },
            duracion:       Number(row.duracion_min) || null,
            semantic_notes: notas,
            atributos,
            activo: true,
          });
        });

      } else {
        const CAMPOS_BASE = ['nombre','descripcion','disponibilidad','variante','descripcion_variante','precio','duracion_min'];
        let padreActual = null;

        rows.forEach(row => {
          const nombre   = String(row.nombre   || '').trim();
          const variante = String(row.variante || '').trim();

          if (nombre) {
            const notasPadre = [];
            const atributos  = {};
            Object.keys(row).forEach(col => {
              if (CAMPOS_BASE.includes(col)) return;
              const val = String(row[col] || '').trim();
              if (!val) return;
              if      (/^nota_padre_\d+$/i.test(col))    { notasPadre.push(val); }
              else if (/^nota_variante_\d+$/i.test(col)) { /* ignorar en fila padre */ }
              else                                        { atributos[col] = val; }
            });

            padreActual = {
              tipo:           'complejo',
              nombre,
              descripcion:    String(row.descripcion || '').trim(),
              disponibilidad: ['inmediata','a_coordinar'].includes(row.disponibilidad) ? row.disponibilidad : 'a_coordinar',
              semantic_notes: notasPadre,
              atributos,
              _tempId:        _generarTempId(),
              activo:         true,
            };
            importados.push(padreActual);

            // fila con nombre Y variante a la vez
            if (variante) {
              const notasHijo = [];
              Object.keys(row).forEach(col => {
                if (/^nota_variante_\d+$/i.test(col)) {
                  const val = String(row[col] || '').trim();
                  if (val) notasHijo.push(val);
                }
              });
              importados.push({
                tipo:           'simple',
                nombre:         variante,
                descripcion:    String(row.descripcion_variante || '').trim(),
                disponibilidad: padreActual.disponibilidad,
                precio:         Number(row.precio) ? { tipo: 'fijo', valor: Number(row.precio) } : { tipo: 'consultar' },
                duracion:       Number(row.duracion_min) || null,
                semantic_notes: notasHijo,
                _parentTempId:  padreActual._tempId,
                activo:         true,
              });
            }

          } else if (variante && padreActual) {
            const notasHijo = [];
            Object.keys(row).forEach(col => {
              if (/^nota_variante_\d+$/i.test(col)) {
                const val = String(row[col] || '').trim();
                if (val) notasHijo.push(val);
              }
            });
            importados.push({
              tipo:           'simple',
              nombre:         variante,
              descripcion:    String(row.descripcion_variante || '').trim(),
              disponibilidad: padreActual.disponibilidad,
              precio:         Number(row.precio) ? { tipo: 'fijo', valor: Number(row.precio) } : { tipo: 'consultar' },
              duracion:       Number(row.duracion_min) || null,
              semantic_notes: notasHijo,
              _parentTempId:  padreActual._tempId,
              activo:         true,
            });
          }
        });
      }

      if (!importados.length) { showToast('No se encontraron servicios válidos en el archivo', 'warning'); return; }

      const nombresExistentes = new Set(this._getPadres().map(s => s.nombre.toLowerCase()));
      const duplicados = importados.filter(s => !s._parentTempId && nombresExistentes.has(s.nombre.toLowerCase()));
      const nuevos     = importados.filter(s => !duplicados.includes(s));

      if (!duplicados.length) {
        this._data.serviciosAcumulados.push(...nuevos);
        this._refreshLista();
        showToast(`${importados.filter(s => !s._parentTempId).length} servicios importados correctamente`, 'success');
        return;
      }

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
      nuevosList.innerHTML = `<strong>${nuevos.filter(s=>!s._parentTempId).length} nuevos</strong> (se van a agregar): ${nuevos.filter(s=>!s._parentTempId).map(s => s.nombre).join(', ')}`;
      modal.appendChild(nuevosList);
    }

    const dupList = document.createElement('div');
    dupList.className = 'modal-duplicados-lista';
    const padresDup = duplicados.filter(s => !s._parentTempId);
    dupList.innerHTML = `<p><strong>${padresDup.length} ya existen:</strong></p>`;
    const ul = document.createElement('ul');
    padresDup.forEach(s => {
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
        duplicados.filter(s=>!s._parentTempId).forEach(dup => {
          const idx = this._data.serviciosAcumulados.findIndex(
            s => s.nombre.toLowerCase() === dup.nombre.toLowerCase() && !s._parentTempId && !s.parent_id
          );
          if (idx >= 0) {
            const oldRef = this._data.serviciosAcumulados[idx]._tempId || this._data.serviciosAcumulados[idx].id;
            this._getHijos(oldRef).forEach(h => {
              const hi = this._data.serviciosAcumulados.indexOf(h);
              if (hi >= 0) this._data.serviciosAcumulados.splice(hi, 1);
            });
            this._data.serviciosAcumulados[idx] = dup;
          }
        });
        const hijosDuplicados = importados.filter(s => s._parentTempId && duplicados.some(d => d._tempId === s._parentTempId));
        this._data.serviciosAcumulados.push(...nuevos, ...hijosDuplicados);
        this._refreshLista();
        showToast(`Duplicados sobreescritos, ${nuevos.filter(s=>!s._parentTempId).length} nuevos agregados`, 'success');
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
        showToast(`${importados.filter(s=>!s._parentTempId).length} servicios agregados`, 'success');
        cerrar();
      }
    }));

    btns.appendChild(createButton({
      label: 'Cancelar', variant: 'secondary', icon: 'fa-times', onClick: cerrar
    }));

    modal.appendChild(btns);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
  },

  // ──────────────────────────────────────────────────────────
  // HELPERS
  // ──────────────────────────────────────────────────────────
  _agregarMeta(wb, tipo) {
    const firma = `indiceia_servicios_${tipo}_v1`;
    const metaWs = XLSX.utils.aoa_to_sheet([[firma]]);
    XLSX.utils.book_append_sheet(wb, metaWs, '_indiceia_meta');
  },

  _agregarValidacionesSimples(ws, rowStart, rowEnd) {
    if (!ws['!dataValidations']) ws['!dataValidations'] = [];
    ws['!dataValidations'].push({ sqref: `C${rowStart}:C${rowEnd}`, type: 'list', formula1: '"inmediata,a_coordinar"', showDropDown: false });
    ws['!dataValidations'].push({ sqref: `D${rowStart}:D${rowEnd}`, type: 'list', formula1: '"consultar,fijo"',        showDropDown: false });
  },

  _agregarValidacionesComplejos(ws, rowStart, rowEnd) {
    if (!ws['!dataValidations']) ws['!dataValidations'] = [];
    ws['!dataValidations'].push({ sqref: `C${rowStart}:C${rowEnd}`, type: 'list', formula1: '"inmediata,a_coordinar"', showDropDown: false });
  },

  // ──────────────────────────────────────────────────────────
  // SAVE — resuelve _tempId → parent_id real
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
      validate: () => true,
      getLabel: () => dirtyController.hasUnsavedChanges()
        ? 'Guardar y volver al dashboard'
        : 'Volver al dashboard',
      dirtyController,
      onSave: async ({ uid, comercioId }) => {
        if (!comercioId) throw new Error('No hay comercioId para guardar servicios');
        const batch       = writeBatch(db);
        const comercioRef = doc(db, 'entidades', comercioId);
        const colRef      = collection(db, 'entidades', comercioId, 'servicios');

        const idsOriginales = new Set(
          this._originalSnapshot.filter(s => s.id).map(s => s.id)
        );
        const idsActuales = new Set(
          this._data.serviciosAcumulados.filter(s => s.id).map(s => s.id)
        );
        idsOriginales.forEach(id => {
          if (!idsActuales.has(id)) batch.delete(doc(colRef, id));
        });

        const tempIdToRef = {};

        // 1. Pre-crear referencias — padres nuevos Y existentes reimportados
        this._data.serviciosAcumulados.forEach(servicio => {
          if (servicio.tipo === 'complejo' && servicio._tempId) {
            if (!servicio.id) {
              // Padre nuevo — crear ref nueva
              tempIdToRef[servicio._tempId] = doc(colRef);
            } else {
              // Padre existente reimportado — mapear _tempId → ref real
              tempIdToRef[servicio._tempId] = doc(colRef, servicio.id);
            }
          }
        });

        // 2. Procesar todos los servicios
        this._data.serviciosAcumulados.forEach(servicio => {
          const { id, _tempId, _parentTempId, ...data } = servicio;

          let ref;
          if (id) {
            ref = doc(colRef, id);
          } else if (_tempId && tempIdToRef[_tempId]) {
            ref = tempIdToRef[_tempId];
          } else {
            ref = doc(colRef);
          }

          // Resolver parent_id
          if (_parentTempId) {
            const padreExistente = this._data.serviciosAcumulados.find(
              s => s.id === _parentTempId
            );
            if (padreExistente) {
              data.parent_id = padreExistente.id;
            } else if (tempIdToRef[_parentTempId]) {
              data.parent_id = tempIdToRef[_parentTempId].id;
            }
            // si no encuentra ninguno, no asigna — evita el crash
          }

          batch.set(ref, { ...data, fechaActualizacion: serverTimestamp() });
        });

        batch.update(comercioRef, {
          'onboardingSteps.servicios': true,
          fechaActualizacion: serverTimestamp()
        });

        await batch.commit();
        return true;
      },
      onSuccess: () => showToast('💾 Servicios guardados', 'success'),
      onError:   (err) => {
        console.error('Error guardando servicios:', err);
        showToast('Error al guardar: ' + err.message, 'error');
      }
    });
  }
};

runSkeleton({ page, adapter: createFirebaseAdapter, options: { loadingMessage: 'Cargando servicios...' } });
