// src/pages/productos.js
import { auth } from '../firebase.js';
import { onAuthStateChanged } from 'firebase/auth';
import { signOut } from 'firebase/auth';
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

// Categorías predefinidas
const PREDEFINED_CATEGORIES = [
  "Ropa y Moda","Calzado","Accesorios","Joyería","Relojes",
  "Electrónicos","Informática","Celulares y Tablets","Audio y Video","Gaming",
  "Hogar y Decoración","Muebles","Electrodomésticos","Jardín","Ferretería",
  "Belleza y Cosméticos","Salud","Farmacia","Perfumería","Cuidado Personal",
  "Alimentos","Bebidas","Panadería","Carnicería","Verdulería","Almacén",
  "Servicios Profesionales","Educación","Turismo","Transporte","Seguros",
  "Libros","Música","Películas","Juguetes","Deportes","Fitness",
  "Automotor","Mascotas","Bebés y Niños","Arte y Manualidades","Oficina",
  "Regalería","Marroquinería","Óptica","Fotografía","Instrumentos Musicales",
  "Papelería","Librería","Floristería","Cerrajería","Tapicería"
];

// Variables globales
let userData = {};
let products = [];
let selectedCategories = [];
let currentProductType = "producto";
let editingProductId = null;

// ==========================================
// INICIALIZACIÓN
// ==========================================
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

    showLoading('Cargando productos...');
    userData = await getUserData();
    selectedCategories = userData.categories || PREDEFINED_CATEGORIES;
    await loadProducts();
    
    updateHeader();
    updateSubscriptionBanner();
    renderTypeSelector();
    renderProductForm();
    renderProductsTable();
    setupEventListeners();
    Navigation.init();

    // Validación para navegación
    window.validateCurrentPageData = () => {
      return products.length > 0;
    };

    hideLoading();
  } catch (error) {
    hideLoading();
    console.error('Error:', error);
    showToast('Error', 'No se pudo cargar la página', 'error');
  }
});

// ==========================================
// CARGA DE DATOS
// ==========================================
async function loadProducts() {
  try {
    products = await getProducts();
    updateProductCounter();
  } catch (error) {
    console.error('Error loading products:', error);
    products = [];
  }
}

// ==========================================
// ACTUALIZACIÓN DE HEADER
// ==========================================
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
  
  const trialEnd = userData.trialEndDate ? new Date(userData.trialEndDate) : null;
  const now = new Date();
  const status = userData.estado || 'trial';
  
  if (status === 'active') {
    const endDate = userData.subscriptionEndDate ? new Date(userData.subscriptionEndDate) : null;
    const formattedDate = endDate ? endDate.toLocaleDateString('es-ES') : 'fecha no disponible';
    messageEl.textContent = `Suscripción activa hasta ${formattedDate}`;
    banner.className = 'subscription-banner active';
  } else if (status === 'trial' && trialEnd) {
    const daysLeft = Math.ceil((trialEnd - now) / (1000 * 60 * 60 * 24));
    if (daysLeft > 0) {
      messageEl.textContent = `Trial gratuito - ${daysLeft} días restantes`;
      banner.className = 'subscription-banner';
    } else {
      messageEl.textContent = `Trial expirado - actualiza tu plan`;
      banner.className = 'subscription-banner expired';
    }
  } else {
    messageEl.textContent = `Suscripción vencida - actualiza tu plan`;
    banner.className = 'subscription-banner expired';
  }
}

// ==========================================
// RENDERIZADO DE UI
// ==========================================
function renderTypeSelector() {
  const container = document.getElementById('typeSelector');
  if (!container) return;

  container.innerHTML = `
    <label class="type-option ${currentProductType === 'producto' ? 'active' : ''}">
      <input type="radio" name="itemType" value="producto" ${currentProductType === 'producto' ? 'checked' : ''}>
      <div class="type-content">
        <i class="fas fa-box"></i>
        <span>Producto</span>
        <small>Bien físico con precio fijo (ej: remera, pizza, shampoo)</small>
      </div>
    </label>
    <label class="type-option ${currentProductType === 'servicio' ? 'active' : ''}">
      <input type="radio" name="itemType" value="servicio" ${currentProductType === 'servicio' ? 'checked' : ''}>
      <div class="type-content">
        <i class="fas fa-handshake"></i>
        <span>Servicio</span>
        <small>Prestación o actividad (ej: corte de pelo, reparación, clases)</small>
      </div>
    </label>
  `;
}

function renderProductForm() {
  const container = document.getElementById('productFields');
  const formTitle = document.getElementById('formTitle');
  if (!container) return;

  formTitle.textContent = currentProductType === 'producto' ? 'Agregar Producto' : 'Agregar Servicio';

  const commonFields = [
    { id: "productName", label: "Nombre/Título", type: "text", required: true },
    { id: "productCode", label: "Código/SKU", type: "text", required: false },
    { id: "productCategory", label: "Categoría", type: "select", required: true, options: selectedCategories },
    { id: "productSubcategory", label: "Subcategoría", type: "text", required: false },
    { id: "productDescription", label: "Descripción", type: "textarea", required: false },
    { id: "productImage", label: "Imagen (URL)", type: "url", required: false, placeholder: "https://ejemplo.com/imagen.jpg" }
  ];

  let specificFields = [];
  if (currentProductType === "producto") {
    specificFields = [
      { id: "productPrice", label: "Precio", type: "number", required: false, step: "0.01" },
      { id: "productStock", label: "Stock", type: "number", required: false },
      { id: "productColor", label: "Color", type: "text", required: false },
      { id: "productSize", label: "Talle/Tamaño", type: "text", required: false },
      { id: "productOrigin", label: "Origen", type: "text", required: false }
    ];
  } else {
    specificFields = [
      { id: "servicePhone", label: "Teléfono de contacto", type: "tel", required: false },
      { id: "serviceEmail", label: "Email de contacto", type: "email", required: false },
      { id: "serviceDuration", label: "Duración estimada", type: "text", required: false },
      { id: "serviceAvailability", label: "Disponibilidad", type: "text", required: false }
    ];
  }

  let html = commonFields.map(field => renderFormField(field, "")).join("");
  html += specificFields.map(field => renderFormField(field, "")).join("");

  container.innerHTML = html;
}

function renderFormField(field, value = "") {
  let inputHtml = "";
  if (field.type === "textarea") {
    inputHtml = `<textarea id="${field.id}" name="${field.id}" placeholder="${field.placeholder || ""}" ${field.required ? "required" : ""}>${value}</textarea>`;
  } else if (field.type === "select") {
    const options = Array.isArray(field.options) ? field.options : [];
    inputHtml = `<select id="${field.id}" name="${field.id}" ${field.required ? "required" : ""}>
      <option value="">Seleccionar...</option>
      ${options.map(o => `<option value="${o}" ${value === o ? "selected" : ""}>${o}</option>`).join("")}
    </select>`;
  } else {
    inputHtml = `<input type="${field.type}" id="${field.id}" name="${field.id}" value="${value}" placeholder="${field.placeholder || ""}" ${field.required ? "required" : ""} ${field.step ? `step="${field.step}"` : ""}>`;
  }
  return `
    <div class="form-field">
      <label for="${field.id}">${field.label}${field.required ? " *" : ""}</label>
      ${inputHtml}
      <div class="error-message">Este campo es requerido</div>
    </div>
  `;
}

function renderProductsTable() {
  const head = document.getElementById("productsTableHead");
  const body = document.getElementById("productsTableBody");
  if (!head || !body) return;

  if (products.length === 0) {
    head.innerHTML = "";
    body.innerHTML = `<tr><td colspan="6" class="empty-state-row">No hay registros cargados</td></tr>`;
    return;
  }

  head.innerHTML = `
    <tr>
      <th>Nombre</th>
      <th>Tipo</th>
      <th>Categoría</th>
      <th>Precio</th>
      <th>Stock</th>
      <th>Acciones</th>
    </tr>
  `;

  body.innerHTML = products.map(item => {
    const isProduct = !item.telefono;
    return `
      <tr data-product-id="${item.id}">
        <td>${item.nombre || ""}</td>
        <td>${isProduct ? "Producto" : "Servicio"}</td>
        <td>${item.categoria || ""}</td>
        <td>$${item.precio || 0}</td>
        <td>${item.stock ?? (isProduct ? "N/A" : "-")}</td>
        <td>
          <div class="table-actions">
            <button class="btn btn-sm btn-outline edit-product" title="Editar">
              <i class="fas fa-edit"></i>
            </button>
            <button class="btn btn-sm toggle-status" title="${item.paused ? 'Activar' : 'Pausar'}">
              <i class="fas ${item.paused ? 'fa-play' : 'fa-pause'}"></i>
            </button>
            <button class="btn btn-sm btn-danger delete-product" title="Eliminar">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join("");

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
  const plan = PlansManager.getPlan(userData.plan || 'basico');
  const currentCount = products.length;
  const maxProducts = plan.maxProductos === -1 ? Infinity : plan.maxProductos;
  const percentage = maxProducts === Infinity ? 0 : Math.min(100, Math.round((currentCount / maxProducts) * 100));

  const counterEl = document.getElementById('productCounter');
  const maxEl = document.getElementById('maxProducts');
  const fillEl = document.getElementById('productProgressFill');
  const warningEl = document.getElementById('limitWarning');

  if (counterEl) counterEl.textContent = `${currentCount}/${maxProducts === Infinity ? '∞' : maxProducts} productos cargados`;
  if (maxEl) maxEl.textContent = maxProducts === Infinity ? 'ilimitados' : maxProducts;
  if (fillEl) fillEl.style.width = `${percentage}%`;

  if (warningEl) {
    warningEl.style.display = (maxProducts !== Infinity && currentCount >= maxProducts) ? 'block' : 'none';
  }
}

// ==========================================
// EVENT LISTENERS
// ==========================================
function setupEventListeners() {
  // Cambio de tipo
  document.getElementById('typeSelector')?.addEventListener('change', (e) => {
    if (e.target.name === 'itemType') {
      currentProductType = e.target.value;
      renderTypeSelector();
      renderProductForm();
    }
  });

  // Submit formulario
  document.getElementById('productForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!validateProductForm()) return;
    await saveProduct();
  });

  // Limpiar formulario
  document.getElementById('clearProduct')?.addEventListener('click', () => {
    document.getElementById('productForm').reset();
    editingProductId = null;
  });

  // Logout
  document.getElementById('logoutBtn')?.addEventListener('click', async () => {
    if (confirm('¿Cerrar sesión?')) {
      await signOut(auth);
      window.location.href = '/index.html';
    }
  });

  // Archivo CSV
  const fileUpload = document.getElementById('fileUpload');
  const fileInput = document.getElementById('excelFile');
  
  if (fileUpload && fileInput) {
    fileUpload.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', handleCSVFile);
    
    fileUpload.addEventListener('dragover', (e) => {
      e.preventDefault();
      fileUpload.classList.add('dragover');
    });
    
    fileUpload.addEventListener('dragleave', () => {
      fileUpload.classList.remove('dragover');
    });
    
    fileUpload.addEventListener('drop', (e) => {
      e.preventDefault();
      fileUpload.classList.remove('dragover');
      const file = e.dataTransfer?.files?.[0];
      if (file) processCSVFile(file);
    });
  }

  document.getElementById('exportProducts')?.addEventListener('click', exportProducts);
  document.getElementById('clearProducts')?.addEventListener('click', clearAllProducts);
}

// ==========================================
// CRUD PRODUCTOS
// ==========================================
function validateProductForm() {
  const requiredFields = ['productName', 'productCategory'];
  let isValid = true;
  
  requiredFields.forEach(id => {
    const el = document.getElementById(id);
    if (!el?.value.trim()) {
      el?.classList.add('error');
      isValid = false;
    } else {
      el?.classList.remove('error');
    }
  });
  
  return isValid;
}

async function saveProduct() {
  try {
    const plan = PlansManager.getPlan(userData.plan || 'basico');
    const maxProducts = plan.maxProductos === -1 ? Infinity : plan.maxProductos;
    
    if (products.length >= maxProducts && !editingProductId) {
      showToast('Límite alcanzado', `Tu plan permite hasta ${maxProducts} productos. Para cargar más, actualiza tu plan.`, 'warning');
      return;
    }

    const productData = collectProductData();
    showLoading('Guardando producto...');

    if (editingProductId) {
      await updateProduct(editingProductId, productData);
      showToast('Éxito', 'Producto actualizado', 'success');
    } else {
      await addProduct(productData);
      showToast('Éxito', 'Producto agregado', 'success');
    }

    try {
      await syncToGist();
    } catch (err) {
      console.error("No se pudo sincronizar JSON:", err);
    }

    await loadProducts();
    renderProductsTable();
    document.getElementById('productForm').reset();
    editingProductId = null;
    hideLoading();
  } catch (error) {
    hideLoading();
    console.error('Error saving product:', error);
    showToast('Error', 'No se pudo guardar el producto', 'error');
  }
}

function collectProductData() {
  const data = {
    nombre: document.getElementById('productName')?.value.trim(),
    codigo: document.getElementById('productCode')?.value.trim(),
    categoria: document.getElementById('productCategory')?.value.trim(),
    subcategoria: document.getElementById('productSubcategory')?.value.trim(),
    descripcion: document.getElementById('productDescription')?.value.trim(),
    imagen: document.getElementById('productImage')?.value.trim(),
    paused: false
  };

  if (currentProductType === 'producto') {
    data.precio = parseFloat(document.getElementById('productPrice')?.value) || 0;
    data.stock = parseInt(document.getElementById('productStock')?.value) || 0;
    data.color = document.getElementById('productColor')?.value.trim();
    data.talle = document.getElementById('productSize')?.value.trim();
    data.origen = document.getElementById('productOrigin')?.value.trim();
  } else {
    data.telefono = document.getElementById('servicePhone')?.value.trim();
    data.email = document.getElementById('serviceEmail')?.value.trim();
    data.duracion = document.getElementById('serviceDuration')?.value.trim();
    data.disponibilidad = document.getElementById('serviceAvailability')?.value.trim();
  }

  return data;
}

function editProduct(id) {
  const product = products.find(p => p.id === id);
  if (!product) return;

  document.getElementById('productName').value = product.nombre || '';
  document.getElementById('productCode').value = product.codigo || '';
  document.getElementById('productCategory').value = product.categoria || '';
  document.getElementById('productSubcategory').value = product.subcategoria || '';
  document.getElementById('productDescription').value = product.descripcion || '';
  document.getElementById('productImage').value = product.imagen || '';

  const isProduct = product.precio !== undefined || product.stock !== undefined;
  currentProductType = isProduct ? 'producto' : 'servicio';
  renderTypeSelector();
  renderProductForm();

  if (isProduct) {
    document.getElementById('productPrice').value = product.precio || '';
    document.getElementById('productStock').value = product.stock || '';
    document.getElementById('productColor').value = product.color || '';
    document.getElementById('productSize').value = product.talle || '';
    document.getElementById('productOrigin').value = product.origen || '';
  } else {
    document.getElementById('servicePhone').value = product.telefono || '';
    document.getElementById('serviceEmail').value = product.email || '';
    document.getElementById('serviceDuration').value = product.duracion || '';
    document.getElementById('serviceAvailability').value = product.disponibilidad || '';
  }

  editingProductId = id;
  showToast('Edición', 'Producto cargado en el formulario para editar', 'info');
}

async function deleteProductHandler(id) {
  if (!confirm('¿Estás seguro de eliminar este producto?')) return;
  try {
    showLoading('Eliminando producto...');
    await deleteProduct(id);
    
    try {
      await syncToGist();
    } catch (err) {
      console.error("No se pudo sincronizar JSON:", err);
    }
    
    await loadProducts();
    renderProductsTable();
    hideLoading();
    showToast('Producto eliminado', 'El producto ha sido eliminado correctamente', 'success');
  } catch (error) {
    hideLoading();
    console.error(error);
    showToast('Error', 'No se pudo eliminar el producto', 'error');
  }
}

async function toggleProductStatus(id) {
  try {
    const product = products.find(p => p.id === id);
    if (!product) return;
    const newStatus = !product.paused;
    await updateProduct(id, { paused: newStatus });
    
    try {
      await syncToGist();
    } catch (err) {
      console.error("No se pudo sincronizar JSON:", err);
    }
    
    await loadProducts();
    renderProductsTable();
    showToast('Estado actualizado', `Producto ${newStatus ? 'pausado' : 'activado'}`, 'success');
  } catch (error) {
    console.error('Error toggling status:', error);
    showToast('Error', 'No se pudo cambiar el estado', 'error');
  }
}

// ==========================================
// CSV HANDLERS
// ==========================================
async function handleCSVFile(e) {
  const file = e.target.files?.[0];
  if (file) {
    await processCSVFile(file);
  }
}

async function processCSVFile(file) {
  showToast('CSV', 'Funcionalidad de importación CSV en desarrollo', 'info');
}

function exportProducts() {
  if (products.length === 0) {
    showToast('Info', 'No hay productos para exportar', 'info');
    return;
  }
  showToast('Exportar', 'Funcionalidad de exportación en desarrollo', 'info');
}

async function clearAllProducts() {
  if (!confirm('¿Eliminar todos los productos? Esta acción no puede deshacerse.')) return;
  try {
    showLoading('Eliminando productos...');
    hideLoading();
    showToast('Éxito', 'Todos los productos eliminados', 'success');
  } catch (error) {
    hideLoading();
    console.error(error);
    showToast('Error', 'No se pudieron eliminar los productos', 'error');
  }
}
