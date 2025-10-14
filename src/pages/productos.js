import { auth } from '../firebase.js';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { 
  getUserData, 
  getProducts, 
  addProduct, 
  updateProduct, 
  deleteProduct,
  syncToGist 
} from '../shared/firebaseHelpers.js';
import { showLoading, hideLoading, showToast } from '../shared/utils.js';
import { PlansManager } from '../shared/plans.js';
import Navigation from '../shared/navigation.js';
import Papa from 'papaparse';

let userData = {};
let products = [];
let currentUser = null;
let editingProductId = null;
let hasUnsavedChanges = false;

// Calcular flags automáticos
function calcularFlagsAutomaticos(producto) {
  return {
    sin_precio: !producto.precio || producto.precio === 0,
    sin_stock: !producto.stock || producto.stock === 0,
    sin_imagen: !producto.imagen || producto.imagen.trim() === '',
    activo: !producto.pausado && 
            !producto.deleted && 
            producto.precio > 0 && 
            producto.nombre && 
            producto.nombre.trim() !== ''
  };
}

// Buscar producto existente para UPSERT
function findExistingProduct(productData) {
  // Prioridad 1: Buscar por código
  if (productData.codigo && productData.codigo.trim() !== '') {
    const found = products.find(p => 
      p.codigo && 
      p.codigo.toLowerCase() === productData.codigo.toLowerCase()
    );
    if (found) return found;
  }
  
  // Prioridad 2: Buscar por nombre
  if (productData.nombre && productData.nombre.trim() !== '') {
    const found = products.find(p => 
      p.nombre && 
      p.nombre.toLowerCase() === productData.nombre.toLowerCase()
    );
    if (found) return found;
  }
  
  return null;
}

// UPSERT: CREATE o UPDATE automático
async function upsertProduct(productData) {
  const existing = findExistingProduct(productData);
  const dataWithFlags = {
    ...productData,
    ...calcularFlagsAutomaticos(productData),
    deleted: false
  };
  
  if (existing) {
    await updateProduct(existing.id, {
      ...dataWithFlags,
      fechaActualizacion: new Date().toISOString()
    });
    return { action: 'updated', id: existing.id };
  } else {
    const newId = await addProduct({
      ...dataWithFlags,
      fechaCreacion: new Date().toISOString(),
      fechaActualizacion: new Date().toISOString()
    });
    return { action: 'created', id: newId };
  }
}

// INICIALIZACIÓN
document.addEventListener('DOMContentLoaded', async () => {
  try {
    showLoading('Verificando sesión...');
    
    const user = await new Promise((resolve) => {
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        unsubscribe();
        resolve(user);
      });
    });

    if (!user) {
      window.location.href = '/index.html';
      return;
    }

    currentUser = user;
    showLoading('Cargando productos...');
    
    userData = await getUserData();
    await loadProducts();
    
    updateHeader();
    updateSubscriptionBanner();
    fillCategorySelect();
    renderProductsTable();
    setupEventListeners();
    Navigation.init();

    window.validateCurrentPageData = () => {
      if (hasUnsavedChanges) {
        showToast('Cambios sin guardar', 'Guarda antes de continuar', 'warning');
        return false;
      }
      return products.length > 0;
    };

    hideLoading();
  } catch (error) {
    hideLoading();
    console.error('Error:', error);
    showToast('Error', 'No se pudo cargar: ' + error.message, 'error');
  }
});

async function loadProducts() {
  try {
    products = await getProducts();
    updateProductCounter();
  } catch (error) {
    console.error('Error loading products:', error);
    products = [];
  }
}

function updateHeader() {
  const commerceName = document.getElementById('commerceName');
  const planBadge = document.getElementById('planBadge');
  
  if (commerceName) {
    commerceName.textContent = userData.nombreComercio || 'Mi Comercio';
  }
  if (planBadge) {
    const plan = PlansManager.getPlan(userData.plan || 'trial');
    planBadge.textContent = plan ? `${plan.emoji} ${plan.nombre}` : 'Trial';
  }
}

function updateSubscriptionBanner() {
  const banner = document.getElementById('subscriptionBanner');
  const messageEl = document.getElementById('subscriptionMessage');
  
  if (!banner || !messageEl) return;
  
  const plan = userData.plan || 'trial';
  if (plan === 'trial') {
    messageEl.textContent = '🎉 Trial gratuito - Configura tus productos';
    banner.className = 'subscription-banner trial';
  } else {
    messageEl.textContent = `✅ Plan ${plan} activo`;
    banner.className = 'subscription-banner active';
  }
}

function fillCategorySelect() {
  const select = document.getElementById('categoria');
  if (!select) return;
  
  const categorias = userData.categorias && Array.isArray(userData.categorias) 
    ? userData.categorias 
    : [];
  
  categorias.forEach(cat => {
    const option = document.createElement('option');
    option.value = cat;
    option.textContent = cat;
    select.appendChild(option);
  });
}

function renderProductsTable() {
  const head = document.getElementById("productsTableHead");
  const body = document.getElementById("productsTableBody");
  if (!head || !body) return;

  if (products.length === 0) {
    head.innerHTML = '';
    body.innerHTML = '<tr><td colspan="9" class="empty-state-row">No hay productos cargados</td></tr>';
    return;
  }

  head.innerHTML = `
    <tr>
      <th>Nombre</th>
      <th>Código</th>
      <th>Categoría</th>
      <th>Precio</th>
      <th>Stock</th>
      <th>Estado IA</th>
      <th>Estado</th>
      <th colspan="3">Acciones</th>
    </tr>
  `;

  body.innerHTML = products.map(product => {
    const flags = calcularFlagsAutomaticos(product);
    const warnings = [];
    if (flags.sin_precio) warnings.push('Sin precio');
    if (flags.sin_stock) warnings.push('Sin stock');
    if (flags.sin_imagen) warnings.push('Sin imagen');
    
    return `
    <tr data-product-id="${product.id}" class="${product.pausado ? 'paused-row' : ''}">
      <td><strong>${product.nombre}</strong></td>
      <td>${product.codigo || '-'}</td>
      <td>${product.categoria || '-'}</td>
      <td class="editable-cell" data-field="precio" data-type="number" title="Doble click para editar">
        $${(product.precio || 0).toFixed(2)}
      </td>
      <td class="editable-cell" data-field="stock" data-type="number" title="Doble click para editar">
        ${product.stock ?? 0}
      </td>
      <td>
        ${flags.activo 
          ? '<span class="badge badge-active">✓ Activo</span>' 
          : '<span class="badge badge-paused">⚠ Inactivo</span>'}
        ${warnings.length > 0 ? `<small>${warnings.join(', ')}</small>` : ''}
      </td>
      <td>
        <span class="badge ${product.pausado ? 'badge-paused' : 'badge-active'}">
          ${product.pausado ? '⏸ Pausado' : '▶ Activo'}
        </span>
      </td>
      <td>
        <button class="btn btn-sm btn-outline edit-product" title="Editar">
          <i class="fas fa-edit"></i>
        </button>
      </td>
      <td>
        <button class="btn btn-sm btn-outline toggle-status" title="${product.pausado ? 'Activar' : 'Pausar'}">
          <i class="fas ${product.pausado ? 'fa-play' : 'fa-pause'}"></i>
        </button>
      </td>
      <td>
        <button class="btn btn-sm btn-danger delete-product" title="Eliminar">
          <i class="fas fa-trash"></i>
        </button>
      </td>
    </tr>
  `}).join("");

  body.addEventListener("click", async (e) => {
    const row = e.target.closest("tr");
    if (!row) return;
    const id = row.dataset.productId;
    
    if (e.target.closest(".edit-product")) {
      editProduct(id);
    } else if (e.target.closest(".delete-product")) {
      await deleteProductHandler(id);
    } else if (e.target.closest(".toggle-status")) {
      await toggleProductStatus(id);
    }
  });

  // Doble click para editar inline
  body.addEventListener("dblclick", async (e) => {
    const cell = e.target.closest(".editable-cell");
    if (!cell) return;
    
    const row = cell.closest("tr");
    const productId = row.dataset.productId;
    const field = cell.dataset.field;
    
    await editInlineCell(cell, productId, field);
  });
}

async function editInlineCell(cell, productId, field) {
  const product = products.find(p => p.id === productId);
  if (!product) return;
  
  const currentValue = product[field] || '';
  const originalHTML = cell.innerHTML;
  
  const input = document.createElement('input');
  input.type = field === 'precio' ? 'number' : 'number';
  input.value = currentValue;
  input.step = field === 'precio' ? '0.01' : '1';
  input.style.width = '100%';
  input.style.padding = '0.5rem';
  input.style.border = '2px solid #4299e1';
  input.style.borderRadius = '4px';
  
  cell.innerHTML = '';
  cell.appendChild(input);
  input.focus();
  input.select();
  
  const saveValue = async () => {
    try {
      const newValue = field === 'precio' 
        ? parseFloat(input.value) || 0
        : parseInt(input.value) || 0;
      
      await updateProduct(productId, { 
        [field]: newValue,
        fechaActualizacion: new Date().toISOString()
      });
      
      try { await syncToGist(); } catch (err) { console.warn(err); }
      
      await loadProducts();
      renderProductsTable();
      showToast('Guardado', `${field} actualizado`, 'success');
    } catch (error) {
      cell.innerHTML = originalHTML;
      showToast('Error', 'No se pudo guardar', 'error');
    }
  };
  
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') saveValue();
    if (e.key === 'Escape') {
      cell.innerHTML = originalHTML;
    }
  });
  
  input.addEventListener('blur', saveValue);
}

function updateProductCounter() {
  const plan = PlansManager.getPlan(userData.plan || 'trial');
  const currentCount = products.length;
  const maxProducts = plan.maxProductos === -1 ? Infinity : plan.maxProductos;
  const percentage = maxProducts === Infinity ? 0 : Math.min(100, (currentCount / maxProducts) * 100);

  const counterEl = document.getElementById('productCounter');
  const fillEl = document.getElementById('productProgressFill');
  const warningEl = document.getElementById('limitWarning');

  if (counterEl) counterEl.textContent = `${currentCount}/${maxProducts === Infinity ? '∞' : maxProducts} productos`;
  if (fillEl) fillEl.style.width = `${percentage}%`;
  if (warningEl) {
    warningEl.style.display = (maxProducts !== Infinity && currentCount >= maxProducts) ? 'block' : 'none';
  }
}

function setupEventListeners() {
  document.getElementById('productForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    await saveProduct();
  });

  document.getElementById('clearProduct')?.addEventListener('click', () => {
    document.getElementById('productForm').reset();
    editingProductId = null;
    hasUnsavedChanges = false;
    document.getElementById('saveProduct').textContent = '💾 Guardar Producto';
  });

  document.getElementById('logoutBtn')?.addEventListener('click', async () => {
    if (confirm('¿Cerrar sesión?')) {
      await signOut(auth);
      window.location.href = '/index.html';
    }
  });

  document.getElementById('productForm')?.addEventListener('input', () => {
    hasUnsavedChanges = true;
  });

  const fileUpload = document.getElementById('fileUpload');
  const fileInput = document.getElementById('excelFile');
  
  if (fileUpload && fileInput) {
    fileUpload.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', (e) => handleCSVFile(e.target.files[0]));
    
    fileUpload.addEventListener('dragover', (e) => {
      e.preventDefault();
      fileUpload.classList.add('dragover');
    });
    fileUpload.addEventListener('dragleave', () => fileUpload.classList.remove('dragover'));
    fileUpload.addEventListener('drop', (e) => {
      e.preventDefault();
      fileUpload.classList.remove('dragover');
      handleCSVFile(e.dataTransfer.files[0]);
    });
  }

  document.getElementById('exportProducts')?.addEventListener('click', exportProducts);
  document.getElementById('clearProducts')?.addEventListener('click', clearAllProducts);

  window.addEventListener('beforeunload', (e) => {
    if (hasUnsavedChanges) {
      e.preventDefault();
      e.returnValue = 'Tienes cambios sin guardar.';
    }
  });
}

function collectProductData() {
  return {
    nombre: document.getElementById('nombre')?.value.trim(),
    codigo: document.getElementById('codigo')?.value.trim(),
    categoria: document.getElementById('categoria')?.value.trim(),
    subcategoria: document.getElementById('subcategoria')?.value.trim(),
    descripcion: document.getElementById('descripcion')?.value.trim(),
    imagen: document.getElementById('imagen')?.value.trim(),
    precio: parseFloat(document.getElementById('precio')?.value) || 0,
    stock: parseInt(document.getElementById('stock')?.value) || 0,
    color: document.getElementById('color')?.value.trim(),
    talle: document.getElementById('talle')?.value.trim(),
    origen: document.getElementById('origen')?.value.trim(),
    pausado: false
  };
}

function editProduct(id) {
  const product = products.find(p => p.id === id);
  if (!product) return;

  document.getElementById('nombre').value = product.nombre || '';
  document.getElementById('codigo').value = product.codigo || '';
  document.getElementById('categoria').value = product.categoria || '';
  document.getElementById('subcategoria').value = product.subcategoria || '';
  document.getElementById('descripcion').value = product.descripcion || '';
  document.getElementById('imagen').value = product.imagen || '';
  document.getElementById('precio').value = product.precio || '';
  document.getElementById('stock').value = product.stock || '';
  document.getElementById('color').value = product.color || '';
  document.getElementById('talle').value = product.talle || '';
  document.getElementById('origen').value = product.origen || '';

  editingProductId = id;
  document.getElementById('saveProduct').textContent = '✏️ Actualizar Producto';
  showToast('Edición', 'Producto cargado para editar', 'info');
}

async function saveProduct() {
  try {
    const plan = PlansManager.getPlan(userData.plan || 'trial');
    const maxProducts = plan.maxProductos === -1 ? Infinity : plan.maxProductos;
    
    const productData = collectProductData();
    
    if (!productData.nombre || !productData.precio) {
      showToast('Campos requeridos', 'Nombre y Precio son obligatorios', 'warning');
      return;
    }

    showLoading('Guardando producto...');

    let result;
    if (editingProductId) {
      await updateProduct(editingProductId, {
        ...productData,
        ...calcularFlagsAutomaticos(productData),
        fechaActualizacion: new Date().toISOString()
      });
      result = { action: 'updated' };
      editingProductId = null;
    } else {
      result = await upsertProduct(productData);
    }

    try { await syncToGist(); } catch (err) { console.warn(err); }

    await loadProducts();
    renderProductsTable();
    document.getElementById('productForm').reset();
    document.getElementById('saveProduct').textContent = '💾 Guardar Producto';
    hasUnsavedChanges = false;

    hideLoading();
    const msg = result.action === 'created' ? 'Producto creado' : 'Producto actualizado';
    showToast('Éxito', msg, 'success');
  } catch (error) {
    hideLoading();
    console.error('Error:', error);
    showToast('Error', 'No se pudo guardar: ' + error.message, 'error');
  }
}

async function deleteProductHandler(id) {
  if (!confirm('¿Eliminar este producto?')) return;
  
  try {
    showLoading('Eliminando...');
    await deleteProduct(id);
    try { await syncToGist(); } catch (err) { console.warn(err); }
    await loadProducts();
    renderProductsTable();
    hideLoading();
    showToast('Éxito', 'Producto eliminado', 'success');
  } catch (error) {
    hideLoading();
    showToast('Error', 'No se pudo eliminar', 'error');
  }
}

async function toggleProductStatus(id) {
  try {
    const product = products.find(p => p.id === id);
    if (!product) return;
    
    await updateProduct(id, { 
      pausado: !product.pausado,
      fechaActualizacion: new Date().toISOString()
    });
    try { await syncToGist(); } catch (err) { console.warn(err); }
    await loadProducts();
    renderProductsTable();
    showToast('Estado', `Producto ${!product.pausado ? 'pausado' : 'activado'}`, 'success');
  } catch (error) {
    showToast('Error', 'No se pudo cambiar el estado', 'error');
  }
}

async function handleCSVFile(file) {
  if (!file) return;
  showLoading('Procesando CSV...');
  
  Papa.parse(file, {
    header: true,
    dynamicTyping: true,
    skipEmptyLines: true,
    complete: async (results) => {
      await processCSVImport(results.data);
    },
    error: (error) => {
      hideLoading();
      showToast('Error', 'No se pudo leer el archivo', 'error');
    }
  });
}

async function processCSVImport(data) {
  try {
    showLoading(`Procesando ${data.length} productos...`);

    let created = 0, updated = 0, skipped = 0;

    for (const row of data) {
      const productData = {
        nombre: row.nombre || row.Nombre || row.name || '',
        codigo: row.codigo || row.Código || row.SKU || row.code || '',
        categoria: row.categoria || row.Categoría || row.category || '',
        subcategoria: row.subcategoria || row.Subcategoría || '',
        descripcion: row.descripcion || row.Descripción || row.description || '',
        imagen: row.imagen || row.Imagen || row.image || '',
        precio: parseFloat(row.precio || row.Precio || row.price || 0),
        stock: parseInt(row.stock || row.Stock || 0),
        color: row.color || row.Color || '',
        talle: row.talle || row.Talle || row.size || '',
        origen: row.origen || row.Origen || '',
        pausado: row.pausado === 1 || row.pausado === 'Sí' || row.pausado === 'true'
      };

      if (!productData.nombre || !productData.precio) {
        skipped++;
        continue;
      }

      const result = await upsertProduct(productData);
      if (result.action === 'created') created++;
      if (result.action === 'updated') updated++;
    }

    try { await syncToGist(); } catch (err) { console.warn(err); }
    await loadProducts();
    renderProductsTable();
    hideLoading();
    
    showToast('Importación completa', 
      `✅ ${created} creados | 🔄 ${updated} actualizados | ⚠️ ${skipped} omitidos`, 
      'success');
  } catch (error) {
    hideLoading();
    showToast('Error', 'Error en importación', 'error');
  }
}

function exportProducts() {
  if (products.length === 0) {
    showToast('Info', 'No hay productos para exportar', 'info');
    return;
  }

  const csv = [
    ['nombre', 'codigo', 'categoria', 'subcategoria', 'descripcion', 'imagen', 'precio', 'stock', 'color', 'talle', 'origen', 'pausado'],
    ...products.map(p => [
      p.nombre, p.codigo, p.categoria, p.subcategoria, p.descripcion, p.imagen,
      p.precio, p.stock, p.color, p.talle, p.origen, p.pausado ? 1 : 0
    ])
  ];

  const csvStr = csv.map(row => row.map(cell => `"${cell || ''}"`).join(',')).join('\n');
  const blob = new Blob([csvStr], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `productos-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  window.URL.revokeObjectURL(url);
  
  showToast('Éxito', 'CSV exportado', 'success');
}

async function clearAllProducts() {
  if (!confirm('¿Eliminar TODOS los productos?')) return;
  
  try {
    showLoading('Eliminando...');
    for (const product of products) {
      await deleteProduct(product.id);
    }
    try { await syncToGist(); } catch (err) { console.warn(err); }
    await loadProducts();
    renderProductsTable();
    hideLoading();
    showToast('Éxito', 'Todos los productos eliminados', 'success');
  } catch (error) {
    hideLoading();
    showToast('Error', 'Error al eliminar', 'error');
  }
}
