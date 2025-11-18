// src/pages/productos.jsx
import { auth, db } from '../firebase.js';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, collection, getDocs, addDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import Navigation from '../shared/navigation.jsx';
import { showLoading, hideLoading, showToast } from '../shared/utils.jsx';
import { PLANS, calcularEstadoPlan, getDiasRestantesTrial } from '../shared/plans.js';
import { runFlowController } from '../controllers/flowController.js';

/ =========================
// 🔄 INIT FLOW CONTROLLER
// =========================
onAuthStateChanged(auth, async (user) => {
  if (user) {
    await runFlowController(user.uid);
  } else {
    window.location.href = "/login.html";
  }
});


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
  console.log('Iniciando productos.js');
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      currentUser = user;
      await initializePage();
    } else {
      window.location.href = '/index.html';
    }
  });
});

async function initializePage() {
  try {
    showLoading('Cargando productos...');
    const userRef = doc(db, 'usuarios', currentUser.uid);
    const userDoc = await getDoc(userRef);
    if (!userDoc.exists() || !userDoc.data().comercioId) {
      window.location.href = './mi-comercio.html';
      return;
    }
    currentComercioId = userDoc.data().comercioId;
    const comercioRef = doc(db, 'comercios', currentComercioId);
    const comercioDoc = await getDoc(comercioRef);
    if (comercioDoc.exists()) {
      comercioData = { id: currentComercioId, ...comercioDoc.data() };
    }
    await loadProducts();
    updateHeader();
    updateSubscriptionBanner();
    renderProductsTable();
    setupEventListeners();
    Navigation.init();
    createSaveButton();
    window.validateCurrentPageData = () => {
      const activeProducts = productos.filter(p => !p.paused);
      if (activeProducts.length === 0) {
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
  } catch (error) {
    hideLoading();
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
  } catch (error) {
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
  switch (estado) {
    case 'trial':
      const diasRestantes = getDiasRestantesTrial(comercioData);
      banner.classList.add('trial');
      message.innerHTML = `<strong>Trial activo</strong> - Te quedan <strong>${diasRestantes} días</strong>`;
      break;
    case 'expirado':
      banner.classList.add('expired');
      message.innerHTML = `<strong>Tu trial expiró.</strong> Elegí un plan para continuar`;
      break;
    case 'activo':
      banner.classList.add('active');
      message.innerHTML = `<strong>Plan ${planActual?.nombre} activo</strong>`;
      break;
    default:
      banner.classList.add('trial');
      message.innerHTML = `<strong>Cargá tus productos</strong>`;
  }
}

// ==================== EVENT LISTENERS ====================
function setupEventListeners() {
  document.getElementById('openAssistant')?.addEventListener('click', () => {
    showToast('info', 'Asistente abierto',
      'En la nueva pestaña, decile a Claude: "Soy de Indice IA y necesito ayuda cargando productos"', 8000);
  });

  const toggleMode = document.getElementById('toggleMode');
  const advancedFields = document.getElementById('advancedFields');
  if (toggleMode && advancedFields) {
    toggleMode.addEventListener('click', () => {
      const isVisible = advancedFields.style.display !== 'none';
      advancedFields.style.display = isVisible ? 'none' : 'block';
      toggleMode.innerHTML = isVisible ? 'Agregar más detalles' : 'Ocultar detalles';
    });
  }

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

  document.getElementById('manualForm')?.addEventListener('submit', handleManualSubmit);

  const fileUploadZone = document.getElementById('fileUploadZone');
  const fileInput = document.getElementById('fileInput');
  if (fileUploadZone && fileInput) {
    fileUploadZone.addEventListener('click', () => fileInput.click());
    fileUploadZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      fileUploadZone.classList.add('dragover');
    });
    fileUploadZone.addEventListener('dragleave', () => fileUploadZone.classList.remove('dragover'));
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

  document.getElementById('applyMapping')?.addEventListener('click', applyMapping);
  document.getElementById('cancelImport')?.addEventListener('click', () => {
    document.getElementById('csvPreviewSection').style.display = 'none';
    csvData = [];
    csvColumns = [];
  });

  document.getElementById('searchProducts')?.addEventListener('input', (e) => filterProducts(e.target.value));
  document.getElementById('checkAll')?.addEventListener('change', (e) => {
    productos.forEach(p => p.paused = !e.target.checked);
    renderProductsTable();
    markAsChanged();
  });

  document.getElementById('logoutBtn')?.addEventListener('click', handleLogout);

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
    <button type="button" class="btn btn-secondary btn-sm" onclick="this.parentElement.remove()">X</button>
  `;
  container.appendChild(div);
}

function renderEtiquetas() {
  const container = document.getElementById('etiquetasList');
  container.innerHTML = etiquetas.map((etiqueta, index) => `
    <span class="etiqueta-tag">
      ${etiqueta}
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

  const atributosObj = {};
  document.querySelectorAll('.atributo-field').forEach(field => {
    const key = field.querySelector('[data-attr-key]')?.value.trim();
    const value = field.querySelector('[data-attr-value]')?.value.trim();
    if (key && value) {
      atributosObj[key] = value;
    }
  });
  newProduct.atributos = atributosObj;
  newProduct.etiquetas = [...etiquetas];

  if (!newProduct.nombre || !newProduct.descripcion) {
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
    e.target.reset();
    atributos = [];
    etiquetas = [];
    document.getElementById('atributosList').innerHTML = '';
    document.getElementById('etiquetasList').innerHTML = '';
    document.getElementById('advancedFields').style.display = 'none';
    document.getElementById('toggleMode').innerHTML = 'Agregar más detalles';
    hideLoading();
    showToast('success', 'Producto agregado', 'El producto se guardó correctamente');
    document.getElementById('productsTable').scrollIntoView({ behavior: 'smooth' });
  } catch (error) {
    hideLoading();
    showToast('error', 'Error', 'No se pudo guardar el producto: ' + error.message);
  }
}

// ==================== FILE PARSING (XLSX) ====================
function parseFile(file) {
  showLoading('Procesando archivo...');
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = e.target.result;
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
      showToast('error', 'Error', 'No se pudo leer el archivo: ' + error.message);
    }
  };
  reader.onerror = () => {
    hideLoading();
    showToast('error', 'Error', 'No se pudo leer el archivo');
  };
  reader.readAsBinaryString(file);
}

function showPreview() {
  const previewSection = document.getElementById('csvPreviewSection');
  const previewHeader = document.getElementById('previewHeader');
  const previewBody = document.getElementById('previewBody');
  const mappingFields = document.getElementById('mappingFields');
  const importCount = document.getElementById('importCount');
  previewSection.style.display = 'block';
  const preview = csvData.slice(0, 5);
  previewHeader.innerHTML = `<tr>${csvColumns.map(col => `<th>${col}</th>`).join('')}</tr>`;
  previewBody.innerHTML = preview.map(row => `<tr>${csvColumns.map(col => `<td>${row[col] || ''}</td>`).join('')}</tr>`).join('');
  
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
            <option value="${campo.value}" ${campo.value === autoMap ? 'selected' : ''}>${campo.label}</option>
          `).join('')}
          <option value="__atributo__${col}">Agregar a atributos como "${col}"</option>
        </select>
      </div>
    `;
  }).join('');
  importCount.textContent = csvData.length;
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
    'disponibilidad': ['disponibilidad', 'availability', 'estado']
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
    const newProduct = { paused: false, atributos: {}, etiquetas: [] };
    Object.keys(row).forEach(csvColumn => {
      const targetField = mapping[csvColumn];
      let value = row[csvColumn];
      if (!targetField || !value) return;
      if (targetField.startsWith('__atributo__')) {
        const attrName = targetField.replace('__atributo__', '');
        newProduct.atributos[attrName] = value;
        return;
      }
      if (targetField === 'precio_final') {
        value = parsePrecio(value);
      } else if (targetField === 'stock') {
        value = parseInt(value) || 0;
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
        ...Object.fromEntries(Object.entries(newProduct).filter(([_, v]) => v !== '' && v !== null))
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
  markAsChanged();
  hideLoading();
  showToast('success', 'Importación completa', `${added} nuevos, ${updated} actualizados`, 5000);
  document.getElementById('productsTable').scrollIntoView({ behavior: 'smooth' });
}

function parsePrecio(value) {
  if (typeof value === 'number') return value;
  if (!value) return 0;
  let clean = value
    .toString()
    .replace(/[^\d,.-]/g, '')
    .replace(',', '.');
  const parts = clean.split('.');
  if (parts.length > 2) {
    clean = parts.slice(0, -1).join('') + '.' + parts[parts.length - 1];
  }
  const num = parseFloat(clean);
  return isNaN(num) ? 0 : num;
}

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
          <input type="checkbox" ${isActive ? 'checked' : ''} onchange="toggleProductStatus(${index})">
        </td>
        <td class="editable-cell" data-field="codigo" data-index="${index}">${producto.codigo || ''}</td>
        <td class="editable-cell" data-field="nombre" data-index="${index}">${producto.nombre || ''}</td>
        <td class="editable-cell" data-field="precio_final" data-index="${index}">
          ${producto.precio_final ? `$${formatNumber(producto.precio_final)}` : '-'}
        </td>
        <td class="editable-cell" data-field="stock" data-index="${index}">${producto.stock || 0}</td>
        <td style="text-align: center;">
          <button class="btn btn-secondary btn-sm" onclick="deleteProduct(${index})" title="Eliminar">X</button>
        </td>
      </tr>
    `;
  }).join('');
  document.querySelectorAll('.editable-cell').forEach(cell => {
    cell.addEventListener('click', () => makeEditable(cell));
  });
}

window.toggleProductStatus = (index) => {
  productos[index].paused = !productos[index].paused;
  renderProductsTable();
  markAsChanged();
};

window.deleteProduct = (index) => {
  if (confirm('¿Eliminar este producto?')) {
    productos.splice(index, 1);
    renderProductsTable();
    markAsChanged();
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
  cell.textContent = '';
  cell.appendChild(input);
  input.focus();
  const save = () => {
    let newValue = input.value.trim();
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
  });
}

function filterProducts(searchTerm) {
  const rows = document.querySelectorAll('#tableBody tr');
  const normalized = searchTerm.toLowerCase();
  rows.forEach(row => {
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
  saveBtn.innerHTML = '<span>Guardar Cambios</span>';
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    userInfo.insertBefore(saveBtn, logoutBtn);
  } else {
    userInfo.appendChild(saveBtn);
  }
  saveBtn.addEventListener('click', saveAllProducts);
}

function markAsChanged() {
  hasUnsavedChanges = true;
  const saveBtn = document.getElementById('saveChangesBtn');
  if (saveBtn) {
    saveBtn.disabled = false;
    saveBtn.className = 'btn-save';
    saveBtn.innerHTML = '<span>Guardar Cambios</span>';
  }
}

async function saveAllProducts() {
  const saveBtn = document.getElementById('saveChangesBtn');
  try {
    if (productos.length === 0) {
      showToast('warning', 'Sin productos', 'Agregá al menos 1 producto');
      return false;
    }
    if (saveBtn) {
      saveBtn.className = 'btn-save saving';
      saveBtn.innerHTML = '<span>Guardando...</span>';
      saveBtn.disabled = true;
    }
    showLoading('Guardando productos...');

    const productosRef = collection(db, 'comercios', currentComercioId, 'productos');
    const currentIds = new Set(productos.map(p => p.id).filter(id => id));
    const allDocs = await getDocs(productosRef);

    for (const docSnap of allDocs.docs) {
      if (!currentIds.has(docSnap.id)) {
        await deleteDoc(doc(db, 'comercios', currentComercioId, 'productos', docSnap.id));
      }
    }

    for (const producto of productos) {
      const { id, ...productData } = producto;
      if (id) {
        const productRef = doc(db, 'comercios', currentComercioId, 'productos', id);
        await updateDoc(productRef, { ...productData, fechaActualizacion: new Date() });
      } else {
        const newDocRef = await addDoc(productosRef, {
          ...productData,
          fechaCreacion: new Date(),
          fechaActualizacion: new Date()
        });
        producto.id = newDocRef.id;
      }
    }

    const comercioRef = doc(db, 'comercios', currentComercioId);
    await updateDoc(comercioRef, {
      cantidadProductos: productos.length,
      'onboardingSteps.productos': true,
      fechaActualizacion: new Date()
    });

    console.log('✅ Productos guardados y paso "productos" marcado como completado');

    originalProductos = JSON.parse(JSON.stringify(productos));
    hasUnsavedChanges = false;

    if (saveBtn) {
      saveBtn.className = 'btn-save saved';
      saveBtn.innerHTML = '<span>Guardado</span>';
      setTimeout(() => {
        saveBtn.disabled = true;
        saveBtn.className = 'btn-save';
        saveBtn.innerHTML = '<span>Guardar Cambios</span>';
      }, 2000);
    }

    hideLoading();
    showToast('success', 'Productos guardados', 'Todos los cambios se guardaron correctamente');

    setTimeout(() => {
      runFlowController(currentUser.uid);
    }, 1000);

    return true;
  } catch (error) {
    hideLoading();
    if (saveBtn) {
      saveBtn.className = 'btn-save';
      saveBtn.innerHTML = '<span>Error</span>';
      saveBtn.disabled = false;
    }
    showToast('error', 'Error', 'No se pudieron guardar los productos: ' + error.message);
    return false;
  }
}

async function handleLogout() {
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
