// ============================================================
// src/pages/productos/productos.js
// ============================================================
// Página de productos usando skeleton COMPLETO
// Patrón: Acumulación local (manual + Excel) + Batch save via onSave
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
import { db } from '/src/services/firebase/firebase.js';
import { 
  writeBatch, 
  doc, 
  collection, 
  getDocs,
  deleteDoc,
  serverTimestamp 
} from 'firebase/firestore';

// ==================== UTILS ====================
import { showProgressOverlay, updateProgress, finishProgressOverlay } from '/src/shared/progressOverlay.js';

// ==================== ESTILOS ====================
import './productos.css';

// ==================== LIBRERÍA EXCEL ====================
// SheetJS debe estar cargada globalmente en HTML
const XLSX = window.XLSX;

// ============================================================
// MÓDULO DE PÁGINA
// ============================================================
const page = {
  _data: {
    productos: [],
    draftManual: {
      atributos: [],
      etiquetas: []
    },
    draftImport: {
      csvData: [],
      csvColumns: [],
      mapping: {}
    },
    showAdvanced: false,
    showImportPreview: false
  },

  // ──────────────────────────────────────────────────────────
  // LOAD — solo datos
  // ──────────────────────────────────────────────────────────
  async load(ctx) {
    const comercioId = ctx.comercioId;
    
    if (!comercioId) {
      this._data.productos = [];
      return;
    }

    try {
      const productosRef = collection(db, 'comercios', comercioId, 'productos');
      const snapshot = await getDocs(productosRef);
      
      this._data.productos = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (err) {
      if (err.code === 'permission-denied') {
        this._data.productos = [];
      } else {
        console.error('Error cargando productos:', err);
        this._data.productos = [];
      }
    }
  },

  // ──────────────────────────────────────────────────────────
  // RENDER — solo DOM, usando componentes
  // ──────────────────────────────────────────────────────────
  render() {
    const root = document.getElementById('skeleton-page');
    root.innerHTML = '';

    // Header de página
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

    // Card: Formulario manual
    const formCard = this._renderFormCard();
    root.appendChild(formCard);

    // Card: Importar Excel
    const importCard = this._renderImportCard();
    root.appendChild(importCard);

    // Card: Tabla de productos (si hay)
    if (this._data.productos.length > 0) {
      const tableCard = this._renderTableCard();
      root.appendChild(tableCard);
    }

    // Botón onboarding con onSave custom
    const saveBtn = this._renderSaveButton();
    root.appendChild(saveBtn);
  },

  // ──────────────────────────────────────────────────────────
  // FORM CARD — Agregar producto manual
  // ──────────────────────────────────────────────────────────
  _renderFormCard() {
    const container = document.createElement('div');

    // Campos básicos
    const codigo = createFormField({
      id: 'prod-codigo',
      label: 'Código (opcional)',
      placeholder: 'SKU123',
      helpText: 'Si no lo completás, se genera automáticamente'
    });

    const nombre = createFormField({
      id: 'prod-nombre',
      label: 'Nombre del producto',
      required: true,
      placeholder: 'Ej: Remera deportiva'
    });

    const descripcion = createFormField({
      id: 'prod-descripcion',
      label: 'Descripción',
      type: 'textarea',
      rows: 3,
      required: true,
      placeholder: 'Describe el producto...'
    });

    const precio = createFormField({
      id: 'prod-precio',
      label: 'Precio',
      type: 'number',
      required: true,
      placeholder: '0.00'
    });

    const stock = createFormField({
      id: 'prod-stock',
      label: 'Stock',
      type: 'number',
      placeholder: '0'
    });

    const categoria = createFormField({
      id: 'prod-categoria',
      label: 'Categoría',
      placeholder: 'Ej: Ropa'
    });

    // Toggle avanzado
    const toggleBtn = createButton({
      label: this._data.showAdvanced ? 'Ocultar detalles' : 'Agregar más detalles',
      variant: 'link',
      icon: this._data.showAdvanced ? 'fa-chevron-up' : 'fa-chevron-down',
      onClick: () => {
        this._data.showAdvanced = !this._data.showAdvanced;
        this.render(); // Re-renderizar para mostrar/ocultar
      }
    });

    container.append(codigo, nombre, descripcion, precio, stock, categoria, toggleBtn);

    // Campos avanzados (condicional)
    if (this._data.showAdvanced) {
      const avanzados = this._renderAdvancedFields();
      container.appendChild(avanzados);
    }

    // Botón agregar
    const btnAgregar = createButton({
      label: 'Agregar Producto',
      variant: 'primary',
      icon: 'fa-plus',
      block: true,
      onClick: () => this._handleManualSubmit({ codigo, nombre, descripcion, precio, stock, categoria })
    });

    container.appendChild(btnAgregar);

    return createCard({
      title: 'Agregar Producto Manualmente',
      icon: 'fa-plus-circle',
      content: container
    });
  },

  _renderAdvancedFields() {
    const container = document.createElement('div');
    container.className = 'advanced-fields';

    const subcategoria = createFormField({
      id: 'prod-subcategoria',
      label: 'Subcategoría',
      placeholder: 'Ej: Remeras'
    });

    const marca = createFormField({
      id: 'prod-marca',
      label: 'Marca',
      placeholder: 'Ej: Nike'
    });

    const imagen = createFormField({
      id: 'prod-imagen',
      label: 'URL de imagen',
      type: 'url',
      placeholder: 'https://...'
    });

    const disponibilidad = createFormField({
      id: 'prod-disponibilidad',
      label: 'Disponibilidad',
      type: 'select',
      options: [
        { value: 'inmediata', label: 'Inmediata' },
        { value: 'bajo_pedido', label: 'Bajo pedido' },
        { value: 'sin_stock', label: 'Sin stock' }
      ],
      value: 'inmediata'
    });

    // Atributos dinámicos
    const atributosSection = this._renderAtributosSection();
    
    // Etiquetas
    const etiquetasSection = this._renderEtiquetasSection();

    container.append(subcategoria, marca, imagen, disponibilidad, atributosSection, etiquetasSection);

    // Guardar refs para submit
    this._advancedRefs = { subcategoria, marca, imagen, disponibilidad };

    return container;
  },

  _renderAtributosSection() {
    const wrapper = document.createElement('div');
    wrapper.className = 'form-group';

    const label = document.createElement('label');
    label.textContent = 'Atributos personalizados';
    wrapper.appendChild(label);

    // Listado actual
    const list = document.createElement('div');
    list.className = 'atributos-list';
    
    this._data.draftManual.atributos.forEach((attr, index) => {
      const row = document.createElement('div');
      row.className = 'atributo-row';
      row.innerHTML = `
        <span><strong>${attr.key}:</strong> ${attr.value}</span>
        <button type="button" class="btn-icon btn-sm" data-index="${index}">
          <i class="fas fa-times"></i>
        </button>
      `;
      row.querySelector('button').addEventListener('click', () => {
        this._data.draftManual.atributos.splice(index, 1);
        this.render(); // Re-renderizar
      });
      list.appendChild(row);
    });

    wrapper.appendChild(list);

    // Inputs para agregar nuevo
    const inputs = document.createElement('div');
    inputs.className = 'atributo-inputs';
    inputs.innerHTML = `
      <input type="text" id="attr-key" placeholder="Nombre (ej: sabor)">
      <input type="text" id="attr-value" placeholder="Valor (ej: chocolate)">
    `;
    wrapper.appendChild(inputs);

    const btnAdd = createButton({
      label: 'Agregar atributo',
      variant: 'secondary',
      size: 'sm',
      icon: 'fa-plus',
      onClick: () => {
        const key = inputs.querySelector('#attr-key').value.trim();
        const value = inputs.querySelector('#attr-value').value.trim();
        if (key && value) {
          this._data.draftManual.atributos.push({ key, value });
          this.render();
        }
      }
    });

    wrapper.appendChild(btnAdd);

    return wrapper;
  },

  _renderEtiquetasSection() {
    const wrapper = document.createElement('div');
    wrapper.className = 'form-group';

    const label = document.createElement('label');
    label.textContent = 'Etiquetas';
    wrapper.appendChild(label);

    // Tags actuales
    const tags = document.createElement('div');
    tags.className = 'etiquetas-tags';
    
    this._data.draftManual.etiquetas.forEach((etiqueta, index) => {
      const tag = document.createElement('span');
      tag.className = 'etiqueta-tag';
      tag.innerHTML = `
        ${etiqueta}
        <button type="button">×</button>
      `;
      tag.querySelector('button').addEventListener('click', () => {
        this._data.draftManual.etiquetas.splice(index, 1);
        this.render();
      });
      tags.appendChild(tag);
    });

    wrapper.appendChild(tags);

    // Input para agregar
    const inputGroup = document.createElement('div');
    inputGroup.className = 'etiqueta-input-group';
    inputGroup.innerHTML = `<input type="text" id="etiqueta-input" placeholder="Ej: nuevo, destacado">`;
    wrapper.appendChild(inputGroup);

    const btnAdd = createButton({
      label: 'Agregar etiqueta',
      variant: 'secondary',
      size: 'sm',
      icon: 'fa-tag',
      onClick: () => {
        const value = inputGroup.querySelector('#etiqueta-input').value.trim();
        if (value && !this._data.draftManual.etiquetas.includes(value)) {
          this._data.draftManual.etiquetas.push(value);
          this.render();
        }
      }
    });

    wrapper.appendChild(btnAdd);

    return wrapper;
  },

  _handleManualSubmit(refs) {
    const newProduct = {
      codigo: refs.codigo.getValue() || this._generateCodigo(),
      nombre: refs.nombre.getValue(),
      descripcion: refs.descripcion.getValue(),
      precio_final: parseFloat(refs.precio.getValue()) || 0,
      stock: parseInt(refs.stock.getValue()) || 0,
      categoria: refs.categoria.getValue(),
      paused: false,
      atributos: {},
      etiquetas: [...this._data.draftManual.etiquetas]
    };

    // Campos avanzados si existen
    if (this._advancedRefs) {
      newProduct.subcategoria = this._advancedRefs.subcategoria.getValue();
      newProduct.marca = this._advancedRefs.marca.getValue();
      newProduct.imagen = this._advancedRefs.imagen.getValue();
      newProduct.disponibilidad = this._advancedRefs.disponibilidad.getValue();
    }

    // Convertir array de atributos a objeto
    this._data.draftManual.atributos.forEach(attr => {
      newProduct.atributos[attr.key] = attr.value;
    });

    // Validación
    if (!newProduct.nombre || !newProduct.descripcion) {
      showToast('Campos requeridos', 'Completá nombre y descripción', 'warning');
      return;
    }

    // Agregar y resetear
    this._data.productos.push(newProduct);
    this._data.draftManual = { atributos: [], etiquetas: [] };
    this._data.showAdvanced = false;

    showToast('Producto agregado', 'Guardá para confirmar los cambios', 'success');
    this.render(); // Re-renderizar todo (muestra tabla si es primer producto)
  },

  // ──────────────────────────────────────────────────────────
  // IMPORT CARD — Excel/CSV
  // ──────────────────────────────────────────────────────────
  _renderImportCard() {
    const container = document.createElement('div');

    // Zona drag & drop
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
    fileInput.type = 'file';
    fileInput.accept = '.xlsx,.xls,.csv';
    fileInput.style.display = 'none';
    
    uploadZone.addEventListener('click', () => fileInput.click());
    
    uploadZone.addEventListener('dragover', e => {
      e.preventDefault();
      uploadZone.classList.add('dragover');
    });
    
    uploadZone.addEventListener('dragleave', () => {
      uploadZone.classList.remove('dragover');
    });
    
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

    // Preview de importación (condicional)
    if (this._data.showImportPreview && this._data.draftImport.csvData.length > 0) {
      const preview = this._renderImportPreview();
      container.appendChild(preview);
    }

    return createCard({
      title: 'Importar desde Excel/CSV',
      icon: 'fa-file-excel',
      content: container
    });
  },

  _parseFile(file) {
    if (!XLSX) {
      showToast('Error', 'Librería XLSX no cargada', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet, { defval: '' });

        if (jsonData.length === 0) {
          showToast('Error', 'El archivo está vacío', 'error');
          return;
        }

        this._data.draftImport.csvData = jsonData;
        this._data.draftImport.csvColumns = Object.keys(jsonData[0]);
        this._data.showImportPreview = true;

        // Auto-detectar mapping
        this._data.draftImport.mapping = this._autoDetectMapping();

        showToast('Archivo cargado', `${jsonData.length} filas detectadas`, 'success');
        this.render();

      } catch (err) {
        console.error(err);
        showToast('Error', 'No se pudo leer el archivo', 'error');
      }
    };
    reader.readAsBinaryString(file);
  },

  _autoDetectMapping() {
    const mapping = {};
    const columns = this._data.draftImport.csvColumns;
    
    const mappings = {
      'codigo': ['codigo', 'code', 'id', 'sku'],
      'nombre': ['nombre', 'articulo', 'producto', 'name', 'title'],
      'descripcion': ['descripcion', 'description'],
      'precio_final': ['precio', 'price', 'pvp'],
      'stock': ['stock', 'cantidad', 'qty'],
      'categoria': ['categoria', 'category']
    };

    columns.forEach(col => {
      const normalized = col.toLowerCase().trim();
      for (const [field, aliases] of Object.entries(mappings)) {
        if (aliases.some(alias => normalized.includes(alias))) {
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

    // Contador
    const count = document.createElement('p');
    count.innerHTML = `<strong>${this._data.draftImport.csvData.length}</strong> filas detectadas`;
    container.appendChild(count);

    // Preview tabla (primeras 5)
    const previewTable = document.createElement('div');
    previewTable.className = 'preview-table-container';
    
    const table = document.createElement('table');
    table.className = 'preview-table';
    
    const thead = document.createElement('thead');
    thead.innerHTML = `<tr>${this._data.draftImport.csvColumns.map(col => `<th>${col}</th>`).join('')}</tr>`;
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    const preview = this._data.draftImport.csvData.slice(0, 5);
    tbody.innerHTML = preview.map(row => 
      `<tr>${this._data.draftImport.csvColumns.map(col => `<td>${row[col] || ''}</td>`).join('')}</tr>`
    ).join('');
    table.appendChild(tbody);
    
    previewTable.appendChild(table);
    container.appendChild(previewTable);

    // Mapeo de columnas
    const mappingSection = document.createElement('div');
    mappingSection.className = 'mapping-section';
    mappingSection.innerHTML = '<h4>Mapeo de columnas</h4><p class="help-text">Indicá qué campo corresponde a cada columna:</p>';

    const camposBase = [
      { value: '', label: '-- Ignorar --' },
      { value: 'codigo', label: 'Código' },
      { value: 'nombre', label: 'Nombre' },
      { value: 'descripcion', label: 'Descripción' },
      { value: 'precio_final', label: 'Precio' },
      { value: 'stock', label: 'Stock' },
      { value: 'categoria', label: 'Categoría' },
      { value: 'subcategoria', label: 'Subcategoría' },
      { value: 'marca', label: 'Marca' }
    ];

    this._data.draftImport.csvColumns.forEach(col => {
      const field = document.createElement('div');
      field.className = 'mapping-field';
      
      const currentMapping = this._data.draftImport.mapping[col] || '';
      
      field.innerHTML = `
        <label><strong>"${col}"</strong> →</label>
        <select data-column="${col}">
          ${camposBase.map(c => `<option value="${c.value}" ${c.value === currentMapping ? 'selected' : ''}>${c.label}</option>`).join('')}
          <option value="__atributo__${col}" ${currentMapping.startsWith('__atributo__') ? 'selected' : ''}>Atributo: "${col}"</option>
        </select>
      `;
      
      // Actualizar mapping al cambiar
      field.querySelector('select').addEventListener('change', (e) => {
        this._data.draftImport.mapping[col] = e.target.value;
      });
      
      mappingSection.appendChild(field);
    });

    container.appendChild(mappingSection);

    // Botones
    const actions = document.createElement('div');
    actions.className = 'form-actions';

    const btnImport = createButton({
      label: 'Importar productos',
      variant: 'primary',
      icon: 'fa-check',
      onClick: () => this._applyMapping()
    });

    const btnCancel = createButton({
      label: 'Cancelar',
      variant: 'secondary',
      onClick: () => {
        this._data.draftImport = { csvData: [], csvColumns: [], mapping: {} };
        this._data.showImportPreview = false;
        this.render();
      }
    });

    actions.append(btnImport, btnCancel);
    container.appendChild(actions);

    return container;
  },

  _applyMapping() {
    const { csvData, mapping } = this._data.draftImport;
    let added = 0, updated = 0;

    csvData.forEach(row => {
      const newProduct = {
        paused: false,
        atributos: {},
        etiquetas: []
      };

      Object.keys(row).forEach(col => {
        const target = mapping[col];
        let value = row[col];

        if (!target || value === '' || value === null || value === undefined) return;

        if (target.startsWith('__atributo__')) {
          const attrName = target.replace('__atributo__', '');
          newProduct.atributos[attrName] = String(value);
          return;
        }

        if (target === 'precio_final') {
          value = this._parsePrecio(value);
        } else if (target === 'stock') {
          value = parseInt(value) || 0;
        } else {
          value = String(value).trim();
        }

        newProduct[target] = value;
      });

      if (!newProduct.nombre) return;

      if (!newProduct.codigo) {
        newProduct.codigo = this._generateCodigo();
      }

      // Merge por código
      const existingIndex = this._data.productos.findIndex(p => p.codigo === newProduct.codigo);
      
      if (existingIndex >= 0) {
        this._data.productos[existingIndex] = {
          ...this._data.productos[existingIndex],
          ...Object.fromEntries(
            Object.entries(newProduct).filter(([_, v]) => v !== '' && v !== null)
          )
        };
        updated++;
      } else {
        this._data.productos.push(newProduct);
        added++;
      }
    });

    // Limpiar import
    this._data.draftImport = { csvData: [], csvColumns: [], mapping: {} };
    this._data.showImportPreview = false;

    showToast('Importación completa', `${added} nuevos, ${updated} actualizados`, 'success');
    this.render();
  },

  _parsePrecio(value) {
    if (typeof value === 'number') return value;
    if (!value) return 0;
    
    let clean = String(value).replace(/[^\d,.-]/g, '').replace(',', '.');
    const parts = clean.split('.');
    if (parts.length > 2) {
      clean = parts.slice(0, -1).join('') + '.' + parts[parts.length - 1];
    }
    
    const num = parseFloat(clean);
    return isNaN(num) ? 0 : num;
  },

  _generateCodigo() {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `PR${timestamp}${random}`;
  },

  // ──────────────────────────────────────────────────────────
  // TABLE CARD — Productos cargados
  // ──────────────────────────────────────────────────────────
  _renderTableCard() {
    const container = document.createElement('div');

    // Header con búsqueda
    const header = document.createElement('div');
    header.className = 'table-header';
    header.innerHTML = '<h3><i class="fas fa-table"></i> Productos Cargados</h3>';
    
    const search = createFormField({
      id: 'search-products',
      type: 'text',
      placeholder: 'Buscar productos...',
      actions: {
        onInput: (value) => this._filterProducts(value)
      }
    });
    search.classList.add('search-box');
    
    header.appendChild(search);
    container.appendChild(header);

    // Tabla
    const tableContainer = document.createElement('div');
    tableContainer.className = 'table-container';

    const table = document.createElement('table');
    table.className = 'products-table';
    
    table.innerHTML = `
      <thead>
        <tr>
          <th class="col-code">Código</th>
          <th class="col-name">Nombre</th>
          <th class="col-price">Precio</th>
          <th class="col-stock">Stock</th>
          <th class="col-category">Categoría</th>
          <th class="col-actions">Acciones</th>
        </tr>
      </thead>
      <tbody id="products-tbody"></tbody>
    `;

    const tbody = table.querySelector('#products-tbody');
    
    this._data.productos.forEach((p, index) => {
      const isPaused = p.paused;
      const row = document.createElement('tr');
      row.className = isPaused ? 'paused-row' : '';
      row.dataset.index = index;
      
      row.innerHTML = `
        <td>${p.codigo || '-'}</td>
        <td>${p.nombre || '-'}</td>
        <td style="text-align: right;">${p.precio_final ? `$${this._formatNumber(p.precio_final)}` : '-'}</td>
        <td style="text-align: center;">${p.stock ?? 0}</td>
        <td>${p.categoria || '-'}</td>
        <td>
          <div class="action-buttons">
            <button class="btn-action ${isPaused ? 'btn-play' : 'btn-pause'}" title="${isPaused ? 'Activar' : 'Pausar'}">
              <i class="fas fa-${isPaused ? 'play' : 'pause'}"></i>
            </button>
            <button class="btn-action btn-delete" title="Eliminar">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </td>
      `;

      // Event listeners
      const btnToggle = row.querySelector('.btn-action:not(.btn-delete)');
      btnToggle.addEventListener('click', () => this._toggleProduct(index));

      const btnDelete = row.querySelector('.btn-delete');
      btnDelete.addEventListener('click', () => this._deleteProduct(index));

      tbody.appendChild(row);
    });

    tableContainer.appendChild(table);
    container.appendChild(tableContainer);

    return createCard({
      title: 'Productos Cargados',
      icon: 'fa-table',
      variant: 'warning',
      content: container
    });
  },

  _filterProducts(searchTerm) {
    const rows = document.querySelectorAll('#products-tbody tr');
    const normalized = searchTerm.toLowerCase();
    
    rows.forEach(row => {
      const text = row.textContent.toLowerCase();
      row.style.display = text.includes(normalized) ? '' : 'none';
    });
  },

  _toggleProduct(index) {
    this._data.productos[index].paused = !this._data.productos[index].paused;
    this.render();
  },

  _deleteProduct(index) {
    const p = this._data.productos[index];
    const nombre = p.nombre || p.codigo || 'este producto';
    
    if (confirm(`¿Eliminar "${nombre}"?\n\nEsta acción no se puede deshacer.`)) {
      this._data.productos.splice(index, 1);
      showToast('Producto eliminado', 'Guardá para confirmar', 'info');
      this.render();
    }
  },

  _formatNumber(num) {
    return new Intl.NumberFormat('es-AR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(num);
  },

  // ──────────────────────────────────────────────────────────
  // SAVE BUTTON — Onboarding con onSave custom
  // ──────────────────────────────────────────────────────────
  _renderSaveButton() {
    return createOnboardingButton({
      stepName: 'productos',
      
      validate: () => {
        const activos = this._data.productos.filter(p => !p.paused);
        const valid = activos.length > 0;
        
        if (!valid) {
          showToast('Error', 'Necesitás al menos 1 producto activo', 'warning');
        }
        
        return valid;
      },
      
      onSave: async ({ uid, comercioId }) => {
        if (!comercioId) throw new Error('No hay comercioId');
        
        const productosRef = collection(db, 'comercios', comercioId, 'productos');
        const batch = writeBatch(db);
        
        // Obtener existentes
        const existentes = await getDocs(productosRef);
        const existingMap = new Map(existentes.docs.map(d => [d.id, d.data()]));
        const currentMap = new Map(this._data.productos.filter(p => p.id).map(p => [p.id, p]));
        
        const toDelete = [];
        const toUpdate = [];
        const toAdd = [];

        // Detectar eliminados
        existentes.docs.forEach(docSnap => {
          if (!currentMap.has(docSnap.id)) {
            toDelete.push(docSnap.ref);
          }
        });

        // Detectar updates y adds
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

        const totalOps = toDelete.length + toUpdate.length + toAdd.length;
        if (totalOps === 0) {
          showToast('Sin cambios', 'No hay cambios para guardar', 'info');
          return true;
        }

        // Progress overlay
        showProgressOverlay(totalOps, {
          title: 'Sincronizando catálogo',
          initialMessage: `${toDelete.length} eliminados, ${toUpdate.length} actualizados, ${toAdd.length} nuevos`
        });

        // Ejecutar operaciones
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
          batch.set(newRef, {
            ...p,
            fechaCreacion: serverTimestamp(),
            fechaActualizacion: serverTimestamp()
          });
        }

        // Commit
        await batch.commit();
        finishProgressOverlay('Catálogo sincronizado', 800);
        
        return true;
      },
      
      onSuccess: () => {
        showToast('Éxito', 'Productos guardados correctamente', 'success');
      },
      
      onError: (err) => {
        console.error('Error guardando productos:', err);
        showToast('Error al guardar', err.message, 'error');
      }
    });
  },

  // ──────────────────────────────────────────────────────────
  // DIRTY STATE
  // ──────────────────────────────────────────────────────────
  getCurrentData() {
    return {
      productos: structuredClone(this._data.productos),
      draftManual: structuredClone(this._data.draftManual),
      draftImport: structuredClone(this._data.draftImport)
    };
  },

  isFormValid() {
    const activos = this._data.productos.filter(p => !p.paused);
    return activos.length > 0;
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
