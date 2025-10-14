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
    renderProductForm();
    renderProductsTable();
    setupEventListeners();
    setupNavigation();
    createSaveButton();

    window.validateCurrentPageData = () => {
      if (hasUnsavedChanges) {
        showToast('Cambios sin guardar', 'Guarda los cambios del formulario antes de continuar', 'warning');
        return false;
      }
      return products.length > 0;
    };

    hideLoading();
  } catch (error) {
    hideLoading();
    console.error('Error:', error);
    showToast('Error', 'No se pudo cargar la página: ' + error.message, 'error');
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
  const status = userData.estado || 'trial';
  
  if (status === 'active' || plan !== 'trial') {
    messageEl.textContent = `✅ Plan ${plan} activo`;
    banner.className = 'subscription-banner active';
  } else {
    messageEl.textContent = `🎉 Trial gratuito - Configura tus productos`;
    banner.className = 'subscription-banner trial';
  }
}

function renderProductForm() {
  const container = document.getElementById('productFields');
  if (!container) return;

  const categorias = userData.categorias && Array.isArray(userData.categorias) ? userData.categorias : [];

  const fields = [
    { id: "nombre", label: "Nombre/Título", type: "text", required: true },
    { id: "codigo", label: "Código/SKU", type: "text", required: false },
    { id: "categoria", label: "Categoría", type: "select", required: true, options: categorias },
    { id: "subcategoria", label: "Subcategoría", type: "text", required: false },
    { id: "descripcion", label: "Descripción", type: "textarea", required: false },
    { id: "imagen", label: "Imagen (URL)", type: "url", required: false },
    { id: "precio", label: "Precio", type: "number", required: true, step: "0.01" },
    { id: "stock", label: "Stock", type: "number", required: false },
    { id: "color", label: "Color", type: "text", required: false },
    { id: "talle", label: "Talle/Tamaño", type: "text", required: false },
    { id: "origen", label: "Origen", type: "text", required: false }
  ];

  let html = '<div class="form-row">';
  fields.forEach((field, idx) => {
    if (idx > 0 && idx % 2 === 0) html += '</div><div class="form-row">';
    
    let fieldHtml = '';
    if (field.type === 'textarea') {
      fieldHtml = `<textarea id="${field.id}" placeholder="" ${field.required ? 'required' : ''} rows="4"></textarea>`;
    } else if (field.type === 'select') {
      const opts = Array.isArray(field.options) ? field.options : [];
      fieldHtml = `<select id="${field.id}" ${field.required ? 'required' : ''}>
        <option value="">Seleccionar...</option>
        ${opts.map(o => `<option value="${o}">${o}</option>`).join('')}
      </select>`;
    } else {
      fieldHtml = `<input type="${field.type}" id="${field.id}" placeholder="" ${field.required ? 'required' : ''} ${field.step ? `step="${field.step}"` : ''}>`;
    }

    html += `
      <div class="form-group">
        <label for="${field.id}">${field.label}${field.required ? ' <span class="required">*</span>' : ''}</label>
        ${fieldHtml}
      </div>
    `;
  });
  html += '</div>';

  container.innerHTML = html;
}

function renderProductsTable() {
  const head = document.getElementById("productsTableHead");
  const body = document.getElementById("productsTableBody");
  if (!head || !body) return;

  if (products.length === 0) {
    head.innerHTML = '';
    body.innerHTML = `<tr><td colspan="7" class="empty-state-row">No hay productos cargados</td></tr>`;
    return;
  }

  head.innerHTML = `
    <tr>
      <th>Nombre</th>
      <th>Categoría</th>
      <th>Precio</th>
      <th>Stock</th>
      <th>Estado</th>
      <th colspan="3">Acciones</th>
    </tr>
  `;

  body.innerHTML = products.map(product => `
    <tr data-product-id="${product.id}" class="${product.pausado ? 'paused-row' : ''}">
      <td><strong>${product.nombre}</strong></td>
      <td>${product.categoria || '-'}</td>
      <td>$${(product.precio || 0).toFixed(2)}</td>
      <td>${product.stock ?? '-'}</td>
      <td>
        <span class="badge ${product.pausado ? 'badge-paused' : 'badge-active'}">
          ${product.pausado ? 'Pausado' : 'Activo'}
        </span>
      </td>
      <td>
        <button class="btn btn-sm btn-outline edit-product" title="Editar">
          <i class="fas fa-edit"></i>
        </button>
      </td>
      <td>
        <button class="btn btn-sm toggle-status" title="${product.pausado ? 'Activar' : 'Pausar'}">
          <i class="fas ${product.pausado ? 'fa-play' : 'fa-pause'}"></i>
        </button>
      </td>
      <td>
        <button class="btn btn-sm btn-danger delete-product" title="Eliminar">
          <i class="fas fa-trash"></i>
        </button>
      </td>
    </tr>
  `).join("");

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
    updateSaveButton();
  });

  document.getElementById('logoutBtn')?.addEventListener('click', async () => {
    if (confirm('¿Cerrar sesión?')) {
      await signOut(auth);
      window.location.href = '/index.html';
    }
  });

  // Marcar cambios en el formulario
  document.getElementById('productForm')?.addEventListener('input', () => {
    hasUnsavedChanges = true;
    updateSaveButton();
  });
  document.getElementById('productForm')?.addEventListener('change', () => {
    hasUnsavedChanges = true;
    updateSaveButton();
  });

  // CSV
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
      e.returnValue = 'Tienes cambios sin guardar en el formulario.';
    }
  });
}

function setupNavigation() {
  Navigation.init();
}

function createSaveButton() {
  const userInfo = document.querySelector('.header .user-info');
  if (!userInfo) return;

  const saveBtn = document.createElement('button');
  saveBtn.id = 'saveChangesBtn';
  saveBtn.className = 'btn-save';
  saveBtn.disabled = true;
  saveBtn.innerHTML = '<i class="fas fa-save"></i> <span>Guardar</span>';
  
  userInfo.insertBefore(saveBtn, document.getElementById('logoutBtn'));
  saveBtn.addEventListener('click', saveProduct);
}

function updateSaveButton() {
  const saveBtn = document.getElementById('saveChangesBtn');
  if (!saveBtn) return;
  saveBtn.disabled = !hasUnsavedChanges;
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
    
    if (!editingProductId && products.length >= maxProducts) {
      showToast('Límite alcanzado', `Tu plan permite ${maxProducts} productos`, 'warning');
      return;
    }

    const productData = collectProductData();
    
    if (!productData.nombre || !productData.precio) {
      showToast('Campos requeridos', 'Nombre y Precio son obligatorios', 'warning');
      return;
    }

    showLoading('Guardando producto...');

    if (editingProductId) {
      await updateProduct(editingProductId, productData);
      editingProductId = null;
    } else {
      await addProduct(productData);
    }

    try {
      await syncToGist();
    } catch (err) {
      console.warn('JSON no sincronizado:', err);
    }

    await loadProducts();
    renderProductsTable();
    document.getElementById('productForm').reset();
    document.getElementById('saveProduct').textContent = '💾 Guardar Producto';
    hasUnsavedChanges = false;
    updateSaveButton();

    hideLoading();
    showToast('Éxito', editingProductId ? 'Producto actualizado' : 'Producto agregado', 'success');
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
    
    await updateProduct(id, { pausado: !product.pausado });
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
      await processCSVImport(results.data, results.meta.fields);
    },
    error: (error) => {
      hideLoading();
      showToast('Error', 'No se pudo leer el archivo: ' + error.message, 'error');
    }
  });
}

async function processCSVImport(data, fields) {
  try {
    showLoading(`Importando ${data.length} productos...`);

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

      if (!productData.nombre || !productData.precio) continue;

      const existing = products.find(p => p.codigo === productData.codigo && productData.codigo);
      if (existing) {
        await updateProduct(existing.id, productData);
      } else {
        await addProduct(productData);
      }
    }

    try { await syncToGist(); } catch (err) { console.warn(err); }
    await loadProducts();
    renderProductsTable();
    hideLoading();
    showToast('Éxito', `${data.length} productos importados/actualizados`, 'success');
  } catch (error) {
    hideLoading();
    showToast('Error', 'Error en importación: ' + error.message, 'error');
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
  if (!confirm('¿Eliminar TODOS los productos? No se puede deshacer.')) return;
  
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
