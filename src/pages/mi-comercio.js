// ============================================================
// src/pages/mi-comercio.js
// ============================================================
// ==================== SKELETON CORE ====================
import { runLifecycle }            from '/src/skeleton/lifecycle.js';
import { createFirebaseAdapter }   from '/src/skeleton/adapters/firebaseAdapter.js';
import { mountLayout }             from '/src/skeleton/layout/index.js';
// NOTA: Ya no necesitamos importar mountCiudadAutocomplete aquí para renderizar,
// pero lo dejamos si se usa en otro lado, o podemos eliminarlo si update.js lo maneja todo.
// import { mountCiudadAutocomplete } from '/src/shared/ciudades.js'; 

// ==================== FIREBASE ====================
import { doc, getDoc, setDoc, updateDoc, collection, Timestamp } from 'firebase/firestore';
import { db } from '/src/services/firebase/firebase.js';

// ==================== FLOW ====================
import { runFlowController } from '/src/controllers/flowController.js';

// ==================== COMPONENTES ====================
import { createFormField }        from '/src/skeleton/components/form-field/index.js';
import { createCard }             from '/src/skeleton/components/card/index.js';
import { createCategorySelector } from '/src/skeleton/components/category-selector/index.js';
import { createOnboardingButton } from '/src/skeleton/components/onboarding-button/index.js';
import { showToast }              from '/src/skeleton/components/toast/index.js';

// ==================== SHARED ====================
import { fillProvinciaSelector } from '/src/shared/provincias.js';
import { ubicacionFromForm, rubroFromForm } from '/src/shared/entity-context.js';
import { createInitialPlan } from '/src/shared/createInitialPlan.js';
import './mi-comercio.css';

// ==================== DATOS ESTÁTICOS ====================
const CATEGORIAS_COMUNES = [
 "Panadería ",  "Carnicería ",  "Verdulería ",  "Kiosco ",  "Supermercado ",  "Restaurante ",
 "Cafetería ",  "Pizzería ",  "Heladería ",  "Bar ",  "Ropa ",  "Zapatería ",  "Belleza ",
 "Peluquería ",  "Gimnasio ",  "Farmacia ",  "Ferretería ",  "Librería ",  "Juguetería ",
 "Electrónica ",  "Mascotas ",  "Óptica ",  "Limpieza ",  "Regalería ",  "Tienda de deportes "
];

const METODOS_PAGO = [
{ id: 'efectivo',        nombre: 'Efectivo',        icon: 'fa-money-bill'   },
{ id: 'tarjeta_debito',  nombre: 'Tarjeta Débito',  icon: 'fa-credit-card'  },
{ id: 'tarjeta_credito', nombre: 'Tarjeta Crédito', icon: 'fa-credit-card'  },
{ id: 'transferencia',   nombre: 'Transferencia',   icon: 'fa-exchange-alt' },
{ id: 'mercadopago',     nombre: 'Mercado Pago',    icon: 'fa-wallet'       },
{ id: 'qr',              nombre: 'QR',              icon: 'fa-qrcode'       }
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
    await runFlowController(ctx.user.uid);
    mountLayout(ctx);
    const state = await load(ctx);
    render(ctx, state);
  }
});

// ============================================================
// LOAD
// ============================================================
async function load(ctx) {
  const isEditMode             = window.isEditMode === true;
  const comercioData           = ctx.comercioData || {};
  const isNewComercio          = !comercioData.nombre;
  const comercioSlug           = comercioData.landing?.slug || null;
  const slugDisponible         = !!comercioSlug;
  const selectedPaymentMethods = comercioData.paymentMethods || [];
  const tieneLocalFisico       = comercioData.tieneLocalFisico !== false;

  return { isEditMode, isNewComercio, comercioData, comercioSlug, slugDisponible, selectedPaymentMethods, tieneLocalFisico };
}

// ============================================================
// RENDER
// ============================================================
function render(ctx, state) {
  const page = document.getElementById('skeleton-page');
  page.innerHTML = '';

  const refs = {
    fields:              {},
    categorySelector:    null,
    paymentCards:        [],
    slugInput:           null,
    slugStatus:          null,
    slugValidationTimer: null,
    localidadSeleccionada: null,
  };

  const uiState = {
    comercioSlug:           state.comercioSlug,
    slugDisponible:         state.slugDisponible,
    selectedPaymentMethods: [...state.selectedPaymentMethods],
    tieneLocalFisico:       state.tieneLocalFisico,
  };

  const title = document.createElement('h2');
  title.textContent = state.isNewComercio ? 'Crear Mi Comercio' : 'Editar Mi Comercio';
  title.className   = 'page-title';
  page.appendChild(title);

  page.appendChild(renderSeccionBasicos(state, refs, uiState));
  page.appendChild(renderSeccionUbicacion(state, refs, uiState));
  page.appendChild(renderSeccionContacto(state, refs, uiState));
  page.appendChild(renderSeccionRedes(state, refs, uiState));
  page.appendChild(renderSeccionCategorias(state, refs, uiState));
  page.appendChild(renderSeccionPagos(state, refs, uiState));
  page.appendChild(renderBotonGuardar(ctx, state, refs, uiState));
}

// ============================================================
// SECCIONES
// ============================================================
function renderSeccionBasicos(state, refs, uiState) {
  const section   = crearSeccion('Datos Básicos');
  const tieneSlug = !!state.comercioData.landing?.slug;

  refs.fields.nombre = createFormField({
    label: 'Nombre del Comercio', name: 'nombre', required: true,
    value: state.comercioData.nombre || ''
  });
  section.appendChild(refs.fields.nombre);

  section.appendChild(
    tieneSlug
      ? renderSlugReadonly(state.comercioData.landing.slug)
      : renderSlugEditable(refs, uiState)
  );

  refs.fields.descripcion = createFormField({
    label: 'Descripción', name: 'descripcion', type: 'textarea', required: true,
    placeholder: 'Contanos sobre tu comercio...',
    value: state.comercioData.descripcion || ''
  });
  section.appendChild(refs.fields.descripcion);

  agregarListeners([refs.fields.nombre, refs.fields.descripcion], refs, uiState);
  return section;
}

function renderSlugEditable(refs, uiState) {
  const wrapper = document.createElement('div');
  wrapper.className = 'slug-field-wrapper';

  const warning = document.createElement('p');
  warning.className   = 'form-help form-help--warning';
  warning.textContent = '⚠️ Tu link público. Elegilo con cuidado — una vez guardado no se puede cambiar.';
  wrapper.appendChild(warning);

  const slugContainer = document.createElement('div');
  slugContainer.className = 'slug-container';

  const slugPrefix = document.createElement('span');
  slugPrefix.className   = 'slug-prefix';
  slugPrefix.textContent = 'indiceia.com/';

  refs.slugInput = document.createElement('input');
  refs.slugInput.type        = 'text';
  refs.slugInput.className   = 'slug-input';
  refs.slugInput.placeholder = 'mi-comercio';
  refs.slugInput.value       = uiState.comercioSlug || '';

  slugContainer.append(slugPrefix, refs.slugInput);
  wrapper.appendChild(slugContainer);

  refs.slugStatus = document.createElement('div');
  refs.slugStatus.className = 'slug-status';
  refs.slugStatus.innerHTML = `<span class="slug-icon"></span><span class="slug-text"></span>`;
  wrapper.appendChild(refs.slugStatus);

  refs.slugInput.addEventListener('input', () => {
    clearTimeout(refs.slugValidationTimer);
    const slug = refs.slugInput.value.trim();
    if (slug.length < 3) {
      updateSlugStatus(refs, 'empty', '');
      uiState.slugDisponible = false;
      uiState.comercioSlug   = null;
      document.dispatchEvent(new Event('change'));
      return;
    }
    updateSlugStatus(refs, 'checking', 'Verificando disponibilidad...');
    refs.slugValidationTimer = setTimeout(() => validarSlug(slug, refs, uiState, false), 800);
  });

  setTimeout(() => {
    const nombreInput = refs.fields.nombre?.input;
    if (!nombreInput) return;
    nombreInput.addEventListener('input', () => {
      clearTimeout(refs.slugValidationTimer);
      const valor = nombreInput.value.trim();
      if (valor.length >= 3 && refs.slugInput) {
        refs.slugValidationTimer = setTimeout(async () => {
          const newSlug = slugify(valor);
          refs.slugInput.value = newSlug;
          await validarSlug(newSlug, refs, uiState, true);
        }, 500);
      }
    });
  }, 0);

  return wrapper;
}

function renderSlugReadonly(slug) {
  const wrapper = document.createElement('div');
  wrapper.className = 'slug-field-wrapper';

  const display = document.createElement('div');
  display.className = 'slug-readonly';

  const prefix = document.createElement('span');
  prefix.className   = 'slug-prefix';
  prefix.textContent = 'indiceia.com/';

  const value = document.createElement('span');
  value.className   = 'slug-value';
  value.textContent = slug;

  const lock = document.createElement('span');
  lock.className = 'slug-lock';
  lock.innerHTML = '<i class="fas fa-lock"></i>';

  display.append(prefix, value, lock);

  const note = document.createElement('p');
  note.className   = 'form-help';
  note.textContent = 'Este es tu link permanente. No se puede modificar.';

  wrapper.append(display, note);
  return wrapper;
}

// ------------------------------------------------------------
// UBICACIÓN
// ------------------------------------------------------------
function renderSeccionUbicacion(state, refs, uiState) {
  const section = crearSeccion('Ubicación');

  const localFisicoContainer = document.createElement('div');
  localFisicoContainer.className = 'form-field';
  
  const toggleWrapper = document.createElement('div');
  toggleWrapper.className = 'toggle-wrapper';
  
  const checkbox = document.createElement('input');
  checkbox.type    = 'checkbox';
  checkbox.id      = 'tieneLocalFisico';
  checkbox.checked = uiState.tieneLocalFisico;
  
  const label = document.createElement('label');
  label.htmlFor = 'tieneLocalFisico';
  label.innerHTML = `<span class="toggle-label">¿Tenés local físico?</span> <span class="toggle-helper">Marcá si atendés clientes en un local</span>`;
  
  checkbox.addEventListener('change', (e) => {
    uiState.tieneLocalFisico = e.target.checked;
    document.dispatchEvent(new Event('change'));
  });
  
  toggleWrapper.append(checkbox, label);
  localFisicoContainer.appendChild(toggleWrapper);
  section.appendChild(localFisicoContainer);

  refs.fields.pais = createFormField({
    label: 'País', name: 'pais', value: 'Argentina', disabled: true
  });
  section.appendChild(refs.fields.pais);

  refs.fields.provincia = createFormField({
    label: 'Provincia', name: 'provincia', type: 'select', required: true
  });
  fillProvinciaSelector('Argentina', refs.fields.provincia.input);

  const provinciaActual = state.comercioData.ubicacion?.provincia
    || state.comercioData.localidad?.provincia
    || state.comercioData.provincia
    || '';

  if (provinciaActual) refs.fields.provincia.input.value = provinciaActual;
  section.appendChild(refs.fields.provincia);

  // --- CAMPO CIUDAD CON AUTOCOMPLETE INTEGRADO ---
  const localidadActual = state.comercioData.ubicacion?.localidad
    || state.comercioData.localidad
    || state.comercioData.ciudad
    || '';

  // Función helper para crear/actualizar el campo ciudad
  const crearCampoCiudad = (provincia, valorInicial) => {
    // Si ya existe, lo removemos para recrearlo limpio con la nueva provincia
    if (refs.fields.ciudad) {
      refs.fields.ciudad.remove();
    }

    refs.fields.ciudad = createFormField({
      label: 'Ciudad',
      name: 'ciudad',
      type: 'autocomplete',       // ← Tipo especial del Skeleton
      required: true,
      provincia: provincia,       // ← Pasa la provincia para filtrar
      value: valorInicial,        // ← Soporta string u objeto {id, nombre}
      placeholder: provincia ? 'Buscá tu localidad...' : 'Primero elegí una provincia',
      onChange: (localidadObj) => {
        refs.localidadSeleccionada = localidadObj;
        document.dispatchEvent(new Event('change'));
      }
    });
    
    // Insertamos antes de Dirección
    section.insertBefore(refs.fields.ciudad, refs.fields.direccion);
  };

  // Inicializar ciudad si hay provincia
  if (provinciaActual) {
    crearCampoCiudad(provinciaActual, localidadActual);
  } else {
    // Crear campo deshabilitado hasta elegir provincia
    crearCampoCiudad(null, '');
  }

  // Listener para cuando cambia la provincia
  refs.fields.provincia.input.addEventListener('change', (e) => {
    const nuevaProvincia = e.target.value;
    refs.localidadSeleccionada = null;
    
    // Recrear el campo ciudad con la nueva provincia
    crearCampoCiudad(nuevaProvincia, '');
    
    document.dispatchEvent(new Event('change'));
  });

  refs.fields.direccion = createFormField({
    label: 'Dirección', name: 'direccion', required: true,
    value: state.comercioData.direccion || ''
  });
  refs.fields.direccion.input.addEventListener('input', () => {
    document.dispatchEvent(new Event('change'));
  });
  section.appendChild(refs.fields.direccion);

  return section;
}

// ------------------------------------------------------------
// CONTACTO
// ------------------------------------------------------------
function renderSeccionContacto(state, refs, uiState) {
  const section = crearSeccion('Contacto');

  refs.fields.telefono = createFormField({
    label: 'Teléfono', name: 'telefono', type: 'tel', required: true,
    placeholder: '+54 9 11 1234-5678', value: state.comercioData.telefono || ''
  });
  refs.fields.email = createFormField({
    label: 'Email', name: 'email', type: 'email', required: true,
    placeholder: 'contacto@ejemplo.com', value: state.comercioData.email || ''
  });

  section.append(refs.fields.telefono, refs.fields.email);
  agregarListeners([refs.fields.telefono, refs.fields.email], refs, uiState);
  return section;
}

// ------------------------------------------------------------
// REDES SOCIALES
// ------------------------------------------------------------
function renderSeccionRedes(state, refs, uiState) {
  const section = crearSeccion('Redes Sociales');
  const help = document.createElement('p');
  help.className   = 'form-help';
  help.textContent = 'Al menos una red social es obligatoria.';
  section.appendChild(help);

  refs.fields.website   = createFormField({ label: 'Sitio Web',  name: 'website',   type: 'url', placeholder: 'https://...',         value: state.comercioData.website   || '' });
  refs.fields.instagram = createFormField({ label: 'Instagram',  name: 'instagram',              placeholder: '@usuario',             value: state.comercioData.instagram || '' });
  refs.fields.facebook  = createFormField({ label: 'Facebook',   name: 'facebook',               placeholder: 'facebook.com/usuario', value: state.comercioData.facebook  || '' });
  refs.fields.whatsapp  = createFormField({ label: 'WhatsApp',   name: 'whatsapp',  type: 'tel', placeholder: '+54 9 11 1234-5678',   value: state.comercioData.whatsapp  || '' });

  section.append(refs.fields.website, refs.fields.instagram, refs.fields.facebook, refs.fields.whatsapp);
  agregarListeners([refs.fields.website, refs.fields.instagram, refs.fields.facebook, refs.fields.whatsapp], refs, uiState);
  return section;
}

// ------------------------------------------------------------
// CATEGORÍAS
// ------------------------------------------------------------
function renderSeccionCategorias(state, refs, uiState) {
  const section = crearSeccion('Categorías');

  refs.categorySelector = createCategorySelector({
    options:  CATEGORIAS_COMUNES,
    selected: state.comercioData.categories || [],
  });
  refs.categorySelector.addEventListener('categories-change', () => {
    document.dispatchEvent(new Event('change'));
  });
  section.appendChild(refs.categorySelector);
  return section;
}

// ------------------------------------------------------------
// MÉTODOS DE PAGO
// ------------------------------------------------------------
function renderSeccionPagos(state, refs, uiState) {
  const section = crearSeccion('Métodos de Pago');
  const grid = document.createElement('div');
  grid.className = 'payment-grid';

  METODOS_PAGO.forEach(metodo => {
    const isSelected = uiState.selectedPaymentMethods.includes(metodo.id);
    const card = createCard({
       title: metodo.nombre, icon: metodo.icon, variant: 'info',
       selectable: true, selected: isSelected, compact: true,
       onClick: () => {
         card.toggle();
         if (card.isSelected()) {
           if (!uiState.selectedPaymentMethods.includes(metodo.id))
             uiState.selectedPaymentMethods.push(metodo.id);
         } else {
           uiState.selectedPaymentMethods = uiState.selectedPaymentMethods.filter(id => id !== metodo.id);
         }
         document.dispatchEvent(new Event('change'));
       }
     });
     refs.paymentCards.push(card);
     grid.appendChild(card);
  });
  section.appendChild(grid);
  return section;
}

// ============================================================
// BOTÓN GUARDAR
// ============================================================
function renderBotonGuardar(ctx, state, refs, uiState) {
  const btnContainer = document.createElement('div');
  btnContainer.className = 'btn-container';
  const isEditMode = state.isEditMode;

  const btn = createOnboardingButton({
    stepName: 'mi-comercio',
    validate: () => isFormValid(refs, uiState, state),
    getLabel: () => {
      if (!isEditMode) return 'Continuar';
      if (hayDirtyState(refs, uiState, state)) return 'Guardar y volver al dashboard';
      return 'Volver al dashboard';
    },
    dirtyController: isEditMode ? {
      hasUnsavedChanges: () => hayDirtyState(refs, uiState, state),
      markSaved: () => {
        const current = getCurrentData(refs, uiState);
        Object.assign(state.comercioData, current);
      }
    } : undefined,
    onSave: async ({ uid, comercioId: ctxComercioId }) => {
      const updates            = getCurrentData(refs, uiState);
      const originalHasLanding = state.comercioData.landing?.slug;

      if (!originalHasLanding) {
        updates.landing = {
          activo: true, nombre: updates.nombre,
          slug: uiState.comercioSlug, tipo: 'default',
          createdAt: new Date(), updatedAt: new Date()
        };
      } else {
        updates.landing = {
          ...state.comercioData.landing,
          nombre:    updates.nombre,
          updatedAt: new Date()
        };
      }

      if (state.isNewComercio) {
        const comercioRef = ctxComercioId
          ? doc(db, 'entidades', ctxComercioId)
          : doc(collection(db, 'entidades'));
        const comercioId = comercioRef.id;

        await setDoc(comercioRef, {
          ...updates,
          duenoId:            uid,
          fechaCreacion:      new Date(),
          fechaActualizacion: new Date(),
          onboardingSteps:    { 'mi-comercio': true }
        });

        const now       = Timestamp.now();
        const expiresAt = Timestamp.fromDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));
        await createInitialPlan(comercioId);

        await setDoc(doc(db, 'landings', uiState.comercioSlug), {
          slug: uiState.comercioSlug, comercioId,
          nombre: updates.nombre, activo: true,
          createdAt: new Date(), updatedAt: new Date()
        });

        await updateDoc(doc(db, 'usuarios', uid), {
          comercioId,
          'onboardingSteps.mi-comercio': true
        });

        // ─ Referral event ──
        const usuarioSnap = await getDoc(doc(db, 'usuarios', uid));
        const referredBy  = usuarioSnap.data()?.referredBy || null;
        if (referredBy) {
          await setDoc(doc(collection(db, 'referral_events')), {
            referrerCode:    referredBy,
            referrerType:    'usuario',
            createdUserId:   uid,
            createdEntityId: comercioId,
            valid:           false,
            timestamp:       new Date()
          });
          console.log(' Referral event creado (pendiente) para:', referredBy);
        }
        // ─ Fin referral event ──

        return { success: true, stepMarked: true };
      } else {
        await updateDoc(doc(db, 'entidades', ctxComercioId), {
          ...updates,
          'onboardingSteps.mi-comercio': true,
          fechaActualizacion: new Date()
        });
        if (!originalHasLanding) {
          await setDoc(doc(db, 'landings', uiState.comercioSlug), {
            slug: uiState.comercioSlug, comercioId: ctxComercioId,
            nombre: updates.nombre, activo: true,
            createdAt: new Date(), updatedAt: new Date()
          });
        }
        return { success: true, stepMarked: true };
      }
    },
    onSuccess: () => showToast('Comercio guardado correctamente', 'success'),
    onError:   (err) => {
      console.error(' Error guardando:', err);
      showToast('Error al guardar: ' + err.message, 'error');
    },
  });
  btnContainer.appendChild(btn);
  return btnContainer;
}

// ============================================================
// VALIDACIÓN SLUG
// ============================================================
async function validarSlug(slug, refs, uiState, autoGenerated) {
  if (!slug || slug.length < 3) {
    updateSlugStatus(refs, 'empty', '');
    uiState.slugDisponible = false;
    uiState.comercioSlug   = null;
    document.dispatchEvent(new Event('change'));
    return;
  }

  try {
    const landingSnap = await getDoc(doc(db, 'landings', slug));
    if (!landingSnap.exists()) {
      uiState.comercioSlug   = slug;
      uiState.slugDisponible = true;
      updateSlugStatus(refs, 'available', `✓ Disponible: indiceia.com/${slug}`);
      document.dispatchEvent(new Event('change'));
      return;
    }

    if (autoGenerated) {
      for (let i = 1; i <= 3; i++) {
        const alt     = `${slug}-${i}`;
        const altSnap = await getDoc(doc(db, 'landings', alt));
        if (!altSnap.exists()) {
          uiState.comercioSlug   = alt;
          uiState.slugDisponible = true;
          updateSlugStatus(refs, 'suggestion', `Ya existe. Sugerencia: indiceia.com/${alt}`);
          if (refs.slugInput) refs.slugInput.value = alt;
          document.dispatchEvent(new Event('change'));
          return;
        }
      }
    }

    uiState.slugDisponible = false;
    uiState.comercioSlug   = null;
    updateSlugStatus(refs, 'taken', 'Este nombre ya está en uso. Probá con otro.');
    document.dispatchEvent(new Event('change'));
  } catch (err) {
    console.error('Error validando slug:', err);
    uiState.slugDisponible = false;
    uiState.comercioSlug   = null;
    updateSlugStatus(refs, 'error', 'Error al validar. Intentá de nuevo.');
    document.dispatchEvent(new Event('change'));
  }
}

function updateSlugStatus(refs, status, message) {
  if (!refs.slugStatus) return;
  const icon  = refs.slugStatus.querySelector('.slug-icon');
  const text  = refs.slugStatus.querySelector('.slug-text');
  const icons = {
    checking:   ' <i class= "fas fa-spinner fa-spin " > </i >',
    available:  ' <i class= "fas fa-check-circle " style= "color: var(--s-success) " > </i >',
    suggestion: ' <i class= "fas fa-info-circle " style= "color: var(--s-info) " > </i >',
    taken:      ' <i class= "fas fa-times-circle " style= "color: var(--s-danger) " > </i >',
    error:      ' <i class= "fas fa-exclamation-triangle " style= "color: var(--s-warning) " > </i >',
    empty:      ''
  };
  icon.innerHTML   = icons[status] || '';
  text.textContent = message;
}

// ============================================================
// HELPERS DE FORMULARIO
// ============================================================
function getCurrentData(refs, uiState) {
  return {
    nombre:           refs.fields.nombre?.input.value.trim()          || '',
    descripcion:      refs.fields.descripcion?.input.value.trim()     || '',
    ubicacion: ubicacionFromForm(refs),
    rubro: rubroFromForm(refs.categorySelector?.getSelected() || []),
    direccion:        refs.fields.direccion?.input.value.trim()       || '',
    telefono:         refs.fields.telefono?.input.value.trim()        || '',
    email:            refs.fields.email?.input.value.trim()           || '',
    website:          refs.fields.website?.input.value.trim()         || null,
    instagram:        refs.fields.instagram?.input.value.trim()       || null,
    facebook:         refs.fields.facebook?.input.value.trim()        || null,
    whatsapp:         refs.fields.whatsapp?.input.value.trim()        || null,
    categories:       refs.categorySelector?.getSelected()            || [],
    paymentMethods:   uiState.selectedPaymentMethods,
    tieneLocalFisico: uiState.tieneLocalFisico,
  };
}

function isFormValid(refs, uiState, state) {
  const data = getCurrentData(refs, uiState);
  const tieneUbicacion = data.ubicacion?.localidad?.id && data.direccion;
  const camposBasicos  = data.nombre && data.descripcion &&
                         tieneUbicacion && data.telefono && data.email;
  const tieneRedSocial  = data.website || data.instagram || data.facebook || data.whatsapp;
  const tieneCategorias = data.categories.length > 0;
  const slugValido      = state.comercioData.landing?.slug || uiState.slugDisponible;

  return !!(camposBasicos && tieneRedSocial && tieneCategorias && slugValido);
}

function hayDirtyState(refs, uiState, state) {
  const current  = getCurrentData(refs, uiState);
  const original = state.comercioData;

  return (
    current.nombre          !== (original.nombre          || '') ||
    current.descripcion     !== (original.descripcion     || '') ||
    JSON.stringify(current.ubicacion) !== JSON.stringify(original.ubicacion || original.localidad || null) ||
    current.direccion       !== (original.direccion       || '') ||
    current.telefono        !== (original.telefono        || '') ||
    current.email           !== (original.email           || '') ||
    current.website         !== (original.website         || null) ||
    current.instagram       !== (original.instagram       || null) ||
    current.facebook        !== (original.facebook        || null) ||
    current.whatsapp        !== (original.whatsapp        || null) ||
    JSON.stringify(current.categories)     !== JSON.stringify(original.categories     || []) ||
    JSON.stringify(current.paymentMethods) !== JSON.stringify(original.paymentMethods || []) ||
    current.tieneLocalFisico !== (original.tieneLocalFisico !== false)
  );
}

// ============================================================
// UTILS
// ============================================================
function crearSeccion(titulo) {
  const section = document.createElement('div');
  section.className = 'form-section';
  const h3 = document.createElement('h3');
  h3.textContent = titulo;
  section.appendChild(h3);
  return section;
}

function agregarListeners(fields, refs, uiState) {
  fields.forEach(field => {
    field.input.addEventListener('input', () => {
      document.dispatchEvent(new Event('change'));
    });
  });
}
