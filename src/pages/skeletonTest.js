// pages/mi-comercio/mi-comercio.js
// ==================== MIGRACIÓN AL SISTEMA SKELETON ====================

import { runSkeleton } from '../skeleton/skeleton.js';
import { createFirebaseAdapter } from '../skeleton/adapters/firebaseAdapter.js';
import { createFormField } from '../skeleton/components/form-field/index.js';
import { createButton } from '../skeleton/components/button/index.js';
import { createCard } from '../skeleton/components/card/index.js';
import { createCategorySelector } from '../skeleton/components/category-selector/index.js';
import { showToast } from '../skeleton/components/toast/index.js';
import { fillProvinciaSelector } from '../shared/provincias.js';

// Firebase
import { db } from '../firebase.js';
import { doc, getDoc, setDoc, updateDoc, Timestamp } from 'firebase/firestore';

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

// ==================== PÁGINA ====================
const miComercioPage = {
  // Referencias a componentes
  fields: {},
  categorySelector: null,
  paymentCards: [],
  slugInput: null,
  slugStatus: null,
  guardarBtn: null,
  
  // Estado
  comercioSlug: null,
  slugDisponible: false,
  slugValidationTimer: null,
  selectedPaymentMethods: [],
  
  async load(ctx) {
    this.ctx = ctx;
    this.comercioData = ctx.comercioData || {};
    this.isNewComercio = ctx.isNewComercio || false;
    this.currentUser = ctx.currentUser;
    this.currentComercioId = ctx.currentComercioId;

    // Cargar slug si existe
    if (this.comercioData.landing && this.comercioData.landing.slug) {
      this.comercioSlug = this.comercioData.landing.slug;
      this.slugDisponible = true;
    }

    // Cargar métodos de pago seleccionados
    this.selectedPaymentMethods = this.comercioData.paymentMethods || [];

    console.log('✅ Mi Comercio cargado:', { 
      isNew: this.isNewComercio, 
      comercioId: this.currentComercioId 
    });
  },

  render() {
    const page = document.getElementById('skeleton-page');
    page.innerHTML = '';

    // ==================== TÍTULO ====================
    const title = document.createElement('h2');
    title.textContent = this.isNewComercio 
      ? 'Crear Mi Comercio' 
      : 'Editar Mi Comercio';
    title.style.marginBottom = '30px';
    page.appendChild(title);

    // ==================== SECCIÓN: DATOS BÁSICOS ====================
    const seccionBasicos = this.renderSeccionBasicos();
    page.appendChild(seccionBasicos);

    // ==================== SECCIÓN: UBICACIÓN ====================
    const seccionUbicacion = this.renderSeccionUbicacion();
    page.appendChild(seccionUbicacion);

    // ==================== SECCIÓN: CONTACTO ====================
    const seccionContacto = this.renderSeccionContacto();
    page.appendChild(seccionContacto);

    // ==================== SECCIÓN: REDES SOCIALES ====================
    const seccionRedes = this.renderSeccionRedes();
    page.appendChild(seccionRedes);

    // ==================== SECCIÓN: CATEGORÍAS ====================
    const seccionCategorias = this.renderSeccionCategorias();
    page.appendChild(seccionCategorias);

    // ==================== SECCIÓN: MÉTODOS DE PAGO ====================
    const seccionPagos = this.renderSeccionPagos();
    page.appendChild(seccionPagos);

    // ==================== SECCIÓN: LINK PÚBLICO (Solo nuevos) ====================
    if (!this.comercioData.landing || !this.comercioData.landing.slug) {
      const seccionSlug = this.renderSeccionSlug();
      page.appendChild(seccionSlug);
    }

    // ==================== BOTÓN GUARDAR ====================
    this.guardarBtn = createButton({
      label: 'Guardar Comercio',
      icon: 'fa-save',
      variant: 'success',
      size: 'lg',
      block: true,
      onClick: () => this.handleGuardar()
    });
    
    const btnContainer = document.createElement('div');
    btnContainer.style.marginTop = '40px';
    btnContainer.appendChild(this.guardarBtn);
    page.appendChild(btnContainer);

    // Validar formulario inicial
    this.validateForm();
  },

  renderSeccionBasicos() {
    const section = document.createElement('div');
    section.className = 'form-section';
    section.style.marginBottom = '30px';

    const h3 = document.createElement('h3');
    h3.textContent = 'Datos Básicos';
    h3.style.marginBottom = '20px';
    section.appendChild(h3);

    this.fields.nombreComercio = createFormField({
      label: 'Nombre del Comercio',
      name: 'nombreComercio',
      required: true,
      value: this.comercioData.nombreComercio || ''
    });

    this.fields.descripcion = createFormField({
      label: 'Descripción',
      name: 'descripcion',
      type: 'textarea',
      required: true,
      placeholder: 'Contanos sobre tu comercio...',
      value: this.comercioData.descripcion || ''
    });

    section.append(this.fields.nombreComercio, this.fields.descripcion);

    // Auto-generar slug desde nombre (solo para nuevos)
    if (!this.comercioSlug) {
      this.fields.nombreComercio.input.addEventListener('input', () => {
        clearTimeout(this.slugValidationTimer);
        const nombre = this.fields.nombreComercio.input.value.trim();

        if (nombre.length >= 3 && this.slugInput) {
          this.slugValidationTimer = setTimeout(async () => {
            const newSlug = slugify(nombre);
            this.slugInput.value = newSlug;
            await this.validarSlug(newSlug, true);
          }, 500);
        }
      });
    }

    // Validación en inputs
    [this.fields.nombreComercio, this.fields.descripcion].forEach(field => {
      field.input.addEventListener('input', () => this.validateForm());
    });

    return section;
  },

  renderSeccionUbicacion() {
    const section = document.createElement('div');
    section.className = 'form-section';
    section.style.marginBottom = '30px';

    const h3 = document.createElement('h3');
    h3.textContent = 'Ubicación';
    h3.style.marginBottom = '20px';
    section.appendChild(h3);

    // País (fijo)
    this.fields.pais = createFormField({
      label: 'País',
      name: 'pais',
      value: 'Argentina',
      disabled: true
    });

    this.fields.provincia = createFormField({
      label: 'Provincia',
      name: 'provincia',
      type: 'select',
      required: true
    });

    this.fields.ciudad = createFormField({
      label: 'Ciudad',
      name: 'ciudad',
      required: true,
      value: this.comercioData.ciudad || ''
    });

    this.fields.direccion = createFormField({
      label: 'Dirección',
      name: 'direccion',
      required: true,
      value: this.comercioData.direccion || ''
    });

    section.append(
      this.fields.pais,
      this.fields.provincia,
      this.fields.ciudad,
      this.fields.direccion
    );

    // Llenar provincias
    fillProvinciaSelector('Argentina', this.fields.provincia.input);
    
    if (this.comercioData.provincia) {
      setTimeout(() => {
        this.fields.provincia.input.value = this.comercioData.provincia;
      }, 0);
    }

    // Validación
    [this.fields.provincia, this.fields.ciudad, this.fields.direccion].forEach(field => {
      field.input.addEventListener('input', () => this.validateForm());
      field.input.addEventListener('change', () => this.validateForm());
    });

    return section;
  },

  renderSeccionContacto() {
    const section = document.createElement('div');
    section.className = 'form-section';
    section.style.marginBottom = '30px';

    const h3 = document.createElement('h3');
    h3.textContent = 'Contacto';
    h3.style.marginBottom = '20px';
    section.appendChild(h3);

    this.fields.telefono = createFormField({
      label: 'Teléfono',
      name: 'telefono',
      type: 'tel',
      required: true,
      value: this.comercioData.telefono || ''
    });

    this.fields.email = createFormField({
      label: 'Email',
      name: 'email',
      type: 'email',
      required: true,
      value: this.comercioData.email || ''
    });

    section.append(this.fields.telefono, this.fields.email);

    [this.fields.telefono, this.fields.email].forEach(field => {
      field.input.addEventListener('input', () => this.validateForm());
    });

    return section;
  },

  renderSeccionRedes() {
    const section = document.createElement('div');
    section.className = 'form-section';
    section.style.marginBottom = '30px';

    const h3 = document.createElement('h3');
    h3.textContent = 'Redes Sociales y Web';
    h3.style.marginBottom = '10px';
    section.appendChild(h3);

    const subtitle = document.createElement('p');
    subtitle.textContent = 'Completá al menos una red social o sitio web';
    subtitle.style.color = 'var(--s-gray, #999)';
    subtitle.style.marginBottom = '20px';
    section.appendChild(subtitle);

    this.fields.website = createFormField({
      label: 'Sitio Web',
      name: 'website',
      type: 'url',
      placeholder: 'https://...',
      value: this.comercioData.website || ''
    });

    this.fields.instagram = createFormField({
      label: 'Instagram',
      name: 'instagram',
      placeholder: '@tucomercio',
      value: this.comercioData.instagram || ''
    });

    this.fields.facebook = createFormField({
      label: 'Facebook',
      name: 'facebook',
      placeholder: 'facebook.com/tucomercio',
      value: this.comercioData.facebook || ''
    });

    this.fields.whatsapp = createFormField({
      label: 'WhatsApp',
      name: 'whatsapp',
      type: 'tel',
      placeholder: '+54 9 ...',
      value: this.comercioData.whatsapp || ''
    });

    section.append(
      this.fields.website,
      this.fields.instagram,
      this.fields.facebook,
      this.fields.whatsapp
    );

    // Validación (al menos una red social)
    const redesFields = [
      this.fields.website,
      this.fields.instagram,
      this.fields.facebook,
      this.fields.whatsapp
    ];

    redesFields.forEach(field => {
      field.input.addEventListener('input', () => this.validateForm());
    });

    return section;
  },

  renderSeccionCategorias() {
    const section = document.createElement('div');
    section.className = 'form-section';
    section.style.marginBottom = '30px';

    const h3 = document.createElement('h3');
    h3.textContent = 'Categorías';
    h3.style.marginBottom = '20px';
    section.appendChild(h3);

    this.categorySelector = createCategorySelector({
      options: CATEGORIAS_COMUNES,
      selected: this.comercioData.categories || []
    });

    this.categorySelector.addEventListener('categories-change', () => {
      this.validateForm();
    });

    section.appendChild(this.categorySelector);

    return section;
  },

  renderSeccionPagos() {
    const section = document.createElement('div');
    section.className = 'form-section';
    section.style.marginBottom = '30px';

    const h3 = document.createElement('h3');
    h3.textContent = 'Métodos de Pago';
    h3.style.marginBottom = '20px';
    section.appendChild(h3);

    const grid = document.createElement('div');
    grid.style.display = 'grid';
    grid.style.gridTemplateColumns = 'repeat(auto-fit, minmax(200px, 1fr))';
    grid.style.gap = '15px';

    METODOS_PAGO.forEach(metodo => {
      const card = createCard({
        title: metodo.nombre,
        icon: metodo.icon,
        content: `Acepto ${metodo.nombre.toLowerCase()}`,
        selectable: true,
        selected: this.selectedPaymentMethods.includes(metodo.id),
        compact: true
      });

      card.dataset.paymentId = metodo.id;

      card.addEventListener('card-select', (e) => {
        if (e.detail.selected) {
          if (!this.selectedPaymentMethods.includes(metodo.id)) {
            this.selectedPaymentMethods.push(metodo.id);
          }
        } else {
          this.selectedPaymentMethods = this.selectedPaymentMethods.filter(
            id => id !== metodo.id
          );
        }
        this.validateForm();
      });

      this.paymentCards.push(card);
      grid.appendChild(card);
    });

    section.appendChild(grid);

    return section;
  },

  renderSeccionSlug() {
    const section = document.createElement('div');
    section.className = 'form-section';
    section.style.marginBottom = '30px';

    const h3 = document.createElement('h3');
    h3.textContent = 'Link Público';
    h3.style.marginBottom = '10px';
    section.appendChild(h3);

    const subtitle = document.createElement('p');
    subtitle.textContent = 'Elegí un nombre único para tu página pública';
    subtitle.style.color = 'var(--s-gray, #999)';
    subtitle.style.marginBottom = '20px';
    section.appendChild(subtitle);

    const inputWrapper = document.createElement('div');
    inputWrapper.style.marginBottom = '10px';

    this.slugInput = document.createElement('input');
    this.slugInput.type = 'text';
    this.slugInput.className = 's-form-input';
    this.slugInput.placeholder = 'mi-comercio';
    this.slugInput.value = this.comercioSlug || '';

    if (this.comercioSlug) {
      this.slugInput.disabled = true;
      this.slugInput.style.backgroundColor = 'var(--s-light, #f8f9fa)';
    }

    this.slugInput.addEventListener('input', (e) => {
      clearTimeout(this.slugValidationTimer);
      let value = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
      e.target.value = value;

      if (value.length >= 3) {
        this.slugValidationTimer = setTimeout(() => {
          this.validarSlug(value, false);
        }, 500);
      } else {
        this.updateSlugStatus('empty', 'Mínimo 3 caracteres');
        this.slugDisponible = false;
        this.validateForm();
      }
    });

    inputWrapper.appendChild(this.slugInput);

    this.slugStatus = document.createElement('div');
    this.slugStatus.className = 'slug-status';
    this.slugStatus.style.marginTop = '8px';
    this.slugStatus.style.fontSize = '14px';
    this.slugStatus.innerHTML = `
      <span class="slug-icon"></span>
      <span class="slug-text">Elegí un nombre para tu link público</span>
    `;

    section.append(inputWrapper, this.slugStatus);

    if (this.comercioSlug) {
      this.updateSlugStatus('available', `✓ indiceia.com/${this.comercioSlug}`);
    }

    return section;
  },

  async validarSlug(slug, showSuggestions = false) {
    if (this.comercioData.landing && this.comercioData.landing.slug) {
      return;
    }

    if (!slug || slug.length < 3) {
      this.updateSlugStatus('empty', 'El nombre debe tener al menos 3 caracteres');
      this.slugDisponible = false;
      this.validateForm();
      return;
    }

    this.updateSlugStatus('checking', 'Verificando disponibilidad...');

    try {
      const landingRef = doc(db, 'landings', slug);
      const landingSnap = await getDoc(landingRef);

      if (!landingSnap.exists() || landingSnap.data().comercioId === this.comercioData.id) {
        this.comercioSlug = slug;
        this.slugDisponible = true;
        this.updateSlugStatus('available', `✓ indiceia.com/${slug}`);
        this.validateForm();
        return;
      }

      // Buscar alternativas
      if (showSuggestions) {
        for (let i = 2; i <= 5; i++) {
          const alt = `${slug}-${i}`;
          const altRef = doc(db, 'landings', alt);
          const altSnap = await getDoc(altRef);

          if (!altSnap.exists()) {
            this.comercioSlug = alt;
            this.slugDisponible = true;
            this.updateSlugStatus('suggestion', `Ya existe. Sugerencia: indiceia.com/${alt}`);
            this.slugInput.value = alt;
            this.validateForm();
            return;
          }
        }
      }

      this.slugDisponible = false;
      this.comercioSlug = null;
      this.updateSlugStatus('taken', 'Este nombre ya está en uso. Probá con otro.');
      this.validateForm();

    } catch (err) {
      console.error('Error validando slug:', err);
      this.slugDisponible = false;
      this.comercioSlug = null;
      this.updateSlugStatus('error', 'Error al validar. Intentá de nuevo.');
      this.validateForm();
    }
  },

  updateSlugStatus(status, message) {
    if (!this.slugStatus) return;

    const icon = this.slugStatus.querySelector('.slug-icon');
    const text = this.slugStatus.querySelector('.slug-text');

    this.slugStatus.className = 'slug-status';

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
  },

  validateForm() {
    // Campos requeridos básicos
    const camposBasicosValidos = 
      this.fields.nombreComercio?.input.value.trim() &&
      this.fields.descripcion?.input.value.trim() &&
      this.fields.provincia?.input.value.trim() &&
      this.fields.ciudad?.input.value.trim() &&
      this.fields.direccion?.input.value.trim() &&
      this.fields.telefono?.input.value.trim() &&
      this.fields.email?.input.value.trim();

    // Al menos una red social
    const tieneRedSocial = 
      this.fields.website?.input.value.trim() ||
      this.fields.instagram?.input.value.trim() ||
      this.fields.facebook?.input.value.trim() ||
      this.fields.whatsapp?.input.value.trim();

    // Categorías
    const tieneCategorias = this.categorySelector?.getSelected().length > 0;

    // Slug (solo para nuevos)
    const originalHasLanding = this.comercioData.landing && this.comercioData.landing.slug;
    const slugValido = originalHasLanding || this.slugDisponible;

    const formularioValido = 
      camposBasicosValidos &&
      tieneRedSocial &&
      tieneCategorias &&
      slugValido;

    if (this.guardarBtn) {
      if (formularioValido) {
        this.guardarBtn.enable();
      } else {
        this.guardarBtn.disable();
      }
    }

    return formularioValido;
  },

  async handleGuardar() {
    if (!this.validateForm()) {
      showToast('Completá todos los campos requeridos', 'warning');
      return;
    }

    this.guardarBtn.setLoading(true);

    try {
      const updates = {
        nombreComercio: this.fields.nombreComercio.input.value.trim(),
        descripcion: this.fields.descripcion.input.value.trim(),
        pais: 'Argentina',
        provincia: this.fields.provincia.input.value.trim(),
        ciudad: this.fields.ciudad.input.value.trim(),
        direccion: this.fields.direccion.input.value.trim(),
        telefono: this.fields.telefono.input.value.trim(),
        email: this.fields.email.input.value.trim(),
        website: this.fields.website.input.value.trim() || null,
        instagram: this.fields.instagram.input.value.trim() || null,
        facebook: this.fields.facebook.input.value.trim() || null,
        whatsapp: this.fields.whatsapp.input.value.trim() || null,
        categories: this.categorySelector.getSelected(),
        paymentMethods: this.selectedPaymentMethods
      };

      const originalHasLanding = this.comercioData.landing && this.comercioData.landing.slug;

      // Landing
      if (!originalHasLanding) {
        updates.landing = {
          activo: true,
          nombre: updates.nombreComercio,
          slug: this.comercioSlug,
          tipo: 'default',
          createdAt: new Date(),
          updatedAt: new Date()
        };
      } else {
        updates.landing = {
          ...this.comercioData.landing,
          nombre: updates.nombreComercio,
          updatedAt: new Date()
        };
      }

      // ==================== CREAR vs ACTUALIZAR ====================
      if (this.isNewComercio) {
        // CREAR NUEVO
        console.log('🆕 Creando comercio nuevo...');

        const nuevoComercio = {
          ...updates,
          duenoId: this.currentUser.uid,
          fechaCreacion: new Date(),
          fechaActualizacion: new Date(),
          onboardingSteps: {
            'mi-comercio': true
          }
        };

        await setDoc(doc(db, 'comercios', this.currentComercioId), nuevoComercio);
        console.log('✅ Comercio creado');

        // PLAN TRIAL 30 DÍAS
        const now = Timestamp.now();
        const expiresAt = Timestamp.fromDate(
          new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        );
        
        await updateDoc(doc(db, 'comercios', this.currentComercioId), {
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
        console.log('✅ Plan TRIAL aplicado');

        // Crear índice landing
        await setDoc(doc(db, 'landings', this.comercioSlug), {
          slug: this.comercioSlug,
          comercioId: this.currentComercioId,
          nombre: updates.nombreComercio,
          activo: true,
          createdAt: new Date(),
          updatedAt: new Date()
        });
        console.log('✅ Landing creado');

        // Guardar comercioId en usuario
        await updateDoc(doc(db, 'usuarios', this.currentUser.uid), {
          comercioId: this.currentComercioId,
          'onboardingSteps.mi-comercio': true
        });
        console.log('✅ Usuario actualizado');

      } else {
        // ACTUALIZAR EXISTENTE
        console.log('✏️ Actualizando comercio existente...');

        updates['onboardingSteps.mi-comercio'] = true;
        updates.fechaActualizacion = new Date();

        await updateDoc(doc(db, 'comercios', this.currentComercioId), updates);
        console.log('✅ Comercio actualizado');

        // Crear landing si no existía
        if (!originalHasLanding) {
          await setDoc(doc(db, 'landings', this.comercioSlug), {
            slug: this.comercioSlug,
            comercioId: this.currentComercioId,
            nombre: updates.nombreComercio,
            activo: true,
            createdAt: new Date(),
            updatedAt: new Date()
          });
          console.log('✅ Landing creado');
        }
      }

      showToast('Comercio guardado correctamente', 'success');
      
      await new Promise(resolve => setTimeout(resolve, 500));
      
      window.location.href = "/dashboard.html";

    } catch (error) {
      console.error('❌ Error guardando:', error);
      showToast('Error al guardar: ' + error.message, 'error');
    } finally {
      this.guardarBtn.setLoading(false);
    }
  }
};

// ==================== RUN ====================
runSkeleton({
  page: miComercioPage,
  adapter: createFirebaseAdapter,
  options: {
    debug: true,
    loadingMessage: 'Cargando datos del comercio...'
  }
});
