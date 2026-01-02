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
    .trim()
    // Eliminar comillas y caracteres especiales ANTES de normalizar
    .replace(/["'`´""'']/g, '') // Elimina todo tipo de comillas
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // Elimina acentos
    .replace(/[^a-z0-9\s-]/g, '') // Solo letras, números, espacios y guiones
    .replace(/\s+/g, '-') // Espacios a guiones
    .replace(/-+/g, '-') // Múltiples guiones a uno solo
    .replace(/^-+|-+$/g, ''); // Elimina guiones al inicio/final
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
  const container = document.getElementById('metodosPagoContainer'); // ✅ Corregido el ID
  if (!container) {
    console.warn('⚠️ #metodosPagoContainer no encontrado');
    return;
  }
  
  // Limpiar solo si tiene contenido dinámico previo
  const existingCheckboxes = container.querySelectorAll('input[type="checkbox"]');
  if (existingCheckboxes.length > 0) {
    // Ya está renderizado desde el HTML, solo actualizar estados
    existingCheckboxes.forEach(checkbox => {
      const isChecked = comercioData.paymentMethods?.includes(checkbox.value) || false;
      checkbox.checked = isChecked;
      const card = checkbox.closest('.payment-method-card');
      if (card) {
        card.classList.toggle('selected', isChecked);
      }
    });
    
    // Agregar listeners
    container.addEventListener('click', (e) => {
      const card = e.target.closest('.payment-method-card');
      if (card) {
        const checkbox = card.querySelector('input[type="checkbox"]');
        if (checkbox && e.target !== checkbox) {
          checkbox.checked = !checkbox.checked;
          card.classList.toggle('selected', checkbox.checked);
          markAsChanged();
          checkFormValidity();
        }
      }
    });
    
    container.addEventListener('change', (e) => {
      if (e.target.type === 'checkbox') {
        const card = e.target.closest('.payment-method-card');
        if (card) {
          card.classList.toggle('selected', e.target.checked);
          markAsChanged();
          checkFormValidity();
        }
      }
    });
  }
  
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
      updateSlugStatus('available', `✓ indiceia.com/${slug}`);
      checkFormValidity();
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
          checkFormValidity();
          return;
        }
      }
    }

    slugDisponible = false;
    comercioSlug = null;
    updateSlugStatus('taken', 'Este nombre ya está en uso. Probá con otro.');
    checkFormValidity();
  } catch (err) {
    console.error('Error validando slug:', err);
    slugDisponible = false;
    comercioSlug = null;
    updateSlugStatus('error', 'Error al validar. Intentá de nuevo.');
    checkFormValidity();
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
    slugInput.disabled = true; // ✅ Deshabilitar si ya existe
    slugInput.classList.add('readonly');
    updateSlugStatus('available', `✓ indiceia.com/${comercioSlug}`);
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
  
  const nombreInput = document.getElementById('nombreComercio');
  const slugInput = document.getElementById('comercioSlug');
  
  if (nombreInput && slugInput) {
    // ✅ SI YA EXISTE SLUG (usuario editando): deshabilitar campo
    if (comercioSlug) {
      slugInput.disabled = true;
      slugInput.classList.add('readonly');
      console.log('✅ Slug existente, campo deshabilitado:', comercioSlug);
    } else {
      // ✅ USUARIO NUEVO: Auto-generar slug mientras escribe el nombre
      console.log('✅ Usuario nuevo, activando auto-generación de slug');
      
      nombreInput.addEventListener('input', () => {
        clearTimeout(slugValidationTimer);
        
        const nombre = nombreInput.value.trim();
        
        // Limpiar estado si el nombre es muy corto
        if (nombre.length < 3) {
          slugInput.value = '';
          updateSlugStatus('empty', 'Mínimo 3 caracteres');
          slugDisponible = false;
          checkFormValidity();
          return;
        }
        
        slugValidationTimer = setTimeout(async () => {
          const newSlug = slugify(nombre);
          slugInput.value = newSlug;
          await validarSlug(newSlug, true); // Con sugerencias
        }, 500);
      });
      
      // Permitir edición manual del slug
      slugInput.addEventListener('input', (e) => {
        clearTimeout(slugValidationTimer);
        
        // Normalizar mientras escribe
        let value = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
        e.target.value = value;
        
        if (value.length < 3) {
          updateSlugStatus('empty', 'Mínimo 3 caracteres');
          slugDisponible = false;
          checkFormValidity();
          return;
        }
        
        slugValidationTimer = setTimeout(async () => {
          await validarSlug(value, false); // Sin sugerencias (edición manual)
        }, 500);
      });
    }
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
  const paymentContainer = document.getElementById('metodosPagoContainer');
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
    updates.paymentMethods = Array.from(document.querySelectorAll('input[name="metodos_pago"]:checked')).map(i => i.value);
    updates['onboardingSteps.mi-comercio'] = true;
    updates.fechaActualizacion = new Date();
    
    // ✅ Solo guardar slug si es nuevo (no existía antes)
    if (!originalData.slug) {
      updates.slug = comercioSlug;
    }
    
    const comercioRef = doc(db, 'comercios', currentComercioId);
    
    // Guardar comercio
    await updateDoc(comercioRef, updates);
    
    // ✅ Crear índice de slug SOLO si es nuevo
    if (!originalData.slug) {
      const slugRef = doc(db, 'landings', comercioSlug);
      await setDoc(slugRef, {
        slug: comercioSlug,
        comercioId: currentComercioId,
        nombre: updates.nombreComercio,
        activo: true,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      console.log('✅ Slug creado en landings:', comercioSlug);
    }
    
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
