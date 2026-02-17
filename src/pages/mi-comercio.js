// ============================================================
// src/pages/mi-comercio/mi-comercio.js
// ============================================================
// 🧠 CONTRATO ctx:
//   ctx.user.uid           → uid del usuario autenticado
//   ctx.userData           → doc /usuarios/{uid}
//   ctx.comercioData       → doc /comercios/{id} (puede ser null si es nuevo)
//   ctx.comercioId         → ID del comercio
// ============================================================

// ==================== SKELETON CORE ====================
import { runLifecycle }          from '/src/skeleton/lifecycle.js';
import { createFirebaseAdapter } from '/src/skeleton/adapters/firebaseAdapter.js';
import { mountLayout }           from '/src/skeleton/layout/index.js';

// ==================== FIREBASE ====================
import { doc, getDoc, setDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '/src/services/firebase/firebase.js';

// ==================== FLOW ====================
import { runFlowController } from '/src/controllers/flowController.js';

// ==================== COMPONENTES ====================
import { createFormField }       from '/src/skeleton/components/form-field/index.js';
import { createButton }          from '/src/skeleton/components/button/index.js';
import { createCard }            from '/src/skeleton/components/card/index.js';
import { createCategorySelector } from '/src/skeleton/components/category-selector/index.js';
import { showToast }             from '/src/skeleton/components/toast/index.js';

// ==================== SHARED ====================
import { fillProvinciaSelector } from '/src/shared/provincias.js';

import './mi-comercio.css';

// ==================== DATOS ESTÁTICOS ====================
const CATEGORIAS_COMUNES = [
  "Panadería", "Carnicería", "Verdulería", "Kiosco", "Supermercado", "Restaurante",
  "Cafetería", "Pizzería", "Heladería", "Bar", "Ropa", "Zapatería", "Belleza",
  "Peluquería", "Gimnasio", "Farmacia", "Ferretería", "Librería", "Juguetería",
  "Electrónica", "Mascotas", "Óptica", "Limpieza", "Regalería", "Tienda de deportes"
];

const METODOS_PAGO = [
  { id: 'efectivo', nombre: 'Efectivo', icon: 'fa-money-bill' },
  { id: 'tarjeta_debito', nombre: 'Tarjeta Débito', icon: 'fa-credit-card' },
  { id: 'tarjeta_credito', nombre: 'Tarjeta Crédito', icon: 'fa-credit-card' },
  { id: 'transferencia', nombre: 'Transferencia', icon: 'fa-exchange-alt' },
  { id: 'mercadopago', nombre: 'Mercado Pago', icon: 'fa-wallet' },
  { id: 'qr', nombre: 'QR', icon: 'fa-qrcode' }
];

// ==================== HELPERS ====================
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

// ==================== ADAPTER ====================
const adapter = (options) => createFirebaseAdapter(options);

// ==================== LIFECYCLE ====================
runLifecycle({
  adapter,
  options: {
    loadingMessage: 'Cargando datos del comercio...',
  },

  async onReady(ctx) {
    // 1️⃣ FLOW
    await runFlowController(ctx.user.uid);

    // 2️⃣ LAYOUT
    mountLayout(ctx);

    // 3️⃣ LOAD
    const state = await load(ctx);

    // 4️⃣ RENDER
    render(ctx, state);
  }
});

// ============================================================
// LOAD — solo datos, sin tocar el DOM
// ============================================================
async function load(ctx) {
  const isNewComercio = !ctx.comercioData || !ctx.comercioData.nombreComercio;
  const comercioData = ctx.comercioData || {};

  // Slug actual
  const comercioSlug = comercioData.landing?.slug || null;
  const slugDisponible = !!comercioSlug;

  // Métodos de pago seleccionados
  const selectedPaymentMethods = comercioData.paymentMethods || [];

  return {
    isNewComercio,
    comercioData,
    comercioSlug,
    slugDisponible,
    selectedPaymentMethods,
  };
}

// ============================================================
// RENDER — solo DOM, sin lógica de negocio
// ============================================================
function render(ctx, state) {
  const page = document.getElementById('skeleton-page');
  page.innerHTML = '';

  // Referencias a componentes (closures compartidas)
  const refs = {
    fields: {},
    categorySelector: null,
    paymentCards: [],
    slugInput: null,
    slugStatus: null,
    guardarBtn: null,
    slugValidationTimer: null,
  };

  // Estado mutable local (solo UI)
  const uiState = {
    comercioSlug: state.comercioSlug,
    slugDisponible: state.slugDisponible,
    selectedPaymentMethods: [...state.selectedPaymentMethods],
  };

  // ==================== TÍTULO ====================
  const title = document.createElement('h2');
  title.textContent = state.isNewComercio ? 'Crear Mi Comercio' : 'Editar Mi Comercio';
  title.className = 'page-title';
  page.appendChild(title);

  // ==================== SECCIONES ====================
  page.appendChild(renderSeccionBasicos(state, refs, uiState));
  page.appendChild(renderSeccionUbicacion(state, refs));
  page.appendChild(renderSeccionContacto(state, refs));
  page.appendChild(renderSeccionRedes(state, refs));
  page.appendChild(renderSeccionCategorias(state, refs));
  page.appendChild(renderSeccionPagos(state, refs, uiState));

  // Solo mostrar slug si es nuevo o no tiene
  if (!state.comercioData.landing?.slug) {
    page.appendChild(renderSeccionSlug(state, refs, uiState));
  }

  // ==================== BOTÓN GUARDAR ====================
  refs.guardarBtn = createButton({
    label: 'Guardar Comercio',
    icon: 'fa-save',
    variant: 'success',
    size: 'lg',
    block: true,
    onClick: () => handleGuardar(ctx, state, refs, uiState)
  });

  const btnContainer = document.createElement('div');
  btnContainer.className = 'btn-container';
  btnContainer.appendChild(refs.guardarBtn);
  page.appendChild(btnContainer);

  // Validar formulario inicial
  validateForm(state, refs, uiState);
}

// ============================================================
// SECCIONES
// ============================================================
function renderSeccionBasicos(state, refs, uiState) {
  const section = document.createElement('div');
  section.className = 'form-section';

  const h3 = document.createElement('h3');
  h3.textContent = 'Datos Básicos';
  section.appendChild(h3);

  refs.fields.nombreComercio = createFormField({
    label: 'Nombre del Comercio',
    name: 'nombreComercio',
    required: true,
    value: state.comercioData.nombreComercio || ''
  });

  refs.fields.descripcion = createFormField({
    label: 'Descripción',
    name: 'descripcion',
    type: 'textarea',
    required: true,
    placeholder: 'Contanos sobre tu comercio...',
    value: state.comercioData.descripcion || ''
  });

  section.append(refs.fields.nombreComercio, refs.fields.descripcion);

  // Auto-generar slug desde nombre (solo para nuevos)
  if (!uiState.comercioSlug) {
    refs.fields.nombreComercio.input.addEventListener('input', () => {
      clearTimeout(refs.slugValidationTimer);
      const nombre = refs.fields.nombreComercio.input.value.trim();

      if (nombre.length >= 3 && refs.slugInput) {
        refs.slugValidationTimer = setTimeout(async () => {
          const newSlug = slugify(nombre);
          refs.slugInput.value = newSlug;
          await validarSlug(newSlug, refs, uiState, true);
        }, 500);
      }
    });
  }

  // Validación
  [refs.fields.nombreComercio, refs.fields.descripcion].forEach(field => {
    field.input.addEventListener('input', () => validateForm(state, refs, uiState));
  });

  return section;
}

function renderSeccionUbicacion(state, refs) {
  const section = document.createElement('div');
  section.className = 'form-section';

  const h3 = document.createElement('h3');
  h3.textContent = 'Ubicación';
  section.appendChild(h3);

  refs.fields.pais = createFormField({
    label: 'País',
    name: 'pais',
    value: 'Argentina',
    disabled: true
  });

  refs.fields.provincia = createFormField({
    label: 'Provincia',
    name: 'provincia',
    type: 'select',
    required: true
  });

  refs.fields.ciudad = createFormField({
    label: 'Ciudad',
    name: 'ciudad',
    required: true,
    value: state.comercioData.ciudad || ''
  });

  refs.fields.direccion = createFormField({
    label: 'Dirección',
    name: 'direccion',
    required: true,
    value: state.comercioData.direccion || ''
  });

  section.append(refs.fields.pais, refs.fields.provincia, refs.fields.ciudad, refs.fields.direccion);

  // ✅ FIX: orden correcto de parámetros
  fillProvinciaSelector('Argentina', refs.fields.provincia.input);

  // ✅ Pre-seleccionar la provincia guardada en Firestore
  const provinciaSaved = state.comercioData.provincia || null;
  if (provinciaSaved) {
    refs.fields.provincia.input.value = provinciaSaved;
    console.log('✅ Provincia cargada desde DB:', provinciaSaved);
    console.log('✅ Valor actual del select:', refs.fields.provincia.input.value);
  } else {
    console.log('ℹ️ No hay provincia guardada en DB, select vacío');
  }

  // Validación
  [refs.fields.provincia, refs.fields.ciudad, refs.fields.direccion].forEach(field => {
    field.input.addEventListener('input', () => validateForm(state, refs, uiState));
  });

  return section;
}


function renderSeccionContacto(state, refs) {
  const section = document.createElement('div');
  section.className = 'form-section';

  const h3 = document.createElement('h3');
  h3.textContent = 'Contacto';
  section.appendChild(h3);

  refs.fields.telefono = createFormField({
    label: 'Teléfono',
    name: 'telefono',
    type: 'tel',
    required: true,
    placeholder: '+54 9 11 1234-5678',
    value: state.comercioData.telefono || ''
  });

  refs.fields.email = createFormField({
    label: 'Email',
    name: 'email',
    type: 'email',
    required: true,
    placeholder: 'contacto@ejemplo.com',
    value: state.comercioData.email || ''
  });

  section.append(refs.fields.telefono, refs.fields.email);

  [refs.fields.telefono, refs.fields.email].forEach(field => {
    field.input.addEventListener('input', () => validateForm(state, refs, uiState));
  });

  return section;
}

function renderSeccionRedes(state, refs) {
  const section = document.createElement('div');
  section.className = 'form-section';

  const h3 = document.createElement('h3');
  h3.textContent = 'Redes Sociales';
  section.appendChild(h3);

  const help = document.createElement('p');
  help.className = 'form-help';
  help.textContent = 'Al menos una red social es obligatoria';
  section.appendChild(help);

  refs.fields.website = createFormField({
    label: 'Sitio Web',
    name: 'website',
    type: 'url',
    placeholder: 'https://...',
    value: state.comercioData.website || ''
  });

  refs.fields.instagram = createFormField({
    label: 'Instagram',
    name: 'instagram',
    placeholder: '@usuario',
    value: state.comercioData.instagram || ''
  });

  refs.fields.facebook = createFormField({
    label: 'Facebook',
    name: 'facebook',
    placeholder: 'facebook.com/usuario',
    value: state.comercioData.facebook || ''
  });

  refs.fields.whatsapp = createFormField({
    label: 'WhatsApp',
    name: 'whatsapp',
    type: 'tel',
    placeholder: '+54 9 11 1234-5678',
    value: state.comercioData.whatsapp || ''
  });

  section.append(refs.fields.website, refs.fields.instagram, refs.fields.facebook, refs.fields.whatsapp);

  [refs.fields.website, refs.fields.instagram, refs.fields.facebook, refs.fields.whatsapp].forEach(field => {
    field.input.addEventListener('input', () => validateForm(state, refs, uiState));
  });

  return section;
}

function renderSeccionCategorias(state, refs) {
  const section = document.createElement('div');
  section.className = 'form-section';

  const h3 = document.createElement('h3');
  h3.textContent = 'Categorías';
  section.appendChild(h3);

  refs.categorySelector = createCategorySelector({
    categories: CATEGORIAS_COMUNES,
    selected: state.comercioData.categories || [],
    onChange: () => validateForm(state, refs, uiState)
  });

  section.appendChild(refs.categorySelector);
  return section;
}

function renderSeccionPagos(state, refs, uiState) {
  const section = document.createElement('div');
  section.className = 'form-section';

  const h3 = document.createElement('h3');
  h3.textContent = 'Métodos de Pago';
  section.appendChild(h3);

  const grid = document.createElement('div');
  grid.className = 'payment-grid';
  section.appendChild(grid);

  METODOS_PAGO.forEach(metodo => {
    const isSelected = uiState.selectedPaymentMethods.includes(metodo.id);

    const card = createCard({
      title: metodo.nombre,
      icon: metodo.icon,
      variant: 'info',
      selectable: true,
      selected: isSelected,
      clickable: true,
      compact: true,
      onClick: () => {
        card.toggle();
        const selected = card.isSelected();
        if (selected) {
          if (!uiState.selectedPaymentMethods.includes(metodo.id)) {
            uiState.selectedPaymentMethods.push(metodo.id);
          }
        } else {
          uiState.selectedPaymentMethods = uiState.selectedPaymentMethods.filter(id => id !== metodo.id);
        }
        validateForm(state, refs, uiState);
      }
    });

    refs.paymentCards.push(card);
    grid.appendChild(card);
  });

  return section;
}

function renderSeccionSlug(state, refs, uiState) {
  const section = document.createElement('div');
  section.className = 'form-section';

  const h3 = document.createElement('h3');
  h3.textContent = 'Link Público';
  section.appendChild(h3);

  const help = document.createElement('p');
  help.className = 'form-help';
  help.textContent = 'Este será tu link público: indiceia.com/tu-comercio';
  section.appendChild(help);

  const slugContainer = document.createElement('div');
  slugContainer.className = 'slug-container';

  const slugPrefix = document.createElement('span');
  slugPrefix.className = 'slug-prefix';
  slugPrefix.textContent = 'indiceia.com/';

  refs.slugInput = document.createElement('input');
  refs.slugInput.type = 'text';
  refs.slugInput.className = 'slug-input';
  refs.slugInput.placeholder = 'mi-comercio';
  refs.slugInput.value = uiState.comercioSlug || '';

  slugContainer.append(slugPrefix, refs.slugInput);
  section.appendChild(slugContainer);

  refs.slugStatus = document.createElement('div');
  refs.slugStatus.className = 'slug-status';
  refs.slugStatus.innerHTML = `
    <span class="slug-icon"></span>
    <span class="slug-text"></span>
  `;
  section.appendChild(refs.slugStatus);

  // Validación al escribir
  refs.slugInput.addEventListener('input', () => {
    clearTimeout(refs.slugValidationTimer);
    const slug = refs.slugInput.value.trim();

    if (slug.length < 3) {
      updateSlugStatus(refs, 'empty', '');
      uiState.slugDisponible = false;
      uiState.comercioSlug = null;
      validateForm(state, refs, uiState);
      return;
    }

    updateSlugStatus(refs, 'checking', 'Verificando disponibilidad...');
    refs.slugValidationTimer = setTimeout(() => validarSlug(slug, refs, uiState, false), 800);
  });

  return section;
}

// ============================================================
// VALIDACIÓN SLUG
// ============================================================
async function validarSlug(slug, refs, uiState, autoGenerated) {
  if (!slug || slug.length < 3) {
    updateSlugStatus(refs, 'empty', '');
    uiState.slugDisponible = false;
    uiState.comercioSlug = null;
    validateForm(null, refs, uiState);
    return;
  }

  try {
    const landingSnap = await getDoc(doc(db, 'landings', slug));

    if (!landingSnap.exists()) {
      uiState.comercioSlug = slug;
      uiState.slugDisponible = true;
      updateSlugStatus(refs, 'available', `✓ Disponible: indiceia.com/${slug}`);
      validateForm(null, refs, uiState);
      return;
    }

    // Ya existe
    if (autoGenerated) {
      // Sugerir alternativas
      for (let i = 1; i <= 3; i++) {
        const alt = `${slug}-${i}`;
        const altSnap = await getDoc(doc(db, 'landings', alt));
        if (!altSnap.exists()) {
          uiState.comercioSlug = alt;
          uiState.slugDisponible = true;
          updateSlugStatus(refs, 'suggestion', `Ya existe. Sugerencia: indiceia.com/${alt}`);
          refs.slugInput.value = alt;
          validateForm(null, refs, uiState);
          return;
        }
      }
    }

    uiState.slugDisponible = false;
    uiState.comercioSlug = null;
    updateSlugStatus(refs, 'taken', 'Este nombre ya está en uso. Probá con otro.');
    validateForm(null, refs, uiState);

  } catch (err) {
    console.error('Error validando slug:', err);
    uiState.slugDisponible = false;
    uiState.comercioSlug = null;
    updateSlugStatus(refs, 'error', 'Error al validar. Intentá de nuevo.');
    validateForm(null, refs, uiState);
  }
}

function updateSlugStatus(refs, status, message) {
  if (!refs.slugStatus) return;

  const icon = refs.slugStatus.querySelector('.slug-icon');
  const text = refs.slugStatus.querySelector('.slug-text');

  const icons = {
    checking: '<i class="fas fa-spinner fa-spin"></i>',
    available: '<i class="fas fa-check-circle" style="color: var(--s-success)"></i>',
    suggestion: '<i class="fas fa-info-circle" style="color: var(--s-info)"></i>',
    taken: '<i class="fas fa-times-circle" style="color: var(--s-danger)"></i>',
    error: '<i class="fas fa-exclamation-triangle" style="color: var(--s-warning)"></i>',
    empty: ''
  };

  icon.innerHTML = icons[status] || '';
  text.textContent = message;
}

// ============================================================
// VALIDACIÓN FORMULARIO
// ============================================================
function validateForm(state, refs, uiState) {
  const camposBasicosValidos =
    refs.fields.nombreComercio?.input.value.trim() &&
    refs.fields.descripcion?.input.value.trim() &&
    refs.fields.provincia?.input.value.trim() &&
    refs.fields.ciudad?.input.value.trim() &&
    refs.fields.direccion?.input.value.trim() &&
    refs.fields.telefono?.input.value.trim() &&
    refs.fields.email?.input.value.trim();

  const tieneRedSocial =
    refs.fields.website?.input.value.trim() ||
    refs.fields.instagram?.input.value.trim() ||
    refs.fields.facebook?.input.value.trim() ||
    refs.fields.whatsapp?.input.value.trim();

  const tieneCategorias = refs.categorySelector?.getSelected().length > 0;

  const originalHasLanding = state?.comercioData?.landing?.slug;
  const slugValido = originalHasLanding || uiState.slugDisponible;

  const formularioValido =
    camposBasicosValidos &&
    tieneRedSocial &&
    tieneCategorias &&
    slugValido;

  if (refs.guardarBtn) {
    formularioValido ? refs.guardarBtn.enable() : refs.guardarBtn.disable();
  }

  return formularioValido;
}

// ============================================================
// GUARDAR
// ============================================================
async function handleGuardar(ctx, state, refs, uiState) {
  if (!validateForm(state, refs, uiState)) {
    showToast('Completá todos los campos requeridos', 'warning');
    return;
  }

  refs.guardarBtn.setLoading(true);

  try {
    const updates = {
      nombreComercio: refs.fields.nombreComercio.input.value.trim(),
      descripcion: refs.fields.descripcion.input.value.trim(),
      pais: 'Argentina',
      provincia: refs.fields.provincia.input.value.trim(),
      ciudad: refs.fields.ciudad.input.value.trim(),
      direccion: refs.fields.direccion.input.value.trim(),
      telefono: refs.fields.telefono.input.value.trim(),
      email: refs.fields.email.input.value.trim(),
      website: refs.fields.website.input.value.trim() || null,
      instagram: refs.fields.instagram.input.value.trim() || null,
      facebook: refs.fields.facebook.input.value.trim() || null,
      whatsapp: refs.fields.whatsapp.input.value.trim() || null,
      categories: refs.categorySelector.getSelected(),
      paymentMethods: uiState.selectedPaymentMethods
    };

    const originalHasLanding = state.comercioData.landing?.slug;

    // Landing
    if (!originalHasLanding) {
      updates.landing = {
        activo: true,
        nombre: updates.nombreComercio,
        slug: uiState.comercioSlug,
        tipo: 'default',
        createdAt: new Date(),
        updatedAt: new Date()
      };
    } else {
      updates.landing = {
        ...state.comercioData.landing,
        nombre: updates.nombreComercio,
        updatedAt: new Date()
      };
    }

    // ==================== CREAR vs ACTUALIZAR ====================
    if (state.isNewComercio) {
      console.log('🆕 Creando comercio nuevo...');

      const nuevoComercio = {
        ...updates,
        duenoId: ctx.user.uid,
        fechaCreacion: new Date(),
        fechaActualizacion: new Date(),
        onboardingSteps: {
          'mi-comercio': true
        }
      };

      await setDoc(doc(db, 'comercios', ctx.comercioId), nuevoComercio);

      // PLAN TRIAL 30 DÍAS
      const now = Timestamp.now();
      const expiresAt = Timestamp.fromDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));

      await updateDoc(doc(db, 'comercios', ctx.comercioId), {
        plan: {
          type: 'trial',
          active: true,
          trial: true,
          startedAt: now,
          expiresAt: expiresAt,
          createdAt: now,
          updatedAt: now,
          source: 'system'
        },
        fechaActualizacion: new Date()
      });

      // Crear índice landing
      await setDoc(doc(db, 'landings', uiState.comercioSlug), {
        slug: uiState.comercioSlug,
        comercioId: ctx.comercioId,
        nombre: updates.nombreComercio,
        activo: true,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      // Guardar comercioId en usuario
      await updateDoc(doc(db, 'usuarios', ctx.user.uid), {
        comercioId: ctx.comercioId,
        'onboardingSteps.mi-comercio': true
      });

    } else {
      console.log('✏️ Actualizando comercio existente...');

      updates['onboardingSteps.mi-comercio'] = true;
      updates.fechaActualizacion = new Date();

      await updateDoc(doc(db, 'comercios', ctx.comercioId), updates);

      // Crear landing si no existía
      if (!originalHasLanding) {
        await setDoc(doc(db, 'landings', uiState.comercioSlug), {
          slug: uiState.comercioSlug,
          comercioId: ctx.comercioId,
          nombre: updates.nombreComercio,
          activo: true,
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }
    }

    showToast('Comercio guardado correctamente', 'success');
    await new Promise(resolve => setTimeout(resolve, 500));
    window.location.href = '/src/pages/dashboard/dashboard.html';

  } catch (error) {
    console.error('❌ Error guardando:', error);
    showToast('Error al guardar: ' + error.message, 'error');
  } finally {
    refs.guardarBtn.setLoading(false);
  }
}
