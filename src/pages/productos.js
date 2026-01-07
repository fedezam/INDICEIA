// src/pages/productos.js
// ==================== VERSIÓN REFACTORIZADA ====================
// Usa dataPageSkeleton.js - SOLO lógica específica de productos

// ==================== ESTILOS ====================
import '../styles/base.css';
import '../styles/layout.css';
import '../styles/components.css';
import '../styles/forms.css';
import '../styles/forms-premium.css';
import './productos.css';

// ==================== FIREBASE ====================
import { db } from '../firebase.js';
import {
  doc,
  getDoc,
  updateDoc,
  collection,
  getDocs,
  addDoc,
  deleteDoc
} from 'firebase/firestore';

// ==================== UTILS ====================
import { showToast, showLoading, hideLoading } from '../shared/utils.js';

// ==================== SKELETON ====================
import { runDataPage } from '../shared/dataPageSkeleton.js';

// ==================== ESTADO LOCAL ====================
let productos = [];
let csvData = [];
let csvColumns = [];
let atributos = [];
let etiquetas = [];

// ==================== MÓDULO EXPORTADO ====================
const productosModule = {
  // 1️⃣ LOAD - Cargar datos desde Firebase
  async load({ currentComercioId, comercioData }) {
    const ref = collection(db, 'comercios', currentComercioId, 'productos');
    const snap = await getDocs(ref);
    
    productos = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    
    console.log(`✅ ${productos.length} productos cargados`);
  },

  // 2️⃣ RENDER - Dibujar UI específica de productos
  render() {
    // Verificar que el DOM esté listo
    const tbody = document.getElementById('tableBody');
    if (!tbody) {
      console.error('❌ DOM no está listo, reintentando...');
      setTimeout(() => this.render(), 100);
      return;
    }

    console.log('🎨 Renderizando UI de productos...');
    
    // Ocultar loading inicial
    const initialLoading = document.getElementById('initialLoading');
    if (initialLoading) initialLoading.style.display = 'none';
    
    renderProductsTable();
    renderManualForm();
    renderImportZone();
    setupProductEvents();
    insertAIHelperCard();
    console.log('✅ UI renderizada correctamente');
  },

  // 3️⃣ GET CURRENT DATA - Snapshot para dirty detection
  getCurrentData() {
    return { productos: structuredClone(productos) };
  },

  // 4️⃣ SAVE - Guardar cambios
  async save({ currentComercioId, isEditMode }) {
    if (productos.length === 0) {
      showToast('Sin productos', 'Agregá al menos 1 producto', 'warning');
      throw new Error('No hay productos para guardar');
    }

    const activos = productos.filter(p => !p.paused);
    if (activos.length === 0) {
      showToast('Productos requeridos', 'Necesitás al menos 1 producto activo', 'warning');
      throw new Error('No hay productos activos');
    }

    showLoading('Guardando productos...');

    const ref = collection(db, 'comercios', currentComercioId, 'productos');
    
    // Eliminar productos borrados
    const currentIds = new Set(productos.map(p => p.id).filter(Boolean));
    const allDocs = await getDocs(ref);
    
    for (const docSnap of allDocs.docs) {
      if (!currentIds.has(docSnap.id)) {
        await deleteDoc(docSnap.ref);
      }
    }

    // Guardar/actualizar productos
    for (const producto of productos) {
      const { id, ...data } = producto;
      
      if (id) {
        await updateDoc(doc(ref, id), {
          ...data,
          fechaActualizacion: new Date()
        });
      } else {
        const newDoc = await addDoc(ref, {
          ...data,
          fechaCreacion: new Date(),
          fechaActualizacion: new Date()
        });
        producto.id = newDoc.id;
      }
    }

    // Marcar paso como completado
    await updateDoc(doc(db, 'comercios', currentComercioId), {
      'onboardingSteps.productos': true,
      cantidadProductos: productos.length
    });

    hideLoading();
    showToast('Guardado', 'Productos actualizados correctamente', 'success');
  },

  // 5️⃣ VALIDACIÓN - ¿Puede avanzar?
  isFormValid() {
    const activos = productos.filter(p => !p.paused);
    return activos.length > 0;
  }
};

// ==================== UI RENDERING ====================

function renderProductsTable() {
  console.log('🔧 renderProductsTable() llamado, productos:', productos.length);
  
  const tbody = document.getElementById('tableBody');
  const productCount = document.getElementById('productCount');
  
  if (!tbody) {
    console.error('❌ #tableBody no encontrado en DOM');
    return;
  }
  
  if (productCount) {
    productCount.textContent = productos.length;
    console.log('📊 Contador actualizado:', productos.length);
  }

  if (productos.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6">Sin productos cargados</td></tr>';
    console.log('⚠️ Sin productos, mostrando mensaje vacío');
    return;
  }

  tbody.innerHTML = productos.map((p, i) => {
    const isPaused = p.paused;
    const rowClass = isPaused ? 'paused-row' : '';
    
    // Botón pausar/activar
    const toggleBtn = isPaused
      ? `<button class="btn-action btn-play" onclick="window.toggleProduct(${i})" title="Activar producto">
           <i class="fas fa-play"></i>
         </button>`
      : `<button class="btn-action btn-pause" onclick="window.toggleProduct(${i})" title="Pausar producto">
           <i class="fas fa-pause"></i>
         </button>`;
    
    // Botón eliminar
    const deleteBtn = `<button class="btn-action btn-delete" onclick="window.deleteProduct(${i})" title="Eliminar producto">
                         <i class="fas fa-trash"></i>
                       </button>`;

    return `
      <tr class="${rowClass}">
        <td>${p.codigo || '-'}</td>
        <td>${p.nombre || '-'}</td>
        <td style="text-align: right;">${p.precio_final ? `$${formatNumber(p.precio_final)}` : '-'}</td>
        <td style="text-align: center;">${p.stock ?? 0}</td>
        <td>${p.categoria || '-'}</td>
        <td>
          <div class="action-buttons">
            ${toggleBtn}
            ${deleteBtn}
          </div>
        </td>
      </tr>
    `;
  }).join('');
  
  console.log('✅ Tabla renderizada con', productos.length, 'filas');
}

function renderManualForm() {
  const form = document.getElementById('manualForm');
  if (!form) return;
  
  form.addEventListener('submit', handleManualSubmit);
  
  // Toggle modo avanzado
  const toggleMode = document.getElementById('toggleMode');
  const advancedFields = document.getElementById('advancedFields');
  
  if (toggleMode && advancedFields) {
    toggleMode.addEventListener('click', () => {
      const isVisible = advancedFields.style.display !== 'none';
      advancedFields.style.display = isVisible ? 'none' : 'block';
      toggleMode.innerHTML = isVisible 
        ? '<i class="fas fa-chevron-down"></i> Agregar más detalles' 
        : '<i class="fas fa-chevron-up"></i> Ocultar detalles';
    });
  }

  // Botones atributos/etiquetas
  document.getElementById('addAtributo')?.addEventListener('click', addAtributoField);
  document.getElementById('addEtiqueta')?.addEventListener('click', () => {
    const input = document.getElementById('etiquetaInput');
    const value = input.value.trim();
    if (value && !etiquetas.includes(value)) {
      etiquetas.push(value);
      renderEtiquetas();
      input.value = '';
    }
  });
}

function renderImportZone() {
  const fileUploadZone = document.getElementById('fileUploadZone');
  const fileInput = document.getElementById('fileInput');
  
  if (!fileUploadZone || !fileInput) return;

  fileUploadZone.addEventListener('click', () => fileInput.click());
  
  fileUploadZone.addEventListener('dragover', e => {
    e.preventDefault();
    fileUploadZone.classList.add('dragover');
  });
  
  fileUploadZone.addEventListener('dragleave', () => {
    fileUploadZone.classList.remove('dragover');
  });
  
  fileUploadZone.addEventListener('drop', e => {
    e.preventDefault();
    fileUploadZone.classList.remove('dragover');
    const file = e.dataTransfer.files[0];
    if (file) parseFile(file);
  });
  
  fileInput.addEventListener('change', e => {
    const file = e.target.files[0];
    if (file) parseFile(file);
  });

  // Botones de importación
  document.getElementById('applyMapping')?.addEventListener('click', applyMapping);
  document.getElementById('cancelImport')?.addEventListener('click', () => {
    document.getElementById('csvPreviewSection').style.display = 'none';
    csvData = [];
    csvColumns = [];
  });
}

function setupProductEvents() {
  // Toggle producto (pausar/activar)
  window.toggleProduct = (i) => {
    productos[i].paused = !productos[i].paused;
    renderProductsTable();
  };

  // Eliminar producto
  window.deleteProduct = (i) => {
    const p = productos[i];
    const nombre = p.nombre || p.codigo || 'este producto';
    
    // Confirmación con mensaje claro
    const confirmMessage = `¿Estás seguro de eliminar "${nombre}"?\n\nEsta acción no se puede deshacer.`;
    
    if (confirm(confirmMessage)) {
      productos.splice(i, 1);
      renderProductsTable();
      showToast('Producto eliminado', 'Guardá para confirmar los cambios', 'info');
    }
  };

  // Búsqueda
  document.getElementById('searchProducts')?.addEventListener('input', e => {
    filterProducts(e.target.value);
  });
}

function insertAIHelperCard() {
  const container = document.querySelector('main .container');
  if (!container || document.querySelector('.ai-helper-card')) return;

  const card = document.createElement('div');
  card.className = 'ai-helper-card';
  card.innerHTML = `
    <div class="ai-helper-icon">AI</div>
    <div class="ai-helper-content">
      <h4>¡Tu IA aprenderá tu catálogo!</h4>
      <p>Cargá tus productos para que tu asistente conozca qué vendés, precios y disponibilidad en tiempo real.</p>
      <small>Podés agregar productos manualmente o importar desde Excel/CSV</small>
    </div>
  `;

  container.insertBefore(card, container.firstChild);
}

// ==================== FORMULARIO MANUAL ====================

async function handleManualSubmit(e) {
  e.preventDefault();
  const formData = new FormData(e.target);

  const newProduct = {
    codigo: formData.get('codigo') || generateCodigo(),
    nombre: formData.get('nombre'),
    descripcion: formData.get('descripcion'),
    precio_final: parseFloat(formData.get('precio_final')) || 0,
    stock: parseInt(formData.get('stock')) || 0,
    categoria: formData.get('categoria') || '',
    subcategoria: formData.get('subcategoria') || '',
    marca: formData.get('marca') || '',
    imagen: formData.get('imagen') || '',
    disponibilidad: formData.get('disponibilidad') || 'inmediata',
    paused: false,
    atributos: {},
    etiquetas: [...etiquetas]
  };

  // Recoger atributos
  document.querySelectorAll('.atributo-field').forEach(field => {
    const keyInput = field.querySelector('[data-attr-key]');
    const valueInput = field.querySelector('[data-attr-value]');
    const key = keyInput?.value.trim();
    const value = valueInput?.value.trim();
    if (key && value) {
      newProduct.atributos[key] = value;
    }
  });

  if (!newProduct.nombre || !newProduct.descripcion) {
    showToast('Campos requeridos', 'Completá nombre y descripción', 'warning');
    return;
  }

  productos.push(newProduct);
  renderProductsTable();

  // Limpiar form
  e.target.reset();
  atributos = [];
  etiquetas = [];
  document.getElementById('atributosList').innerHTML = '';
  document.getElementById('etiquetasList').innerHTML = '';

  const advancedFields = document.getElementById('advancedFields');
  const toggleMode = document.getElementById('toggleMode');
  if (advancedFields) advancedFields.style.display = 'none';
  if (toggleMode) toggleMode.innerHTML = '<i class="fas fa-chevron-down"></i> Agregar más detalles';

  showToast('Producto agregado', 'Guardá para confirmar', 'success');
  document.getElementById('productsTable')?.scrollIntoView({ behavior: 'smooth' });
}

function addAtributoField() {
  const container = document.getElementById('atributosList');
  const index = atributos.length;
  atributos.push({ key: '', value: '' });

  const div = document.createElement('div');
  div.className = 'atributo-field';
  div.innerHTML = `
    <input type="text" placeholder="Nombre (ej: sabor)" data-attr-key="${index}">
    <input type="text" placeholder="Valor (ej: chocolate)" data-attr-value="${index}">
    <button type="button" class="btn btn-secondary btn-sm" onclick="window.removeAtributo(${index})">
      <i class="fas fa-times"></i>
    </button>
  `;
  container.appendChild(div);
}

window.removeAtributo = (index) => {
  atributos.splice(index, 1);
  document.getElementById('atributosList').innerHTML = '';
  atributos.forEach(() => addAtributoField());
};

function renderEtiquetas() {
  const container = document.getElementById('etiquetasList');
  if (!container) return;

  container.innerHTML = etiquetas.map((etiqueta, index) => `
    <span class="etiqueta-tag">
      ${etiqueta}
      <button type="button" onclick="window.removeEtiqueta(${index})">×</button>
    </span>
  `).join('');
}

window.removeEtiqueta = (index) => {
  etiquetas.splice(index, 1);
  renderEtiquetas();
};

// ==================== IMPORT EXCEL/CSV ====================

function parseFile(file) {
  showLoading('Procesando archivo...');

  const reader = new FileReader();

  reader.onload = (e) => {
    try {
      const data = e.target.result;

      if (typeof XLSX === 'undefined') {
        throw new Error('Librería XLSX no encontrada');
      }

      const workbook = XLSX.read(data, { type: 'binary' });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(firstSheet, { defval: "" });

      if (jsonData.length === 0) throw new Error('El archivo está vacío');

      csvData = jsonData;
      csvColumns = Object.keys(jsonData[0]);

      showPreview();
      hideLoading();
    } catch (error) {
      hideLoading();
      showToast('Error', 'No se pudo leer el archivo: ' + error.message, 'error');
    }
  };

  reader.onerror = () => {
    hideLoading();
    showToast('Error', 'No se pudo leer el archivo', 'error');
  };

  reader.readAsBinaryString(file);
}

function showPreview() {
  const previewSection = document.getElementById('csvPreviewSection');
  const previewHeader = document.getElementById('previewHeader');
  const previewBody = document.getElementById('previewBody');
  const mappingFields = document.getElementById('mappingFields');
  const importCount = document.getElementById('importCount');

  if (!previewSection) return;

  previewSection.style.display = 'block';

  const preview = csvData.slice(0, 5);
  previewHeader.innerHTML = `<tr>${csvColumns.map(col => `<th>${col}</th>`).join('')}</tr>`;
  previewBody.innerHTML = preview.map(row => 
    `<tr>${csvColumns.map(col => `<td>${row[col] || ''}</td>`).join('')}</tr>`
  ).join('');

  const camposBase = [
    { value: '', label: '-- Ignorar --' },
    { value: 'codigo', label: 'Código' },
    { value: 'nombre', label: 'Nombre del producto' },
    { value: 'descripcion', label: 'Descripción' },
    { value: 'precio_final', label: 'Precio' },
    { value: 'stock', label: 'Stock' },
    { value: 'categoria', label: 'Categoría' },
    { value: 'subcategoria', label: 'Subcategoría' },
    { value: 'marca', label: 'Marca' },
    { value: 'imagen', label: 'Imagen URL' },
    { value: 'disponibilidad', label: 'Disponibilidad' }
  ];

  mappingFields.innerHTML = csvColumns.map(col => {
    const autoMap = detectColumnMapping(col);
    return `
      <div class="mapping-field">
        <label><strong>Columna:</strong> "${col}"</label>
        <select data-csv-column="${col}">
          ${camposBase.map(campo => `
            <option value="${campo.value}" ${campo.value === autoMap ? 'selected' : ''}>
              ${campo.label}
            </option>
          `).join('')}
          <option value="__atributo__${col}">Atributo: "${col}"</option>
        </select>
      </div>
    `;
  }).join('');

  importCount.textContent = csvData.length;

  showToast('Archivo cargado', `Se detectaron ${csvData.length} productos. Revisá el mapeo.`, 'info');
  previewSection.scrollIntoView({ behavior: 'smooth' });
}

function detectColumnMapping(columnName) {
  const normalized = columnName.toLowerCase().trim();

  const mappings = {
    'codigo': ['codigo', 'code', 'id', 'sku'],
    'nombre': ['nombre', 'articulo', 'producto', 'name', 'title'],
    'descripcion': ['descripcion', 'description', 'detalle'],
    'precio_final': ['precio', 'price', 'precio_final', 'pvp'],
    'stock': ['stock', 'cantidad', 'qty'],
    'categoria': ['categoria', 'category', 'rubro'],
    'subcategoria': ['subcategoria', 'subcategory'],
    'marca': ['marca', 'brand'],
    'imagen': ['imagen', 'image', 'foto', 'url_imagen'],
    'disponibilidad': ['disponibilidad', 'availability']
  };

  for (const [field, aliases] of Object.entries(mappings)) {
    if (aliases.some(alias => normalized.includes(alias))) return field;
  }

  return '';
}

function applyMapping() {
  const selects = document.querySelectorAll('#mappingFields select');
  const mapping = {};

  selects.forEach(select => {
    const csvColumn = select.dataset.csvColumn;
    const targetField = select.value;
    if (targetField) mapping[csvColumn] = targetField;
  });

  mergeCSVData(mapping);
}

function mergeCSVData(mapping) {
  showLoading('Importando productos...');

  let added = 0;
  let updated = 0;

  csvData.forEach(row => {
    const newProduct = {
      paused: false,
      atributos: {},
      etiquetas: []
    };

    Object.keys(row).forEach(csvColumn => {
      const targetField = mapping[csvColumn];
      let value = row[csvColumn];

      if (!targetField || value === null || value === undefined || value === '') return;

      if (targetField.startsWith('__atributo__')) {
        const attrName = targetField.replace('__atributo__', '');
        newProduct.atributos[attrName] = String(value);
        return;
      }

      if (targetField === 'precio_final') {
        value = parsePrecio(value);
      } else if (targetField === 'stock') {
        value = parseInt(value) || 0;
      } else {
        value = String(value).trim();
      }

      newProduct[targetField] = value;
    });

    if (!newProduct.nombre && !newProduct.descripcion) return;

    if (!newProduct.codigo || newProduct.codigo.trim() === '') {
      newProduct.codigo = generateCodigo();
    }

    const existingIndex = productos.findIndex(p => p.codigo === newProduct.codigo);

    if (existingIndex >= 0) {
      productos[existingIndex] = {
        ...productos[existingIndex],
        ...Object.fromEntries(
          Object.entries(newProduct).filter(([_, v]) => v !== '' && v !== null && v !== undefined)
        )
      };
      updated++;
    } else {
      productos.push(newProduct);
      added++;
    }
  });

  document.getElementById('csvPreviewSection').style.display = 'none';
  csvData = [];
  csvColumns = [];

  renderProductsTable();

  hideLoading();
  showToast('Importación completa', `${added} nuevos, ${updated} actualizados`, 'success');

  document.getElementById('productsTable')?.scrollIntoView({ behavior: 'smooth' });
}

// ==================== HELPERS ====================

function parsePrecio(value) {
  if (typeof value === 'number') return value;
  if (!value) return 0;

  let clean = value.toString().replace(/[^\d,.-]/g, '').replace(',', '.');
  const parts = clean.split('.');
  if (parts.length > 2) {
    clean = parts.slice(0, -1).join('') + '.' + parts[parts.length - 1];
  }

  const num = parseFloat(clean);
  return isNaN(num) ? 0 : num;
}

function generateCodigo() {
  const date = new Date();
  const timestamp = date.getTime().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `PR${timestamp}${random}`;
}

function formatNumber(num) {
  return new Intl.NumberFormat('es-AR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(num);
}

function filterProducts(searchTerm) {
  const rows = document.querySelectorAll('#tableBody tr');
  const normalized = searchTerm.toLowerCase();

  rows.forEach(row => {
    const text = row.textContent.toLowerCase();
    row.style.display = text.includes(normalized) ? '' : 'none';
  });
}

// ==================== BOOT ====================
runDataPage(productosModule);
