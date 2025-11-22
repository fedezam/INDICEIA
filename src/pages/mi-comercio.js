// src/pages/mi-comercio.js
import { auth, db } from '../firebase.js';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, updateDoc, addDoc, collection } from 'firebase/firestore';
import { fillProvinciaSelector } from '../shared/provincias.js';
import { PLANS, calcularEstadoPlan, getDiasRestantesTrial } from '../shared/plans.js';
import { showToast, showLoading, hideLoading } from '../shared/utils.js';
import { runFlowController } from '../controllers/flowController.js';

// ==================== DATOS ESTÁTICOS ====================
const CATEGORIAS_COMUNES = [
  "Panadería", "Carnicería", "Verdulería", "Kiosco", "Supermercado", "Restaurante",
  "Cafetería", "Pizzería", "Heladería", "Bar", "Ropa", "Zapatería", "Belleza",
  "Peluquería", "Gimnasio", "Farmacia", "Ferretería", "Librería", "Juguetería",
  "Electrónica", "Mascotas", "Óptica", "Limpieza", "Regalería", "Tienda de deportes"
];

const METODOS_PAGO = [
  { value: "efectivo", label: "Efectivo", icon: "fa-money-bill-wave" },
  { value: "billetera", label: "Billetera virtual (Mercado Pago, MODO, Ualá, etc.)", icon: "fa-mobile-alt", highlight: true },
  { value: "tarjeta_credito", label: "Tarjeta de crédito", icon: "fa-credit-card" },
  { value: "tarjeta_debito", label: "Tarjeta de débito (física)", icon: "fa-credit-card" },
  { value: "transferencia", label: "Transferencia bancaria", icon: "fa-university" },
  { value: "cripto", label: "Criptomonedas", icon: "fa-bitcoin" }
];

// ==================== VARIABLES GLOBALES ====================
let currentUser = null;
let currentComercioId = null;
let comercioData = {};
let originalData = {};
let selectedCategories = [];
let hasUnsavedChanges = false;

// ==================== FUNCIÓN AUXILIAR PARA VERIFICAR ELEMENTOS ====================
function safeGetElement(id) {
  const element = document.getElementById(id);
  if (!element) {
    console.warn(`⚠️ Elemento no encontrado: #${id}`);
  }
  return element;
}

function safeSetInnerHTML(id, content) {
  const element = safeGetElement(id);
  if (element) {
    element.innerHTML = content;
    return true;
  }
  return false;
}

function safeSetTextContent(id, content) {
  const element = safeGetElement(id);
  if (element) {
    element.textContent = content;
    return true;
  }
  return false;
}

// ==================== INICIALIZACIÓN ====================
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "/login.html";
    return;
  }
  currentUser = user;
  await initializePage();
  if (typeof runFlowController === 'function') {
    runFlowController(user.uid);
  }
});

async function initializePage() {
  try {
    showLoading('Cargando tu comercio...');

    const userRef = doc(db, 'usuarios', currentUser.uid);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists() && userSnap.data().comercioId) {
      currentComercioId = userSnap.data().comercioId;
    } else {
      const nuevo = await addDoc(collection(db, 'comercios'), {
        dueñoId: currentUser.uid,
        fechaCreacion: new Date(),
        plan: 'trial',
        pais: 'Argentina',
        fechaInicioTrial: new Date(),
        onboardingSteps: { 
          usuario: true, 
          'mi-comercio': false, 
          horarios: false, 
          productos: false, 
          'ia-config': false 
        }
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
    insertAIHelperCard();

    hideLoading();
  } catch (err) {
    console.error('❌ Error en initializePage:', err);
    hideLoading();
    showToast('Error', 'No se pudo cargar la página: ' + err.message, 'error');
  }
}

async function loadComercioData() {
  const ref = doc(db, 'comercios', currentComercioId);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    comercioData = { id: currentComercioId, ...snap.data() };
    selectedCategories = comercioData.categories || [];
  } else {
    comercioData = { plan: 'trial', pais: 'Argentina' };
    selectedCategories = [];
  }
  originalData = JSON.parse(JSON.stringify(comercioData));
}

// ==================== HEADER & BANNER ====================
function updateHeader() {
  safeSetTextContent('commerceName', comercioData.nombreComercio || 'Mi Comercio');
  
  const badgeEl = safeGetElement('planBadge');
  if (badgeEl) {
    const plan = PLANS[comercioData.plan || 'trial'];
    badgeEl.textContent = plan ? `${plan.emoji} ${plan.nombre}` : 'Trial';
  }
}

function updateSubscriptionBanner() {
  const banner = safeGetElement('subscriptionBanner');
  const msg = safeGetElement('subscriptionMessage');
  if (!banner || !msg) return;

  const estado = calcularEstadoPlan(comercioData);
  const plan = PLANS[comercioData.plan || 'trial'];

  banner.className = 'subscription-banner';
  switch (estado) {
    case 'trial':
      const dias = getDiasRestantesTrial(comercioData);
      banner.classList.add('trial');
      msg.innerHTML = `<strong>Trial activo</strong> – Te quedan <strong>${dias} días</strong> gratis`;
      break;
    case 'activo':
      banner.classList.add('active');
      msg.innerHTML = `<strong>Plan ${plan.nombre} activo</strong> – Todo funcionando`;
      break;
    case 'expirado':
      banner.classList.add('expired');
      msg.innerHTML = `Trial expirado – Elegí un plan para continuar`;
      break;
    default:
      banner.classList.add('trial');
      msg.innerHTML = `Completá tu comercio para activar tu IA`;
  }
}

// ==================== RENDERS CON VALIDACIÓN ====================
function renderPlans() {
  const container = safeGetElement('planSelector');
  if (!container) return;

  container.innerHTML = '';

  Object.entries(PLANS).forEach(([key, plan]) => {
    if (key === 'trial') return;
    const selected = comercioData.plan === key;

    const card = document.createElement('div');
    card.className = `plan-card ${selected ? 'selected' : ''}`;
    card.dataset.plan = key;
    card.innerHTML = `
      <div class="plan-header">
        <h4>${plan.emoji} ${plan.nombre}</h4>
        <div class="plan-price">$${plan.precio || 0}<small>/mes</small></div>
      </div>
      <p class="plan-description">${plan.descripcion}</p>
      <div class="plan-features">
        ${plan.features.map(f => `<div class="feature"><i class="fas fa-check"></i> ${f}</div>`).join('')}
      </div>
      ${plan.masVendido ? '<div style="background:#10b981;color:white;padding:0.25rem 0.75rem;border-radius:8px;font-size:0.8rem;margin-top:1rem;">MÁS VENDIDO</div>' : ''}
    `;

    card.onclick = () => {
      document.querySelectorAll('.plan-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      comercioData.plan = key;
      markAsChanged();
      updateSubscriptionBanner();
      showToast('Plan seleccionado', `Ahora tenés el plan ${plan.nombre}`, 'info');
    };

    container.appendChild(card);
  });
}

function renderCategoriesSection() {
  const container = safeGetElement('categoriesGrid');
  if (!container) return;

  container.innerHTML = `
    <div class="categories-selector">
      <div class="category-dropdown">
        <select id="categorySelect" class="category-select">
          <option value="">Seleccionar categoría común...</option>
          ${CATEGORIAS_COMUNES.map(c => `<option value="${c}">${c}</option>`).join('')}
        </select>
      </div>

      <div class="custom-category">
        <input type="text" id="customCatInput" placeholder="O agregá una personalizada...">
        <button type="button" id="addCustomBtn" class="btn btn-primary">
          <i class="fas fa-plus"></i> Añadir
        </button>
      </div>
    </div>

    <div class="selected-categories">
      <h4><i class="fas fa-tags"></i> Categorías seleccionadas (${selectedCategories.length})</h4>
      <div class="selected-categories-grid" id="selectedTags"></div>
      ${selectedCategories.length === 0 ? '<p class="empty-categories">Aún no seleccionaste ninguna categoría</p>' : ''}
    </div>
  `;

  renderSelectedTags();

  const categorySelect = safeGetElement('categorySelect');
  if (categorySelect) {
    categorySelect.addEventListener('change', (e) => {
      const val = e.target.value.trim();
      if (val && !selectedCategories.includes(val)) {
        selectedCategories.push(val);
        e.target.value = '';
        renderSelectedTags();
        markAsChanged();
      }
    });
  }

  const addBtn = safeGetElement('addCustomBtn');
  const customInput = safeGetElement('customCatInput');
  
  if (addBtn && customInput) {
    addBtn.addEventListener('click', () => {
      const val = customInput.value.trim();
      if (val && !selectedCategories.includes(val)) {
        selectedCategories.push(val);
        customInput.value = '';
        renderSelectedTags();
        markAsChanged();
      }
    });

    customInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        addBtn.click();
      }
    });
  }
}

function renderSelectedTags() {
  const grid = safeGetElement('selectedTags');
  if (!grid) return;

  grid.innerHTML = selectedCategories.map(cat => `
    <div class="selected-category-tag">
      ${cat}
      <button type="button" class="remove-btn" data-cat="${cat}">×</button>
    </div>
  `).join('');

  grid.querySelectorAll('.remove-btn').forEach(btn => {
    btn.onclick = () => {
      selectedCategories = selectedCategories.filter(c => c !== btn.dataset.cat);
      renderSelectedTags();
      markAsChanged();
    };
  });
}

function renderPaymentMethods() {
  const container = safeGetElement('paymentMethods');
  if (!container) return;

  container.innerHTML = '';

  METODOS_PAGO.forEach(m => {
    const checked = comercioData.paymentMethods?.includes(m.value) || false;

    const tag = document.createElement('div');
    tag.className = `payment-tag ${checked ? 'selected' : ''}`;
    tag.innerHTML = `
      <input type="checkbox" id="pay_${m.value}" name="paymentMethods" value="${m.value}" ${checked ? 'checked' : ''}>
      <label for="pay_${m.value}">
        <i class="fas ${m.icon}"></i>
        ${m.label}
      </label>
    `;

    tag.addEventListener('click', (e) => {
      e.preventDefault();
      const checkbox = tag.querySelector('input');
      checkbox.checked = !checkbox.checked;
      tag.classList.toggle('selected', checkbox.checked);
      markAsChanged();
    });

    container.appendChild(tag);
  });
}

// ==================== FORM & SAVE ====================
function fillForm() {
  const form = safeGetElement('miComercioForm');
  if (!form) return;

  Object.keys(comercioData).forEach(key => {
    const field = form.elements[key];
    if (field) field.value = comercioData[key] || '';
  });

  const paisField = safeGetElement('pais');
  if (paisField) {
    paisField.value = 'Argentina';
    paisField.disabled = true;
  }

  const provinciaSelect = safeGetElement('provincia');
  if (provinciaSelect && typeof fillProvinciaSelector === 'function') {
    fillProvinciaSelector('Argentina', provinciaSelect);
  }
}

function createSaveButton() {
  const userInfo = document.querySelector('.header .user-info');
  if (!userInfo || safeGetElement('saveChangesBtn')) return;

  const btn = document.createElement('button');
  btn.id = 'saveChangesBtn';
  btn.className = 'btn-save';
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-save"></i> <span>Guardar Cambios</span>';
  
  const logoutBtn = safeGetElement('logoutBtn');
  if (logoutBtn) {
    userInfo.insertBefore(btn, logoutBtn);
    btn.addEventListener('click', saveFormData);
  }
}

function markAsChanged() {
  hasUnsavedChanges = true;
  const btn = safeGetElement('saveChangesBtn');
  if (btn) {
    btn.disabled = false;
    btn.className = 'btn-save';
    btn.innerHTML = '<i class="fas fa-save"></i> <span>Guardar Cambios</span>';
  }
}

function setupEventListeners() {
  const form = safeGetElement('miComercioForm');
  if (form) {
    form.addEventListener('input', markAsChanged);
  }

  const logoutBtn = safeGetElement('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      if (confirm('¿Cerrar sesión?')) signOut(auth);
    });
  }
}

async function saveFormData() {
  const btn = safeGetElement('saveChangesBtn');
  const form = safeGetElement('miComercioForm');
  if (!form) return;

  const required = ['nombreComercio', 'provincia', 'ciudad', 'direccion', 'descripcion', 'telefono', 'email'];
  let missing = [];
  
  required.forEach(id => {
    const el = safeGetElement(id);
    if (el && !el.value.trim()) {
      missing.push(el.previousElementSibling?.textContent || id);
    }
  });

  const hasSocial = ['website', 'instagram', 'facebook', 'tiktok'].some(id => {
    const el = safeGetElement(id);
    return el && el.value.trim();
  });
  
  if (!hasSocial) missing.push('al menos una red social o web');
  if (selectedCategories.length === 0) missing.push('categorías');
  if (!document.querySelector('.plan-card.selected')) missing.push('un plan');

  if (missing.length > 0) {
    showToast('Faltan datos', 'Completá: ' + missing.join(', '), 'warning');
    return;
  }

  try {
    if (btn) {
      btn.classList.add('saving');
      btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';
    }

    const formData = new FormData(form);
    const updates = {};
    for (let [k, v] of formData) updates[k] = v.trim();

    updates.categories = selectedCategories;
    updates.paymentMethods = Array.from(document.querySelectorAll('input[name="paymentMethods"]:checked')).map(i => i.value);
    updates.plan = document.querySelector('.plan-card.selected')?.dataset.plan || 'trial';
    updates['onboardingSteps.mi-comercio'] = true;
    updates.fechaActualizacion = new Date();

    await updateDoc(doc(db, 'comercios', currentComercioId), updates);

    comercioData = { ...comercioData, ...updates };
    originalData = JSON.parse(JSON.stringify(comercioData));
    hasUnsavedChanges = false;

    if (btn) {
      btn.classList.remove('saving');
      btn.classList.add('saved');
      btn.innerHTML = '<i class="fas fa-check"></i> ¡Guardado!';

      setTimeout(() => {
        btn.disabled = true;
        btn.className = 'btn-save';
        btn.innerHTML = '<i class="fas fa-save"></i> <span>Guardar Cambios</span>';
      }, 2500);
    }

    showToast('Éxito', 'Todo guardado correctamente', 'success');
    updateHeader();
    updateSubscriptionBanner();

  } catch (err) {
    console.error('❌ Error al guardar:', err);
    if (btn) {
      btn.className = 'btn-save';
      btn.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Error';
    }
    showToast('Error', 'No se pudo guardar: ' + err.message, 'error');
  }
}

function insertAIHelperCard() {
  const container = document.querySelector('main .container');
  if (!container || document.querySelector('.ai-helper-card')) return;

  const card = document.createElement('div');
  card.className = 'ai-helper-card';
  card.innerHTML = `
    <div class="ai-helper-icon">AI</div>
    <div class="ai-helper-content">
      <h4>¡Tu IA está tomando forma!</h4>
      <p>Con esta información crearé un asistente inteligente que conozca tu negocio al detalle y convierta más ventas.</p>
      <small>Cuanto más completes, mejor será tu IA</small>
    </div>
  `;
  container.insertBefore(card, container.firstChild);
}

// Validación para flowController
window.validateCurrentPageData = async () => {
  if (hasUnsavedChanges) {
    showToast('Cambios sin guardar', 'Guardá antes de continuar', 'warning');
    return false;
  }
  return true;
};
