// ============================================================
// src/pages/productos/productos.js
// ============================================================

import { runSkeleton }             from '/src/skeleton/skeleton.js';
import { createFirebaseAdapter }   from '/src/skeleton/adapters/firebaseAdapter.js';
import { createFormField }         from '/src/skeleton/components/form-field/index.js';
import { createButton }            from '/src/skeleton/components/button/index.js';
import { createCard }              from '/src/skeleton/components/card/index.js';
import { createOnboardingButton }  from '/src/skeleton/components/onboarding-button/index.js';
import { showToast }               from '/src/skeleton/components/toast/index.js';
import { app, db }                 from '/src/services/firebase/firebase.js';
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import {
  writeBatch,
  doc,
  collection,
  getDocs,
  serverTimestamp
} from 'firebase/firestore';
import {
  showProgressOverlay,
  updateProgress,
  finishProgressOverlay
} from '/src/shared/progressOverlay.js';
import './productos.css';

const XLSX = window.XLSX;
const TEMPLATE_FIRMA = 'indiceia_template_v1';
const storage = getStorage(app);

// ============================================================
// PÁGINA
// ============================================================
const page = {
  _data: {
    productos: [],
    draftManual: {
      codigo:         '',
      nombre:         '',
      descripcion:    '',
      precio:         '',
      stock:          '',
      categoria:      '',
      imagen:         '',
      subcategoria:   '',
      marca:          '',
      disponibilidad: 'inmediata',
      atributos:      [],
      etiquetas:      []
    },
    showAdvanced: false,
    editingIndex: null,
  },

  _isEditMode:       false,
  _comercioId:       null,
  _originalSnapshot: [],

  // ──────────────────────────────────────────────────────────
  // HELPERS
  // ──────────────────────────────────────────────────────────
  _getEtiquetasExistentes() {
    const set = new Set();
    this._data.productos.forEach(p => (p.etiquetas || []).forEach(e => set.add(e)));
    this._data.draftManual.etiquetas.forEach(e => set.add(e));
    return [...set].sort();
  },

  _getCategoriasUnicas() {
    return [...new Set(
      this._data.productos
        .map(p => p.categoria)
        .filter(c => c && c.trim() && c !== 'general')
    )].sort((a, b) => a.localeCompare(b, 'es'));
  },

  // ──────────────────────────────────────────────────────────
  // UPLOAD IMAGEN
  // ──────────────────────────────────────────────────────────
  async _subirImagen(file) {
    if (!this._comercioId) throw new Error('Sin comercioId');
    const filename = `${Date.now()}-${file.name.replace(/\s+/g, '_')}`;
    const ref = storageRef(storage, `entidades/${this._comercioId}/productos/${filename}`);
    await uploadBytes(ref, file);
    return getDownloadURL(ref);
  },

  // ──────────────────────────────────────────────────────────
  // LOAD
  // ──────────────────────────────────────────────────────────
  async load(ctx) {
    this._isEditMode = ctx.isEditMode === true;
    this._comercioId = ctx.comercioId;

    if (!this._comercioId) {
      this._data.productos   = [];
      this._originalSnapshot = [];
      return;
    }

    try {
      const snap = await getDocs(collection(db, 'entidades', this._comercioId, 'productos'));
      this._data.productos = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      this._data.productos.sort((a, b) =>
        (a.nombre || '').localeCompare(b.nombre || '', 'es')
      );
      this._originalSnapshot = structuredClone(this._data.productos);
    } catch (err) {
      console.error('[productos] load() ERROR:', err);
      this._data.productos   = [];
      this._originalSnapshot = [];
    }
  },

  // ──────────────────────────────────────────────────────────
  // RENDER
  // ──────────────────────────────────────────────────────────
  render() {
    const root = document.getElementById('skeleton-page');
    root.innerHTML = '';

    const header = document.createElement('div');
    header.className = 'page-header';
    header.innerHTML = `
      <h1><i class="fas fa-box"></i> Catálogo de Productos</h1>
      <p>Cargá tus productos manualmente o importá desde Excel</p>
      <div class="product-stats">
        <span class="stat-badge">
          <i class="fas fa-boxes"></i>
          <strong>${this._data.productos.length}</strong> productos
        </span>
      </div>
    `;
    root.appendChild(header);
    root.appendChild(this._renderTipsCard());
    root.appendChild(this._renderFormCard());
    root.appendChild(this._renderImportCard());

    if (this._data.productos.length > 0) {
      root.appendChild(this._renderCategoriasCard());
      root.appendChild(this._renderTableCard());
    }

    root.appendChild(this._renderSaveButton());
  },

  // ──────────────────────────────────────────────────────────
  // TIPS CARD
  // ──────────────────────────────────────────────────────────
  _renderTipsCard() {
    const tips = [
      { icon: 'fa-tags',        titulo: 'Usá categorías',       texto: 'Asigná una categoría a cada producto (ej: Pizzas, Bebidas, Postres). Si usás un template visual, los productos se van a agrupar automáticamente.' },
      { icon: 'fa-font',        titulo: 'Nombres consistentes', texto: 'Usá siempre el mismo nombre para el mismo producto. El cliente lo ve tal cual lo escribís.' },
      { icon: 'fa-align-left',  titulo: 'Descripción corta',    texto: 'Una línea es suficiente. Ej: "Pizza con muzzarella y tomate, tamaño grande".' },
      { icon: 'fa-dollar-sign', titulo: 'Precio sin símbolos',  texto: 'Escribí solo el número, sin puntos ni símbolos. Ej: 5500 — no $5.500 ni 5,500.' },
      { icon: 'fa-image',       titulo: 'Imágenes',             texto: 'Subí una foto desde tu celular o pegá un link directo. Las fotos que subís quedan guardadas en ÍndiceIA.' }
    ];

    const container = document.createElement('div');
    const toggleBtn = document.createElement('button');
    toggleBtn.className = 'tips-toggle';
    toggleBtn.innerHTML = `<i class="fas fa-lightbulb"></i> Consejos para cargar bien tus productos <i class="fas fa-chevron-down tips-chevron"></i>`;

    const tipsContent = document.createElement('div');
    tipsContent.className = 'tips-content tips-hidden';

    tips.forEach(tip => {
      const item = document.createElement('div');
      item.className = 'tip-item';
      item.innerHTML = `
        <div class="tip-icon"><i class="fas ${tip.icon}"></i></div>
        <div class="tip-body"><strong>${tip.titulo}</strong><p>${tip.texto}</p></div>
      `;
      tipsContent.appendChild(item);
    });

    toggleBtn.addEventListener('click', () => {
      const isOpen = !tipsContent.classList.contains('tips-hidden');
      tipsContent.classList.toggle('tips-hidden', isOpen);
      toggleBtn.querySelector('.tips-chevron').className = `fas tips-chevron ${isOpen ? 'fa-chevron-down' : 'fa-chevron-up'}`;
    });

    container.appendChild(toggleBtn);
    container.appendChild(tipsContent);
    return container;
  },

  // ──────────────────────────────────────────────────────────
  // FORM CARD
  // ──────────────────────────────────────────────────────────
  _renderFormCard() {
    const container = document.createElement('div');
    container.id = 'form-manual-card';

    const codigo      = createFormField({ id: 'prod-codigo',      label: 'Código (opcional)',   placeholder: 'SKU123', helpText: 'Si no lo completás, se genera automáticamente', value: this._data.draftManual.codigo });
    const nombre      = createFormField({ id: 'prod-nombre',      label: 'Nombre del producto', required: true, placeholder: 'Ej: Pizza Muzzarella Grande', value: this._data.draftManual.nombre });
    const descripcion = createFormField({ id: 'prod-descripcion', label: 'Descripción',          type: 'textarea', rows: 2, required: true, placeholder: 'Una línea. Ej: Pizza con muzzarella y tomate, tamaño grande', value: this._data.draftManual.descripcion });
    
    // ── PRECIO CON FORMATO EN TIEMPO REAL ─────────────────────
    const precioGroup = document.createElement('div');
    precioGroup.className = 'form-group';

    const precioLabel = document.createElement('label');
    precioLabel.innerHTML = 'Precio <span class="required">*</span>';

    const precioInput = document.createElement('input');
    precioInput.type = 'text';
    precioInput.id = 'prod-precio';
    precioInput.placeholder = '5.500';
    precioInput.className = 'form-control';
    precioInput.inputMode = 'numeric';

    const _formatPrecioDisplay = (raw) => {
      const clean = String(raw).replace(/\D/g, '');
      return clean ? new Intl.NumberFormat('es-AR').format(parseInt(clean)) : '';
    };
    const _getPrecioRaw = () => precioInput.value.replace(/\./g, '').replace(/,/g, '');

    precioInput.value = this._data.draftManual.precio
      ? _formatPrecioDisplay(this._data.draftManual.precio)
      : '';

    precioInput.addEventListener('input', () => {
      const raw = precioInput.value.replace(/\D/g, '');
      const pos = precioInput.selectionStart;
      const prevLen = precioInput.value.length;
      precioInput.value = raw ? new Intl.NumberFormat('es-AR').format(parseInt(raw)) : '';
      const diff = precioInput.value.length - prevLen;
      precioInput.setSelectionRange(pos + diff, pos + diff);
    });

    const precioHelp = document.createElement('small');
    precioHelp.className = 'form-help';
    precioHelp.textContent = 'Solo el número, sin $ ni puntos';

    precioGroup.append(precioLabel, precioInput, precioHelp);
    const precio = { getValue: () => _getPrecioRaw() };
    // ──────────────────────────────────────────────────────────

    const stock       = createFormField({ id: 'prod-stock',       label: 'Stock',                type: 'number', placeholder: '0', value: this._data.draftManual.stock });
    const categoria   = createFormField({ id: 'prod-categoria',   label: 'Categoría',            required: true, placeholder: 'Ej: Pizzas', helpText: 'Necesaria para agrupar productos en el catálogo visual', value: this._data.draftManual.categoria });

    // Autocomplete categorías
    const categoriasExistentes = this._getCategoriasUnicas();
    if (categoriasExistentes.length > 0) {
      const datalist = document.createElement('datalist');
      datalist.id = 'categorias-datalist';
      categoriasExistentes.forEach(cat => {
        const opt = document.createElement('option');
        opt.value = cat;
        datalist.appendChild(opt);
      });
      categoria.appendChild(datalist);
      const input = categoria.querySelector('input');
      if (input) input.setAttribute('list', 'categorias-datalist');
    }

    // ── IMAGEN — upload + preview + fallback URL ──────────
    const imagenGroup = document.createElement('div');
    imagenGroup.className = 'form-group imagen-group';

    const imagenLabel = document.createElement('label');
    imagenLabel.textContent = 'Foto del producto';
    imagenGroup.appendChild(imagenLabel);

    // Preview
    const preview = document.createElement('div');
    preview.className = 'imagen-preview' + (this._data.draftManual.imagen ? ' imagen-preview--visible' : '');
    if (this._data.draftManual.imagen) {
      preview.innerHTML = `<img src="${this._data.draftManual.imagen}" alt="preview"/><button class="imagen-preview-remove" title="Quitar imagen"><i class="fas fa-times"></i></button>`;
      preview.querySelector('.imagen-preview-remove').addEventListener('click', () => {
        this._data.draftManual.imagen = '';
        this.render();
      });
    }
    imagenGroup.appendChild(preview);

    // Botón subir desde dispositivo
    const fileInput = document.createElement('input');
    fileInput.type    = 'file';
    fileInput.accept  = 'image/*';
    fileInput.style.display = 'none';
    imagenGroup.appendChild(fileInput);

    const btnSubir = document.createElement('button');
    btnSubir.type      = 'button';
    btnSubir.className = 'imagen-upload-btn';
    btnSubir.innerHTML = `<i class="fas fa-camera"></i> Subir foto desde mi dispositivo`;
    btnSubir.addEventListener('click', () => fileInput.click());
    imagenGroup.appendChild(btnSubir);

    fileInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      btnSubir.disabled   = true;
      btnSubir.innerHTML  = `<i class="fas fa-spinner fa-spin"></i> Subiendo...`;
      try {
        const url = await this._subirImagen(file);
        this._data.draftManual.imagen = url;
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
    sep.className = 'imagen-sep';
    sep.innerHTML = '<span>o pegá un link directo</span>';
    imagenGroup.appendChild(sep);

    // Campo URL como fallback
    const imagenUrl = document.createElement('input');
    imagenUrl.type        = 'url';
    imagenUrl.className   = 'imagen-url-input';
    imagenUrl.placeholder = 'https://...';
    imagenUrl.value       = this._data.draftManual.imagen || '';
    imagenUrl.addEventListener('input', () => {
      this._data.draftManual.imagen = imagenUrl.value.trim();
    });
    imagenGroup.appendChild(imagenUrl);

    // Objeto imagen compatible con _handleManualSubmit
    const imagen = {
      getValue: () => this._data.draftManual.imagen || imagenUrl.value.trim()
    };

    const _saveBaseDraft = () => {
      this._data.draftManual.codigo      = codigo.getValue();
      this._data.draftManual.nombre      = nombre.getValue();
      this._data.draftManual.descripcion = descripcion.getValue();
      this._data.draftManual.precio      = precio.getValue();
      this._data.draftManual.stock       = stock.getValue();
      this._data.draftManual.categoria   = categoria.getValue();
      this._data.draftManual.imagen      = imagen.getValue();
    };

    const toggleBtn = createButton({
      label:   this._data.showAdvanced ? 'Ocultar detalles' : 'Agregar más detalles',
      variant: 'link',
      icon:    this._data.showAdvanced ? 'fa-chevron-up' : 'fa-chevron-down',
      onClick: () => {
        _saveBaseDraft();
        this._data.showAdvanced = !this._data.showAdvanced;
        this.render();
      }
    });

    container.append(codigo, nombre, descripcion, precioGroup, stock, categoria, imagenGroup, toggleBtn);

    if (this._data.showAdvanced) {
      container.appendChild(this._renderAdvancedFields());
    }

    const spacer = document.createElement('div');
    spacer.className = 'form-actions-spacer';
    container.appendChild(spacer);

    const btnAgregar = createButton({
      label:   this._data.editingIndex !== null ? 'Actualizar Producto' : 'Agregar Producto',
      variant: 'primary',
      icon:    this._data.editingIndex !== null ? 'fa-check' : 'fa-plus',
      block:   true,
      onClick: () => {
        _saveBaseDraft();
        this._handleManualSubmit({ codigo, nombre, descripcion, precio, stock, categoria, imagen });
      }
    });

    if (this._data.editingIndex !== null) {
      const btnCancelar = createButton({
        label:   'Cancelar edición',
        variant: 'link',
        icon:    'fa-times',
        block:   true,
        onClick: () => {
          this._data.editingIndex = null;
          this._data.draftManual  = {
            codigo: '', nombre: '', descripcion: '', precio: '', stock: '',
            categoria: '', imagen: '', subcategoria: '', marca: '',
            disponibilidad: 'inmediata', atributos: [], etiquetas: []
          };
          this._data.showAdvanced = false;
          this.render();
        }
      });
      container.appendChild(btnCancelar);
    }

    container.appendChild(btnAgregar);

    return createCard({
      title:   this._data.editingIndex !== null ? 'Editando Producto' : 'Agregar Producto Manualmente',
      icon:    this._data.editingIndex !== null ? 'fa-edit' : 'fa-plus-circle',
      content: container
    });
  },

  _renderAdvancedFields() {
    const container = document.createElement('div');
    container.className = 'advanced-fields';

    const subcategoria   = createFormField({ id: 'prod-subcategoria',   label: 'Subcategoría',  placeholder: 'Ej: Especiales', value: this._data.draftManual.subcategoria });
    const marca          = createFormField({ id: 'prod-marca',           label: 'Marca',          placeholder: 'Ej: Nike',       value: this._data.draftManual.marca });
    const disponibilidad = createFormField({
      id: 'prod-disponibilidad', label: 'Disponibilidad', type: 'select',
      options: [
        { value: 'inmediata',    label: 'Inmediata'   },
        { value: 'bajo_pedido', label: 'Bajo pedido' },
        { value: 'sin_stock',   label: 'Sin stock'   }
      ],
      value: this._data.draftManual.disponibilidad || 'inmediata'
    });

    container.append(subcategoria, marca, disponibilidad);
    container.appendChild(this._renderAtributosSection());
    container.appendChild(this._renderEtiquetasSection());

    this._advancedRefs = { subcategoria, marca, disponibilidad };
    return container;
  },

  _renderAtributosSection() {
    const wrapper = document.createElement('div');
    wrapper.className = 'form-group';

    const label = document.createElement('label');
    label.textContent = 'Atributos personalizados';
    wrapper.appendChild(label);

    const list = document.createElement('div');
    list.className = 'atributos-list';

    this._data.draftManual.atributos.forEach((attr, index) => {
      const row = document.createElement('div');
      row.className = 'atributo-row';
      row.innerHTML = `<span><strong>${attr.key}:</strong> ${attr.value}</span><button type="button" class="btn-icon btn-sm"><i class="fas fa-times"></i></button>`;
      row.querySelector('button').addEventListener('click', () => {
        this._data.draftManual.atributos.splice(index, 1);
        this.render();
      });
      list.appendChild(row);
    });
    wrapper.appendChild(list);

    const inputs = document.createElement('div');
    inputs.className = 'atributo-inputs';
    inputs.innerHTML = `<input type="text" id="attr-key" placeholder="Nombre (ej: sabor)"><input type="text" id="attr-value" placeholder="Valor (ej: chocolate)">`;
    wrapper.appendChild(inputs);

    wrapper.appendChild(createButton({
      label: 'Agregar atributo', variant: 'secondary', size: 'sm', icon: 'fa-plus',
      onClick: () => {
        const key   = inputs.querySelector('#attr-key').value.trim();
        const value = inputs.querySelector('#attr-value').value.trim();
        if (key && value) {
          this._data.draftManual.atributos.push({ key, value });
          this.render();
        }
      }
    }));

    return wrapper;
  },

  _renderEtiquetasSection() {
    const wrapper = document.createElement('div');
    wrapper.className = 'form-group etiquetas-section';

    const label = document.createElement('label');
    label.textContent = 'Etiquetas';
    wrapper.appendChild(label);

    const helpText = document.createElement('p');
    helpText.className = 'etiquetas-help';
    helpText.textContent = 'Usadas para agrupar y filtrar productos. Hacé clic en × para quitar una etiqueta de este producto.';
    wrapper.appendChild(helpText);

    const tags = document.createElement('div');
    tags.className = 'etiquetas-tags';

    if (this._data.draftManual.etiquetas.length === 0) {
      const empty = document.createElement('span');
      empty.className = 'etiquetas-empty';
      empty.textContent = 'Sin etiquetas';
      tags.appendChild(empty);
    } else {
      this._data.draftManual.etiquetas.forEach((etiqueta, index) => {
        const tag = document.createElement('span');
        tag.className = 'etiqueta-tag';
        tag.innerHTML = `
          <span class="etiqueta-tag-text">${etiqueta}</span>
          <button type="button" class="etiqueta-tag-remove" title="Quitar etiqueta" aria-label="Quitar ${etiqueta}">
            <i class="fas fa-times"></i>
          </button>
        `;
        tag.querySelector('.etiqueta-tag-remove').addEventListener('click', () => {
          this._data.draftManual.etiquetas.splice(index, 1);
          this.render();
        });
        tags.appendChild(tag);
      });
    }
    wrapper.appendChild(tags);

    const inputWrapper = document.createElement('div');
    inputWrapper.className = 'etiqueta-input-wrapper';

    const input = document.createElement('input');
    input.type        = 'text';
    input.id          = 'etiqueta-input';
    input.placeholder = 'Ej: destacado, nuevo, sin tacc...';
    input.className   = 'etiqueta-input';
    inputWrapper.appendChild(input);

    const dropdown = document.createElement('div');
    dropdown.className = 'etiqueta-dropdown etiqueta-dropdown-hidden';
    inputWrapper.appendChild(dropdown);

    wrapper.appendChild(inputWrapper);

    const etiquetasExistentes = this._getEtiquetasExistentes()
      .filter(e => !this._data.draftManual.etiquetas.includes(e));

    const _addEtiqueta = (value) => {
      const val = value.trim().toLowerCase();
      if (val && !this._data.draftManual.etiquetas.includes(val)) {
        this._data.draftManual.etiquetas.push(val);
        this.render();
      }
    };

    const _renderDropdown = (filtro) => {
      dropdown.innerHTML = '';
      const sugerencias = etiquetasExistentes.filter(e =>
        e.toLowerCase().includes(filtro.toLowerCase())
      );
      if (sugerencias.length === 0) { dropdown.classList.add('etiqueta-dropdown-hidden'); return; }
      sugerencias.forEach(s => {
        const item = document.createElement('button');
        item.type      = 'button';
        item.className = 'etiqueta-dropdown-item';
        item.innerHTML = `<i class="fas fa-tag"></i> ${s}`;
        item.addEventListener('mousedown', (e) => { e.preventDefault(); _addEtiqueta(s); });
        dropdown.appendChild(item);
      });
      dropdown.classList.remove('etiqueta-dropdown-hidden');
    };

    input.addEventListener('input', () => {
      const val = input.value.trim();
      if (val.length === 0 && etiquetasExistentes.length > 0) _renderDropdown('');
      else if (val.length > 0) _renderDropdown(val);
      else dropdown.classList.add('etiqueta-dropdown-hidden');
    });
    input.addEventListener('focus', () => { if (etiquetasExistentes.length > 0) _renderDropdown(input.value.trim()); });
    input.addEventListener('blur',  () => { setTimeout(() => dropdown.classList.add('etiqueta-dropdown-hidden'), 150); });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ',') {
        e.preventDefault();
        const val = input.value.trim().replace(/,$/, '');
        if (val) _addEtiqueta(val);
      }
    });

    wrapper.appendChild(createButton({
      label: 'Agregar', variant: 'secondary', size: 'sm', icon: 'fa-plus',
      onClick: () => { const val = input.value.trim(); if (val) _addEtiqueta(val); }
    }));

    if (etiquetasExistentes.length > 0) {
      const sugerenciasWrap = document.createElement('div');
      sugerenciasWrap.className = 'etiquetas-sugerencias';
      const sugerenciasLabel = document.createElement('span');
      sugerenciasLabel.className = 'etiquetas-sugerencias-label';
      sugerenciasLabel.textContent = 'Etiquetas existentes:';
      sugerenciasWrap.appendChild(sugerenciasLabel);
      const chips = document.createElement('div');
      chips.className = 'etiquetas-chips';
      etiquetasExistentes.slice(0, 12).forEach(e => {
        const chip = document.createElement('button');
        chip.type = 'button';
        chip.className = 'etiqueta-chip';
        chip.textContent = e;
        chip.addEventListener('click', () => _addEtiqueta(e));
        chips.appendChild(chip);
      });
      sugerenciasWrap.appendChild(chips);
      wrapper.appendChild(sugerenciasWrap);
    }

    return wrapper;
  },

  _handleManualSubmit(refs) {
    const newProduct = {
      codigo:       refs.codigo.getValue()      || this._generateCodigo(),
      nombre:       refs.nombre.getValue(),
      descripcion:  refs.descripcion.getValue(),
      precio_final: parseFloat(refs.precio.getValue()) || 0,
      stock:        parseInt(refs.stock.getValue())    || 0,
      categoria:    refs.categoria.getValue(),
      imagen:       refs.imagen.getValue(),
      paused:       false,
      atributos:    {},
      etiquetas:    [...this._data.draftManual.etiquetas]
    };

    if (this._advancedRefs) {
      newProduct.subcategoria   = this._advancedRefs.subcategoria.getValue();
      newProduct.marca          = this._advancedRefs.marca.getValue();
      newProduct.disponibilidad = this._advancedRefs.disponibilidad.getValue();
    }

    this._data.draftManual.atributos.forEach(attr => {
      newProduct.atributos[attr.key] = attr.value;
    });

    if (!newProduct.nombre || !newProduct.descripcion) {
      showToast('Campos requeridos', 'Completá nombre y descripción', 'warning');
      return;
    }
    if (!newProduct.categoria) {
      showToast('Categoría requerida', 'Asigná una categoría (ej: Pizzas, Bebidas)', 'warning');
      return;
    }

    if (this._data.editingIndex !== null) {
      const original = this._data.productos[this._data.editingIndex];
      this._data.productos[this._data.editingIndex] = { ...original, ...newProduct };
      this._data.editingIndex = null;
      showToast('Producto actualizado', 'Guardá para confirmar los cambios', 'success');
    } else {
      this._data.productos.push(newProduct);
      showToast('Producto agregado', 'Guardá para confirmar los cambios', 'success');
    }

    this._data.productos.sort((a, b) =>
      (a.nombre || '').localeCompare(b.nombre || '', 'es')
    );

    this._data.draftManual = {
      codigo: '', nombre: '', descripcion: '', precio: '', stock: '',
      categoria: '', imagen: '', subcategoria: '', marca: '',
      disponibilidad: 'inmediata', atributos: [], etiquetas: []
    };
    this._data.showAdvanced = false;
    this.render();
  },

  // ──────────────────────────────────────────────────────────
  // GESTIONAR CATEGORÍAS
  // ──────────────────────────────────────────────────────────
  _renderCategoriasCard() {
    const container = document.createElement('div');
    const categorias = this._getCategoriasUnicas();

    if (categorias.length === 0) {
      const empty = document.createElement('p');
      empty.style.cssText = 'color:#888;font-size:13px;margin:0;';
      empty.textContent = 'No hay categorías cargadas todavía.';
      container.appendChild(empty);
      return createCard({ title: 'Gestionar Categorías', icon: 'fa-tags', content: container });
    }

    const hint = document.createElement('p');
    hint.className = 'categorias-hint';
    hint.textContent = 'Renombrá una categoría para corregirla en todos los productos que la tienen.';
    container.appendChild(hint);

    const list = document.createElement('div');
    list.className = 'categorias-list';

    categorias.forEach(cat => {
      const count = this._data.productos.filter(p => p.categoria === cat).length;
      const row = document.createElement('div');
      row.className = 'categoria-row';

      const info = document.createElement('div');
      info.className = 'categoria-info';
      info.innerHTML = `
        <span class="categoria-nombre">${cat}</span>
        <span class="categoria-count">${count} producto${count !== 1 ? 's' : ''}</span>
      `;

      const input = document.createElement('input');
      input.type        = 'text';
      input.className   = 'categoria-rename-input';
      input.value       = cat;
      input.placeholder = 'Nuevo nombre...';

      const btnRenombrar = createButton({
        label: 'Renombrar', variant: 'secondary', size: 'sm', icon: 'fa-pen',
        onClick: () => {
          const nuevoNombre = input.value.trim();
          if (!nuevoNombre || nuevoNombre === cat) return;
          this._data.productos.forEach(p => {
            if (p.categoria === cat) p.categoria = nuevoNombre;
          });
          showToast('Categoría renombrada', `"${cat}" → "${nuevoNombre}" en ${count} producto${count !== 1 ? 's' : ''}`, 'success');
          this.render();
        }
      });

      row.appendChild(info);
      row.appendChild(input);
      row.appendChild(btnRenombrar);
      list.appendChild(row);
    });

    container.appendChild(list);

    const hint2 = document.createElement('p');
    hint2.className = 'categorias-hint-small';
    hint2.textContent = 'Los cambios se aplican al guardar el catálogo.';
    container.appendChild(hint2);

    return createCard({ title: 'Gestionar Categorías', icon: 'fa-tags', content: container });
  },

  // ──────────────────────────────────────────────────────────
  // IMPORT CARD
  // ──────────────────────────────────────────────────────────
  _renderImportCard() {
    const container = document.createElement('div');

    const instrucciones = document.createElement('div');
    instrucciones.className = 'import-instrucciones';
    instrucciones.innerHTML = `
      <p>Para cargar varios productos a la vez:</p>
      <ol>
        <li>Descargá la plantilla oficial de ÍndiceIA</li>
        <li>Completá tus productos en el archivo</li>
        <li>Subí el archivo completado</li>
      </ol>
    `;
    container.appendChild(instrucciones);

    // ── BOTÓN DE DESCARGA INTELIGENTE ──────────────────────
    const tieneProductos = this._data.productos.length > 0;
    container.appendChild(createButton({
      label: tieneProductos ? 'Descargar mis productos para editar' : 'Descargar plantilla vacía',
      variant: 'secondary',
      icon: 'fa-download',
      onClick: () => tieneProductos ? this._downloadProductos() : this._downloadTemplate()
    }));
    // ────────────────────────────────────────────────────────

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
    return createCard({ title: 'Importar desde Plantilla', icon: 'fa-file-excel', content: container });
  },

  _downloadTemplate() {
    window.open('/plantilla_indiceia_productos.xlsx', '_blank');
  },

  // ── NUEVO MÉTODO: EXPORTAR PRODUCTOS ACTUALES ───────────
  _downloadProductos() {
    if (!XLSX) { showToast('Error', 'Librería XLSX no cargada', 'error'); return; }

    const wb = XLSX.utils.book_new();

    // Hoja de productos con datos actuales
    const CAMPOS_BASE = ['codigo','nombre','descripcion','precio_final','categoria','stock','disponibilidad','imagen'];
    const rows = this._data.productos.map(p => {
      const row = {
        codigo:         p.codigo        || '',
        nombre:         p.nombre        || '',
        descripcion:    p.descripcion   || '',
        precio_final:   p.precio_final  || 0,
        categoria:      p.categoria     || '',
        stock:          p.stock         ?? 0,
        disponibilidad: p.disponibilidad || 'inmediata',
        imagen:         p.imagen        || ''
      };
      // Atributos extra como columnas adicionales
      if (p.atributos && typeof p.atributos === 'object') {
        Object.entries(p.atributos).forEach(([k, v]) => { row[k] = v; });
      }
      return row;
    });

    const ws = XLSX.utils.json_to_sheet(rows, { header: CAMPOS_BASE });

    // Ancho de columnas para mejor legibilidad
    ws['!cols'] = [
      { wch: 18 }, // codigo
      { wch: 30 }, // nombre
      { wch: 40 }, // descripcion
      { wch: 12 }, // precio_final
      { wch: 18 }, // categoria
      { wch: 8  }, // stock
      { wch: 14 }, // disponibilidad
      { wch: 50 }, // imagen
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'productos');

    // Hoja de firma — para que el validador la reconozca al reimportar
    const metaWs = XLSX.utils.aoa_to_sheet([[TEMPLATE_FIRMA]]);
    XLSX.utils.book_append_sheet(wb, metaWs, '_indiceia_meta');

    XLSX.writeFile(wb, 'mis_productos_indiceia.xlsx');
    showToast('Descargado', `${this._data.productos.length} productos exportados`, 'success');
  },
  // ─────────────────────────────────────────────────────────

  _parseFile(file) {
    if (!XLSX) { showToast('Error', 'Librería XLSX no cargada', 'error'); return; }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target.result, { type: 'binary' });

        const metaSheet = wb.Sheets['_indiceia_meta'];
        if (!metaSheet) { showToast('Archivo no válido', 'Usá la plantilla oficial de ÍndiceIA.', 'error'); return; }
        const firmaData = XLSX.utils.sheet_to_json(metaSheet, { header: 1 });
        if (!firmaData?.[0]?.[0] || firmaData[0][0] !== TEMPLATE_FIRMA) {
          showToast('Archivo no válido', 'Usá la plantilla oficial de ÍndiceIA.', 'error'); return;
        }

        const ws       = wb.Sheets['productos'];
        const jsonData = XLSX.utils.sheet_to_json(ws, { defval: '' });

        if (jsonData.length === 0) { showToast('Plantilla vacía', 'Completá al menos un producto en la plantilla', 'warning'); return; }

        const CAMPOS_BASE = ['codigo','nombre','descripcion','precio_final','categoria','stock','disponibilidad','imagen'];
        let added = 0, skipped = 0;

        jsonData.forEach((row) => {
          if (!row.nombre || !String(row.categoria || '').trim()) { skipped++; return; }

          const producto = {
            codigo:         String(row.codigo || this._generateCodigo()),
            nombre:         String(row.nombre).trim(),
            descripcion:    String(row.descripcion || '').trim(),
            precio_final:   this._parsePrecio(row.precio_final),
            stock:          parseInt(row.stock) || 0,
            categoria:      String(row.categoria || '').trim(),
            imagen:         String(row.imagen || '').trim(),
            disponibilidad: ['inmediata', 'bajo_pedido', 'sin_stock'].includes(row.disponibilidad)
                              ? row.disponibilidad : 'inmediata',
            paused: false, atributos: {}, etiquetas: []
          };

          Object.keys(row).forEach(col => {
            if (!CAMPOS_BASE.includes(col) && row[col] !== '' && row[col] != null) {
              producto.atributos[col] = String(row[col]).trim();
            }
          });

          const idx2 = this._data.productos.findIndex(p => p.codigo === producto.codigo);
          if (idx2 >= 0) {
            this._data.productos[idx2] = { ...this._data.productos[idx2], ...producto };
          } else {
            this._data.productos.push(producto);
          }
          added++;
        });

        this._data.productos.sort((a, b) => (a.nombre || '').localeCompare(b.nombre || '', 'es'));
        showToast('Plantilla cargada', `${added} productos listos para guardar`, 'success');
        this.render();

      } catch (err) {
        console.error('[productos] _parseFile() ERROR:', err);
        showToast('Error', 'No se pudo leer el archivo', 'error');
      }
    };
    reader.readAsBinaryString(file);
  },

  _parsePrecio(value) {
    if (typeof value === 'number') return value;
    if (!value) return 0;
    let clean = String(value).replace(/[^\d,.-]/g, '').replace(',', '.');
    const parts = clean.split('.');
    if (parts.length > 2) clean = parts.slice(0, -1).join('') + '.' + parts[parts.length - 1];
    const num = parseFloat(clean);
    return isNaN(num) ? 0 : num;
  },

  _generateCodigo() {
    return `PR${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
  },

  // ──────────────────────────────────────────────────────────
  // TABLE CARD
  // ──────────────────────────────────────────────────────────
  _renderTableCard() {
    const container = document.createElement('div');

    const header = document.createElement('div');
    header.className = 'table-header';
    const search = createFormField({
      id: 'search-products', type: 'text', placeholder: 'Buscar productos...',
      actions: { onInput: (value) => this._filterProducts(value) }
    });
    search.classList.add('search-box');
    header.appendChild(search);
    container.appendChild(header);

    const tableWrap = document.createElement('div');
    tableWrap.className = 'table-container';

    const table = document.createElement('table');
    table.className = 'products-table';
    table.innerHTML = `
      <thead>
        <tr>
          <th>Nombre</th>
          <th>Categoría</th>
          <th style="text-align:right">Precio</th>
          <th style="text-align:center">Stock</th>
          <th style="text-align:center">Imagen</th>
          <th>Etiquetas</th>
          <th style="text-align:center">Acciones</th>
        </tr>
      </thead>
      <tbody id="products-tbody"></tbody>
    `;

    const tbody = table.querySelector('#products-tbody');

    this._data.productos.forEach((p, index) => {
      const row = document.createElement('tr');
      row.className     = p.paused ? 'paused-row' : '';
      row.dataset.index = index;

      const tieneImagen = !!(p.imagen && p.imagen.trim());
      const imagenHtml  = tieneImagen
        ? `<img src="${p.imagen}" style="width:40px;height:40px;object-fit:cover;border-radius:6px;" onerror="this.replaceWith('<i class=\\'fas fa-times-circle\\'></i>')">`
        : '<i class="fas fa-times-circle" style="color:var(--s-gray);font-size:16px;" title="Sin imagen"></i>';

      const etiquetasHtml = (p.etiquetas || []).length > 0
        ? (p.etiquetas || []).map(e => `<span class="table-tag">${e}</span>`).join('')
        : '<span class="table-tag-empty">—</span>';

      row.innerHTML = `
        <td><strong>${p.nombre || '-'}</strong>${p.codigo ? `<br><small style="color:#aaa">${p.codigo}</small>` : ''}</td>
        <td>${p.categoria || '<span style="color:#aaa;font-style:italic">general</span>'}</td>
        <td style="text-align:right">${p.precio_final ? `$${this._formatNumber(p.precio_final)}` : '-'}</td>
        <td style="text-align:center">${p.stock ?? 0}</td>
        <td style="text-align:center">${imagenHtml}</td>
        <td><div class="table-tags">${etiquetasHtml}</div></td>
        <td>
          <div class="action-buttons">
            <button class="btn-action btn-edit"  title="Editar"><i class="fas fa-pen"></i></button>
            <button class="btn-action ${p.paused ? 'btn-play' : 'btn-pause'}" title="${p.paused ? 'Activar' : 'Pausar'}">
              <i class="fas fa-${p.paused ? 'play' : 'pause'}"></i>
            </button>
            <button class="btn-action btn-delete" title="Eliminar"><i class="fas fa-trash"></i></button>
          </div>
        </td>
      `;
      row.querySelector('.btn-edit').addEventListener('click',   () => this._editProduct(index));
      row.querySelector('.btn-pause, .btn-play').addEventListener('click', () => this._toggleProduct(index));
      row.querySelector('.btn-delete').addEventListener('click', () => this._deleteProduct(index));
      tbody.appendChild(row);
    });

    tableWrap.appendChild(table);
    container.appendChild(tableWrap);

    return createCard({ title: 'Productos Cargados', icon: 'fa-table', variant: 'warning', content: container });
  },

  _filterProducts(searchTerm) {
    document.querySelectorAll('#products-tbody tr').forEach(row => {
      row.style.display = row.textContent.toLowerCase().includes(searchTerm.toLowerCase()) ? '' : 'none';
    });
  },

  _editProduct(index) {
    const p = this._data.productos[index];
    this._data.editingIndex = index;
    this._data.showAdvanced = !!(
      p.subcategoria || p.marca ||
      p.disponibilidad !== 'inmediata' || p.etiquetas?.length > 0
    );
    this._data.draftManual = {
      codigo:         p.codigo         || '',
      nombre:         p.nombre         || '',
      descripcion:    p.descripcion    || '',
      precio:         p.precio_final   ? String(p.precio_final) : '',
      stock:          p.stock          !== undefined ? String(p.stock) : '',
      categoria:      p.categoria      || '',
      imagen:         p.imagen         || '',
      subcategoria:   p.subcategoria   || '',
      marca:          p.marca          || '',
      disponibilidad: p.disponibilidad || 'inmediata',
      atributos:      p.atributos ? Object.entries(p.atributos).map(([key, value]) => ({ key, value })) : [],
      etiquetas:      [...(p.etiquetas || [])]
    };
    this.render();
    setTimeout(() => {
      const formCard = document.getElementById('form-manual-card');
      if (formCard) formCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  },

  _toggleProduct(index) {
    this._data.productos[index].paused = !this._data.productos[index].paused;
    this.render();
  },

  _deleteProduct(index) {
    const nombre = this._data.productos[index].nombre || 'este producto';
    if (confirm(`¿Eliminar "${nombre}"?\n\nEsta acción no se puede deshacer.`)) {
      this._data.productos.splice(index, 1);
      showToast('Producto eliminado', 'Guardá para confirmar', 'info');
      this.render();
    }
  },

  _formatNumber(num) {
    return new Intl.NumberFormat('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num);
  },

  // ──────────────────────────────────────────────────────────
  // SAVE BUTTON
  // ──────────────────────────────────────────────────────────
  _renderSaveButton() {
    const dirtyController = {
      hasUnsavedChanges: () => JSON.stringify(this._data.productos) !== JSON.stringify(this._originalSnapshot),
      markSaved:         () => { this._originalSnapshot = structuredClone(this._data.productos); }
    };

    return createOnboardingButton({
      stepName: 'productos',
      validate: () => {
        const activos = this._data.productos.filter(p => !p.paused).length;
        if (this._isEditMode && !dirtyController.hasUnsavedChanges()) return true;
        return activos > 0;
      },
      getLabel: () => {
        const activos = this._data.productos.filter(p => !p.paused).length;
        if (activos === 0) return 'Cargá al menos un producto';
        if (this._isEditMode && !dirtyController.hasUnsavedChanges()) return 'Volver al dashboard';
        return 'Guardar productos';
      },
      dirtyController,
      onSave: async ({ uid, comercioId }) => {
        if (!comercioId) throw new Error('No hay comercioId');

        const productosRef = collection(db, 'entidades', comercioId, 'productos');
        const batch        = writeBatch(db);
        const existentes   = await getDocs(productosRef);
        const existingMap  = new Map(existentes.docs.map(d => [d.id, d.data()]));
        const currentMap   = new Map(this._data.productos.filter(p => p.id).map(p => [p.id, p]));

        const toDelete = [];
        const toUpdate = [];
        const toAdd    = [];

        existentes.docs.forEach(d => { if (!currentMap.has(d.id)) toDelete.push(d.ref); });

        this._data.productos.forEach(p => {
          if (!p.id) {
            toAdd.push(p);
          } else {
            const old = existingMap.get(p.id);
            if (old && JSON.stringify(old) !== JSON.stringify(p)) {
              toUpdate.push({ ref: doc(db, 'entidades', comercioId, 'productos', p.id), data: p });
            }
          }
        });

        const totalOps = toDelete.length + toUpdate.length + toAdd.length;
        if (totalOps === 0) {
          showToast('Sin cambios', 'No hay cambios para guardar', 'info');
          return { success: true, stepMarked: false };
        }

        showProgressOverlay(totalOps, {
          title: 'Sincronizando catálogo',
          initialMessage: `${toDelete.length} eliminados, ${toUpdate.length} actualizados, ${toAdd.length} nuevos`
        });

        for (const ref of toDelete) { updateProgress('Eliminando producto...'); batch.delete(ref); }
        for (const { ref, data } of toUpdate) {
          updateProgress(`Actualizando ${data.nombre || 'producto'}...`);
          const { id, ...rest } = data;
          batch.update(ref, { ...rest, fechaActualizacion: serverTimestamp() });
        }
        for (const p of toAdd) {
          updateProgress(`Creando ${p.nombre || 'producto'}...`);
          const newRef = doc(productosRef);
          batch.set(newRef, { ...p, fechaCreacion: serverTimestamp(), fechaActualizacion: serverTimestamp() });
        }

        await batch.commit();
        finishProgressOverlay('Catálogo sincronizado', 800);
        return { success: true, stepMarked: false };
      },
      onSuccess: () => showToast('Éxito', 'Productos guardados correctamente', 'success'),
      onError:   (err) => {
        console.error('[productos] onError():', err);
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
  options: { loadingMessage: 'Cargando catálogo...' }
});
