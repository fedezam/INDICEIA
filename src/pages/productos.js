// ========================================
// ARCHIVO: src/pages/productos.js - PARTE 1/3
// ========================================
import '../styles/base.css';
import '../styles/layout.css';
import '../styles/components.css';
import '../styles/forms.css';
import '../styles/forms-premium.css';
import './productos.css';
import { auth, db } from '../firebase.js';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, updateDoc, collection, getDocs, addDoc, deleteDoc } from 'firebase/firestore';
import { renderLayout, updateHeaderInfo, updateSubscriptionBanner } from '../shared/layout.js';
import { initNavigation } from '../shared/navigation.js';
import { PLANS, calcularEstadoPlan, getDiasRestantesTrial } from '../shared/plans.js';
import { showToast, showLoading, hideLoading } from '../shared/utils.js';
import { runFlowController } from '../controllers/flowController.js';

// ==================== VARIABLES GLOBALES ====================
let currentUser = null;
let currentComercioId = null;
let comercioData = {};
let productos = [];
let originalProductos = [];
let hasUnsavedChanges = false;
let csvData = [];
let csvColumns = [];
let atributos = [];
let etiquetas = [];

// ==================== INICIALIZACIÓN ====================
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "/login.html";
    return;
  }
  currentUser = user;
  
  try {
    await user.getIdToken();
  } catch (err) {
    console.warn("Sesión expirada, cerrando...");
    signOut(auth);
    window.location.href = "/login.html";
    return;
  }
  
  await initializePage();
  runFlowController(user.uid);
});

// ==================== CARGA INICIAL ====================
async function initializePage() {
  try {
    showLoading('Cargando productos...');
    renderLayout();
    
    // IMPORTANTE: Obtener comercioId del usuario (requerido por Firestore rules)
    const userRef = doc(db, 'usuarios', currentUser.uid);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists() && userSnap.data().comercioId) {
      currentComercioId = userSnap.data().comercioId;
    } else {
      showToast('Error', 'No se encontró comercio. Completá primero "Mi comercio".', 'warning');
      hideLoading();
      setTimeout(() => {
        window.location.href = "/mi-comercio.html";
      }, 2000);
      return;
    }
    
    // Cargar datos del comercio
    await loadComercioData();
    
    // Cargar productos existentes
    await loadProducts();
    
    initNavigation();
    updateHeaderInfo(comercioData.nombreComercio, PLANS[comercioData.plan || 'trial']);
    updateBanner();
    
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    
    renderProductsTable();
    createSaveButton();
    setupEventListeners();
    insertAIHelperCard();
    checkFormValidity();
    
    // Validación para flowController
    window.validateCurrentPageData = async () => {
      const activeProducts = productos.filter(p => !p.paused);
      if (activeProducts.length === 0) {
        showToast('Productos requeridos', 'Necesitás al menos 1 producto activo', 'warning');
        return false;
      }
      if (hasUnsavedChanges) {
        showToast('Cambios sin guardar', 'Guardá antes de continuar', 'warning');
        return false;
      }
      return true;
    };
    
    hideLoading();
  } catch (err) {
    console.error(err);
    hideLoading();
    showToast('Error', 'No se pudo cargar: ' + err.message, 'error');
  }
}

async function loadComercioData() {
  const ref = doc(db, 'comercios', currentComercioId);
  const snap = await getDoc(ref);
  
  if (snap.exists()) {
    comercioData = { id: currentComercioId, ...snap.data() };
  } else {
    comercioData = { plan: 'trial', pais: 'Argentina' };
  }
}

async function loadProducts() {
  try {
    // Leer subcolección productos del comercio
    const productosRef = collection(db, 'comercios', currentComercioId, 'productos');
    const snapshot = await getDocs(productosRef);
    
    productos = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    originalProductos = structuredClone(productos);
    console.log(`✅ ${productos.length} productos cargados`);
  } catch (error) {
    console.error('Error cargando productos:', error);
    productos = [];
    originalProductos = [];
  }
}

// ==================== BANNER HELPER ====================
function updateBanner() {
  const estado = calcularEstadoPlan(comercioData);
  const plan = PLANS[comercioData.plan || 'trial'];
  let html = '';
  
  switch (estado) {
    case 'trial':
      const dias = getDiasRestantesTrial(comercioData);
      html = `<strong>Trial activo</strong> – Te quedan <strong>${dias} días</strong> gratis`;
      break;
    case 'activo':
      html = `<strong>Plan ${plan.nombre} activo</strong> – Todo funcionando`;
      break;
    case 'expirado':
      html = `Trial expirado – Elegí un plan para continuar`;
      break;
    default:
      html = `Cargá tus productos para que tu IA los conozca`;
  }
  
  updateSubscriptionBanner(html, estado);
}

// ==================== EVENT LISTENERS ====================
function setupEventListeners() {
  // Toggle campos avanzados
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

  // Atributos y etiquetas
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

  // Formulario manual
  const manualForm = document.getElementById('manualForm');
  if (manualForm) {
    manualForm.addEventListener('submit', handleManualSubmit);
  }

  // File upload
  const fileUploadZone = document.getElementById('fileUploadZone');
  const fileInput = document.getElementById('fileInput');
  if (fileUploadZone && fileInput) {
    fileUploadZone.addEventListener('click', () => fileInput.click());
    fileUploadZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      fileUploadZone.classList.add('dragover');
    });
    fileUploadZone.addEventListener('dragleave', () => {
      fileUploadZone.classList.remove('dragover');
    });
    fileUploadZone.addEventListener('drop', (e) => {
      e.preventDefault();
      fileUploadZone.classList.remove('dragover');
      const file = e.dataTransfer.files[0];
      if (file) parseFile(file);
    });
    fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) parseFile(file);
    });
  }

  // Mapeo y cancelar import
  document.getElementById('applyMapping')?.addEventListener('click', applyMapping);
  document.getElementById('cancelImport')?.addEventListener('click', () => {
    document.getElementById('csvPreviewSection').style.display = 'none';
    csvData = [];
    csvColumns = [];
  });

  // Búsqueda
  document.getElementById('searchProducts')?.addEventListener('input', (e) => {
    filterProducts(e.target.value);
  });

  // Seleccionar todos
  document.getElementById('checkAll')?.addEventListener('change', (e) => {
    productos.forEach(p => p.paused = !e.target.checked);
    renderProductsTable();
    markAsChanged();
  });

  // Logout
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      if (confirm('¿Cerrar sesión?')) signOut(auth);
    });
  }

  // Botón inferior
  const btnBottom = document.getElementById('saveChangesBtnBottom');
  if (btnBottom) {
    btnBottom.addEventListener('click', saveAllProducts);
  }

  // Advertencia antes de salir
  window.addEventListener('beforeunload', (e) => {
    if (hasUnsavedChanges) {
      e.preventDefault();
      e.returnValue = '¿Seguro que querés salir? Tenés cambios sin guardar.';
    }
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

// ==================== VALIDACIÓN Y BOTONES ====================
function markAsChanged() {
  hasUnsavedChanges = true;
  checkFormValidity();
}

function checkFormValidity() {
  const activeProducts = productos.filter(p => !p.paused);
  const alMenosUnActivo = activeProducts.length > 0;
  
  const btnTop = document.getElementById('saveChangesBtn');
  const btnBottom = document.getElementById('saveChangesBtnBottom');
  const buttons = [btnTop, btnBottom].filter(Boolean);
  
  if (!alMenosUnActivo || !hasUnsavedChanges) {
    buttons.forEach(b => {
      b.disabled = true;
      b.classList.remove('ready', 'saving', 'saved');
      b.classList.add('btn-save');
      if (b.id === 'saveChangesBtn') {
        b.innerHTML = '<i class="fas fa-save"></i> <span>Guardar Cambios</span>';
      }
      if (b.id === 'saveChangesBtnBottom') {
        b.innerHTML = 'Guardar Cambios';
      }
    });
  } else {
    buttons.forEach(b => {
      b.disabled = false;
      b.classList.add('ready');
      if (!b.classList.contains('saving') && !b.classList.contains('saved')) {
        if (b.id === 'saveChangesBtn') {
          b.innerHTML = '<i class="fas fa-save"></i> <span>Guardar Cambios</span>';
        }
        if (b.id === 'saveChangesBtnBottom') {
          b.innerHTML = 'Guardar Cambios';
        }
      }
    });
  }
}

function createSaveButton() {
  if (document.getElementById('saveChangesBtn')) return;
  
  const userInfo = document.querySelector('.header .user-info');
  const logoutBtn = document.getElementById('logoutBtn');
  
  if (!userInfo || !logoutBtn) {
    console.warn('⚠️ No se pudo crear botón de guardar');
    return;
  }
  
  const btn = document.createElement('button');
  btn.id = 'saveChangesBtn';
  btn.className = 'btn-save';
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-save"></i> <span>Guardar Cambios</span>';
  
  userInfo.insertBefore(btn, logoutBtn);
  btn.addEventListener('click', saveAllProducts);
}

// ==================== FIN PARTE 1 ====================
// Continuá con productos-parte2.js para:
// - addAtributoField()
// - renderEtiquetas()
// - handleManualSubmit()
// - parseFile()
// - showPreview()
// - detectColumnMapping()
// - applyMapping()
// - mergeCSVData()
// ========================================
// ARCHIVO: src/pages/productos.js - PARTE 2/3
// ========================================
// COPIAR ESTO DESPUÉS DE LA PARTE 1

// ==================== FORMULARIO MANUAL ====================
function addAtributoField() {
  const container = document.getElementById('atributosList');
  const index = atributos.length;
  atributos.push({ key: '', value: '' });
  
  const div = document.createElement('div');
  div.className = 'atributo-field';
  div.innerHTML = `
    <input type="text" placeholder="Nombre (ej: sabor)" data-attr-key="${index}">
    <input type="text" placeholder="Valor (ej: chocolate)" data-attr-value="${index}">
    <button type="button" class="btn btn-secondary btn-sm" onclick="removeAtributo(${index})">
      <i class="fas fa-times"></i>
    </button>
  `;
  container.appendChild(div);
}

window.removeAtributo = (index) => {
  atributos.splice(index, 1);
  document.getElementById('atributosList').innerHTML = '';
  atributos.forEach((_, i) => addAtributoField());
};

function renderEtiquetas() {
  const container = document.getElementById('etiquetasList');
  if (!container) return;
  
  container.innerHTML = etiquetas.map((etiqueta, index) => `
    <span class="etiqueta-tag">
      ${etiqueta}
      <button type="button" onclick="removeEtiqueta(${index})">×</button>
    </span>
  `).join('');
}

window.removeEtiqueta = (index) => {
  etiquetas.splice(index, 1);
  renderEtiquetas();
};

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

  // Recopilar atributos
  document.querySelectorAll('.atributo-field').forEach(field => {
    const keyInput = field.querySelector('[data-attr-key]');
    const valueInput = field.querySelector('[data-attr-value]');
    const key = keyInput?.value.trim();
    const value = valueInput?.value.trim();
    if (key && value) {
      newProduct.atributos[key] = value;
    }
  });

  // Validación
  if (!newProduct.nombre || !newProduct.descripcion) {
    showToast('Campos requeridos', 'Completá nombre y descripción', 'warning');
    return;
  }

  try {
    showLoading('Agregando producto...');
    
    // Agregar a la lista local
    productos.push(newProduct);
    
    // Re-renderizar tabla
    renderProductsTable();
    
    // Reset form
    e.target.reset();
    atributos = [];
    etiquetas = [];
    document.getElementById('atributosList').innerHTML = '';
    document.getElementById('etiquetasList').innerHTML = '';
    
    const advancedFields = document.getElementById('advancedFields');
    const toggleMode = document.getElementById('toggleMode');
    if (advancedFields) advancedFields.style.display = 'none';
    if (toggleMode) toggleMode.innerHTML = '<i class="fas fa-chevron-down"></i> Agregar más detalles';
    
    hideLoading();
    markAsChanged();
    showToast('Producto agregado', 'Guardá para confirmar los cambios', 'success');
    
    // Scroll a la tabla
    document.getElementById('productsTable')?.scrollIntoView({ behavior: 'smooth' });
  } catch (error) {
    hideLoading();
    showToast('Error', 'No se pudo agregar el producto: ' + error.message, 'error');
  }
}

// ==================== IMPORT EXCEL/CSV ====================
function parseFile(file) {
  showLoading('Procesando archivo...');
  
  const reader = new FileReader();
  
  reader.onload = (e) => {
    try {
      const data = e.target.result;
      
      // Usar SheetJS (debe estar incluido en el HTML)
      if (typeof XLSX === 'undefined') {
        throw new Error('Librería XLSX no encontrada. Agregá <script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"></script> al HTML');
      }
      
      const workbook = XLSX.read(data, { type: 'binary' });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(firstSheet, { defval: "" });
      
      if (jsonData.length === 0) {
        throw new Error('El archivo está vacío');
      }
      
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
  
  // Preview de primeras 5 filas
  const preview = csvData.slice(0, 5);
  previewHeader.innerHTML = `<tr>${csvColumns.map(col => `<th>${col}</th>`).join('')}</tr>`;
  previewBody.innerHTML = preview.map(row => 
    `<tr>${csvColumns.map(col => `<td>${row[col] || ''}</td>`).join('')}</tr>`
  ).join('');
  
  // Campos base para mapeo
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

  // Generar selectores de mapeo
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
    'codigo': ['codigo', 'code', 'id', 'sku', 'producto_id', 'cod'],
    'nombre': ['nombre', 'articulo', 'producto', 'name', 'title', 'descripcion_corta'],
    'descripcion': ['descripcion', 'description', 'detalle', 'desc', 'descripcion_larga'],
    'precio_final': ['precio', 'price', 'precio_final', 'pvp', 'valor', 'importe'],
    'stock': ['stock', 'cantidad', 'qty', 'disponible', 'existencia'],
    'categoria': ['categoria', 'category', 'rubro', 'tipo', 'linea'],
    'subcategoria': ['subcategoria', 'subcategory', 'subtipo', 'subrubro'],
    'marca': ['marca', 'brand', 'fabricante', 'proveedor'],
    'imagen': ['imagen', 'image', 'foto', 'picture', 'url_imagen', 'img'],
    'disponibilidad': ['disponibilidad', 'availability', 'estado', 'disponible']
  };
  
  for (const [field, aliases] of Object.entries(mappings)) {
    if (aliases.some(alias => normalized.includes(alias))) {
      return field;
    }
  }
  
  return '';
}

function applyMapping() {
  const selects = document.querySelectorAll('#mappingFields select');
  const mapping = {};
  
  selects.forEach(select => {
    const csvColumn = select.dataset.csvColumn;
    const targetField = select.value;
    if (targetField) {
      mapping[csvColumn] = targetField;
    }
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
    
    // Mapear columnas
    Object.keys(row).forEach(csvColumn => {
      const targetField = mapping[csvColumn];
      let value = row[csvColumn];
      
      if (!targetField || value === null || value === undefined || value === '') return;
      
      // Si es atributo personalizado
      if (targetField.startsWith('__atributo__')) {
        const attrName = targetField.replace('__atributo__', '');
        newProduct.atributos[attrName] = String(value);
        return;
      }
      
      // Parsear valores según tipo
      if (targetField === 'precio_final') {
        value = parsePrecio(value);
      } else if (targetField === 'stock') {
        value = parseInt(value) || 0;
      } else {
        value = String(value).trim();
      }
      
      newProduct[targetField] = value;
    });
    
    // Validar campos mínimos
    if (!newProduct.nombre && !newProduct.descripcion) return;
    
    // Generar código si no tiene
    if (!newProduct.codigo || newProduct.codigo.trim() === '') {
      newProduct.codigo = generateCodigo();
    }
    
    // Verificar si ya existe (por código)
    const existingIndex = productos.findIndex(p => p.codigo === newProduct.codigo);
    
    if (existingIndex >= 0) {
      // Actualizar existente (solo campos con valor)
      productos[existingIndex] = {
        ...productos[existingIndex],
        ...Object.fromEntries(
          Object.entries(newProduct).filter(([_, v]) => v !== '' && v !== null && v !== undefined)
        )
      };
      updated++;
    } else {
      // Agregar nuevo
      productos.push(newProduct);
      added++;
    }
  });
  
  // Ocultar preview
  document.getElementById('csvPreviewSection').style.display = 'none';
  csvData = [];
  csvColumns = [];
  
  // Re-renderizar
  renderProductsTable();
  markAsChanged();
  
  hideLoading();
  showToast('Importación completa', `${added} nuevos, ${updated} actualizados`, 'success');
  
  document.getElementById('productsTable')?.scrollIntoView({ behavior: 'smooth' });
}

function parsePrecio(value) {
  if (typeof value === 'number') return value;
  if (!value) return 0;
  
  // Limpiar: quitar símbolos, dejar solo números, comas y puntos
  let clean = value
    .toString()
    .replace(/[^\d,.-]/g, '')
    .replace(',', '.');
  
  // Si tiene múltiples puntos, quedarse con el último como decimal
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

// ==================== FIN PARTE 2 ====================
// Continuá con productos-parte3.js para:
// - renderProductsTable()
// - makeEditable()
// - toggleProductStatus()
// - deleteProduct()
// - filterProducts()
// - saveAllProducts()
// - formatNumber()

// ========================================
// ARCHIVO: src/pages/productos.js - PARTE 3/3
// ========================================
// COPIAR ESTO DESPUÉS DE LA PARTE 2

// ==================== TABLA DE PRODUCTOS ====================
function renderProductsTable() {
  const tableBody = document.getElementById('tableBody');
  const emptyMessage = document.getElementById('emptyMessage');
  const productCount = document.getElementById('productCount');
  
  if (!tableBody) return;
  
  if (productCount) {
    productCount.textContent = productos.length;
  }
  
  if (productos.length === 0) {
    if (emptyMessage) emptyMessage.style.display = 'block';
    tableBody.innerHTML = '';
    return;
  }
  
  if (emptyMessage) emptyMessage.style.display = 'none';
  
  tableBody.innerHTML = productos.map((producto, index) => {
    const isActive = !producto.paused;
    const rowClass = producto.paused ? 'paused-row' : '';
    
    return `
      <tr class="${rowClass}" data-index="${index}">
        <td style="text-align: center;">
          <input 
            type="checkbox" 
            ${isActive ? 'checked' : ''} 
            onchange="toggleProductStatus(${index})"
          >
        </td>
        <td class="editable-cell" data-field="codigo" data-index="${index}">
          ${producto.codigo || '-'}
        </td>
        <td class="editable-cell" data-field="nombre" data-index="${index}">
          ${producto.nombre || '-'}
        </td>
        <td class="editable-cell" data-field="precio_final" data-index="${index}">
          ${producto.precio_final ? `$${formatNumber(producto.precio_final)}` : '-'}
        </td>
        <td class="editable-cell" data-field="stock" data-index="${index}">
          ${producto.stock || 0}
        </td>
        <td class="editable-cell" data-field="categoria" data-index="${index}">
          ${producto.categoria || '-'}
        </td>
        <td style="text-align: center;">
          <button 
            class="btn btn-danger btn-sm" 
            onclick="deleteProduct(${index})" 
            title="Eliminar"
          >
            <i class="fas fa-trash"></i>
          </button>
        </td>
      </tr>
    `;
  }).join('');
  
  // Agregar listeners de edición inline
  document.querySelectorAll('.editable-cell').forEach(cell => {
    cell.addEventListener('click', () => makeEditable(cell));
  });
}

// ==================== EDICIÓN INLINE ====================
function makeEditable(cell) {
  const field = cell.dataset.field;
  const index = parseInt(cell.dataset.index);
  const currentValue = productos[index][field] || '';
  
  // Crear input
  const input = document.createElement('input');
  input.type = (field === 'precio_final' || field === 'stock') ? 'number' : 'text';
  input.value = field === 'precio_final' ? (currentValue || 0) : currentValue;
  input.step = field === 'precio_final' ? '0.01' : '1';
  input.min = (field === 'precio_final' || field === 'stock') ? '0' : undefined;
  input.style.width = '100%';
  input.style.boxSizing = 'border-box';
  input.style.padding = '0.5rem';
  input.style.border = '2px solid var(--primary)';
  input.style.borderRadius = '4px';
  
  // Reemplazar contenido
  cell.textContent = '';
  cell.appendChild(input);
  input.focus();
  input.select();
  
  const save = () => {
    let newValue = input.value.trim();
    
    // Parsear según tipo
    if (field === 'precio_final') {
      newValue = parseFloat(newValue) || 0;
    } else if (field === 'stock') {
      newValue = parseInt(newValue) || 0;
    }
    
    // Actualizar dato
    productos[index][field] = newValue;
    
    // Re-renderizar
    renderProductsTable();
    markAsChanged();
  };
  
  input.addEventListener('blur', save);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      save();
    } else if (e.key === 'Escape') {
      renderProductsTable();
    }
  });
}

// ==================== ACCIONES DE PRODUCTOS ====================
window.toggleProductStatus = (index) => {
  productos[index].paused = !productos[index].paused;
  renderProductsTable();
  markAsChanged();
  
  const status = productos[index].paused ? 'pausado' : 'activado';
  showToast('Estado actualizado', `Producto ${status}. Guardá para confirmar.`, 'info');
};

window.deleteProduct = (index) => {
  const producto = productos[index];
  const nombre = producto.nombre || producto.codigo || 'este producto';
  
  if (confirm(`¿Eliminar "${nombre}"?`)) {
    productos.splice(index, 1);
    renderProductsTable();
    markAsChanged();
    showToast('Producto eliminado', 'Guardá para confirmar los cambios', 'info');
  }
};

function filterProducts(searchTerm) {
  const rows = document.querySelectorAll('#tableBody tr');
  const normalized = searchTerm.toLowerCase();
  
  rows.forEach(row => {
    const text = row.textContent.toLowerCase();
    row.style.display = text.includes(normalized) ? '' : 'none';
  });
}

// ==================== GUARDADO MASIVO ====================
async function saveAllProducts() {
  const btn = document.getElementById('saveChangesBtn');
  const btnBottom = document.getElementById('saveChangesBtnBottom');
  
  // Validación
  if (productos.length === 0) {
    showToast('Sin productos', 'Agregá al menos 1 producto', 'warning');
    return false;
  }
  
  const activeProducts = productos.filter(p => !p.paused);
  if (activeProducts.length === 0) {
    showToast('Productos requeridos', 'Necesitás al menos 1 producto activo', 'warning');
    return false;
  }
  
  try {
    // Estado "guardando"
    [btn, btnBottom].forEach(b => {
      if (b) {
        b.classList.add('saving');
        b.classList.remove('saved', 'ready');
        if (b.id === 'saveChangesBtn') {
          b.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';
        }
        if (b.id === 'saveChangesBtnBottom') {
          b.innerHTML = 'Guardando...';
        }
      }
    });
    
    showLoading('Guardando productos...');
    
    // IMPORTANTE: Usar la subcolección del comercio
    const productosRef = collection(db, 'comercios', currentComercioId, 'productos');
    
    // 1. Obtener IDs actuales
    const currentIds = new Set(productos.map(p => p.id).filter(id => id));
    
    // 2. Eliminar productos que ya no están en la lista
    const allDocs = await getDocs(productosRef);
    for (const docSnap of allDocs.docs) {
      if (!currentIds.has(docSnap.id)) {
        await deleteDoc(doc(db, 'comercios', currentComercioId, 'productos', docSnap.id));
        console.log(`🗑️ Eliminado: ${docSnap.id}`);
      }
    }
    
    // 3. Actualizar o crear productos
    for (const producto of productos) {
      const { id, ...productData } = producto;
      
      if (id) {
        // Actualizar existente
        const productRef = doc(db, 'comercios', currentComercioId, 'productos', id);
        await updateDoc(productRef, {
          ...productData,
          fechaActualizacion: new Date()
        });
        console.log(`✏️ Actualizado: ${id}`);
      } else {
        // Crear nuevo
        const newDocRef = await addDoc(productosRef, {
          ...productData,
          fechaCreacion: new Date(),
          fechaActualizacion: new Date()
        });
        producto.id = newDocRef.id;
        console.log(`✅ Creado: ${newDocRef.id}`);
      }
    }
    
    // 4. Actualizar documento del comercio
    const comercioRef = doc(db, 'comercios', currentComercioId);
    await updateDoc(comercioRef, {
      cantidadProductos: productos.length,
      'onboardingSteps.productos': true,
      fechaActualizacion: new Date()
    });
    
    console.log('✅ Productos guardados y paso marcado como completado');
    
    // Actualizar estado
    originalProductos = structuredClone(productos);
    hasUnsavedChanges = false;
    
    // Estado "guardado"
    [btn, btnBottom].forEach(b => {
      if (b) {
        b.classList.remove('saving');
        b.classList.add('saved');
        if (b.id === 'saveChangesBtn') {
          b.innerHTML = '<i class="fas fa-check"></i> ¡Guardado!';
        }
        if (b.id === 'saveChangesBtnBottom') {
          b.innerHTML = '¡Guardado!';
        }
      }
    });
    
    setTimeout(() => {
      [btn, btnBottom].forEach(b => {
        if (b) {
          b.disabled = true;
          b.className = 'btn-save';
          if (b.id === 'saveChangesBtn') {
            b.innerHTML = '<i class="fas fa-save"></i> <span>Guardar Cambios</span>';
          }
          if (b.id === 'saveChangesBtnBottom') {
            b.innerHTML = 'Guardar Cambios';
          }
        }
      });
    }, 2500);
    
    hideLoading();
    showToast('Éxito', 'Productos guardados correctamente', 'success');
    updateBanner();
    
    // Ejecutar flowController
    try {
      runFlowController(currentUser.uid);
    } catch (e) {
      console.warn('runFlowController falló tras guardar:', e);
    }
    
    return true;
  } catch (error) {
    console.error('Error guardando productos:', error);
    hideLoading();
    
    [btn, btnBottom].forEach(b => {
      if (b) {
        b.className = 'btn-save';
        b.innerHTML = '<i class="fas fa-save"></i> Error';
        b.disabled = false;
      }
    });
    
    showToast('Error', 'No se pudieron guardar los productos: ' + error.message, 'error');
    return false;
  } finally {
    checkFormValidity();
  }
}

// ==================== HELPERS ====================
function formatNumber(num) {
  return new Intl.NumberFormat('es-AR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(num);
}

// ==================== FIN PARTE 3 ====================
// Este es el final del archivo productos.js
// Combiná las 3 partes en orden: Parte 1 + Parte 2 + Parte 3
