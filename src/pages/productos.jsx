// src/pages/productos.jsx
import { auth, db } from '../firebase.js';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, collection, getDocs, addDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import Navigation from '../shared/navigation.js';
import { showLoading, hideLoading, showToast } from '../shared/utils.js';
import { updateCommerceJSON } from '../shared/updateCommerceJSON.js';
import { PLANS, calcularEstadoPlan, getDiasRestantesTrial } from '../shared/plans.js';
import { redirectToNextStep } from '../shared/redirect-dashboard.js';

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

// ==================== INIT ====================
document.addEventListener('DOMContentLoaded', async () => {
  console.log('🚀 Iniciando productos.js');
  console.log('Iniciando productos.js');

  onAuthStateChanged(auth, async (user) => {
    if (user) {
      console.log('✅ Usuario autenticado:', user.email);
      currentUser = user;
      await initializePage();
    } else {
      console.log('❌ Usuario no autenticado, redirigiendo...');
      window.location.href = '/index.html';
    }
  });
});

async function initializePage() {
  try {
    showLoading('Cargando productos...');

    // Obtener comercioId
    const userRef = doc(db, 'usuarios', currentUser.uid);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists() || !userDoc.data().comercioId) {
      window.location.href = './mi-comercio.html';
      return;
    }

    currentComercioId = userDoc.data().comercioId;

    // Cargar datos del comercio
    const comercioRef = doc(db, 'comercios', currentComercioId);
    const comercioDoc = await getDoc(comercioRef);

    if (comercioDoc.exists()) {
      comercioData = { id: currentComercioId, ...comercioDoc.data() };
    }

    // Cargar productos
    await loadProducts();

    // Inicializar UI
    updateHeader();
    updateSubscriptionBanner();
    renderProductsTable();
    setupEventListeners();
    Navigation.init();
    createSaveButton();

    // Validación para navegación
    window.validateCurrentPageData = () => {
      const activeProducts = productos.filter(p => !p.paused);
      if (activeProducts.length === 0) {
        showToast('Productos requeridos', '👋 Ey! Necesitás al menos 1 producto activo', 'warning');
        showToast('Productos requeridos', 'Necesitás al menos 1 producto activo', 'warning');
        return false;
      }

      if (hasUnsavedChanges) {
        showToast('Cambios sin guardar', 'Guardá los cambios antes de continuar', 'warning');
        return false;
      }

      return true;
    };

    hideLoading();
    console.log('✅ Página inicializada correctamente');

  } catch (error) {
    hideLoading();
    console.error('❌ Error inicializando página:', error);
    console.error('Error inicializando página:', error);
    showToast('Error', 'No se pudo cargar la página: ' + error.message, 'error');
  }
}

// ==================== CARGAR PRODUCTOS ====================
async function loadProducts() {
  try {
    const productosRef = collection(db, 'comercios', currentComercioId, 'productos');
    const snapshot = await getDocs(productosRef);

    productos = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    originalProductos = JSON.parse(JSON.stringify(productos));
    document.getElementById('productCount').textContent = productos.length;
    console.log('✅ Productos cargados:', productos.length);
    console.log('Productos cargados:', productos.length);
  } catch (error) {
    console.error('❌ Error cargando productos:', error);
    console.error('Error cargando productos:', error);
    throw error;
  }
}

// ==================== HEADER ====================
function updateHeader() {
  const commerceName = document.getElementById('commerceName');
  const planBadge = document.getElementById('planBadge');

  if (commerceName) {
    commerceName.textContent = comercioData.nombreComercio || 'Mi Comercio';
  }
  if (planBadge) {
    const plan = PLANS[comercioData.plan || 'trial'];
    planBadge.textContent = plan ? `${plan.emoji} ${plan.nombre}` : 'Trial';
  }
}

function updateSubscriptionBanner() {
  const banner = document.getElementById('subscriptionBanner');
  const message = document.getElementById('subscriptionMessage');

  if (!banner || !message) return;

  const estado = calcularEstadoPlan(comercioData);
  const planActual = PLANS[comercioData.plan || 'trial'];

  banner.className = 'subscription-banner';

  switch(estado) {
    case 'trial':
      const diasRestantes = getDiasRestantesTrial(comercioData);
      banner.classList.add('trial');
      message.innerHTML = `🎉 <strong>Trial activo</strong> - Te quedan <strong>${diasRestantes} días</strong>`;
      message.innerHTML = `<strong>Trial activo</strong> - Te quedan <strong>${diasRestantes} días</strong>`;
      break;
      
    case 'expirado':
      banner.classList.add('expired');
      message.innerHTML = `⚠️ <strong>Tu trial expiró.</strong> Elegí un plan para continuar`;
      message.innerHTML = `<strong>Tu trial expiró.</strong> Elegí un plan para continuar`;
      break;
      
    case 'activo':
      banner.classList.add('active');
      message.innerHTML = `✅ <strong>Plan ${planActual?.nombre} activo</strong>`;
      message.innerHTML = `<strong>Plan ${planActual?.nombre} activo</strong>`;
      break;
      
    default:
      banner.classList.add('trial');
      message.innerHTML = `🎉 <strong>Cargá tus productos</strong>`;
      message.innerHTML = `<strong>Cargá tus productos</strong>`;
  }
}

// ==================== EVENT LISTENERS ====================
function setupEventListeners() {
  // Asistente IA
  document.getElementById('openAssistant')?.addEventListener('click', () => {
    showToast('info', '🤖 Asistente abierto', 
      'En la nueva pestaña, decile a Claude: "Soy de Indice IA y necesito ayuda cargando productos"', 
      8000);
    showToast('info', 'Asistente abierto', 
      'En la nueva pestaña, decile a Claude: "Soy de Indice IA y necesito ayuda cargando productos"', 8000);
  });

  // Toggle modo básico/avanzado
  const toggleMode = document.getElementById('toggleMode');
  const advancedFields = document.getElementById('advancedFields');

  if (toggleMode && advancedFields) {
    toggleMode.addEventListener('click', () => {
      const isVisible = advancedFields.style.display !== 'none';
      advancedFields.style.display = isVisible ? 'none' : 'block';
      toggleMode.innerHTML = isVisible ? '➕ Agregar más detalles' : '➖ Ocultar detalles';
      toggleMode.innerHTML = isVisible ? 'Agregar más detalles' : 'Ocultar detalles';
    });
  }

  // Agregar atributo
  document.getElementById('addAtributo')?.addEventListener('click', addAtributoField);

  // Agregar etiqueta
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
  document.getElementById('manualForm')?.addEventListener('submit', handleManualSubmit);

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
    
    fileUploadZone.addEventListener('dragover', (e) => { e.preventDefault(); fileUploadZone.classList.add('dragover'); });
    fileUploadZone.addEventListener('dragleave', () => fileUploadZone.classList.remove('dragover'));
    fileUploadZone.addEventListener('drop', (e) => {
      e.preventDefault();
      fileUploadZone.classList.remove('dragover');
      e.preventDefault(); fileUploadZone.classList.remove('dragover');
      const file = e.dataTransfer.files[0];
      if (file) parseFile(file);
    });

    fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) parseFile(file);
    });
  }

  // Botones de mapeo
  document.getElementById('applyMapping')?.addEventListener('click', applyMapping);
  document.getElementById('cancelImport')?.addEventListener('click', () => {
    document.getElementById('csvPreviewSection').style.display = 'none';
    csvData = [];
    csvColumns = [];
  });

  // Búsqueda
  document.getElementById('searchProducts')?.addEventListener('input', (e) => {
    filterProducts(e.target.value);
    csvData = []; csvColumns = [];
  });

  // Check all
  document.getElementById('searchProducts')?.addEventListener('input', (e) => filterProducts(e.target.value));
  document.getElementById('checkAll')?.addEventListener('change', (e) => {
    productos.forEach(p => p.paused = !e.target.checked);
    renderProductsTable();
    markAsChanged();
    renderProductsTable(); markAsChanged();
  });

  // Logout
  document.getElementById('logoutBtn')?.addEventListener('click', handleLogout);

  // Beforeunload
  window.addEventListener('beforeunload', (e) => {
    if (hasUnsavedChanges) {
      e.preventDefault();
      e.returnValue = '¿Seguro que quieres salir? Tienes cambios sin guardar.';
    }
  });
}

// ==================== FORM MANUAL ====================
function addAtributoField() {
  const container = document.getElementById('atributosList');
  const index = atributos.length;

  const div = document.createElement('div');
  div.className = 'atributo-field';
  div.innerHTML = `
    <input type="text" placeholder="Nombre (ej: sabor)" data-attr-key="${index}">
    <input type="text" placeholder="Valor (ej: chocolate)" data-attr-value="${index}">
    <button type="button" class="btn btn-secondary btn-sm" onclick="this.parentElement.remove()">
      <i class="fas fa-times"></i>
    </button>
    <button type="button" class="btn btn-secondary btn-sm" onclick="this.parentElement.remove()">X</button>
  `;
  
  container.appendChild(div);
}

function renderEtiquetas() {
  const container = document.getElementById('etiquetasList');
  container.innerHTML = etiquetas.map((etiqueta, index) => `
    <span class="etiqueta-tag">
      ${etiqueta}
      <button type="button" onclick="removeEtiqueta(${index})">
        <i class="fas fa-times"></i>
      </button>
      <button type="button" onclick="removeEtiqueta(${index})">X</button>
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

  const form = e.target;

  
  // Campos básicos
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
    paused: false
  };

  // Atributos
  const atributosObj = {};
  document.querySelectorAll('.atributo-field').forEach(field => {
    const key = field.querySelector('[data-attr-key]')?.value.trim();
    const value = field.querySelector('[data-attr-value]')?.value.trim();
    if (key && value) {
      atributosObj[key] = value;
    }
    if (key && value) atributosObj[key] = value;
  });
  newProduct.atributos = atributosObj;

  // Etiquetas
  newProduct.etiquetas = [...etiquetas];

  // Validación
  if (!newProduct.nombre || !newProduct.descripcion) {
    showToast('Campos requeridos', '👋 Ey! Falta el nombre o la descripción del producto', 'warning');
    showToast('Campos requeridos', 'Falta el nombre o la descripción del producto', 'warning');
    return;
  }

  try {
    showLoading('Guardando producto...');

    const productosRef = collection(db, 'comercios', currentComercioId, 'productos');
    const docRef = await addDoc(productosRef, {
      ...newProduct,
      fechaCreacion: new Date(),
      fechaActualizacion: new Date()
    });

    newProduct.id = docRef.id;
    productos.push(newProduct);
    
    renderProductsTable();
    form.reset();
    atributos = [];
    etiquetas = [];
    e.target.reset();
    atributos = []; etiquetas = [];
    document.getElementById('atributosList').innerHTML = '';
    document.getElementById('etiquetasList').innerHTML = '';
    document.getElementById('advancedFields').style.display = 'none';
    document.getElementById('toggleMode').innerHTML = '➕ Agregar más detalles';
    document.getElementById('toggleMode').innerHTML = 'Agregar más detalles';

    hideLoading();
    showToast('success', '✅ Producto agregado', 'El producto se guardó correctamente');

    // Scroll a la tabla
    showToast('success', 'Producto agregado', 'El producto se guardó correctamente');
    document.getElementById('productsTable').scrollIntoView({ behavior: 'smooth' });

  } catch (error) {
    hideLoading();
    console.error('Error guardando producto:', error);
    showToast('error', 'Error', 'No se pudo guardar el producto: ' + error.message);
  }
}

// ==================== FILE PARSING ====================
function parseFile(file) {
  showLoading('Procesando archivo...');
  
  const reader = new FileReader();

  reader.onload = (e) => {
    try {
      const data = e.target.result;
      const workbook = XLSX.read(data, { type: 'binary' });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(firstSheet, { defval: "" });

      if (jsonData.length === 0) {
        throw new Error('El archivo está vacío');
      }
      if (jsonData.length === 0) throw new Error('El archivo está vacío');

      csvData = jsonData;
      csvColumns = Object.keys(jsonData[0]);
      
      showPreview();
      hideLoading();

    } catch (error) {
      hideLoading();
      console.error('Error parseando archivo:', error);
      showToast('error', 'Error', 'No se pudo leer el archivo: ' + error.message);
    }
  };

  reader.onerror = () => {
    hideLoading();
    showToast('error', 'Error', 'No se pudo leer el archivo');
  };
  
  reader.onerror = () => { hideLoading(); showToast('error', 'Error', 'No se pudo leer el archivo'); };
  reader.readAsBinaryString(file);
}

function showPreview() {
  const previewSection = document.getElementById('csvPreviewSection');
  const previewHeader = document.getElementById('previewHeader');
  const previewBody = document.getElementById('previewBody');
  const mappingFields = document.getElementById('mappingFields');
  const importCount = document.getElementById('importCount');

  previewSection.style.display = 'block';
  
  // Preview - primeras 5 filas
  const preview = csvData.slice(0, 5);

  previewHeader.innerHTML = `
    <tr>
      ${csvColumns.map(col => `<th>${col}</th>`).join('')}
    </tr>
  `;
  
  previewBody.innerHTML = preview.map(row => `
    <tr>
      ${csvColumns.map(col => `<td>${row[col] || ''}</td>`).join('')}
    </tr>
  `).join('');
  previewHeader.innerHTML = `<tr>${csvColumns.map(col => `<th>${col}</th>`).join('')}</tr>`;
  previewBody.innerHTML = preview.map(row => `<tr>${csvColumns.map(col => `<td>${row[col] || ''}</td>`).join('')}</tr>`).join('');

  // Mapeo de columnas
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
    // Auto-detectar mapeo
    const autoMap = detectColumnMapping(col);
    
    return `
      <div class="mapping-field">
        <label>
          <strong>Columna:</strong> "${col}"
        </label>
        <label><strong>Columna:</strong> "${col}"</label>
        <select data-csv-column="${col}">
          ${camposBase.map(campo => `
            <option value="${campo.value}" ${campo.value === autoMap ? 'selected' : ''}>
              ${campo.label}
            </option>
            <option value="${campo.value}" ${campo.value === autoMap ? 'selected' : ''}>${campo.label}</option>
          `).join('')}
          <option value="__atributo__${col}">
            📦 Agregar a atributos como "${col}"
          </option>
          <option value="__atributo__${col}">Agregar a atributos como "${col}"</option>
        </select>
      </div>
    `;
  }).join('');

  importCount.textContent = csvData.length;
  
  showToast('info', 'Archivo cargado', `Se detectaron ${csvData.length} productos. Revisá el mapeo de columnas.`, 5000);
  
  // Scroll al preview
  showToast('info', 'Archivo cargado', `Se detectaron ${csvData.length} productos. Revisá el mapeo.`, 5000);
  previewSection.scrollIntoView({ behavior: 'smooth' });
}

function detectColumnMapping(columnName) {
  const normalized = columnName.toLowerCase().trim();
  
  const mappings = {
    'codigo': ['codigo', 'code', 'id', 'sku', 'producto_id'],
    'nombre': ['nombre', 'articulo', 'producto', 'name', 'title'],
    'descripcion': ['descripcion', 'description', 'detalle', 'desc'],
    'precio_final': ['precio', 'price', 'precio_final', 'pvp', 'valor'],
    'stock': ['stock', 'cantidad', 'qty', 'disponible'],
    'categoria': ['categoria', 'category', 'rubro', 'tipo'],
    'subcategoria': ['subcategoria', 'subcategory', 'subtipo'],
    'marca': ['marca', 'brand', 'fabricante'],
    'imagen': ['imagen', 'image', 'foto', 'picture', 'url_imagen'],
    'disponibilidad': ['disponibilidad', 'availability', 'estado'],
    'codigo': ['codigo', 'code', 'id', 'sku'],
    'nombre': ['nombre', 'articulo', 'producto', 'name'],
    'descripcion': ['descripcion', 'description'],
    'precio_final': ['precio', 'price', 'pvp'],
    'stock': ['stock', 'cantidad', 'qty'],
    'categoria': ['categoria', 'category'],
    'subcategoria': ['subcategoria', 'subcategory'],
    'marca': ['marca', 'brand'],
    'imagen': ['imagen', 'image', 'foto'],
    'disponibilidad': ['disponibilidad', 'availability']
  };

  for (const [field, aliases] of Object.entries(mappings)) {
    if (aliases.some(alias => normalized.includes(alias))) {
      return field;
    }
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
    
    if (targetField) {
      mapping[csvColumn] = targetField;
    }
    if (targetField) mapping[csvColumn] = targetField;
  });

  mergeCSVData(mapping);
}

function mergeCSVData(mapping) {
  showLoading('Importando productos...');
  
  let added = 0;
  let updated = 0;
  let added = 0, updated = 0;

  csvData.forEach(row => {
    const newProduct = {
      paused: false,
      atributos: {},
      etiquetas: []
    };

    // Mapear columnas
    const newProduct = { paused: false, atributos: {}, etiquetas: [] };
    Object.keys(row).forEach(csvColumn => {
      const targetField = mapping[csvColumn];
      let value = row[csvColumn];

      if (!targetField || !value) return;

      // Si es atributo
      if (targetField.startsWith('__atributo__')) {
        const attrName = targetField.replace('__atributo__', '');
        newProduct.atributos[attrName] = value;
        return;
      }

      // Conversiones de tipo
      if (targetField === 'precio_final') {
        value = parsePrecio(value);
      } else if (targetField === 'stock') {
        value = parseInt(value) || 0;
      }

      if (targetField === 'precio_final') value = parsePrecio(value);
      else if (targetField === 'stock') value = parseInt(value) || 0;
      newProduct[targetField] = value;
    });

    // Validaciones
    if (!newProduct.nombre && !newProduct.descripcion) {
      return; // Skip productos inválidos
    }

    // Auto-generar código si no existe
    if (!newProduct.codigo || newProduct.codigo.trim() === '') {
      newProduct.codigo = generateCodigo();
    }
    if (!newProduct.nombre && !newProduct.descripcion) return;
    if (!newProduct.codigo) newProduct.codigo = generateCodigo();

    // Buscar si existe (por código)
    const existingIndex = productos.findIndex(p => p.codigo === newProduct.codigo);

    if (existingIndex >= 0) {
      // Merge: no sobrescribir campos vacíos
      productos[existingIndex] = {
        ...productos[existingIndex],
        ...Object.fromEntries(
          Object.entries(newProduct).filter(([_, v]) => v !== '' && v !== null)
        )
      };
      productos[existingIndex] = { ...productos[existingIndex], ...Object.fromEntries(Object.entries(newProduct).filter(([_, v]) => v !== '' && v !== null)) };
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

  csvData = []; csvColumns = [];
  renderProductsTable();
  markAsChanged();
  hideLoading();

  showToast('success', 'Importación completa', 
    `✅ ${added} productos nuevos, ${updated} actualizados`, 5000);

  // Scroll a la tabla
  showToast('success', 'Importación completa', `${added} nuevos, ${updated} actualizados`, 5000);
  document.getElementById('productsTable').scrollIntoView({ behavior: 'smooth' });
}

function parsePrecio(value) {
  if (typeof value === 'number') return value;
  if (!value) return 0;

  // Quitar símbolos de moneda y espacios
  let clean = value
    .toString()
    .replace(/[^\d,.-]/g, '')  // Solo números, coma, punto, guión
    .replace(',', '.');         // Coma decimal → punto

  // Si hay más de un punto, el último es decimal
  let clean = value.toString().replace(/[^\d,.-]/g, '').replace(',', '.');
  const parts = clean.split('.');
  if (parts.length > 2) {
    const decimals = parts.pop();
    clean = parts.join('') + '.' + decimals;
  }

  if (parts.length > 2) clean = parts.slice(0, -1).join('') + '.' + parts[parts.length - 1];
  const num = parseFloat(clean);
  return isNaN(num) ? 0 : num;
}

// ==================== TABLA DE PRODUCTOS ====================
// ==================== TABLA ====================
function renderProductsTable() {
  const tableBody = document.getElementById('tableBody');
  const emptyMessage = document.getElementById('emptyMessage');
  const productCount = document.getElementById('productCount');

  productCount.textContent = productos.length;

  if (productos.length === 0) {
    emptyMessage.style.display = 'block';
    tableBody.innerHTML = '';
    return;
  }

  emptyMessage.style.display = 'none';

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
          ${producto.codigo || ''}
        </td>
        <td class="editable-cell" data-field="nombre" data-index="${index}">
          ${producto.nombre || ''}
          <input type="checkbox" ${!producto.paused ? 'checked' : ''} onchange="toggleProductStatus(${index})">
        </td>
        <td class="editable-cell" data-field="codigo" data-index="${index}">${producto.codigo || ''}</td>
        <td class="editable-cell" data-field="nombre" data-index="${index}">${producto.nombre || ''}</td>
        <td class="editable-cell" data-field="precio_final" data-index="${index}">
          ${producto.precio_final ? `$${formatNumber(producto.precio_final)}` : '-'}
        </td>
        <td class="editable-cell" data-field="stock" data-index="${index}">
          ${producto.stock || 0}
        </td>
        <td class="editable-cell" data-field="stock" data-index="${index}">${producto.stock || 0}</td>
        <td style="text-align: center;">
          <button class="btn btn-secondary btn-sm" onclick="deleteProduct(${index})" title="Eliminar">
            <i class="fas fa-trash"></i>
          </button>
          <button class="btn btn-secondary btn-sm" onclick="deleteProduct(${index})" title="Eliminar">X</button>
        </td>
      </tr>
    `;
  }).join('');

  // Event listeners para edición inline
  document.querySelectorAll('.editable-cell').forEach(cell => {
    cell.addEventListener('click', () => makeEditable(cell));
  });
  document.querySelectorAll('.editable-cell').forEach(cell => cell.addEventListener('click', () => makeEditable(cell)));
}

window.toggleProductStatus = (index) => {
  productos[index].paused = !productos[index].paused;
  renderProductsTable();
  markAsChanged();
};

window.deleteProduct = (index) => {
  if (confirm('¿Estás seguro de eliminar este producto?')) {
  if (confirm('¿Eliminar este producto?')) {
    productos.splice(index, 1);
    renderProductsTable();
    markAsChanged();
    showToast('info', 'Producto eliminado', 'Guardá los cambios para confirmar');
    showToast('info', 'Producto eliminado', 'Guardá para confirmar');
  }
};

function makeEditable(cell) {
  const field = cell.dataset.field;
  const index = parseInt(cell.dataset.index);
  const currentValue = productos[index][field] || '';

  const input = document.createElement('input');
  input.type = field === 'precio_final' || field === 'stock' ? 'number' : 'text';
  input.value = field === 'precio_final' ? (currentValue || 0) : currentValue;
  input.style.width = '100%';
  input.style.boxSizing = 'border-box';
  input.style.width = '100%'; input.style.boxSizing = 'border-box';

  cell.textContent = '';
  cell.appendChild(input);
  input.focus();

  const save = () => {
    let newValue = input.value.trim();
    
    if (field === 'precio_final') {
      newValue = parseFloat(newValue) || 0;
    } else if (field === 'stock') {
      newValue = parseInt(newValue) || 0;
    }
    
    if (field === 'precio_final') newValue = parseFloat(newValue) || 0;
    else if (field === 'stock') newValue = parseInt(newValue) || 0;
    productos[index][field] = newValue;
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
    if (e.key === 'Enter') { e.preventDefault(); save(); }
    else if (e.key === 'Escape') renderProductsTable();
  });
}

function filterProducts(searchTerm) {
  const rows = document.querySelectorAll('#tableBody tr');
  const normalized = searchTerm.toLowerCase();
  
  rows.forEach(row => {
    const text = row.textContent.toLowerCase();
    row.style.display = text.includes(normalized) ? '' : 'none';
    row.style.display = row.textContent.toLowerCase().includes(normalized) ? '' : 'none';
  });
}

// ==================== HELPERS ====================
function generateCodigo() {
  const date = new Date();
  const timestamp = date.getTime().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `PROD_${timestamp}_${random}`;
}

function formatNumber(num) {
  return new Intl.NumberFormat('es-AR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(num);
  return new Intl.NumberFormat('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num);
}

// ==================== GUARDAR ====================
function createSaveButton() {
  const userInfo = document.querySelector('.header .user-info');
  if (!userInfo) return;

  const saveBtn = document.createElement('button');
  saveBtn.id = 'saveChangesBtn';
  saveBtn.className = 'btn-save';
  saveBtn.disabled = true;
  saveBtn.innerHTML = '<i class="fas fa-save"></i> <span>Guardar Cambios</span>';
  saveBtn.innerHTML = '<span>Guardar Cambios</span>';

  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    userInfo.insertBefore(saveBtn, logoutBtn);
  } else {
    userInfo.appendChild(saveBtn);
  }
  if (logoutBtn) userInfo.insertBefore(saveBtn, logoutBtn);
  else userInfo.appendChild(saveBtn);

  saveBtn.addEventListener('click', saveAllProducts);
}

function markAsChanged() {
  hasUnsavedChanges = true;
  const saveBtn = document.getElementById('saveChangesBtn');
  if (saveBtn) {
    saveBtn.disabled = false;
    saveBtn.className = 'btn-save';
    saveBtn.innerHTML = '<i class="fas fa-save"></i> <span>Guardar Cambios</span>';
    saveBtn.innerHTML = '<span>Guardar Cambios</span>';
  }
}

async function saveAllProducts() {
  const saveBtn = document.getElementById('saveChangesBtn');

  try {
    if (productos.length === 0) {
      showToast('warning', 'Sin productos', '👋 Ey! Agregá al menos 1 producto antes de guardar');
      showToast('warning', 'Sin productos', 'Agregá al menos 1 producto');
      return false;
    }

    if (saveBtn) {
      saveBtn.className = 'btn-save saving';
      saveBtn.innerHTML = '<i class="fas fa-spinner"></i> <span>Guardando...</span>';
      saveBtn.innerHTML = '<span>Guardando...</span>';
      saveBtn.disabled = true;
    }

    showLoading('Guardando productos...');

    const productosRef = collection(db, 'comercios', currentComercioId, 'productos');
    
    // Eliminar productos que ya no existen
    const currentIds = new Set(productos.map(p => p.id).filter(id => id));
    const allDocs = await getDocs(productosRef);

    for (const docSnap of allDocs.docs) {
      if (!currentIds.has(docSnap.id)) {
        await deleteDoc(doc(db, 'comercios', currentComercioId, 'productos', docSnap.id));
      }
    }

    // Guardar/actualizar productos
    for (const producto of productos) {
      const { id, ...productData } = producto;
      
      if (id) {
        const productRef = doc(db, 'comercios', currentComercioId, 'productos', id);
        await updateDoc(productRef, {
          ...productData,
          fechaActualizacion: new Date()
        });
        await updateDoc(productRef, { ...productData, fechaActualizacion: new Date() });
      } else {
        const newDocRef = await addDoc(productosRef, {
          ...productData,
          fechaCreacion: new Date(),
          fechaActualizacion: new Date()
        });
        const newDocRef = await addDoc(productosRef, { ...productData, fechaCreacion: new Date(), fechaActualizacion: new Date() });
        producto.id = newDocRef.id;
      }
    }

    console.log('✅ Productos guardados en Firestore');

    // Actualizar JSON en Gist
    try {
      await updateCommerceJSON(currentComercioId, currentUser.uid);
      console.log('✅ JSON actualizado en Gist');
    } catch (jsonError) {
      console.warn('⚠️ Error actualizando JSON:', jsonError);
      showToast('warning', 'Advertencia', 'Productos guardados pero JSON no actualizado');
    }

    // Actualizar cantidadProductos
    const comercioRef = doc(db, 'comercios', currentComercioId);
    await updateDoc(comercioRef, {
      cantidadProductos: productos.length,
      fechaActualizacion: new Date()
    });

    // Estado local
    originalProductos = JSON.parse(JSON.stringify(productos));
    hasUnsavedChanges = false;

    // UI feedback
    if (saveBtn) {
      saveBtn.className = 'btn-save saved';
      saveBtn.innerHTML = '<i class="fas fa-check-circle"></i> <span>Guardado ✓</span>';
      saveBtn.innerHTML = '<span>Guardado</span>';
      setTimeout(() => {
        saveBtn.disabled = true;
        saveBtn.className = 'btn-save';
        saveBtn.innerHTML = '<i class="fas fa-save"></i> <span>Guardar Cambios</span>';
        saveBtn.innerHTML = '<span>Guardar Cambios</span>';
      }, 2000);
    }

    Navigation.markPageAsCompleted('productos');
    Navigation.updateProgressBar();

    hideLoading();
    showToast('success', '✅ Productos guardados', 'Todos los cambios se guardaron correctamente');
    setTimeout(() => {
    redirectToNextStep();
    }, 2000);
    showToast('success', 'Productos guardados', 'Todos los cambios se guardaron correctamente');
    setTimeout(() => redirectToNextStep(), 2000);
    return true;

  } catch (error) {
    console.error('❌ Error guardando productos:', error);
    console.error('Error guardando productos:', error);
    hideLoading();
    
    if (saveBtn) {
      saveBtn.className = 'btn-save';
      saveBtn.innerHTML = '<i class="fas fa-exclamation-circle"></i> <span>Error</span>';
      saveBtn.innerHTML = '<span>Error</span>';
      saveBtn.disabled = false;
    }
    
    showToast('error', 'Error', 'No se pudieron guardar los productos: ' + error.message);
    return false;
  }
}

async function handleLogout() {
  if (confirm('¿Estás seguro que deseas cerrar sesión?')) {
  if (confirm('¿Cerrar sesión?')) {
    try {
      showLoading('Cerrando sesión...');
      await signOut(auth);
      window.location.href = '/index.html';
    } catch (error) {
      hideLoading();
      showToast('error', 'Error', 'No se pudo cerrar sesión');
    }
  }
}
