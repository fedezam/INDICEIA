// src/pages/mi-comercio.js
import '../styles/base.css';
import '../styles/layout.css';
import '../styles/components.css';
import '../styles/forms.css';
import '../styles/forms-premium.css';
import './mi-comercio.css';
import { auth, db } from '../firebase.js';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, updateDoc, addDoc, collection, setDoc } from 'firebase/firestore';
import { renderLayout, updateHeaderInfo, updateSubscriptionBanner } from '../shared/layout.js';
import { initNavigation } from '../shared/navigation.js';
import { fillProvinciaSelector } from '../shared/provincias.js';
import { PLANS, calcularEstadoPlan, getDiasRestantesTrial } from '../shared/plans.js';
import { showToast, showLoading, hideLoading } from '../shared/utils.js';
import { runFlowController, redirectAfterSave } from '../controllers/flowController.js';

// ==================== SLUG UTILS ====================
function slugify(text) {
  return text
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

// ==================== DATOS ESTÁTICOS ====================
const CATEGORIAS_COMUNES = [
  "Panadería", "Carnicería", "Verdulería", "Kiosco", "Supermercado", "Restaurante",
  "Cafetería", "Pizzería", "Heladería", "Bar", "Ropa", "Zapatería", "Belleza",
  "Peluquería", "Gimnasio", "Farmacia", "Ferretería", "Librería", "Juguetería",
  "Electrónica", "Mascotas", "Óptica", "Limpieza", "Regalería", "Tienda de deportes"
];

const METODOS_PAGO = [
  { value: "efectivo", label: "Efectivo", icon: "fa-money-bill-wave" },
  { value: "billetera", label: "Billetera virtual (Mercado Pago, MODO, Ualá, etc.)", icon: "fa-mobile-alt" },
  { value: "tarjeta_credito", label: "Tarjeta de crédito", icon: "fa-credit-card" },
  { value: "tarjeta_debito", label: "Tarjeta de débito", icon: "fa-credit-card" },
  { value: "transferencia", label: "Transferencia bancaria", icon: "fa-university" }
];

// ==================== VARIABLES GLOBALES ====================
let currentUser = null;
let currentComercioId = null;
let comercioData = {};
let originalData = {};
let selectedCategories = [];
let hasUnsavedChanges = false;
let comercioSlug = null;
let slugDisponible = false;
let slugValidationTimer = null;

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
    showLoading('Cargando tu comercio...');
    renderLayout();
    const userRef = doc(db, 'usuarios', currentUser.uid);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists() && userSnap.data().comercioId) {
      currentComercioId = userSnap.data().comercioId;
    } else {
      const nuevo = await addDoc(collection(db, 'comercios'), {
        dueñoId: currentUser.uid,
        duenoId: currentUser.uid,
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
    initNavigation();
    updateHeaderInfo(comercioData.nombreComercio, PLANS[comercioData.plan || 'trial']);
    updateBanner();
    renderPlans();
    renderCategoriesSection();
    renderPaymentMethods();
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    fillForm();
    const provinciaEl = document.getElementById('provincia');
    if (provinciaEl) {
      fillProvinciaSelector('Argentina', provinciaEl);
    }
    createSaveButton();
    setupEventListeners();
    insertAIHelperCard();
    checkFormValidity();
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
    selectedCategories = comercioData.categories || [];
  } else {
    comercioData = { plan: 'trial', pais: 'Argentina' };
    selectedCategories = [];
  }
  originalData = structuredClone(comercioData);
  
  // Cargar slug si existe
  comercioSlug = comercioData.slug || null;
  slugDisponible = !!comercioSlug;
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
      html = `Completá tu comercio para activar tu IA`;
  }
  updateSubscriptionBanner(html, estado);
}

// ==================== RENDERS ====================
function renderPlans() {
  const container = document.getElementById('planSelector');
  if (!container) {
    console.warn('⚠️ #planSelector no encontrado');
    return;
  }
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
      checkFormValidity();
      updateHeaderInfo(comercioData.nombreComercio, plan);
      updateBanner();
      showToast('Plan seleccionado', `Ahora tenés el plan ${plan.nombre}`, 'info');
    };
    container.appendChild(card);
  });
}

function renderCategoriesSection() {
  const container = document.getElementById('categoriesGrid');
  if (!container) {
    console.warn('⚠️ #categoriesGrid no encontrado');
    return;
  }
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
        <button type="button" id="addCustomBtn" class="btn btn-primary"><i class="fas fa-plus"></i> Añadir</button>
      </div>
    </div>
    <div class="selected-categories">
      <h4><i class="fas fa-tags"></i> Categorías seleccionadas (${selectedCategories.length})</h4>
      <div class="selected-categories-grid" id="selectedTags"></div>
      ${selectedCategories.length === 0 ? '<p class="empty-categories">Aún no seleccionaste ninguna categoría</p>' : ''}
    </div>
  `;
  renderSelectedTags();
  const selectEl = document.getElementById('categorySelect');
  if (selectEl) {
    selectEl.addEventListener('change', (e) => {
      const val = e.target.value.trim();
      if (val && !selectedCategories.includes(val)) {
        selectedCategories.push(val);
        e.target.value = '';
        renderSelectedTags();
        markAsChanged();
        checkFormValidity();
      }
    });
  }
  const addBtn = document.getElementById('addCustomBtn');
  const customInput = document.getElementById('customCatInput');
  if (addBtn) {
    addBtn.onclick = () => {
      if (customInput) {
        const val = customInput.value.trim();
        if (val && !selectedCategories.includes(val)) {
          selectedCategories.push(val);
          customInput.value = '';
          renderSelectedTags();
          markAsChanged();
          checkFormValidity();
        }
      }
    };
  }
  if (customInput) {
    customInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (addBtn) addBtn.click();
      }
    });
  }
}

function renderSelectedTags() {
  const grid = document.getElementById('selectedTags');
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
      checkFormValidity();
    };
  });
  checkFormValidity();
}

function renderPaymentMethods() {
  const container = document.getElementById('paymentMethods');
  if (!container) {
    console.warn('⚠️ #paymentMethods no encontrado');
    return;
  }
  container.innerHTML = '';
  METODOS_PAGO.forEach(m => {
    const checked = comercioData.paymentMethods?.includes(m.value) || false;
    const tag = document.createElement('div');
    tag.className = `payment-tag ${checked ? 'selected' : ''}`;
    tag.innerHTML = `
      <input type="checkbox" id="pay_${m.value}" name="paymentMethods" value="${m.value}" ${checked ? 'checked' : ''}>
      <label for="pay_${m.value}">
        <i class="fas ${m.icon}"></i> ${m.label}
      </label>
    `;
    tag.addEventListener('click', (e) => {
      e.preventDefault();
      const checkbox = tag.querySelector('input');
      checkbox.checked = !checkbox.checked;
      tag.classList.toggle('selected', checkbox.checked);
      markAsChanged();
      checkFormValidity();
    });
    container.appendChild(tag);
  });
  checkFormValidity();
}

// ==================== VALIDACIÓN DE SLUG (MEJORADA) ====================
async function validarSlug(slug, showSuggestions = false) {
  if (!slug || slug.length < 3) {
    updateSlugStatus('empty', 'El nombre debe tener al menos 3 caracteres');
    slugDisponible = false;
    return;
  }

  updateSlugStatus('checking', 'Verificando disponibilidad...');

  try {
    const slugRef = doc(db, 'landings', slug);
    const snap = await getDoc(slugRef);

    // Si no existe o es mío, está disponible
    if (!snap.exists() || snap.data().comercioId === currentComercioId) {
      comercioSlug = slug;
      slugDisponible = true;
      updateSlugStatus('available', `indiceia.com/${slug}`);
      return;
    }

    // Está ocupado
    if (showSuggestions) {
      // Buscar alternativas
      for (let i = 2; i <= 5; i++) {
        const alt = `${slug}-${i}`;
        const altRef = doc(db, 'landings', alt);
        const altSnap = await getDoc(altRef);

        if (!altSnap.exists()) {
          comercioSlug = alt;
          slugDisponible = true;
          updateSlugStatus('suggestion', `Ya existe. Sugerencia: indiceia.com/${alt}`, alt);
          // Auto-rellenar la sugerencia
          const slugInput = document.getElementById('comercioSlug');
          if (slugInput) slugInput.value = alt;
          return;
        }
      }
    }

    slugDisponible = false;
    updateSlugStatus('taken', 'Este nombre ya está en uso. Probá con otro.');
  } catch (err) {
    console.error('Error validando slug:', err);
    slugDisponible = false;
    updateSlugStatus('error', 'Error al validar. Intentá de nuevo.');
  }
}

function updateSlugStatus(status, message, suggestion = null) {
  const statusEl = document.getElementById('slugStatus');
  const iconEl = document.getElementById('slugStatusIcon');
  const textEl = document.getElementById('slugStatusText');
  
  if (!statusEl || !iconEl || !textEl) return;

  statusEl.className = 'slug-status';
  
  switch (status) {
    case 'checking':
      statusEl.classList.add('checking');
      iconEl.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
      textEl.textContent = message;
      break;
    case 'available':
      statusEl.classList.add('available');
      iconEl.innerHTML = '<i class="fas fa-check-circle"></i>';
      textEl.textContent = message;
      break;
    case 'suggestion':
      statusEl.classList.add('suggestion');
      iconEl.innerHTML = '<i class="fas fa-info-circle"></i>';
      textEl.textContent = message;
      break;
    case 'taken':
      statusEl.classList.add('taken');
      iconEl.innerHTML = '<i class="fas fa-times-circle"></i>';
      textEl.textContent = message;
      break;
    case 'error':
      statusEl.classList.add('error');
      iconEl.innerHTML = '<i class="fas fa-exclamation-triangle"></i>';
      textEl.textContent = message;
      break;
    case 'empty':
      statusEl.classList.add('empty');
      iconEl.innerHTML = '';
      textEl.textContent = message;
      break;
  }
}

// ==================== VALIDACIÓN GLOBAL Y HABILITAR BOTONES ====================
function markAsChanged() {
  hasUnsavedChanges = true;
  checkFormValidity();
}

function checkFormValidity() {
  const form = document.getElementById('miComercioForm');
  if (!form) return;
  const required = ['nombreComercio', 'provincia', 'ciudad', 'direccion', 'descripcion', 'telefono', 'email'];
  let missing = false;
  required.forEach(id => {
    const el = document.getElementById(id);
    if (!el || !el.value.trim()) missing = true;
  });
  const socialFields = ['website', 'instagram', 'facebook', 'tiktok', 'whatsapp'];
  const hasSocial = socialFields.some(id => {
    const el = document.getElementById(id);
    return el && el.value.trim();
  });
  if (!hasSocial) missing = true;
  if (selectedCategories.length === 0) missing = true;
  if (!document.querySelector('.plan-card.selected')) missing = true;
  
  // Validar slug
  if (!slugDisponible) missing = true;
  
  const btnTop = document.getElementById('saveChangesBtn');
  const btnBottom = document.getElementById('saveChangesBtnBottom');
  const buttons = [btnTop, btnBottom].filter(Boolean);
  if (missing || !hasUnsavedChanges) {
    buttons.forEach(b => {
      b.disabled = true;
      b.classList.remove('ready', 'saving', 'saved');
      b.classList.add('btn-save');
      if (b.id === 'saveChangesBtn') b.innerHTML = '<i class="fas fa-save"></i> <span>Guardar Cambios</span>';
      if (b.id === 'saveChangesBtnBottom') b.innerHTML = 'Guardar Cambios';
    });
  } else {
    buttons.forEach(b => {
      b.disabled = false;
      b.classList.add('ready');
      if (!b.classList.contains('saving') && !b.classList.contains('saved')) {
        if (b.id === 'saveChangesBtn') b.innerHTML = '<i class="fas fa-save"></i> <span>Guardar Cambios</span>';
        if (b.id === 'saveChangesBtnBottom') b.innerHTML = 'Guardar Cambios';
      }
    });
  }
}

// ==================== FORM & SAVE ====================
function fillForm() {
  const form = document.getElementById('miComercioForm');
  if (!form) {
    console.warn('⚠️ #miComercioForm no encontrado');
    return;
  }
  Object.entries(comercioData).forEach(([key, value]) => {
    const field = form.elements[key];
    if (field && value) field.value = value;
  });
  
  // Llenar slug si existe
  const slugInput = document.getElementById('comercioSlug');
  if (slugInput && comercioSlug) {
    slugInput.value = comercioSlug;
    updateSlugStatus('available', `indiceia.com/${comercioSlug}`);
  }
  
  checkFormValidity();
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
  btn.addEventListener('click', saveFormData);
}

function setupEventListeners() {
  const form = document.getElementById('miComercioForm');
  if (form) {
    form.addEventListener('input', markAsChanged);
    form.addEventListener('input', checkFormValidity);
  }
  
  // Auto-generar slug desde nombreComercio
  const nombreInput = document.getElementById('nombreComercio');
  if (nombreInput) {
    nombreInput.addEventListener('input', () => {
      clearTimeout(slugValidationTimer);
      
      slugValidationTimer = setTimeout(async () => {
        const slugInput = document.getElementById('comercioSlug');
        if (!slugInput) return;
        
        // Solo auto-generar si el campo está vacío
        if (!slugInput.value.trim()) {
          const nombre = nombreInput.value.trim();
          if (nombre.length >= 3) {
            const newSlug = slugify(nombre);
            slugInput.value = newSlug;
            await validarSlug(newSlug, true);
          }
        }
      }, 500);
    });
  }
  
  // Validar slug cuando el usuario edita manualmente
  const slugInput = document.getElementById('comercioSlug');
  if (slugInput) {
    slugInput.addEventListener('input', (e) => {
      clearTimeout(slugValidationTimer);
      
      // Normalizar mientras escribe
      let value = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
      e.target.value = value;
      
      slugValidationTimer = setTimeout(async () => {
        if (value.length >= 3) {
          await validarSlug(value, false);
        } else {
          updateSlugStatus('empty', 'Mínimo 3 caracteres');
          slugDisponible = false;
        }
        checkFormValidity();
      }, 500);
    });
  }
  
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      if (confirm('¿Cerrar sesión?')) signOut(auth);
    });
  }
  const btnBottom = document.getElementById('saveChangesBtnBottom');
  if (btnBottom) {
    btnBottom.addEventListener('click', saveFormData);
  }
  const paymentContainer = document.getElementById('paymentMethods');
  if (paymentContainer) {
    paymentContainer.addEventListener('change', () => {
      markAsChanged();
      checkFormValidity();
    });
  }
}

async function saveFormData() {
  const btn = document.getElementById('saveChangesBtn');
  const btnBottom = document.getElementById('saveChangesBtnBottom');
  const form = document.getElementById('miComercioForm');
  if (!form) {
    showToast('Error', 'Formulario no encontrado', 'error');
    return;
  }
  
  const required = ['nombreComercio', 'provincia', 'ciudad', 'direccion', 'descripcion', 'telefono', 'email'];
  let missing = [];
  required.forEach(id => {
    const el = document.getElementById(id);
    if (!el || !el.value.trim()) {
      missing.push(id);
    }
  });
  const socialFields = ['website', 'instagram', 'facebook', 'tiktok', 'whatsapp'];
  const hasSocial = socialFields.some(id => {
    const el = document.getElementById(id);
    return el && el.value.trim();
  });
  if (!hasSocial) missing.push('al menos una red social o web');
  if (selectedCategories.length === 0) missing.push('categorías');
  if (!document.querySelector('.plan-card.selected')) missing.push('un plan');
  
  if (missing.length > 0) {
    showToast('Faltan datos', 'Completá: ' + missing.join(', '), 'warning');
    checkFormValidity();
    return;
  }
  
  // Validar slug
  if (!comercioSlug || !slugDisponible) {
    showToast('Link público', 'Elegí un nombre disponible para tu link público', 'warning');
    return;
  }
  
  try {
    [btn, btnBottom].forEach(b => {
      if (b) {
        b.classList.add('saving');
        b.classList.remove('saved', 'ready');
        if (b.id === 'saveChangesBtn') b.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';
        if (b.id === 'saveChangesBtnBottom') b.innerHTML = 'Guardando...';
      }
    });
    
    const formData = new FormData(form);
    const updates = {};
    for (let [k, v] of formData) updates[k] = v.trim();
    updates.categories = selectedCategories;
    updates.paymentMethods = Array.from(document.querySelectorAll('input[name="paymentMethods"]:checked')).map(i => i.value);
    updates.plan = document.querySelector('.plan-card.selected')?.dataset.plan || 'trial';
    updates['onboardingSteps.mi-comercio'] = true;
    updates.fechaActualizacion = new Date();
    updates.slug = comercioSlug;
    
    const comercioRef = doc(db, 'comercios', currentComercioId);
    const slugRef = doc(db, 'landings', comercioSlug);
    
    // Guardar comercio
    await updateDoc(comercioRef, updates);
    
    // Crear/actualizar índice de slug
    await setDoc(slugRef, {
      slug: comercioSlug,
      comercioId: currentComercioId,
      nombre: updates.nombreComercio,
      activo: true,
      createdAt: originalData.slug ? (comercioData.createdAt || new Date()) : new Date(),
      updatedAt: new Date()
    });
    
    comercioData = { ...comercioData, ...updates };
    originalData = structuredClone(comercioData);
    hasUnsavedChanges = false;
    
    [btn, btnBottom].forEach(b => {
      if (b) {
        b.classList.remove('saving');
        b.classList.add('saved');
        if (b.id === 'saveChangesBtn') b.innerHTML = '<i class="fas fa-check"></i> ¡Guardado!';
        if (b.id === 'saveChangesBtnBottom') b.innerHTML = '¡Guardado!';
      }
    });
    
    setTimeout(() => {
      [btn, btnBottom].forEach(b => {
        if (b) {
          b.disabled = true;
          b.className = 'btn-save';
          if (b.id === 'saveChangesBtn') b.innerHTML = '<i class="fas fa-save"></i> <span>Guardar Cambios</span>';
          if (b.id === 'saveChangesBtnBottom') b.innerHTML = 'Guardar Cambios';
        }
      });
    }, 2500);

    showToast('Éxito', 'Todo guardado correctamente', 'success');
    updateHeaderInfo(comercioData.nombreComercio, PLANS[comercioData.plan]);
    updateBanner();

    setTimeout(() => {
      redirectAfterSave();
    }, 1000);

  } catch (err) {
    console.error(err);
    [btn, btnBottom].forEach(b => {
      if (b) {
        b.className = 'btn-save';
        b.innerHTML = '<i class="fas fa-save"></i> Error';
      }
    });
    showToast('Error', 'No se pudo guardar: ' + err.message, 'error');
  } finally {
    checkFormValidity();
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

window.validateCurrentPageData = async () => {
  if (hasUnsavedChanges) {
    showToast('Cambios sin guardar', 'Guardá antes de continuar', 'warning');
    return false;
  }
  return true;
};
