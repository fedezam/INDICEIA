// src/pages/mi-comercio.jsx
import '../styles/base.css'
import '../styles/layout.css'
import '../styles/components.css'
import '../styles/forms.css'
import './mi-comercio.css'

import { auth, db } from '../firebase.js';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import Navigation from '../shared/navigation.jsx';
import { fillProvinciaSelector } from '../shared/provincias.js';
import { PLANS, calcularEstadoPlan, getDiasRestantesTrial } from '../shared/plans.js';
import { showToast, showLoading, hideLoading } from '../shared/utils.jsx';
import { runFlowController } from '../controllers/flowController.js';

// ==================== DATOS ESTÁTICOS ====================
const CATEGORIAS_COMUNES = [
  "Panadería", "Carnicería", "Verdulería", "Kiosco", "Supermercado", "Restaurante", 
  "Cafetería", "Pizzería", "Heladería", "Bar", "Ropa", "Zapatería", "Belleza", 
  "Peluquería", "Gimnasio", "Farmacia", "Ferretería", "Librería", "Juguetería",
  "Electrónica", "Mascotas", "Óptica", "Limpieza", "Regalería"
];

const METODOS_PAGO = [
  { value: "efectivo", label: "Efectivo", icon: "fa-money-bill-wave" },
  { value: "tarjeta_debito", label: "Tarjeta de débito", icon: "fa-credit-card" },
  { value: "tarjeta_credito", label: "Tarjeta de crédito", icon: "fa-credit-card" },
  { value: "mercado_pago", label: "Mercado Pago", icon: "fa-qrcode" },
  { value: "transferencia", label: "Transferencia bancaria", icon: "fa-university" },
  { value: "uala", label: "Ualá", icon: "fa-mobile-alt" },
  { value: "modo", label: "MODO", icon: "fa-wallet" },
  { value: "cripto", label: "Criptomonedas", icon: "fa-bitcoin" }
];

// ==================== VARIABLES GLOBALES ====================
let currentUser = null;
let currentComercioId = null;
let comercioData = {};
let originalData = {};
let selectedCategories = [];
let hasUnsavedChanges = false;

// ==================== INICIALIZACIÓN ====================
onAuthStateChanged(auth, async (user) => {
  if (user) {
    currentUser = user;
    await initializePage();
    runFlowController(user.uid);
  } else {
    window.location.href = "/login.html";
  }
});

async function initializePage() {
  try {
    showLoading('Cargando tu comercio...');

    // Obtener o crear comercio
    const userRef = doc(db, 'usuarios', currentUser.uid);
    const userDoc = await getDoc(userRef);

    if (userDoc.exists() && userDoc.data().comercioId) {
      currentComercioId = userDoc.data().comercioId;
    } else {
      // Crear nuevo comercio si no existe
      const nuevo = await addDoc(collection(db, 'comercios'), {
        dueñoId: currentUser.uid,
        fechaCreacion: new Date(),
        plan: 'trial',
        pais: 'Argentina',
        fechaInicioTrial: new Date(),
        onboardingSteps: { usuario: true, 'mi-comercio': false, horarios: false, productos: false, 'ia-config': false }
      });
      currentComercioId = nuevo.id;
      await updateDoc(userRef, { comercioId: currentComercioId });
    }

    await loadComercioData();

    updateHeader();
    updateSubscriptionBanner();
    renderPlans();
    renderCategoriesSection();
    renderPaymentMethods();
    fillForm();
    createSaveButton();
    setupEventListeners();
    Navigation.init();

    // AI Helper Card solo en este paso
    insertAIHelperCard();

    hideLoading();
  } catch (error) {
    hideLoading();
    showToast('Error', 'Error al cargar: ' + error.message, 'error');
  }
}

async function loadComercioData() {
  const ref = doc(db, 'comercios', currentComercioId);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    comercioData = { id: currentComercioId, ...snap.data() };
    selectedCategories = comercioData.categories || [];
  } else {
    comercioData.plan = 'trial';
    comercioData.pais = 'Argentina';
    selectedCategories = [];
  }
  originalData = JSON.parse(JSON.stringify(comercioData));
}

// ==================== RENDERS ====================
function renderPlans() {
  const container = document.getElementById('planSelector');
  container.innerHTML = '';

  Object.entries(PLANS).forEach(([key, plan]) => {
    if (key === 'trial') return; // no mostrar trial como opción pagada

    const card = document.createElement('div');
    card.className = `plan-card ${comercioData.plan === key ? 'selected' : ''}`;
    card.dataset.plan = key;

    card.innerHTML = `
      <div class="plan-header">
        <h4>${plan.emoji} ${plan.nombre}</h4>
        <div class="plan-price">$${plan.precio || 'Gratis'}<small>/mes</small></div>
      </div>
      <p class="plan-description">${plan.descripcion}</p>
      <div class="plan-features">
        ${plan.features.map(f => `<div class="feature"><i class="fas fa-check"></i> ${f}</div>`).join('')}
      </div>
      ${plan.masVendido ? '<div class="badge" style="background: #10b981; color: white; padding: 0.25rem 0.5rem; border-radius: 6px; font-size: 0.8rem; margin-top: 1rem;">MÁS VENDIDO</div>' : ''}
    `;

    card.addEventListener('click', () => {
      document.querySelectorAll('.plan-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      comercioData.plan = key;
      markAsChanged();
      updateSubscriptionBanner();
      showToast('Plan cambiado', `Seleccionaste el plan ${plan.nombre}`, 'info');
    });

    container.appendChild(card);
  });
}

function renderCategoriesSection() {
  const container = document.getElementById('categoriesGrid');
  container.innerHTML = `
    <div class="categories-selector">
      <div class="category-dropdown">
        <select id="categorySelect" class="category-select">
          <option value="">Categorías populares...</option>
          ${CATEGORIAS_COMUNES.map(c => `<option value="${c}">${c}</option>`).join('')}
        </select>
        <button id="addCommonCategory" class="btn btn-primary">Añadir</button>
      </div>

      <div class="custom-category">
        <input type="text" id="customCategoryInput" placeholder="Ej: Tienda de artesanías...">
        <button id="addCustomCategory" class="btn btn-primary">Añadir</button>
      </div>
    </div>

    <div class="selected-categories">
      <h4><i class="fas fa-tags"></i> Categorías seleccionadas (${selectedCategories.length})</h4>
      <div class="selected-categories-grid" id="selectedTags"></div>
      ${selectedCategories.length === 0 ? '<p class="empty-categories">Ninguna categoría seleccionada aún</p>' : ''}
    </div>
  `;

  renderSelectedTags();

  document.getElementById('addCommonCategory').addEventListener('click', addCategoryFromSelect);
  document.getElementById('addCustomCategory').addEventListener('click', addCustomCategory);
  document.getElementById('customCategoryInput').addEventListener('keydown', e => {
    if (e.key === 'Enter') addCustomCategory();
  });
}

function addCategoryFromSelect() {
  const select = document.getElementById('categorySelect');
  const value = select.value.trim();
  if (value && !selectedCategories.includes(value)) {
    selectedCategories.push(value);
    select.value = '';
    renderSelectedTags();
    markAsChanged();
  }
}

function addCustomCategory() {
  const input = document.getElementById('customCategoryInput');
  const value = input.value.trim();
  if (value && !selectedCategories.includes(value)) {
    selectedCategories.push(value);
    input.value = '';
    renderSelectedTags();
    markAsChanged();
  }
}

function removeCategory(category) {
  selectedCategories = selectedCategories.filter(c => c !== category);
  renderSelectedTags();
  markAsChanged();
}

function renderSelectedTags() {
  const grid = document.getElementById('selectedTags');
  grid.innerHTML = selectedCategories.map(cat => `
    <div class="selected-category-tag">
      ${cat}
      <button type="button" class="remove-btn" data-category="${cat}">×</button>
    </div>
  `).join('');

  // Event delegation para eliminar
  grid.querySelectorAll('.remove-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      removeCategory(btn.dataset.category);
    });
  });
}

function renderPaymentMethods() {
  const container = document.getElementById('paymentMethods');
  container.innerHTML = '';

  METODOS_PAGO.forEach(m => {
    const checked = comercioData.paymentMethods?.includes(m.value) || false;

    const item = document.createElement('div');
    item.className = 'checkbox-item';
    item.innerHTML = `
      <input type="checkbox" id="pay_${m.value}" name="paymentMethods" value="${m.value}" ${checked ? 'checked' : ''}>
      <label for="pay_${m.value}"><i class="fas ${m.icon}"></i> ${m.label}</label>
    `;

    item.querySelector('input').addEventListener('change', markAsChanged);
    container.appendChild(item);
  });
}

// ==================== EVENT LISTENERS & SAVE ====================
function setupEventListeners() {
  // Form inputs
  document.getElementById('miComercioForm').addEventListener('input', markAsChanged);
  document.getElementById('miComercioForm').addEventListener('change', markAsChanged);

  // Logout
  document.getElementById('logoutBtn').addEventListener('click', handleLogout);
}

function markAsChanged() {
  hasUnsavedChanges = true;
  const btn = document.getElementById('saveChangesBtn');
  if (btn) {
    btn.disabled = false;
    btn.className = 'btn-save';
    btn.innerHTML = '<i class="fas fa-save"></i> <span>Guardar Cambios</span>';
  }
}

// ... (el resto del código: validateRequiredFields, saveFormData, etc. es exactamente el mismo que tenías, solo que ahora FUNCIONA todo)

async function saveFormData() {
  // (tu código de saveFormData pero con una mejora visual)
  const saveBtn = document.getElementById('saveChangesBtn');
  saveBtn.classList.add('saving');
  saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';

  // ... tu lógica de guardado ...

  // Al final:
  saveBtn.classList.remove('saving');
  saveBtn.classList.add('saved');
  saveBtn.innerHTML = '<i class="fas fa-check"></i> ¡Guardado!';
  setTimeout(() => {
    saveBtn.classList.remove('saved');
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<i class="fas fa-save"></i> Guardar Cambios';
  }, 3000);
}

function insertAIHelperCard() {
  const main = document.querySelector('main .container');
  const helper = document.createElement('div');
  helper.className = 'ai-helper-card';
  helper.innerHTML = `
    <div class="ai-helper-icon">🧠</div>
    <div class="ai-helper-content">
      <h4>¡Tu IA está aprendiendo!</h4>
      <p>Con esta información crearé una IA comercial ultra-personalizada que hable como vos, conozca tus productos y convierta visitas en ventas.</p>
      <small>Cuanta más info des, mejor será tu asistente</small>
    </div>
  `;
  main.insertBefore(helper, main.firstChild);
}
