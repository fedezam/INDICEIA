// src/pages/productos.js
import { auth, db } from '../firebase.js';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, collection, getDocs, addDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import Navigation from '../shared/navigation.js';
import { showLoading, hideLoading, showToast } from '../shared/utils.js';
import { updateCommerceJSON } from '../shared/updateCommerceJSON.js';
import { PLANS, calcularEstadoPlan, getDiasRestantesTrial } from '../shared/plans.js';

// ==================== VARIABLES GLOBALES ====================
let currentUser = null;
let currentComercioId = null;
let comercioData = {};
let productos = [];
let originalProductos = [];
let hasUnsavedChanges = false;
let csvData = [];
let csvColumns = [];
let dynamicFields = new Set(['codigo', 'nombre', 'descripcion', 'precio', 'categoria', 'imagen', 'paused']);

// ==================== INIT ====================
document.addEventListener('DOMContentLoaded', async () => {
  console.log('🚀 Iniciando productos.js');

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

    // Obtener comercioId desde el documento del usuario
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
    updateLimitBanner();
    renderTable();
    setupEventListeners();
    Navigation.init();
    createSaveButton();

    // Validación global para navegación
    window.validateCurrentPageData = () => {
      const activeProducts = productos.filter(p => !p.paused);
      if (activeProducts.length === 0) {
        showToast('Productos requeridos', 'Debes tener al menos 1 producto activo', 'warning');
        return false;
      }
      
      // Validar que todos tengan código
      const withoutCode = productos.filter(p => !p.codigo || p.codigo.trim() === '');
      if (withoutCode.length > 0) {
        showToast('Códigos faltantes', 'Todos los productos deben tener un código', 'warning');
        return false;
      }

      if (hasUnsavedChanges) {
        showToast('Cambios sin guardar', 'Debes guardar antes de continuar', 'warning');
        return false;
      }

      return true;
    };

    hideLoading();
    console.log('✅ Página inicializada correctamente');

  } catch (error) {
    hideLoading();
    console.error('❌ Error inicializando página:', error);
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

    // Detectar campos dinámicos de productos existentes
    productos.forEach(p => {
      Object.keys(p).forEach(key => {
        if (key !== 'id' && key !== 'fechaCreacion' && key !== 'fechaActualizacion') {
          dynamicFields.add(key);
        }
      });
    });

    originalProductos = JSON.parse(JSON.stringify(productos));
    console.log('✅ Productos cargados:', productos.length);
  } catch (error) {
    console.error('❌ Error cargando productos:', error);
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
      break;
      
    case 'expirado':
      banner.classList.add('expired');
      message.innerHTML = `⚠️ <strong>Tu trial expiró.</strong> Elegí un plan para continuar`;
      break;
      
    case 'suspendido':
      banner.classList.add('expired');
      message.innerHTML = `❌ <strong>Servicio suspendido.</strong> Regularizá el pago`;
      break;
      
    case 'activo':
      banner.classList.add('active');
      message.innerHTML = `✅ <strong>Plan ${planActual?.nombre} activo</strong>`;
      break;
      
    case 'limite_excedido':
      banner.classList.add('expired');
      const limiteActual = planActual?.productos || 0;
      message.innerHTML = `⚠️ <strong>Has superado el límite de ${limiteActual} productos.</strong> Upgrade tu plan`;
      break;
      
    default:
      banner.classList.add('trial');
      message.innerHTML = `🎉 <strong>Completa tu catálogo de productos</strong>`;
  }
}

function updateLimitBanner() {
  const banner = document.getElementById('limitBanner');
  const limitText = document.getElementById('limitText');
  
  if (!banner || !limitText) return;
  
  const plan = PLANS[comercioData.plan || 'trial'];
  const limite = plan?.productos;
  const actual = productos.length;
  
  if (limite === null) {
    banner.style.display = 'none';
    return;
  }
  
  banner.style.display = 'block';
  limitText.textContent = `${actual} de ${limite} productos usados`;
  
  if (actual >= limite) {
    banner.style.background = '#fed7d7';
    banner.style.borderLeftColor = '#e53e3e';
    limitText.parentElement.style.color = '#9b2c2c';
  } else if (actual >= limite * 0.8) {
    banner.style.background = '#fff3cd';
    banner.style.borderLeftColor = '#ffc107';
    limitText.parentElement.style.color = '#856404';
  } else {
    banner.style.background = '#d1fae5';
    banner.style.borderLeftColor = '#10b981';
    limitText.parentElement.style.color = '#065f46';
  }
}

// ==================== TABLA ====================
function renderTable() {
  const tableHeader = document.getElementById('tableHeader');
  const tableBody = document.getElementById('tableBody');
  const emptyMessage = document.getElementById('emptyMessage');
  
  if (!tableHeader || !tableBody) return;

  // Mostrar mensaje si no hay productos
  if (productos.length === 0) {
    emptyMessage.style.display = 'block';
    tableHeader.innerHTML = '';
    tableBody.innerHTML = '';
    return;
  }
  
  emptyMessage.style.display = 'none';

  // Renderizar headers
  const fields = Array.from(dynamicFields).filter(f => f !== 'id');
  tableHeader.innerHTML = '';
  
  fields.forEach(field => {
    const th = document.createElement('th');
    th.textContent = field.charAt(0).toUpperCase() + field.slice(1);
    th.style.textTransform = 'capitalize';
    tableHeader.appendChild(th);
  });
  
  // Header de acciones
  const thActions = document.createElement('th');
  thActions.textContent = 'Acciones';
  thActions.style.width = '120px';
  thActions.style.textAlign = 'center';
  tableHeader.appendChild(thActions);

  // Renderizar productos
  tableBody.innerHTML = '';
  
  productos.forEach((producto, index) => {
    const tr = document.createElement('tr');
    if (producto.paused) {
      tr.classList.add('paused-row');
    }
    
    fields.forEach(field => {
      const td = document.createElement('td');
      
      if (field === 'paused') {
        // Checkbox para pausar/activar
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = !producto.paused;
        checkbox.addEventListener('change', () => {
          productos[index].paused = !checkbox.checked;
          markAsChanged();
          renderTable();
        });
        td.appendChild(checkbox);
        td.style.textAlign = 'center';
        
      } else if (field === 'precio') {
        // Input numérico para precio
        td.classList.add('editable-cell');
        td.textContent = producto[field] !== undefined ? producto[field] : '';
        td.addEventListener('click', () => makeEditable(td, index, field, 'number'));
        
      } else if (field === 'descripcion') {
        // Textarea para descripción
        td.classList.add('editable-cell');
        td.textContent = producto[field] || '';
        td.style.maxWidth = '300px';
        td.style.whiteSpace = 'nowrap';
        td.style.overflow = 'hidden';
        td.style.textOverflow = 'ellipsis';
        td.addEventListener('click', () => makeEditable(td, index, field, 'textarea'));
        
      } else {
        // Input de texto normal
        td.classList.add('editable-cell');
        td.textContent = producto[field] || '';
        td.addEventListener('click', () => makeEditable(td, index, field, 'text'));
      }
      
      tr.appendChild(td);
    });
    
    // Columna de acciones
    const tdActions = document.createElement('td');
    tdActions.style.textAlign = 'center';
    
    const btnDelete = document.createElement('button');
    btnDelete.className = 'btn btn-secondary';
    btnDelete.style.padding = '0.5rem';
    btnDelete.innerHTML = '<i class="fas fa-trash"></i>';
    btnDelete.title = 'Eliminar producto';
    btnDelete.addEventListener('click', () => deleteProductRow(index));
    
    tdActions.appendChild(btnDelete);
    tr.appendChild(tdActions);
    
    tableBody.appendChild(tr);
  });
}

function makeEditable(cell, index, field, type = 'text') {
  const currentValue = productos[index][field] || '';
  
  let input;
  if (type === 'textarea') {
    input = document.createElement('textarea');
    input.rows = 3;
  } else {
    input = document.createElement('input');
    input.type = type;
  }
  
  input.value = currentValue;
  input.style.width = '100%';
  input.style.boxSizing = 'border-box';
  
  cell.textContent = '';
  cell.appendChild(input);
  input.focus();
  
  const save = () => {
    let newValue = input.value.trim();
    
    if (type === 'number') {
      newValue = parseFloat(newValue) || 0;
    }
    
    productos[index][field] = newValue;
    cell.textContent = newValue;
    cell.classList.add('editable-cell');
    markAsChanged();
  };
  
  input.addEventListener('blur', save);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && type !== 'textarea') {
      e.preventDefault();
      save();
    } else if (e.key === 'Escape') {
      cell.textContent = currentValue;
      cell.classList.add('editable-cell');
    }
  });
}

function deleteProductRow(index) {
  if (confirm('¿Estás seguro de eliminar este producto?')) {
    productos.splice(index, 1);
    markAsChanged();
    renderTable();
    updateLimitBanner();
    showToast('Eliminado', 'Producto eliminado (guarda para confirmar)', 'info');
  }
}

// ==================== CSV ====================
function setupEventListeners() {
  const btnUploadCSV = document.getElementById('btnUploadCSV');
  const btnAddManual = document.getElementById('btnAddManual');
  const btnAddColumn = document.getElementById('btnAddColumn');
  const fileInput = document.getElementById('fileInput');
  const btnApplyMapping = document.getElementById('btnApplyMapping');
  const btnCancelMapping = document.getElementById('btnCancelMapping');
  const logoutBtn = document.getElementById('logoutBtn');

  if (btnUploadCSV) {
    btnUploadCSV.addEventListener('click', () => fileInput.click());
  }

  if (fileInput) {
    fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) parseCSV(file);
    });
  }

  if (btnAddManual) {
    btnAddManual.addEventListener('click', addProductManual);
  }

  if (btnAddColumn) {
    btnAddColumn.addEventListener('click', addDynamicColumn);
  }

  if (btnApplyMapping) {
    btnApplyMapping.addEventListener('click', applyMapping);
  }

  if (btnCancelMapping) {
    btnCancelMapping.addEventListener('click', () => {
      document.getElementById('mappingArea').style.display = 'none';
      csvData = [];
      csvColumns = [];
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener('click', handleLogout);
  }

  window.addEventListener('beforeunload', (e) => {
    if (hasUnsavedChanges) {
      e.preventDefault();
      e.returnValue = '¿Seguro que quieres salir? Tienes cambios sin guardar.';
    }
  });
}

function parseCSV(file) {
  showLoading('Procesando CSV...');
  
  Papa.parse(file, {
    header: true,
    skipEmptyLines: true,
    complete: function(results) {
      hideLoading();
      csvColumns = results.meta.fields;
      csvData = results.data;
      
      console.log('📄 CSV parseado:', csvData.length, 'filas');
      showMappingUI();
    },
    error: function(error) {
      hideLoading();
      console.error('❌ Error parseando CSV:', error);
      showToast('Error', 'No se pudo leer el CSV: ' + error.message, 'error');
    }
  });
}

function showMappingUI() {
  const mappingArea = document.getElementById('mappingArea');
  const mappingFields = document.getElementById('mappingFields');
  
  if (!mappingArea || !mappingFields) return;
  
  mappingArea.style.display = 'block';
  mappingFields.innerHTML = '';
  
  const fieldsArray = Array.from(dynamicFields);
  
  csvColumns.forEach(col => {
    const fieldDiv = document.createElement('div');
    fieldDiv.className = 'form-field';
    
    const label = document.createElement('label');
    label.textContent = `Columna "${col}"`;
    
    const select = document.createElement('select');
    select.dataset.csvColumn = col;
    
    // Opción de ignorar
    const optionIgnore = document.createElement('option');
    optionIgnore.value = '';
    optionIgnore.textContent = '-- Ignorar --';
    select.appendChild(optionIgnore);
    
    // Opciones de campos existentes
    fieldsArray.forEach(field => {
      const option = document.createElement('option');
      option.value = field;
      option.textContent = field.charAt(0).toUpperCase() + field.slice(1);
      
      // Auto-seleccionar si coincide el nombre
      if (field.toLowerCase() === col.toLowerCase()) {
        option.selected = true;
      }
      
      select.appendChild(option);
    });
    
    // Opción para crear nuevo campo
    const optionNew = document.createElement('option');
    optionNew.value = `__new__${col}`;
    optionNew.textContent = `➕ Crear campo "${col}"`;
    select.appendChild(optionNew);
    
    fieldDiv.appendChild(label);
    fieldDiv.appendChild(select);
    mappingFields.appendChild(fieldDiv);
  });
  
  showToast('CSV cargado', `${csvData.length} productos detectados. Configura el mapeo.`, 'info');
}

function applyMapping() {
  const mappingFields = document.getElementById('mappingFields');
  const selects = mappingFields.querySelectorAll('select');
  
  const mapping = {};
  
  selects.forEach(select => {
    const csvColumn = select.dataset.csvColumn;
    let targetField = select.value;
    
    if (targetField.startsWith('__new__')) {
      // Crear nuevo campo dinámico
      targetField = targetField.replace('__new__', '');
      dynamicFields.add(targetField);
    }
    
    if (targetField) {
      mapping[csvColumn] = targetField;
    }
  });
  
  console.log('🗺️ Mapeo aplicado:', mapping);
  mergeProducts(mapping);
  
  document.getElementById('mappingArea').style.display = 'none';
  csvData = [];
  csvColumns = [];
}

function mergeProducts(mapping) {
  let added = 0;
  let updated = 0;
  
  csvData.forEach(row => {
    const newProduct = {};
    
    // Mapear columnas CSV a campos del producto
    Object.keys(row).forEach(csvCol => {
      const targetField = mapping[csvCol];
      if (targetField) {
        let value = row[csvCol];
        
        // Conversiones de tipo
        if (targetField === 'precio') {
          value = parseFloat(value) || 0;
        } else if (targetField === 'paused') {
          value = value.toString().toLowerCase() === 'true' || value === '1';
        }
        
        newProduct[targetField] = value;
      }
    });
    
    // Auto-generar código si no existe
    if (!newProduct.codigo || newProduct.codigo.trim() === '') {
      newProduct.codigo = generateUUID();
    }
    
    // Buscar producto existente por código
    const existingIndex = productos.findIndex(p => p.codigo === newProduct.codigo);
    
    if (existingIndex >= 0) {
      // Merge: actualizar producto existente
      productos[existingIndex] = { ...productos[existingIndex], ...newProduct };
      updated++;
    } else {
      // Validar límite de plan antes de agregar
      const plan = PLANS[comercioData.plan || 'trial'];
      const limite = plan?.productos;
      
      if (limite !== null && productos.length >= limite) {
        showToast('Límite alcanzado', `No se pueden agregar más productos (límite: ${limite})`, 'warning');
        return;
      }
      
      // Agregar nuevo producto
      productos.push(newProduct);
      added++;
    }
  });
  
  markAsChanged();
  renderTable();
  updateLimitBanner();
  
  showToast('CSV importado', `${added} nuevos, ${updated} actualizados`, 'success');
}

// ==================== AGREGAR MANUAL ====================
function addProductManual() {
  const plan = PLANS[comercioData.plan || 'trial'];
  const limite = plan?.productos;
  
  if (limite !== null && productos.length >= limite) {
    showToast('Límite alcanzado', `Límite de ${limite} productos. Upgrade tu plan.`, 'warning');
    return;
  }
  
  const newProduct = {
    codigo: generateUUID(),
    paused: false
  };
  
  // Inicializar todos los campos dinámicos
  dynamicFields.forEach(field => {
    if (field === 'precio') {
      newProduct[field] = 0;
    } else if (field === 'paused') {
      newProduct[field] = false;
    } else if (!newProduct[field]) {
      newProduct[field] = '';
    }
  });
  
  productos.push(newProduct);
  markAsChanged();
  renderTable();
  updateLimitBanner();
  
  showToast('Producto agregado', 'Completa los datos y guarda', 'success');
}

function addDynamicColumn() {
  const columnName = prompt('Nombre de la nueva columna:');
  
  if (!columnName || columnName.trim() === '') {
    return;
  }
  
  const fieldName = columnName.trim().toLowerCase().replace(/\s+/g, '_');
  
  if (dynamicFields.has(fieldName)) {
    showToast('Columna existente', 'Esa columna ya existe', 'warning');
    return;
  }
  
  dynamicFields.add(fieldName);
  
  // Agregar campo vacío a todos los productos existentes
  productos.forEach(p => {
    if (!(fieldName in p)) {
      p[fieldName] = '';
    }
  });
  
  markAsChanged();
  renderTable();
  
  showToast('Columna agregada', `Campo "${fieldName}" creado`, 'success');
}

// ==================== GUARDAR ====================
async function saveAllProducts() {
  const saveBtn = document.getElementById('saveChangesBtn');
  
  try {
    // Validar al menos 1 producto
    if (productos.length === 0) {
      showToast('Sin productos', 'Debes agregar al menos 1 producto', 'warning');
      return false;
    }
    
    // Validar que todos tengan código
    const withoutCode = productos.filter(p => !p.codigo || p.codigo.trim() === '');
    if (withoutCode.length > 0) {
      showToast('Códigos faltantes', 'Todos los productos deben tener un código', 'warning');
      return false;
    }
    
    if (saveBtn) {
      saveBtn.className = 'btn-save saving';
      saveBtn.innerHTML = '<i class="fas fa-spinner"></i> <span>Guardando...</span>';
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
        console.log('🗑️ Producto eliminado:', docSnap.id);
      }
    }
    
    // Guardar/actualizar productos
    for (const producto of productos) {
      const { id, ...productData } = producto;
      
      if (id) {
        // Actualizar existente
        const productRef = doc(db, 'comercios', currentComercioId, 'productos', id);
        await updateDoc(productRef, {
          ...productData,
          fechaActualizacion: new Date()
        });
      } else {
        // Crear nuevo
        const newDocRef = await addDoc(productosRef, {
          ...productData,
          fechaCreacion: new Date(),
          fechaActualizacion: new Date()
        });
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
      showToast('Advertencia', 'Productos guardados pero JSON no actualizado', 'warning');
    }
    
    // Actualizar cantidadProductos en comercio
    const comercioRef = doc(db, 'comercios', currentComercioId);
    await updateDoc(comercioRef, {
      cantidadProductos: productos.length,
      fechaActualizacion: new Date()
    });
    
    // Actualizar estado local
    originalProductos = JSON.parse(JSON.stringify(productos));
    hasUnsavedChanges = false;
    
    // UI feedback
    if (saveBtn) {
      saveBtn.className = 'btn-save saved';
      saveBtn.innerHTML = '<i class="fas fa-check-circle"></i> <span>Guardado ✓</span>';
      setTimeout(() => {
        saveBtn.disabled = true;
        saveBtn.className = 'btn-save';
        saveBtn.innerHTML = '<i class="fas fa-save"></i> <span>Guardar Cambios</span>';
      }, 2000);
    }
    
    // Marcar como completado
    Navigation.markPageAsCompleted('productos');
    Navigation.updateProgressBar();
    
    hideLoading();
    showToast('Éxito', 'Productos guardados y JSON actualizado', 'success');
    return true;
    
  } catch (error) {
    console.error('❌ Error guardando productos:', error);
    hideLoading();
    
    if (saveBtn) {
      saveBtn.className = 'btn-save';
      saveBtn.innerHTML = '<i class="fas fa-exclamation-circle"></i> <span>Error</span>';
      saveBtn.disabled = false;
    }
    
    showToast('Error', 'No se pudieron guardar los productos: ' + error.message, 'error');
    return false;
  }
}

// ==================== BOTÓN GUARDAR ====================
function createSaveButton() {
  const userInfo = document.querySelector('.header .user-info');
  if (!userInfo) return;

  const saveBtn = document.createElement('button');
  saveBtn.id = 'saveChangesBtn';
  saveBtn.className = 'btn-save';
  saveBtn.disabled = true;
  saveBtn.innerHTML = '<i class="fas fa-save"></i> <span>Guardar Cambios</span>';
  
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    userInfo.insertBefore(saveBtn, logoutBtn);
  } else {
    userInfo.appendChild(saveBtn);
  }

  saveBtn.addEventListener('click', saveAllProducts);

  const style = document.createElement('style');
  style.textContent = `
    .header .user-info {
      display: flex;
      align-items: center;
      gap: 1rem;
    }
    .btn-save {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.625rem 1.25rem;
      border: none;
      border-radius: 8px;
      font-size: 0.875rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
      background: #667eea;
      color: white;
      white-space: nowrap;
    }
    .btn-save:disabled {
      background: #e2e8f0;
      color: #94a3b8;
      cursor: not-allowed;
    }
    .btn-save:not(:disabled):hover {
      background: #5568d3;
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
    }
    .btn-save.saving {
      background: #f59e0b;
    }
    .btn-save.saved {
      background: #10b981;
    }
    .btn-save i {
      font-size: 1rem;
    }
    .btn-save.saving i {
      animation: spin 1s linear infinite;
    }
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(style);
}

function markAsChanged() {
  hasUnsavedChanges = true;
  const saveBtn = document.getElementById('saveChangesBtn');
  if (saveBtn) {
    saveBtn.disabled = false;
    saveBtn.className = 'btn-save';
    saveBtn.innerHTML = '<i class="fas fa-save"></i> <span>Guardar Cambios</span>';
  }
}

// ==================== HELPERS ====================
function generateUUID() {
  return 'prod_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

async function handleLogout() {
  if (confirm('¿Estás seguro que deseas cerrar sesión?')) {
    try {
      showLoading('Cerrando sesión...');
      await signOut(auth);
      window.location.href = '/index.html';
    } catch (error) {
      hideLoading();
      showToast('Error', 'No se pudo cerrar sesión', 'error');
    }
  }
}
