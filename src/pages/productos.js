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
import { db }                      from '/src/services/firebase/firebase.js';
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

// ============================================================
// PÁGINA
// ============================================================
const page = {
  _data: {
    productos: [],
    // FIX: draftManual ahora incluye todos los campos base para que sobrevivan el render()
    draftManual: {
      codigo:       '',
      nombre:       '',
      descripcion:  '',
      precio:       '',
      stock:        '',
      categoria:    '',
      subcategoria: '',
      marca:        '',
      imagen:       '',
      disponibilidad: 'inmediata',
      atributos:    [],
      etiquetas:    []
    },
    draftImport: {
      csvData:    [],
      csvColumns: [],
      mapping:    {}
    },
    showAdvanced:      false,
    showImportPreview: false
  },

  _isEditMode:        false,
  _originalSnapshot:  [],

  // ──────────────────────────────────────────────────────────
  // LOAD
  // ──────────────────────────────────────────────────────────
  async load(ctx) {
    console.log('[productos] load() ctx:', ctx);

    this._isEditMode = ctx.isEditMode === true;
    const comercioId = ctx.comercioId;

    if (!comercioId) {
      console.warn('[productos] load() → sin comercioId, productos vacíos');
      this._data.productos   = [];
      this._originalSnapshot = [];
      return;
    }

    try {
      const snap = await getDocs(collection(db, 'comercios', comercioId, 'productos'));
      this._data.productos   = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      this._originalSnapshot = structuredClone(this._data.productos);
      console.log(`[productos] load() → ${this._data.productos.length} productos cargados`);
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
    console.log('[productos] render() → productos:', this._data.productos.length, '| showAdvanced:', this._data.showAdvanced);

    const root = document.getElementById('skeleton-page');
    root.innerHTML = '';

    const header = document.createElement('div');
    header.className = 'page-header';
    header.innerHTML = `
      <h1><i class="fas fa-box"></i> Catálogo de Productos</h1>
      <p>Cargá tus productos manualmente o importá desde Excel/CSV</p>
      <div class="product-stats">
        <span class="stat-badge">
          <i class="fas fa-boxes"></i>
          <strong id="productCount">${this._data.productos.length}</strong> productos
        </span>
      </div>
    `;
    root.appendChild(header);
    root.appendChild(this._renderFormCard());
    root.appendChild(this._renderImportCard());

    if (this._data.productos.length > 0) {
      root.appendChild(this._renderTableCard());
    }

    root.appendChild(this._renderSaveButton());
  },

  // ──────────────────────────────────────────────────────────
  // FORM CARD
  // ──────────────────────────────────────────────────────────
  _renderFormCard() {
    console.log('[productos] _renderFormCard() → draft base:', {
      codigo:      this._data.draftManual.codigo,
      nombre:      this._data.draftManual.nombre,
      descripcion: this._data.draftManual.descripcion,
      precio:      this._data.draftManual.precio,
      stock:       this._data.draftManual.stock,
      categoria:   this._data.draftManual.categoria
    });

    const container = document.createElement('div');

    // FIX: Se pasa value: desde el draft para que los campos no se borren al re-renderizar
    const codigo      = createFormField({ id: 'prod-codigo',      label: 'Código (opcional)',    placeholder: 'SKU123',                   helpText: 'Si no lo completás, se genera automáticamente', value: this._data.draftManual.codigo });
    const nombre      = createFormField({ id: 'prod-nombre',      label: 'Nombre del producto',  required: true, placeholder: 'Ej: Remera deportiva',  value: this._data.draftManual.nombre });
    const descripcion = createFormField({ id: 'prod-descripcion', label: 'Descripción',           type: 'textarea', rows: 3, required: true, placeholder: 'Describe el producto...', value: this._data.draftManual.descripcion });
    const precio      = createFormField({ id: 'prod-precio',      label: 'Precio',                type: 'number', required: true, placeholder: '0.00', value: this._data.draftManual.precio });
    const stock       = createFormField({ id: 'prod-stock',       label: 'Stock',                 type: 'number', placeholder: '0',        value: this._data.draftManual.stock });
    const categoria   = createFormField({ id: 'prod-categoria',   label: 'Categoría',             placeholder: 'Ej: Ropa',                 value: this._data.draftManual.categoria });

    // Helper: persiste los campos base al draft ANTES de re-renderizar
    const _saveBaseDraft = () => {
      this._data.draftManual.codigo      = codigo.getValue();
      this._data.draftManual.nombre      = nombre.getValue();
      this._data.draftManual.descripcion = descripcion.getValue();
      this._data.draftManual.precio      = precio.getValue();
      this._data.draftManual.stock       = stock.getValue();
      this._data.draftManual.categoria   = categoria.getValue();
      console.log('[productos] _saveBaseDraft() guardado:', { ...this._data.draftManual });
    };

    const toggleBtn = createButton({
      label:   this._data.showAdvanced ? 'Ocultar detalles' : 'Agregar más detalles',
      variant: 'link',
      icon:    this._data.showAdvanced ? 'fa-chevron-up' : 'fa-chevron-down',
      onClick: () => {
        // FIX: guardamos los valores ANTES de destruir el DOM con render()
        _saveBaseDraft();
        this._data.showAdvanced = !this._data.showAdvanced;
        console.log('[productos] toggleAdvanced → showAdvanced:', this._data.showAdvanced);
        this.render();
      }
    });

    container.append(codigo, nombre, descripcion, precio, stock, categoria, toggleBtn);

    if (this._data.showAdvanced) {
      container.appendChild(this._renderAdvancedFields());
    }

    const btnAgregar = createButton({
      label:   'Agregar Producto',
      variant: 'primary',
      icon:    'fa-plus',
      block:   true,
      onClick: () => {
        // FIX: también guardamos antes de llamar al submit (por si acaso)
        _saveBaseDraft();
        this._handleManualSubmit({ codigo, nombre, descripcion, precio, stock, categoria });
      }
    });

    container.appendChild(btnAgregar);

    return createCard({ title: 'Agregar Producto Manualmente', icon: 'fa-plus-circle', content: container });
  },

  _renderAdvancedFields() {
    console.log('[productos] _renderAdvancedFields() → draft avanzado:', {
      subcategoria:   this._data.draftManual.subcategoria,
      marca:          this._data.draftManual.marca,
      imagen:         this._data.draftManual.imagen,
      disponibilidad: this._data.draftManual.disponibilidad
    });

    const container = document.createElement('div');
    container.className = 'advanced-fields';

    const subcategoria   = createFormField({ id: 'prod-subcategoria',   label: 'Subcategoría',   placeholder: 'Ej: Remeras',  value: this._data.draftManual.subcategoria });
    const marca          = createFormField({ id: 'prod-marca',           label: 'Marca',           placeholder: 'Ej: Nike',     value: this._data.draftManual.marca });
    const imagen         = createFormField({ id: 'prod-imagen',          label: 'URL de imagen',   type: 'url', placeholder: 'https://...', value: this._data.draftManual.imagen });
    const disponibilidad = createFormField({
      id: 'prod-disponibilidad',
      label: 'Disponibilidad',
      type: 'select',
      options: [
        { value: 'inmediata',    label: 'Inmediata' },
        { value: 'bajo_pedido', label: 'Bajo pedido' },
        { value: 'sin_stock',   label: 'Sin stock' }
      ],
      value: this._data.draftManual.disponibilidad || 'inmediata'
    });

    container.append(subcategoria, marca, imagen, disponibilidad);
    container.appendChild(this._renderAtributosSection());
    container.appendChild(this._renderEtiquetasSection());

    // FIX: guardamos la referencia para poder leer los valores en _handleManualSubmit
    // y también persistimos al draft cada vez que cambian
    this._advancedRefs = { subcategoria, marca, imagen, disponibilidad };

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
        console.log('[productos] atributo eliminado:', attr);
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
      label:   'Agregar atributo',
      variant: 'secondary',
      size:    'sm',
      icon:    'fa-plus',
      onClick: () => {
        const key   = inputs.querySelector('#attr-key').value.trim();
        const value = inputs.querySelector('#attr-value').value.trim();
        if (key && value) {
          console.log('[productos] atributo agregado:', { key, value });
          this._data.draftManual.atributos.push({ key, value });
          this.render();
        } else {
          console.warn('[productos] atributo incompleto → key:', key, '| value:', value);
        }
      }
    }));

    return wrapper;
  },

  _renderEtiquetasSection() {
    const wrapper = document.createElement('div');
    wrapper.className = 'form-group';

    const label = document.createElement('label');
    label.textContent = 'Etiquetas';
    wrapper.appendChild(label);

    const tags = document.createElement('div');
    tags.className = 'etiquetas-tags';

    this._data.draftManual.etiquetas.forEach((etiqueta, index) => {
      const tag = document.createElement('span');
      tag.className = 'etiqueta-tag';
      tag.innerHTML = `${etiqueta}<button type="button">×</button>`;
      tag.querySelector('button').addEventListener('click', () => {
        console.log('[productos] etiqueta eliminada:', etiqueta);
        this._data.draftManual.etiquetas.splice(index, 1);
        this.render();
      });
      tags.appendChild(tag);
    });
    wrapper.appendChild(tags);

    const inputGroup = document.createElement('div');
    inputGroup.className = 'etiqueta-input-group';
    inputGroup.innerHTML = `<input type="text" id="etiqueta-input" placeholder="Ej: nuevo, destacado">`;
    wrapper.appendChild(inputGroup);

    wrapper.appendChild(createButton({
      label:   'Agregar etiqueta',
      variant: 'secondary',
      size:    'sm',
      icon:    'fa-tag',
      onClick: () => {
        const value = inputGroup.querySelector('#etiqueta-input').value.trim();
        if (value && !this._data.draftManual.etiquetas.includes(value)) {
          console.log('[productos] etiqueta agregada:', value);
          this._data.draftManual.etiquetas.push(value);
          this.render();
        } else {
          console.warn('[productos] etiqueta vacía o duplicada:', value);
        }
      }
    }));

    return wrapper;
  },

  _handleManualSubmit(refs) {
    const newProduct = {
      codigo:       refs.codigo.getValue() || this._generateCodigo(),
      nombre:       refs.nombre.getValue(),
      descripcion:  refs.descripcion.getValue(),
      precio_final: parseFloat(refs.precio.getValue()) || 0,
      stock:        parseInt(refs.stock.getValue()) || 0,
      categoria:    refs.categoria.getValue(),
      paused:       false,
      atributos:    {},
      etiquetas:    [...this._data.draftManual.etiquetas]
    };

    if (this._advancedRefs) {
      newProduct.subcategoria   = this._advancedRefs.subcategoria.getValue();
      newProduct.marca          = this._advancedRefs.marca.getValue();
      newProduct.imagen         = this._advancedRefs.imagen.getValue();
      newProduct.disponibilidad = this._advancedRefs.disponibilidad.getValue();
    }

    this._data.draftManual.atributos.forEach(attr => {
      newProduct.atributos[attr.key] = attr.value;
    });

    console.log('[productos] _handleManualSubmit() producto a agregar:', newProduct);

    if (!newProduct.nombre || !newProduct.descripcion) {
      console.warn('[productos] _handleManualSubmit() → faltan campos requeridos');
      showToast('Campos requeridos', 'Completá nombre y descripción', 'warning');
      return;
    }

    this._data.productos.push(newProduct);

    // FIX: reset completo del draft incluyendo todos los campos
    this._data.draftManual = {
      codigo:       '',
      nombre:       '',
      descripcion:  '',
      precio:       '',
      stock:        '',
      categoria:    '',
      subcategoria: '',
      marca:        '',
      imagen:       '',
      disponibilidad: 'inmediata',
      atributos:    [],
      etiquetas:    []
    };
    this._data.showAdvanced = false;

    console.log('[productos] producto agregado. Total:', this._data.productos.length);
    showToast('Producto agregado', 'Guardá para confirmar los cambios', 'success');
    this.render();
  },

  // ──────────────────────────────────────────────────────────
  // IMPORT CARD
  // ──────────────────────────────────────────────────────────
  _renderImportCard() {
    const container = document.createElement('div');

    const uploadZone = document.createElement('div');
    uploadZone.className = 'upload-zone';
    uploadZone.innerHTML = `
      <div class="upload-icon"><i class="fas fa-cloud-upload-alt"></i></div>
      <p class="upload-text"><strong>Arrastrá tu archivo aquí</strong></p>
      <p class="upload-subtext">o hacé clic para seleccionar</p>
      <div class="upload-formats">
        <span class="format-badge">.xlsx</span>
        <span class="format-badge">.xls</span>
        <span class="format-badge">.csv</span>
      </div>
    `;

    const fileInput = document.createElement('input');
    fileInput.type    = 'file';
    fileInput.accept  = '.xlsx,.xls,.csv';
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

    if (this._data.showImportPreview && this._data.draftImport.csvData.length > 0) {
      container.appendChild(this._renderImportPreview());
    }

    return createCard({ title: 'Importar desde Excel/CSV', icon: 'fa-file-excel', content: container });
  },

  _parseFile(file) {
    console.log('[productos] _parseFile() archivo:', file.name, '| tipo:', file.type, '| tamaño:', file.size);

    if (!XLSX) {
      console.error('[productos] _parseFile() → XLSX no disponible en window');
      showToast('Error', 'Librería XLSX no cargada', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb       = XLSX.read(e.target.result, { type: 'binary' });
        const sheet    = wb.Sheets[wb.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(sheet, { defval: '' });

        console.log('[productos] _parseFile() hojas:', wb.SheetNames, '| filas parseadas:', jsonData.length);

        if (jsonData.length === 0) {
          console.warn('[productos] _parseFile() → archivo vacío');
          showToast('Error', 'El archivo está vacío', 'error');
          return;
        }

        this._data.draftImport.csvData    = jsonData;
        this._data.draftImport.csvColumns = Object.keys(jsonData[0]);
        this._data.showImportPreview      = true;
        this._data.draftImport.mapping    = this._autoDetectMapping();

        console.log('[productos] _parseFile() columnas detectadas:', this._data.draftImport.csvColumns);
        console.log('[productos] _parseFile() mapeo auto:', this._data.draftImport.mapping);

        showToast('Archivo cargado', `${jsonData.length} filas detectadas`, 'success');
        this.render();
      } catch (err) {
        console.error('[productos] _parseFile() ERROR al parsear:', err);
        showToast('Error', 'No se pudo leer el archivo', 'error');
      }
    };
    reader.readAsBinaryString(file);
  },

  _autoDetectMapping() {
    const mapping = {};
    const columns = this._data.draftImport.csvColumns;
    const aliases = {
      codigo:       ['codigo', 'code', 'id', 'sku'],
      nombre:       ['nombre', 'articulo', 'producto', 'name', 'title'],
      descripcion:  ['descripcion', 'description'],
      precio_final: ['precio', 'price', 'pvp'],
      stock:        ['stock', 'cantidad', 'qty'],
      categoria:    ['categoria', 'category']
    };

    columns.forEach(col => {
      const norm = col.toLowerCase().trim();
      for (const [field, list] of Object.entries(aliases)) {
        if (list.some(a => norm.includes(a))) {
          mapping[col] = field;
          break;
        }
      }
    });

    return mapping;
  },

  _renderImportPreview() {
    const container = document.createElement('div');
    container.className = 'import-preview';

    const count = document.createElement('p');
    count.innerHTML = `<strong>${this._data.draftImport.csvData.length}</strong> filas detectadas`;
    container.appendChild(count);

    const tableWrap = document.createElement('div');
    tableWrap.className = 'preview-table-container';
    const table = document.createElement('table');
    table.className = 'preview-table';
    table.innerHTML = `
      <thead><tr>${this._data.draftImport.csvColumns.map(c => `<th>${c}</th>`).join('')}</tr></thead>
      <tbody>${this._data.draftImport.csvData.slice(0, 5).map(row =>
        `<tr>${this._data.draftImport.csvColumns.map(c => `<td>${row[c] || ''}</td>`).join('')}</tr>`
      ).join('')}</tbody>
    `;
    tableWrap.appendChild(table);
    container.appendChild(tableWrap);

    const mappingSection = document.createElement('div');
    mappingSection.className = 'mapping-section';
    mappingSection.innerHTML = '<h4>Mapeo de columnas</h4><p class="help-text">Indicá qué campo corresponde a cada columna:</p>';

    const camposBase = [
      { value: '',             label: '-- Ignorar --' },
      { value: 'codigo',       label: 'Código' },
      { value: 'nombre',       label: 'Nombre' },
      { value: 'descripcion',  label: 'Descripción' },
      { value: 'precio_final', label: 'Precio' },
      { value: 'stock',        label: 'Stock' },
      { value: 'categoria',    label: 'Categoría' },
      { value: 'subcategoria', label: 'Subcategoría' },
      { value: 'marca',        label: 'Marca' }
    ];

    this._data.draftImport.csvColumns.forEach(col => {
      const current = this._data.draftImport.mapping[col] || '';
      const field   = document.createElement('div');
      field.className = 'mapping-field';
      field.innerHTML = `
        <label><strong>"${col}"</strong> →</label>
        <select data-column="${col}">
          ${camposBase.map(c => `<option value="${c.value}" ${c.value === current ? 'selected' : ''}>${c.label}</option>`).join('')}
          <option value="__atributo__${col}" ${current === `__atributo__${col}` ? 'selected' : ''}>Atributo: "${col}"</option>
        </select>
      `;
      field.querySelector('select').addEventListener('change', e => {
        console.log('[productos] mapeo cambiado → columna:', col, '| campo:', e.target.value);
        this._data.draftImport.mapping[col] = e.target.value;
      });
      mappingSection.appendChild(field);
    });

    container.appendChild(mappingSection);

    const actions = document.createElement('div');
    actions.className = 'form-actions';
    actions.appendChild(createButton({
      label:   'Importar productos',
      variant: 'primary',
      icon:    'fa-check',
      onClick: () => this._applyMapping()
    }));
    actions.appendChild(createButton({
      label:   'Cancelar',
      variant: 'secondary',
      onClick: () => {
        console.log('[productos] importación cancelada');
        this._data.draftImport       = { csvData: [], csvColumns: [], mapping: {} };
        this._data.showImportPreview = false;
        this.render();
      }
    }));
    container.appendChild(actions);

    return container;
  },

  _applyMapping() {
    const { csvData, mapping } = this._data.draftImport;
    let added = 0, updated = 0, skipped = 0;

    console.log('[productos] _applyMapping() → filas:', csvData.length, '| mapping:', mapping);

    csvData.forEach((row, rowIndex) => {
      const newProduct = { paused: false, atributos: {}, etiquetas: [] };

      Object.keys(row).forEach(col => {
        const target = mapping[col];
        let value    = row[col];
        if (!target || value === '' || value == null) return;

        if (target.startsWith('__atributo__')) {
          newProduct.atributos[target.replace('__atributo__', '')] = String(value);
          return;
        }
        if (target === 'precio_final') value = this._parsePrecio(value);
        else if (target === 'stock')   value = parseInt(value) || 0;
        else                           value = String(value).trim();

        newProduct[target] = value;
      });

      if (!newProduct.nombre) {
        console.warn(`[productos] _applyMapping() fila ${rowIndex} sin nombre → ignorada`, row);
        skipped++;
        return;
      }
      if (!newProduct.codigo) newProduct.codigo = this._generateCodigo();

      const idx = this._data.productos.findIndex(p => p.codigo === newProduct.codigo);
      if (idx >= 0) {
        this._data.productos[idx] = {
          ...this._data.productos[idx],
          ...Object.fromEntries(Object.entries(newProduct).filter(([, v]) => v !== '' && v != null))
        };
        updated++;
      } else {
        this._data.productos.push(newProduct);
        added++;
      }
    });

    console.log(`[productos] _applyMapping() resultado → nuevos: ${added} | actualizados: ${updated} | ignorados: ${skipped}`);

    this._data.draftImport       = { csvData: [], csvColumns: [], mapping: {} };
    this._data.showImportPreview = false;

    showToast('Importación completa', `${added} nuevos, ${updated} actualizados`, 'success');
    this.render();
  },

  _parsePrecio(value) {
    if (typeof value === 'number') return value;
    if (!value) return 0;
    let clean  = String(value).replace(/[^\d,.-]/g, '').replace(',', '.');
    const parts = clean.split('.');
    if (parts.length > 2) clean = parts.slice(0, -1).join('') + '.' + parts[parts.length - 1];
    const num = parseFloat(clean);
    console.log('[productos] _parsePrecio()', value, '→', num);
    return isNaN(num) ? 0 : num;
  },

  _generateCodigo() {
    const codigo = `PR${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    console.log('[productos] _generateCodigo():', codigo);
    return codigo;
  },

  // ──────────────────────────────────────────────────────────
  // TABLE CARD
  // ──────────────────────────────────────────────────────────
  _renderTableCard() {
    const container = document.createElement('div');

    const header = document.createElement('div');
    header.className = 'table-header';
    const search = createFormField({
      id: 'search-products',
      type: 'text',
      placeholder: 'Buscar productos...',
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
          <th>Código</th><th>Nombre</th><th>Precio</th>
          <th>Stock</th><th>Categoría</th><th>Acciones</th>
        </tr>
      </thead>
      <tbody id="products-tbody"></tbody>
    `;

    const tbody = table.querySelector('#products-tbody');

    this._data.productos.forEach((p, index) => {
      const row = document.createElement('tr');
      row.className     = p.paused ? 'paused-row' : '';
      row.dataset.index = index;
      row.innerHTML = `
        <td>${p.codigo || '-'}</td>
        <td>${p.nombre || '-'}</td>
        <td style="text-align:right">${p.precio_final ? `$${this._formatNumber(p.precio_final)}` : '-'}</td>
        <td style="text-align:center">${p.stock ?? 0}</td>
        <td>${p.categoria || '-'}</td>
        <td>
          <div class="action-buttons">
            <button class="btn-action ${p.paused ? 'btn-play' : 'btn-pause'}" title="${p.paused ? 'Activar' : 'Pausar'}">
              <i class="fas fa-${p.paused ? 'play' : 'pause'}"></i>
            </button>
            <button class="btn-action btn-delete" title="Eliminar">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </td>
      `;
      row.querySelector('.btn-action:not(.btn-delete)').addEventListener('click', () => this._toggleProduct(index));
      row.querySelector('.btn-delete').addEventListener('click', () => this._deleteProduct(index));
      tbody.appendChild(row);
    });

    tableWrap.appendChild(table);
    container.appendChild(tableWrap);

    return createCard({ title: 'Productos Cargados', icon: 'fa-table', variant: 'warning', content: container });
  },

  _filterProducts(searchTerm) {
    console.log('[productos] _filterProducts():', searchTerm);
    document.querySelectorAll('#products-tbody tr').forEach(row => {
      row.style.display = row.textContent.toLowerCase().includes(searchTerm.toLowerCase()) ? '' : 'none';
    });
  },

  _toggleProduct(index) {
    const p = this._data.productos[index];
    p.paused = !p.paused;
    console.log(`[productos] _toggleProduct() index:${index} nombre:"${p.nombre}" paused:${p.paused}`);
    this.render();
  },

  _deleteProduct(index) {
    const nombre = this._data.productos[index].nombre || 'este producto';
    if (confirm(`¿Eliminar "${nombre}"?\n\nEsta acción no se puede deshacer.`)) {
      console.log(`[productos] _deleteProduct() eliminado: "${nombre}" index:${index}`);
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
      hasUnsavedChanges: () => {
        const dirty = JSON.stringify(this._data.productos) !== JSON.stringify(this._originalSnapshot);
        console.log('[productos] hasUnsavedChanges():', dirty);
        return dirty;
      },
      markSaved: () => {
        this._originalSnapshot = structuredClone(this._data.productos);
        console.log('[productos] markSaved() snapshot actualizado');
      }
    };

    return createOnboardingButton({
      stepName: 'productos',

      validate: () => {
        const activos = this._data.productos.filter(p => !p.paused).length;
        if (this._isEditMode && !dirtyController.hasUnsavedChanges()) return true;
        const valid = activos > 0;
        console.log('[productos] validate() activos:', activos, '| válido:', valid);
        return valid;
      },

      getLabel: () => {
        const activos = this._data.productos.filter(p => !p.paused).length;
        if (activos === 0) return 'Cargá al menos un producto';
        if (this._isEditMode && !dirtyController.hasUnsavedChanges()) return 'Volver al dashboard';
        return 'Guardar productos';
      },

      dirtyController,

      onSave: async ({ uid, comercioId }) => {
        console.log('[productos] onSave() uid:', uid, '| comercioId:', comercioId);

        if (!comercioId) throw new Error('No hay comercioId');

        const productosRef = collection(db, 'comercios', comercioId, 'productos');
        const batch        = writeBatch(db);
        const existentes   = await getDocs(productosRef);
        const existingMap  = new Map(existentes.docs.map(d => [d.id, d.data()]));
        const currentMap   = new Map(this._data.productos.filter(p => p.id).map(p => [p.id, p]));

        const toDelete = [];
        const toUpdate = [];
        const toAdd    = [];

        existentes.docs.forEach(d => {
          if (!currentMap.has(d.id)) toDelete.push(d.ref);
        });

        this._data.productos.forEach(p => {
          if (!p.id) {
            toAdd.push(p);
          } else {
            const old = existingMap.get(p.id);
            if (old && JSON.stringify(old) !== JSON.stringify(p)) {
              toUpdate.push({ ref: doc(db, 'comercios', comercioId, 'productos', p.id), data: p });
            }
          }
        });

        console.log(`[productos] onSave() → eliminar:${toDelete.length} | actualizar:${toUpdate.length} | agregar:${toAdd.length}`);

        const totalOps = toDelete.length + toUpdate.length + toAdd.length;
        if (totalOps === 0) {
          console.log('[productos] onSave() → sin cambios reales');
          showToast('Sin cambios', 'No hay cambios para guardar', 'info');
          return { success: true, stepMarked: false };
        }

        showProgressOverlay(totalOps, {
          title:          'Sincronizando catálogo',
          initialMessage: `${toDelete.length} eliminados, ${toUpdate.length} actualizados, ${toAdd.length} nuevos`
        });

        for (const ref of toDelete) {
          updateProgress('Eliminando producto...');
          batch.delete(ref);
        }

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
        console.log('[productos] onSave() batch committed OK');
        finishProgressOverlay('Catálogo sincronizado', 800);

        return { success: true, stepMarked: false };
      },

      onSuccess: () => {
        console.log('[productos] onSuccess() guardado exitoso');
        showToast('Éxito', 'Productos guardados correctamente', 'success');
      },

      onError: (err) => {
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
