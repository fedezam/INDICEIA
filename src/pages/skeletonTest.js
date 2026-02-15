// Dashboard en formato skeleton - Refactorizado con s-card

import './skeletonTest.css';

import { runSkeleton } from '../skeleton/skeleton.js';
import { createFirebaseAdapter } from '../skeleton/adapters/firebaseAdapter.js';
import { showToast } from '../skeleton/components/toast/index.js';
import { PLANS, hasLiveAccess, isHighValuePlan } from '../shared/plans.js';

const dashboardPage = {
  async load(ctx) {
    console.log('📦 Dashboard cargado');
    this.ctx = ctx;
    this.comercioData = ctx.comercioData || {};
    this.comercioId = ctx.comercioId;
    this.userData = ctx.userData || {};
    this.offerType = this.userData.offerType || {};
    
    // Asegurar que existe plan
    if (!this.comercioData.plan) {
      this.comercioData.plan = 'trial';
    }
    
    console.log('📊 Offer Type:', this.offerType);
    console.log('🏢 Comercio Data:', this.comercioData);
  },

  render() {
    const page = document.getElementById('skeleton-page');
    if (!page) {
      console.error('❌ #skeleton-page no existe');
      return;
    }

    page.innerHTML = '';

    // Header de la página
    const pageHeader = document.createElement('div');
    pageHeader.className = 'page-header';
    pageHeader.innerHTML = `
      <h1><i class="fas fa-chart-line"></i> Dashboard</h1>
      <p>Resumen general y accesos rápidos a todas las secciones</p>
    `;
    page.appendChild(pageHeader);

    // ===== CARD DEL PLAN (arriba de todo) =====
    page.appendChild(this.createPlanCard());

    // ===== SECCIÓN 1: CONFIGURACIÓN =====
    page.appendChild(this.createConfigSection());

    // ===== SECCIÓN 2: PUBLICACIÓN =====
    page.appendChild(this.createPublishSection());

    // ===== SECCIÓN 3: ESTADÍSTICAS =====
    page.appendChild(this.createStatsSection());
    
    console.log('✅ Dashboard renderizado');
  },

  // ==================== CARD DEL PLAN ====================
  createPlanCard() {
    const planId = this.comercioData.plan || 'trial';
    const planActual = PLANS[planId] || PLANS['trial'];
    
    const card = document.createElement('div');
    card.className = 'plan-card';
    
    let liveStatus = '';
    if (hasLiveAccess(planId, this.comercioData.liveEnabled)) {
      liveStatus = '<p><strong>Interacción continua:</strong> Activada ✓</p>';
    } else {
      liveStatus = '<p><strong>Interacción continua:</strong> No disponible</p>';
    }

    let highValueSection = '';
    if (isHighValuePlan(planId)) {
      highValueSection = '<p class="high-value-active">Plan High Value activo · Comisión por ventas comprobadas</p>';
    } else {
      highValueSection = `
        <div class="high-value-promo">
          <h4>💼 Plan High Value (Gratis)</h4>
          <p>
            Para autos, inmuebles, maquinaria, industria.<br>
            Productos ilimitados · Interacción continua incluida · Comisión 5% solo por ventas comprobadas
          </p>
          <button id="activateHighValue" class="btn btn-outline-primary btn-sm">
            Activar High Value
          </button>
        </div>
      `;
    }

    card.innerHTML = `
      <div class="plan-icon"><i class="fas fa-crown"></i></div>
      <div class="plan-content">
        <h2>Tu Plan Actual</h2>
        <p class="plan-name">${planActual.nombre}</p>
        <p class="plan-desc">${planActual.descripcion}</p>
        ${liveStatus}
        ${highValueSection}
      </div>
      <a href="/plans.html" class="btn btn-light btn-sm">
        <i class="fas fa-arrow-right"></i> Ver planes
      </a>
    `;

    // Evento para activar High Value
    setTimeout(() => {
      const activateBtn = document.getElementById('activateHighValue');
      if (activateBtn) {
        activateBtn.addEventListener('click', () => this.openHighValueModal());
      }
    }, 0);

    return card;
  },

  // ==================== SECCIÓN 1: CONFIGURACIÓN ====================
  createConfigSection() {
    const section = document.createElement('section');
    section.className = 'dashboard-section';
    
    const header = document.createElement('h2');
    header.className = 'section-title';
    header.innerHTML = '<i class="fas fa-cog"></i> Configuración';
    section.appendChild(header);

    const grid = document.createElement('div');
    grid.className = 'dashboard-grid';

    // Cards siempre visibles
    grid.appendChild(this.createCard({
      icon: 'fa-user',
      title: 'Usuario',
      description: 'Datos de acceso y contacto',
      href: '/usuario.html?edit=true',
      buttonLabel: 'Editar',
      buttonIcon: 'edit'
    }));

    grid.appendChild(this.createCard({
      icon: 'fa-store',
      title: 'Mi Comercio',
      description: 'Información general del comercio',
      href: '/mi-comercio.html?edit=true',
      buttonLabel: 'Editar',
      buttonIcon: 'edit'
    }));

    grid.appendChild(this.createCard({
      icon: 'fa-clock',
      title: 'Horarios',
      description: this.comercioData.onboardingSteps?.horarios ? 'Configurados ✓' : 'No configurados',
      href: '/horarios.html?edit=true',
      buttonLabel: 'Editar',
      buttonIcon: 'edit'
    }));

    // SERVICIOS - Condicional
    if (this.offerType.servicios) {
      // Configurado
      grid.appendChild(this.createCard({
        icon: 'fa-concierge-bell',
        title: 'Servicios',
        description: this.getServiciosDescription(),
        href: '/servicios.html?edit=true',
        buttonLabel: 'Editar',
        buttonIcon: 'edit'
      }));
    } else {
      // No configurado - Agregar
      grid.appendChild(this.createAddCard({
        icon: 'fa-concierge-bell',
        title: 'Servicios',
        description: 'Agregá servicios a tu oferta',
        href: '/crear-entidad.html'
      }));
    }

    // PRODUCTOS - Condicional
    if (this.offerType.productos) {
      // Configurado
      grid.appendChild(this.createCard({
        icon: 'fa-box',
        title: 'Productos',
        description: `${this.comercioData.cantidadProductos || 0} producto${this.comercioData.cantidadProductos !== 1 ? 's' : ''}`,
        href: '/productos.html?edit=true',
        buttonLabel: 'Editar',
        buttonIcon: 'edit'
      }));
    } else {
      // No configurado - Agregar
      grid.appendChild(this.createAddCard({
        icon: 'fa-box',
        title: 'Productos',
        description: 'Agregá productos a tu oferta',
        href: '/crear-entidad.html'
      }));
    }

    grid.appendChild(this.createCard({
      icon: 'fa-robot',
      title: 'Configuración IA',
      description: 'Personalidad y comportamiento',
      href: '/ia-config.html?edit=true',
      buttonLabel: 'Editar',
      buttonIcon: 'edit'
    }));

    grid.appendChild(this.createCard({
      icon: 'fa-palette',
      title: 'Visual Builder',
      description: 'Personalización visual de la IA',
      href: '/visual.html',
      buttonLabel: 'Acceder',
      buttonIcon: 'arrow-right'
    }));

    section.appendChild(grid);
    return section;
  },

  // ==================== SECCIÓN 2: PUBLICACIÓN ====================
  createPublishSection() {
    const section = document.createElement('section');
    section.className = 'dashboard-section';
    
    const header = document.createElement('h2');
    header.className = 'section-title';
    header.innerHTML = '<i class="fas fa-rocket"></i> Publicación';
    section.appendChild(header);

    const grid = document.createElement('div');
    grid.className = 'dashboard-grid';

    // Generar Entidad (siempre activa)
    grid.appendChild(this.createGenerateEntityCard());

    // Mi Link Público (condicional)
    const hasEntity = !!this.comercioData.entityPublicUrl;
    
    if (hasEntity) {
      // Entidad generada - Card activa
      grid.appendChild(this.createCard({
        icon: 'fa-link',
        title: 'Mi Link Público',
        description: 'URL y QR para compartir con clientes',
        href: '/link-publico.html',
        buttonLabel: 'Ver link y QR',
        buttonIcon: 'qrcode',
        highlight: true
      }));
    } else {
      // Entidad NO generada - Card disabled
      grid.appendChild(this.createDisabledCard({
        icon: 'fa-link',
        title: 'Mi Link Público',
        description: 'Disponible después de generar la entidad'
      }));
    }

    section.appendChild(grid);
    return section;
  },

  // ==================== SECCIÓN 3: ESTADÍSTICAS ====================
  createStatsSection() {
    const section = document.createElement('section');
    section.className = 'dashboard-section';
    
    const header = document.createElement('h2');
    header.className = 'section-title';
    header.innerHTML = '<i class="fas fa-chart-line"></i> Estadísticas';
    section.appendChild(header);

    const grid = document.createElement('div');
    grid.className = 'dashboard-grid';

    grid.appendChild(this.createCard({
      icon: 'fa-chart-bar',
      title: 'Estadísticas',
      description: 'Visitas, conversiones y métricas',
      href: '/stats.html',
      buttonLabel: 'Ver estadísticas',
      buttonIcon: 'arrow-right',
      highlight: true
    }));

    section.appendChild(grid);
    return section;
  },

  // ==================== HELPERS DE CARDS ====================

  // Card normal (configurada)
  createCard({ icon, title, description, href, buttonLabel, buttonIcon, highlight = false }) {
    const card = document.createElement('div');
    card.className = `dash-card${highlight ? ' highlight' : ''}`;
    
    card.innerHTML = `
      <div class="dash-icon"><i class="fas ${icon}"></i></div>
      <div class="dash-content">
        <h3>${title}</h3>
        <p>${description}</p>
      </div>
      <a href="${href}" class="btn btn-secondary btn-sm">
        <i class="fas fa-${buttonIcon}"></i> ${buttonLabel}
      </a>
    `;

    return card;
  },

  // Card para agregar (no configurada)
  createAddCard({ icon, title, description, href }) {
    const card = document.createElement('div');
    card.className = 'dash-card add-card';
    
    card.innerHTML = `
      <div class="dash-icon add-icon"><i class="fas ${icon}"></i></div>
      <div class="dash-content">
        <h3>${title}</h3>
        <p>${description}</p>
      </div>
      <a href="${href}" class="btn btn-outline-primary btn-sm">
        <i class="fas fa-plus"></i> Agregar
      </a>
    `;

    return card;
  },

  // Card disabled (entidad no generada)
  createDisabledCard({ icon, title, description }) {
    const card = document.createElement('div');
    card.className = 'dash-card disabled-card';
    
    card.innerHTML = `
      <div class="dash-icon disabled-icon"><i class="fas ${icon}"></i></div>
      <div class="dash-content">
        <h3>${title}</h3>
        <p>${description}</p>
      </div>
      <button class="btn btn-secondary btn-sm" disabled>
        <i class="fas fa-lock"></i> No disponible
      </button>
    `;

    return card;
  },

  // Card Generar Entidad
  createGenerateEntityCard() {
    const card = document.createElement('div');
    card.className = 'dash-card highlight';
    
    card.innerHTML = `
      <div class="dash-icon"><i class="fas fa-magic"></i></div>
      <div class="dash-content">
        <h3>Generar Entidad</h3>
        <p>Publica tu configuración al instante</p>
      </div>
      <button id="btnGenerateEntity" class="btn btn-primary btn-sm">
        <i class="fas fa-magic"></i> Generar
      </button>
    `;

    setTimeout(() => {
      const btn = document.getElementById('btnGenerateEntity');
      if (btn) {
        btn.addEventListener('click', () => this.generateEntity());
      }
    }, 0);

    return card;
  },

  // ==================== HELPERS ====================

  getServiciosDescription() {
    const stats = this.comercioData.serviciosStats || { activos: 0, pausados: 0, total: 0 };
    
    if (stats.total === 0) {
      return 'Sin servicios configurados';
    }
    
    let html = `${stats.total} servicio${stats.total !== 1 ? 's' : ''}<br>`;
    html += `<span class="badge-activo">🟢 ${stats.activos} activo${stats.activos !== 1 ? 's' : ''}</span>`;
    
    if (stats.pausados > 0) {
      html += ` <span class="badge-pausado">🔴 ${stats.pausados} pausado${stats.pausados !== 1 ? 's' : ''}</span>`;
    }
    
    return html;
  },

  // ==================== ACCIONES ====================

  async generateEntity() {
    const btn = document.getElementById('btnGenerateEntity');
    if (!btn || btn.disabled) return;

    btn.disabled = true;
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generando...';

    try {
      const response = await fetch('/api/generate-and-upload-entity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comercioId: this.comercioId }),
      });

      const data = await response.json();

      if (data.ok) {
        showToast('¡Entidad generada y publicada con éxito!', 'success');
        
        // Recargar para actualizar el estado de "Mi Link Público"
        setTimeout(() => location.reload(), 1500);
      } else {
        throw new Error(data.error || 'Error desconocido');
      }
    } catch (err) {
      console.error('Error al generar entidad:', err);
      showToast('Error: ' + (err.message || 'No se pudo completar'), 'error');
      btn.disabled = false;
      btn.innerHTML = originalText;
    }
  },

  async openHighValueModal() {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-content">
        <h3>Activar Plan High Value (Gratis)</h3>
        <p>Ideal para ventas de alto valor: autos, inmuebles, maquinaria, industria.</p>
        <ul>
          <li>Productos ilimitados</li>
          <li>Interacción continua incluida</li>
          <li>Sin costo mensual</li>
          <li>Comisión del 5% solo sobre ventas comprobadas mediante el sistema</li>
        </ul>
        <p class="modal-warning"><strong>Importante:</strong> El ocultamiento deliberado de ventas comprobadas resultará en la desactivación permanente del servicio.</p>
        <label class="modal-checkbox">
          <input type="checkbox" id="acceptHVTerms">
          Acepto los términos del plan High Value
        </label>
        <div class="modal-actions">
          <button id="cancelHV" class="btn btn-secondary btn-sm">Cancelar</button>
          <button id="confirmHV" class="btn btn-primary btn-sm" disabled>Activar</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    const checkbox = modal.querySelector('#acceptHVTerms');
    const confirmBtn = modal.querySelector('#confirmHV');
    const cancelBtn = modal.querySelector('#cancelHV');

    checkbox.addEventListener('change', () => {
      confirmBtn.disabled = !checkbox.checked;
    });

    confirmBtn.addEventListener('click', async () => {
      try {
        const response = await fetch('/api/activate-high-value', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ comercioId: this.comercioId })
        });

        if (response.ok) {
          showToast('Plan High Value activado con éxito', 'success');
          modal.remove();
          setTimeout(() => location.reload(), 1000);
        } else {
          throw new Error('Error al activar');
        }
      } catch (err) {
        showToast('Error al activar el plan', 'error');
      }
    });

    cancelBtn.addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.remove();
    });
  }
};

/* ============================
   RUN
============================ */
runSkeleton({
  page: dashboardPage,
  adapter: createFirebaseAdapter,
  options: {
    debug: true,
    loadingMessage: 'Cargando dashboard...'
  }
});
