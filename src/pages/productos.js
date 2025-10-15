// src/pages/productos.js
import { auth, db } from './firebase.js';
import { collection, doc, getDocs, setDoc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

// ==================== UTILIDADES ====================
const toastContainer = document.querySelector('.toast-container');
const loadingOverlay = document.querySelector('.loading-overlay');

function showToast(type, title, message) {
  const toast = document.createElement('div');
  toast.className = `toast ${type} show`;
  toast.innerHTML = `
    <i class="fas fa-info-circle"></i>
    <div class="toast-content">
      <div class="toast-title">${title}</div>
      <div class="toast-message">${message}</div>
    </div>
    <button class="toast-close">&times;</button>
  `;
  toast.querySelector('.toast-close').addEventListener('click', () => {
    toast.remove();
  });
  toastContainer.appendChild(toast);
  setTimeout(() => toast.remove(), 5000);
}

function showLoading(show, text = 'Cargando...') {
  if (show) {
    loadingOverlay.classList.add('show');
    loadingOverlay.querySelector('.loading-text').textContent = text;
  } else {
    loadingOverlay.classList.remove('show');
  }
}

function formatCurrencyToNumber(str) {
  if (!str) return 0;
  return parseFloat(str.replace(/[^0-9.-]+/g, '')) || 0;
}

function generateCode() {
  return 'PRD-' + Math.random().toString(36).substring(2, 10).toUpperCase();
}

// ==================== AUTH ====================
let currentUser = null;
onAuthStateChanged(auth, (user) => {
  if (user) {
    currentUser = user;
    document.querySelector('.user-name').textContent = user.displayName || 'Usuario';
    document.querySelector('.user-email').textContent = user.email;
    loadProducts();
  } else {
    window.location.href = '/index.html';
  }
});

// ==================== CARGA DE PRODUCTOS ====================
const productsTableBody = document.querySelector('#productsTable tbody');
const emptyMessage = document.querySelector('#emptyMessage');
let productsData = [];

async function loadProducts() {
  showLoading(true, 'Cargando productos...');
  const snapshot = await getDocs(collection(db, 'products'));
  productsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  renderProductsTable();
  showLoading(false);
}

function renderProductsTable() {
  productsTableBody.innerHTML = '';
  if (productsData.length === 0) {
    emptyMessage.style.display = 'block';
    return;
  }
  emptyMessage.style.display = 'none';
  productsData.forEach(product => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="editable-cell" data-field="codigo">${product.codigo}</td>
      <td class="editable-cell" data-field="articulo">${product.articulo}</td>
      <td class="editable-cell" data-field="descripcion">${product.descripcion}</td>
      <td class="editable-cell" data-field="precio_final">${product.precio_final || 0}</td>
      <td class="editable-cell" data-field="stock">${product.stock || 0}</td>
      <td class="editable-cell" data-field="categoria">${product.categoria || ''}</td>
      <td class="editable-cell" data-field="subcategoria">${product.subcategoria || ''}</td>
      <td class="editable-cell" data-field="marca">${product.marca || ''}</td>
      <td class="editable-cell" data-field="disponibilidad">${product.disponibilidad || 'inmediata'}</td>
      <td>
        <button class="btn btn-secondary btn-edit">Editar</button>
        <button class="btn btn-danger btn-delete">Eliminar</button>
      </td>
    `;
    // ==================== EDITAR CELDA ====================
    tr.querySelectorAll('.editable-cell').forEach(cell => {
      cell.addEventListener('click', () => editCell(cell, product.id));
    });

    // ==================== BOTONES ====================
    tr.querySelector('.btn-delete').addEventListener('click', () => deleteProduct(product.id));
    productsTableBody.appendChild(tr);
  });
}

function editCell(cell, productId) {
  const field = cell.dataset.field;
  const oldValue = cell.textContent;
  const input = document.createElement(field === 'descripcion' ? 'textarea' : 'input');
  input.value = oldValue;
  cell.innerHTML = '';
  cell.appendChild(input);
  input.focus();

  input.addEventListener('blur', async () => {
    let value = input.value.trim();
    if (['precio_final', 'stock'].includes(field)) {
      value = formatCurrencyToNumber(value);
    }
    await updateDoc(doc(db, 'products', productId), { [field]: value, updatedAt: serverTimestamp() });
    productsData = productsData.map(p => p.id === productId ? { ...p, [field]: value } : p);
    renderProductsTable();
    showToast('success', 'Producto actualizado', `Campo ${field} actualizado correctamente.`);
  });
}

// ==================== ELIMINAR PRODUCTO ====================
async function deleteProduct(productId) {
  if (!confirm('¿Seguro querés eliminar este producto?')) return;
  await deleteDoc(doc(db, 'products', productId));
  productsData = productsData.filter(p => p.id !== productId);
  renderProductsTable();
  showToast('success', 'Producto eliminado', 'El producto fue eliminado correctamente.');
}

// ==================== CARGA MANUAL ====================
const manualForm = document.querySelector('#manualForm');
manualForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const formData = new FormData(manualForm);
  const newProduct = {
    codigo: formData.get('codigo') || generateCode(),
    articulo: formData.get('articulo'),
    descripcion: formData.get('descripcion'),
    precio_final: formatCurrencyToNumber(formData.get('precio_final')),
    stock: parseInt(formData.get('stock')) || 0,
    categoria: formData.get('categoria'),
    subcategoria: formData.get('subcategoria'),
    marca: formData.get('marca'),
    disponibilidad: formData.get('disponibilidad') || 'inmediata',
    atributos: {}, 
    createdAt: serverTimestamp()
  };

  if (!newProduct.articulo || !newProduct.descripcion) {
    showToast('error', 'Campos obligatorios', 'Artículo y descripción son requeridos.');
    return;
  }

  showLoading(true, 'Guardando producto...');
  const docRef = doc(collection(db, 'products'));
  await setDoc(docRef, newProduct);
  productsData.push({ id: docRef.id, ...newProduct });
  renderProductsTable();
  manualForm.reset();
  showLoading(false);
  showToast('success', 'Producto agregado', 'El producto fue agregado correctamente.');
});

// ==================== CARGA MASIVA ====================
const bulkInput = document.querySelector('#bulkFile');
bulkInput.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  showLoading(true, 'Procesando archivo...');
  try {
    const data = await parseExcel(file); // Función que parsea Excel/CSV a JSON
    for (const row of data) {
      const product = {
        codigo: row.codigo || generateCode(),
        articulo: row.articulo,
        descripcion: row.descripcion,
        precio_final: formatCurrencyToNumber(row.precio_final),
        stock: parseInt(row.stock) || 0,
        categoria: row.categoria,
        subcategoria: row.subcategoria,
        marca: row.marca,
        disponibilidad: row.disponibilidad || 'inmediata',
        atributos: row.atributos || {},
        createdAt: serverTimestamp()
      };
      const docRef = doc(collection(db, 'products'));
      await setDoc(docRef, product);
      productsData.push({ id: docRef.id, ...product });
    }
    renderProductsTable();
    showToast('success', 'Carga masiva completa', 'Todos los productos fueron agregados correctamente.');
  } catch (err) {
    console.error(err);
    showToast('error', 'Error al procesar archivo', 'Revisá el formato del Excel/CSV.');
  }
  showLoading(false);
});

// ==================== FUNCIONES AUXILIARES ====================
// Ejemplo simple de parser de Excel/CSV
async function parseExcel(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      const lines = text.split(/\r?\n/);
      const headers = lines[0].split(',');
      const data = lines.slice(1).map(line => {
        const obj = {};
        line.split(',').forEach((val, i) => {
          obj[headers[i].trim()] = val.trim();
        });
        return obj;
      });
      resolve(data);
    };
    reader.onerror = () => reject('Error leyendo el archivo');
    reader.readAsText(file);
  });
}
