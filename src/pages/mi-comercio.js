// src/pages/mi-comercio.js
// ==================== VERSIÓN REFACTORIZADA ====================
// Usa miComercioInit.js - Página especial que CREA el comercio

// ==================== ESTILOS ====================
import '../styles/base.css';
import '../styles/layout.css';
import '../styles/components.css';
import '../styles/forms.css';
import '../styles/forms-premium.css';
import './mi-comercio.css';

// ==================== FIREBASE ====================
import { db } from '../firebase.js';
import { doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';

// ==================== UTILS ====================
import { showToast, showLoading, hideLoading } from '../shared/utils.js';
import { fillProvinciaSelector } from '../shared/provincias.js';

// ==================== SKELETON ESPECIAL ====================
import { runMiComercioPage } from '../shared/miComercioInit.js';

// ==================== SLUG UTILS ====================
function slugify(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/["'`´""'']/g, '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// ==================== DATOS ESTÁTICOS ====================
const CATEGORIAS_COMUNES = [
  "Panadería", "Carnicería", "Verdulería", "Kiosco", "Supermercado", "Restaurante",
  "Cafetería", "Pizzería", "Heladería", "Bar", "Ropa", "Zapatería", "Belleza",
  "Peluquería", "Gimnasio", "Farmacia", "Ferretería", "Librería", "Juguetería",
  "Electrónica", "Mascotas", "Óptica", "Limpieza", "Regalería", "Tienda de deportes"
];

// ==================== ESTADO LOCAL ====================
let comercioData = {};
let selectedCategories = [];
let comercioSlug = null;
let slugDisponible = false;
let slugValidationTimer = null;

// Variables del contexto de inicialización
let isNewComercio = false;
let currentUser = null;
let currentComercioId = null;

// ==================== MÓDULO EXPORTADO ====================
const miComercioModule = {
  // 1️⃣ LOAD - Cargar datos desde Firebase
  async load({ currentComercioId: comercioId, comercioData: comercio, isNewComercio: isNew, currentUser: user }) {
    // Guardar contexto
    currentComercioId = comercioId;
    comercioData = comercio;
    isNewComercio = isNew;
    currentUser = user;

    selectedCategories = comercioData.categories || [];

    // Cargar slug desde landing si existe
    if (comercioData.landing && comercioData.landing.slug) {
      comercioSlug = comercioData.landing.slug;
      slugDisponible = true;
    } else {
      comercioSlug = null;
      slugDisponible = false;
    }

    console.log('✅ Datos del comercio cargados:', { isNewComercio, comercioId });
  },

  // 2️⃣ RENDER - Dibujar UI específica
  render() {
    // Verificar que DOM esté listo
    const form = document.getElementById('miComercioForm');
    if (!form) {
      console.error('❌ DOM no está listo, reintentando...');
      setTimeout(() => this.render(), 100);
      return;
    }

    console.log('🎨 Renderizando UI de mi-comercio...');

    renderCategoriesSection();
    renderPaymentMethods();
    fillForm();
    
    const provinciaEl = document.getElementById('provincia');
    if (provinciaEl) fillProvinciaSelector('Argentina', provinciaEl);

    setupEvents();
    insertAIHelperCard();

    console.log('✅ UI renderizada correctamente');
  },

  // 3️⃣ GET CURRENT DATA - Snapshot para dirty detection
  getCurrentData() {
    const form = document.getElementById('miComercioForm');
    if (!form) return { comercioData: {}, selectedCategories: [] };

    const formData = new FormData(form);
    const updates = {};
    for (let [k, v] of formData) updates[k] = v.trim();

    return {
      comercioData: updates,
      selectedCategories: [...selectedCategories],
      comercioSlug
    };
  },

  // 4️⃣ SAVE - Guardar cambios
  async save() {
    const form = document.getElementById('miComercioForm');
    if (!form) {
      showToast('Error', 'Formulario no encontrado', 'error');
      throw new Error('Formulario no encontrado');
    }

    // Validaciones
    const required = ['nombreComercio', 'provincia', 'ciudad', 'direccion', 'descripcion', 'telefono', 'email'];
    let missing = [];
    required.forEach(id => {
      const el = document.getElementById(id);
      if (!el || !el.value.trim()) missing.push(id);
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
      throw new Error('Validación fallida');
    }

    // Validar slug si es nuevo comercio
    const originalHasLanding = comercioData.landing && comercioData.landing.slug;
    if (!originalHasLanding && (!comercioSlug || !slugDisponible)) {
      showToast('Link público', 'Elegí un nombre disponible para tu link público', 'warning');
      throw new Error('Slug inválido');
    }

    showLoading('Guardando comercio...');

    try {
      const formData = new FormData(form);
      const updates = {};
      for (let [k, v] of formData) updates[k] = v.trim();

      updates.categories = selectedCategories;
      updates.paymentMethods = Array.from(document.querySelectorAll('input[name="metodos_pago"]:checked')).map(i => i.value);

      // Guardar landing dentro del comercio
      if (!originalHasLanding) {
        updates.landing = {
          activo: true,
          nombre: updates.nombreComercio,
          slug: comercioSlug,
          tipo: 'default',
          createdAt: new Date(),
          updatedAt: new Date()
        };
      } else {
        updates.landing = {
          ...comercioData.landing,
          nombre: updates.nombreComercio,
          updatedAt: new Date()
        };
      }

      // ========================================
      // LÓGICA DIFERENCIADA: NUEVO vs EXISTENTE
      // ========================================

      if (isNewComercio) {
        // 🆕 CREAR COMERCIO NUEVO
        console.log('🆕 Creando comercio nuevo...');

        const nuevoComercio = {
          ...updates,
          duenoId: currentUser.uid, // ✅ CAMPO CORRECTO PARA LAS REGLAS
          plan: 'trial',
          fechaCreacion: new Date(),
          fechaActualizacion: new Date(),
          onboardingSteps: {
            'mi-comercio': true
          }
        };

        // Crear documento del comercio
        await setDoc(doc(db, 'comercios', currentComercioId), nuevoComercio);
        console.log('✅ Documento de comercio creado:', currentComercioId);

        // Crear índice en landings
        const landingRef = doc(db, 'landings', comercioSlug);
        await setDoc(landingRef, {
          slug: comercioSlug,
          comercioId: currentComercioId,
          nombre: updates.nombreComercio,
          activo: true,
          createdAt: new Date(),
          updatedAt: new Date()
        });
        console.log('✅ Índice de landing creado:', comercioSlug);

        // 🔑 GUARDAR comercioId EN EL USUARIO
        await updateDoc(doc(db, 'usuarios', currentUser.uid), {
          comercioId: currentComercioId,
          'onboardingSteps.mi-comercio': true
        });
        console.log('✅ comercioId guardado en usuario:', currentComercioId);

      } else {
        // ✏️ ACTUALIZAR COMERCIO EXISTENTE
        console.log('✏️ Actualizando comercio existente...');

        updates['onboardingSteps.mi-comercio'] = true;
        updates.fechaActualizacion = new Date();

        // Actualizar comercio
        await updateDoc(doc(db, 'comercios', currentComercioId), updates);
        console.log('✅ Comercio actualizado');

        // Crear índice en landings SOLO si es nuevo
        if (!originalHasLanding) {
          const landingRef = doc(db, 'landings', comercioSlug);
          await setDoc(landingRef, {
            slug: comercioSlug,
            comercioId: currentComercioId,
            nombre: updates.nombreComercio,
            activo: true,
            createdAt: new Date(),
            updatedAt: new Date()
          });
          console.log('✅ Índice de landing creado:', comercioSlug);
        }
      }

      // Actualizar estado local
      comercioData = { ...comercioData, ...updates };
      
      hideLoading();
      console.log('✅ Guardado completado exitosamente');
      showToast('Comercio guardado correctamente', 'success');
      
      // Esperar a que Firestore propague
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Redirigir para que flow controller decida el siguiente paso
      window.location.href = "/dashboard.html";

    } catch (error) {
      hideLoading();
      console.error('❌ Error guardando:', error);
      showToast('Error', 'No se pudo guardar: ' + error.message, 'error');
      throw error;
    }
  },

  // 5️⃣ VALIDACIÓN - ¿Puede avanzar?
  isFormValid() {
    const form = document.getElementById('miComercioForm');
    if (!form) return false;

    // Validar campos requeridos
    const required = ['nombreComercio', 'provincia', 'ciudad', 'direccion', 'descripcion', 'telefono', 'email'];
    const allFilled = required.every(id => {
      const el = document.getElementById(id);
      return el && el.value.trim();
    });

    if (!allFilled) return false;

    // Validar al menos una red social
    const socialFields = ['website', 'instagram', 'facebook', 'tiktok', 'whatsapp'];
    const hasSocial = socialFields.some(id => {
      const el = document.getElementById(id);
      return el && el.value.trim();
    });

    if (!hasSocial) return false;

    // Validar categorías
    if (selectedCategories.length === 0) return false;

    // Validar slug si es nuevo comercio
    const originalHasLanding = comercioData.landing && comercioData.landing.slug;
    if (!originalHasLanding && !slugDisponible) return false;

    return true;
  }
};

// ==================== UI RENDERING ====================

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
      }
    });
  }

  const addBtn = document.getElementById('addCustomBtn');
  const customInput = document.getElementById('customCatInput');
  if (addBtn && customInput) {
    addBtn.onclick = () => {
      const val = customInput.value.trim();
      if (val && !selectedCategories.includes(val)) {
        selectedCategories.push(val);
        customInput.value = '';
        renderSelectedTags();
      }
    };

    customInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        addBtn.click();
      }
    });
  }
}

function renderSelectedTags() {
  const grid = document.getElementById('selectedTags');
  if (!grid) return;

  // Renderizar las tarjetas de categorías
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
    };
  });

  // 🔥 ACTUALIZAR el mensaje de "Aún no seleccionaste"
  const emptyMsg = document.querySelector('.empty-categories');
  if (emptyMsg) {
    emptyMsg.style.display = selectedCategories.length === 0 ? 'block' : 'none';
  }

  // 🔥 ACTUALIZAR el contador en el título
  const titleH4 = document.querySelector('.selected-categories h4');
  if (titleH4) {
    titleH4.innerHTML = `<i class="fas fa-tags"></i> Categorías seleccionadas (${selectedCategories.length})`;
  }
}
function renderPaymentMethods() {
  const container = document.getElementById('metodosPagoContainer');
  if (!container) {
    console.warn('⚠️ #metodosPagoContainer no encontrado');
    return;
  }

  const checkboxes = container.querySelectorAll('input[type="checkbox"]');
  checkboxes.forEach(checkbox => {
    const isChecked = comercioData.paymentMethods?.includes(checkbox.value) || false;
    checkbox.checked = isChecked;
    const card = checkbox.closest('.payment-method-card');
    if (card) card.classList.toggle('selected', isChecked);
  });

  container.addEventListener('click', (e) => {
    const card = e.target.closest('.payment-method-card');
    if (card && e.target.type !== 'checkbox') {
      const checkbox = card.querySelector('input[type="checkbox"]');
      if (checkbox) {
        checkbox.checked = !checkbox.checked;
        card.classList.toggle('selected', checkbox.checked);
      }
    }
  });

  container.addEventListener('change', (e) => {
    if (e.target.type === 'checkbox') {
      const card = e.target.closest('.payment-method-card');
      if (card) {
        card.classList.toggle('selected', e.target.checked);
      }
    }
  });
}

function fillForm() {
  const form = document.getElementById('miComercioForm');
  if (!form) {
    console.warn('⚠️ #miComercioForm no encontrado');
    return;
  }

  Object.entries(comercioData).forEach(([key, value]) => {
    const field = form.elements[key];
    if (field && value !== undefined && value !== null) field.value = value;
  });

  const slugInput = document.getElementById('comercioSlug');
  if (slugInput) {
    if (comercioSlug) {
      slugInput.value = comercioSlug;
      slugInput.disabled = true;
      slugInput.classList.add('readonly');
      updateSlugStatus('available', `✓ indiceia.com/${comercioSlug}`);
    } else {
      slugInput.value = '';
      slugInput.disabled = false;
      slugInput.classList.remove('readonly');
      updateSlugStatus('empty', 'Elegí un nombre para tu link público');
    }
  }
}

function setupEvents() {
  const nombreInput = document.getElementById('nombreComercio');
  const slugInput = document.getElementById('comercioSlug');

  if (nombreInput && slugInput) {
    if (comercioSlug) {
      // Ya existe landing → bloqueado
      slugInput.disabled = true;
      slugInput.classList.add('readonly');
      console.log('✅ Slug existente, campo deshabilitado:', comercioSlug);
    } else {
      // Comercio nuevo → auto-generar slug
      console.log('✅ Usuario nuevo, activando auto-generación de slug');

      nombreInput.addEventListener('input', () => {
        clearTimeout(slugValidationTimer);
        const nombre = nombreInput.value.trim();

        if (nombre.length < 3) {
          slugInput.value = '';
          updateSlugStatus('empty', 'Mínimo 3 caracteres');
          slugDisponible = false;
          return;
        }

        slugValidationTimer = setTimeout(async () => {
          const newSlug = slugify(nombre);
          slugInput.value = newSlug;
          await validarSlug(newSlug, true);
        }, 500);
      });

      slugInput.addEventListener('input', (e) => {
        clearTimeout(slugValidationTimer);
        let value = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
        e.target.value = value;

        if (value.length < 3) {
          updateSlugStatus('empty', 'Mínimo 3 caracteres');
          slugDisponible = false;
          return;
        }

        slugValidationTimer = setTimeout(async () => {
          await validarSlug(value, false);
        }, 500);
      });
    }
  }
}

// ==================== VALIDACIÓN DE SLUG ====================

async function validarSlug(slug, showSuggestions = false) {
  // Si ya existe landing, no validar más
  if (comercioData.landing && comercioData.landing.slug) {
    return;
  }

  if (!slug || slug.length < 3) {
    updateSlugStatus('empty', 'El nombre debe tener al menos 3 caracteres');
    slugDisponible = false;
    return;
  }

  updateSlugStatus('checking', 'Verificando disponibilidad...');

  try {
    const landingRef = doc(db, 'landings', slug);
    const landingSnap = await getDoc(landingRef);

    // Si no existe o es mío, está disponible
    if (!landingSnap.exists() || landingSnap.data().comercioId === comercioData.id) {
      comercioSlug = slug;
      slugDisponible = true;
      updateSlugStatus('available', `✓ indiceia.com/${slug}`);
      return;
    }

    // Está ocupado - buscar alternativas
    if (showSuggestions) {
      for (let i = 2; i <= 5; i++) {
        const alt = `${slug}-${i}`;
        const altRef = doc(db, 'landings', alt);
        const altSnap = await getDoc(altRef);

        if (!altSnap.exists()) {
          comercioSlug = alt;
          slugDisponible = true;
          updateSlugStatus('suggestion', `Ya existe. Sugerencia: indiceia.com/${alt}`, alt);
          const slugInput = document.getElementById('comercioSlug');
          if (slugInput) slugInput.value = alt;
          return;
        }
      }
    }

    slugDisponible = false;
    comercioSlug = null;
    updateSlugStatus('taken', 'Este nombre ya está en uso. Probá con otro.');

  } catch (err) {
    console.error('Error validando slug:', err);
    slugDisponible = false;
    comercioSlug = null;
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

// ==================== BOOT ====================
runMiComercioPage(miComercioModule);
