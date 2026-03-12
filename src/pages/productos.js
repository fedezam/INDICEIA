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

const TEMPLATE_FIRMA = 'indiceia_template_v1';

// ============================================================
// PÁGINA
// ============================================================
const page = {
  _data: {
    productos: [],
    // Categorías disponibles: arranca con las del comercio,
    // crece dinámicamente con las que el operador usa
    categoriasDisponibles: [],
    draftManual: {
      codigo:         '',
      nombre:         '',
      descripcion:    '',
      precio:         '',
      stock:          '',
      categoria:      '',
      subcategoria:   '',
      marca:          '',
      imagen:         '',
      disponibilidad: 'inmediata',
      atributos:      [],
      etiquetas:      []
    },
    showAdvanced: false,
  },

  _isEditMode:       false,
  _originalSnapshot: [],

  // ──────────────────────────────────────────────────────────
  // HELPERS DE CATEGORÍAS
  // ──────────────────────────────────────────────────────────

  // Agrega una categoría al pool si no existe ya (case-insensitive dedup)
  _addCategoria(cat) {
    if (!cat || !cat.trim()) return;
    const trimmed = cat.trim();
    const exists  = this._data.categoriasDisponibles
      .some(c => c.toLowerCase() === trimmed.toLowerCase());
    if (!exists) {
      this._data.categoriasDisponibles.push(trimmed);
    }
  },

  // Sincroniza el datalist en el DOM sin re-render completo
  _syncDatalist() {
    const dl = document.getElementById('categorias-datalist');
    if (!dl) return;
    dl.innerHTML = '';
    this._data.categoriasDisponibles.forEach(cat => {
      const opt = document.createElement('option');
      opt.value = cat;
      dl.appendChild(opt);
    });
  },

  // ──────────────────────────────────────────────────────────
  // LOAD
  // ──────────────────────────────────────────────────────────
  async load(ctx) {
    console.log('[productos] load() ctx:', ctx);

    this._isEditMode = ctx.isEditMode === true;
    const comercioId = ctx.comercioId;

    // Cargar categorías base del comercio (definidas en el registro)
    const categoriasBase = Array.isArray(ctx.categories) ? ctx.categories : [];
    this._data.categoriasDisponibles = [...categoriasBase];

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

      // Agregar al pool las categorías ya usadas en productos existentes
      this._data.productos.forEach(p => this._addCategoria(p.categoria));

      console.log(`[productos] load() → ${this._data.productos.length} productos | ${this._data.categoriasDisponibles.length} categorías`);
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
    console.log('[productos] render() → productos:', this._data.productos.length);

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
          <strong id="productCount">${this._data.productos.length}</strong> productos
        </span>
      </div>
    `;
    root.appendChild(header);

    // Datalist global — accesible desde cualquier input de categoría
    const datalist = document.createElement('datalist');
    datalist.id = 'categorias-datalist';
    this._data.categoriasDisponibles.forEach(cat => {
      const opt = document.createElement('option');
      opt.value = cat;
      datalist.appendChild(opt);
    });
    root.appendChild(datalist);

    root.appendChild(this._renderTipsCard());
    root.appendChild(this._renderFormCard());
    root.appendChild(this._renderImportCard());

    if (this._data.productos.length > 0) {
      root.appendChild(this._renderTableCard());
    }

    root.appendChild(this._renderSaveButton());
  },

  // ──────────────────────────────────────────────────────────
  // TIPS CARD
  // ──────────────────────────────────────────────────────────
  _renderTipsCard() {
    const tips = [
      {
        icon: 'fa-tags',
        titulo: 'Categoría obligatoria',
        texto: 'Cada producto debe tener una categoría. El template visual agrupa los productos por categoría — sin categoría, todo va junto sin orden. Usá las sugerencias o escribí la tuya.'
      },
      {
        icon: 'fa-font',
        titulo: 'Nombres consistentes',
        texto: 'Usá siempre el mismo nombre para el mismo producto. Ej: "Pizza Muzzarella" — siempre igual, sin variantes de escritura.'
      },
      {
        icon: 'fa-align-left',
        titulo: 'Descripción corta',
        texto: 'Una línea es suficiente. Ej: "Pizza con muzzarella y tomate, tamaño grande".'
      },
      {
        icon: 'fa-dollar-sign',
        titulo: 'Precio sin símbolos',
        texto: 'Escribí solo el número, sin puntos ni símbolos. Ej: 5500 — no $5.500 ni 5,500.'
      },
      {
        icon: 'fa-image',
        titulo: 'Imágenes',
        texto: 'Pegá el link directo a la foto del producto (debe terminar en .jpg, .png, etc.). Si no tenés, dejalo vacío.'
      }
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
        <div class="tip-body">
          <strong>${tip.titulo}</strong>
          <p>${tip.texto}</p>
        </div>
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
    console.log('[productos] _renderFormCard()');

    const container = document.createElement('div');

    const codigo      = createFormField({ id: 'prod-codigo',      label: 'Código (opcional)',   placeholder: 'SKU123', helpText: 'Si no lo completás, se genera automáticamente', value: this._data.draftManual.codigo });
    const nombre      = createFormField({ id: 'prod-nombre',      label: 'Nombre del producto', required: true, placeholder: 'Ej: Pizza Muzzarella Grande', value: this._data.draftManual.nombre });
    const descripcion = createFormField({ id: 'prod-descripcion', label: 'Descripción', type: 'textarea', rows: 2, required: true, placeholder: 'Una línea. Ej: Pizza con muzzarella y tomate, tamaño grande', value: this._data.draftManual.descripcion });
    const precio      = createFormField({ id: 'prod-precio',      label: 'Precio', type: 'number', required: true, placeholder: '5500', helpText: 'Solo el número, sin $ ni puntos', value: this._data.draftManual.precio });
    const stock       = createFormField({ id: 'prod-stock',       label: 'Stock', type: 'number', placeholder: '0', value: this._data.draftManual.stock });

    // Categoría — obligatoria + datalist dinámico
    const categoriaWrapper = document.createElement('div');
    categoriaWrapper.className = 'form-group';

    const categoriaLabel = document.createElement('label');
    categoriaLabel.innerHTML = 'Categoría <span class="required-mark">*</span>';
    categoriaLabel.htmlFor = 'prod-categoria';

    const categoriaInput = document.createElement('input');
    categoriaInput.type        = 'text';
    categoriaInput.id          = 'prod-categoria';
    categoriaInput.placeholder = 'Ej: Pizzas, Bebidas, Postres';
    categoriaInput.setAttribute('list', 'categorias-datalist');
    categoriaInput.value       = this._data.draftManual.categoria || '';
    categoriaInput.required    = true;

    const categoriaHelp = document.createElement('small');
    categoriaHelp.className   = 'form-help';
    categoriaHelp.textContent = 'Obligatoria. Usá las sugerencias para mantener consistencia o escribí una nueva.';

    categoriaWrapper.appendChild(categoriaLabel);
    categoriaWrapper.appendChild(categoriaInput);
    categoriaWrapper.appendChild(categoriaHelp);

    // Getter compatible con el resto del código
    const categoria = {
      getValue: () => categoriaInput.value.trim()
    };

    const _saveBaseDraft = () => {
      this._data.draftManual.codigo      = codigo.getValue();
      this._data.draftManual.nombre      = nombre.getValue();
      this._data.draftManual.descripcion = descripcion.getValue();
      this._data.draftManual.precio      = precio.getValue();
      this._data.draftManual.stock       = stock.getValue();
      this._data.draftManual.categoria   = categoria.getValue();
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

    container.append(codigo, nombre, descripcion, precio, stock, categoriaWrapper, toggleBtn);

    if (this._data.showAdvanced) {
      container.appendChild(this._renderAdvancedFields());
    }

    const btnAgregar = createButton({
      label:   'Agregar Producto',
      variant: 'primary',
      icon:    'fa-plus',
      block:   true,
      onClick: () => {
        _saveBaseDraft();
        this._handleManualSubmit({ codigo, nombre, descripcion, precio, stock, categoria });
      }
    });

    container.appendChild(btnAgregar);

    return createCard({ title: 'Agregar Producto Manualmente', icon: 'fa-plus-circle', content: container });
  },

  _renderAdvancedFields() {
    const container = document.createElement('div');
    container.className = 'advanced-fields';

    const subcategoria   = createFormField({ id: 'prod-subcategoria',   label: 'Subcategoría',  placeholder: 'Ej: Especiales', value: this._data.draftManual.subcategoria });
    const marca          = createFormField({ id: 'prod-marca',           label: 'Marca',          placeholder: 'Ej: Nike',       value: this._data.draftManual.marca });
    const imagen         = createFormField({ id: 'prod-imagen',          label: 'URL de imagen',  type: 'url', placeholder: 'https://...', helpText: 'Link directo a la foto del producto', value: this._data.draftManual.imagen });
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
          this._data.draftManual.atributos.push({ key, value });
          this.render();
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
          this._data.draftManual.etiquetas.push(value);
          this.render();
        }
      }
    }));

    return wrapper;
  },

  _handleManualSubmit(refs) {
    const categoriaVal = refs.categoria.getValue();

    // Validación — categoría obligatoria
    if (!refs.nombre.getValue() || !refs.descripcion.getValue()) {
      showToast('Campos requeridos', 'Completá nombre y descripción', 'warning');
      return;
    }
    if (!categoriaVal) {
      showToast('Categoría requerida', 'Asigná una categoría al producto', 'warning');
      return;
    }

    const newProduct = {
      codigo:       refs.codigo.getValue() || this._generateCodigo(),
      nombre:       refs.nombre.getValue(),
      descripcion:  refs.descripcion.getValue(),
      precio_final: parseFloat(refs.precio.getValue()) || 0,
      stock:        parseInt(refs.stock.getValue()) || 0,
      categoria:    categoriaVal,
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

    // Agregar categoría nueva al pool dinámico
    this._addCategoria(categoriaVal);
    this._syncDatalist();

    this._data.productos.push(newProduct);

    this._data.draftManual = {
      codigo: '', nombre: '', descripcion: '', precio: '', stock: '',
      categoria: '', subcategoria: '', marca: '', imagen: '',
      disponibilidad: 'inmediata', atributos: [], etiquetas: []
    };
    this._data.showAdvanced = false;

    showToast('Producto agregado', 'Guardá para confirmar los cambios', 'success');
    this.render();
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
        <li>Completá tus productos en el archivo (la columna <strong>categoria</strong> es obligatoria)</li>
        <li>Subí el archivo completado</li>
      </ol>
    `;
    container.appendChild(instrucciones);

    const btnDescarga = createButton({
      label:   'Descargar plantilla ÍndiceIA',
      variant: 'secondary',
      icon:    'fa-download',
      onClick: () => this._downloadTemplate()
    });
    container.appendChild(btnDescarga);

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
      <div class="upload-formats">
        <span class="format-badge">.xlsx</span>
      </div>
    `;

    const fileInput = document.createElement('input');
    fileInput.type          = 'file';
    fileInput.accept        = '.xlsx';
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

  // ──────────────────────────────────────────────────────────
  // PARSE FILE
  // ──────────────────────────────────────────────────────────
  _parseFile(file) {
    console.log('[productos] _parseFile() archivo:', file.name);

    if (!XLSX) {
      showToast('Error', 'Librería XLSX no cargada', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target.result, { type: 'binary' });

        const metaSheet = wb.Sheets['_indiceia_meta'];
        if (!metaSheet) {
          showToast('Archivo no válido', 'Usá la plantilla oficial de ÍndiceIA.', 'error');
          return;
        }
        const firmaData = XLSX.utils.sheet_to_json(metaSheet, { header: 1 });
        if (!firmaData?.[0]?.[0] || firmaData[0][0] !== TEMPLATE_FIRMA) {
          showToast('Archivo no válido', 'Usá la plantilla oficial de ÍndiceIA.', 'error');
          return;
        }

        const ws       = wb.Sheets['productos'];
        const jsonData = XLSX.utils.sheet_to_json(ws, { defval: '' });

        if (jsonData.length === 0) {
          showToast('Plantilla vacía', 'Completá al menos un producto', 'warning');
          return;
        }

        const CAMPOS_BASE = ['codigo','nombre','descripcion','precio_final','categoria','stock','disponibilidad','imagen'];
        let added = 0, skipped = 0, sinCategoria = 0;

        jsonData.forEach((row, idx) => {
          if (!row.nombre) {
            skipped++;
            return;
          }

          // Categoría obligatoria — fallback a 'General' con aviso
          const categoriaRaw = String(row.categoria || '').trim();
          if (!categoriaRaw) sinCategoria++;

          const producto = {
            codigo:         String(row.codigo || this._generateCodigo()),
            nombre:         String(row.nombre).trim(),
            descripcion:    String(row.descripcion || '').trim(),
            precio_final:   this._parsePrecio(row.precio_final),
            stock:          parseInt(row.stock) || 0,
            categoria:      categoriaRaw || 'General',
            imagen:         String(row.imagen || '').trim(),
            disponibilidad: ['inmediata', 'bajo_pedido', 'sin_stock'].includes(row.disponibilidad)
                              ? row.disponibilidad : 'inmediata',
            paused:         false,
            atributos:      {},
            etiquetas:      []
          };

          Object.keys(row).forEach(col => {
            if (!CAMPOS_BASE.includes(col) && row[col] !== '' && row[col] != null) {
              producto.atributos[col] = String(row[col]).trim();
            }
          });

          // Agregar categoría al pool dinámico
          this._addCategoria(producto.categoria);

          const idx2 = this._data.productos.findIndex(p => p.codigo === producto.codigo);
          if (idx2 >= 0) {
            this._data.productos[idx2] = { ...this._data.productos[idx2], ...producto };
          } else {
            this._data.productos.push(producto);
          }
          added++;
        });

        // Actualizar datalist con nuevas categorías
        this._syncDatalist();

        const msg = sinCategoria > 0
          ? `${added} productos listos. ${sinCategoria} sin categoría → asignados a "General"`
          : `${added} productos listos para guardar`;

        showToast('Plantilla cargada', msg, sinCategoria > 0 ? 'warning' : 'success');
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
        <td>${p.categoria || '<span style="color:#f59e0b">Sin categoría</span>'}</td>
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
    document.querySelectorAll('#products-tbody tr').forEach(row => {
      row.style.display = row.textContent.toLowerCase().includes(searchTerm.toLowerCase()) ? '' : 'none';
    });
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
      hasUnsavedChanges: () => {
        return JSON.stringify(this._data.productos) !== JSON.stringify(this._originalSnapshot);
      },
      markSaved: () => {
        this._originalSnapshot = structuredClone(this._data.productos);
      }
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

        const totalOps = toDelete.length + toUpdate.length + toAdd.length;
        if (totalOps === 0) {
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
        finishProgressOverlay('Catálogo sincronizado', 800);
        return { success: true, stepMarked: false };
      },

      onSuccess: () => {
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
