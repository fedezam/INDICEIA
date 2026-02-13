// src/pages/dashboard.js
// Dashboard en formato skeleton (sin imports de Firebase directo)

import './skeletonTest.css';

import { runSkeleton } from '../skeleton/skeleton.js';
import { createFirebaseAdapter } from '../skeleton/adapters/firebaseAdapter.js';
import { showToast, showLoading, hideLoading } from '../shared/utils.js';
import { PLANS, calcularEstadoPlan, getDiasRestantesTrial, hasLiveAccess, isHighValuePlan } from '../shared/plans.js';

const dashboardPage = {
  async load(ctx) {
    console.log('📦 Dashboard cargado');
    this.ctx = ctx;
    this.comercioData = ctx.comercioData || {};
    this.comercioId = ctx.comercioId;
    this.userData = ctx.userData || {};
    
    // Asegurar que existe plan
    if (!this.comercioData.plan) {
      this.comercioData.plan = 'trial';
    }
    
    console.log('Comercio Data:', this.comercioData);
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

    // Grid principal
    const grid = document.createElement('section');
    grid.className = 'dashboard-grid';

    // ===== TU PLAN ACTUAL =====
    grid.appendChild(this.createPlanCard());

    // ===== CONFIGURACIÓN =====
    grid.appendChild(this.createCard({
      icon: 'fa-user',
      title: 'Usuario',
      description: 'Datos de acceso y contacto',
      href: '/usuario.html?edit=true',
      buttonLabel: 'Editar'
    }));

    grid.appendChild(this.createCard({
      icon: 'fa-store',
      title: 'Mi Comercio',
      description: 'Información general del comercio',
      href: '/mi-comercio.html?edit=true',
      buttonLabel: 'Editar'
    }));

    grid.appendChild(this.createCard({
      icon: 'fa-clock',
      title: 'Horarios',
      description: this.comercioData.onboardingSteps?.horarios ? 'Configurados ✓' : 'No configurados',
      href: '/horarios.html?edit=true',
      buttonLabel: 'Editar'
    }));

    grid.appendChild(this.createCard({
      icon: 'fa-concierge-bell',
      title: 'Servicios',
      description: this.getServiciosDescription(),
      href: '/servicios.html?edit=true',
      buttonLabel: 'Editar'
    }));

    grid.appendChild(this.createCard({
      icon: 'fa-box',
      title: 'Productos',
      description: `${this.comercioData.cantidadProductos || 0} producto${this.comercioData.cantidadProductos !== 1 ? 's' : ''}`,
      href: '/productos.html?edit=true',
      buttonLabel: 'Editar'
    }));

    grid.appendChild(this.createCard({
      icon: 'fa-robot',
      title: 'Configuración IA',
      description: 'Estado mental y capacidades',
      href: '/ia-config.html?edit=true',
      buttonLabel: 'Editar'
    }));

    // ===== PUBLICACIÓN =====
    grid.appendChild(this.createCard({
      icon: 'fa-palette',
      title: 'Visual Builder',
      description: 'Personaliza la apariencia de tu IA',
      badge: 'Opcional',
      href: '/visual.html',
      buttonLabel: 'Acceder',
      highlight: true
    }));

    grid.appendChild(this.createCard({
      icon: 'fa-chart-bar',
      title: 'Estadísticas',
      description: 'Visitas y conversiones de tu landing',
      href: '/stats.html',
      buttonLabel: 'Ver',
      highlight: true
    }));

    grid.appendChild(this.createGenerateEntityCard());

    grid.appendChild(this.createCard({
      icon: 'fa-link',
      title: 'Mi Link Público',
      description: 'URL permanente y QR personalizado para compartir con clientes',
      href: '/link-publico.html',
      buttonLabel: 'Ver link y QR',
      highlight: true
    }));

    page.appendChild(grid);
    
    console.log('✅ Dashboard renderizado');
  },

  createPlanCard() {
    const planId = this.comercioData.plan || 'trial';
    const planActual = PLANS[planId] || PLANS['trial'];
    
    const card = document.createElement('div');
    card.className = 'dash-card highlight plan-card';
    
    let liveStatus = '';
    if (hasLiveAccess(planId, this.comercioData.liveEnabled)) {
      liveStatus = '<p><strong>Interacción continua:</strong> Activada ✓</p>';
    } else {
      liveStatus = '<p><strong>Interacción continua:</strong> No disponible</p>';
    }

    let highValueSection = '';
    if (isHighValuePlan(planId)) {
      highValueSection = '<p style="color:#28a745;font-weight:bold;">Plan High Value activo · Comisión por ventas comprobadas</p>';
    } else {
      highValueSection = `
        <div style="margin-top:24px;padding:16px;background:#f0f8ff;border-left:4px solid #0070f3;border-radius:8px;">
          <h4 style="margin:0 0 8px;">💼 Plan High Value (Gratis)</h4>
          <p style="font-size:14px;margin:0 0 12px;">
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
      <div class="dash-icon"><i class="fas fa-crown"></i></div>
      <div class="dash-content">
        <h3>Tu Plan Actual</h3>
        <p><strong>${planActual.nombre}</strong></p>
        <p>${planActual.descripcion}</p>
        ${liveStatus}
        ${highValueSection}
      </div>
      <a href="/plans.html" class="btn btn-primary btn-sm">
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

  createCard({ icon, title, description, href, buttonLabel, highlight = false, badge = null }) {
    const card = document.createElement('div');
    card.className = `dash-card${highlight ? ' highlight' : ''}`;
    
    card.innerHTML = `
      <div class="dash-icon"><i class="fas ${icon}"></i></div>
      <div class="dash-content">
        <h3>${title} ${badge ? `<span class="badge-optional">${badge}</span>` : ''}</h3>
        <p>${description}</p>
      </div>
      <a href="${href}" class="btn ${highlight ? 'btn-primary' : 'btn-secondary'} btn-sm">
        <i class="fas fa-${buttonLabel === 'Editar' ? 'edit' : 'arrow-right'}"></i> ${buttonLabel}
      </a>
    `;

    return card;
  },

  createGenerateEntityCard() {
    const card = document.createElement('div');
    card.className = 'dash-card highlight';
    
    card.innerHTML = `
      <div class="dash-icon"><i class="fas fa-cogs"></i></div>
      <div class="dash-content">
        <h3>Generar Entidad</h3>
        <p>Publica tu menú, horarios y configuración IA al instante</p>
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

  getServiciosDescription() {
    const stats = this.comercioData.serviciosStats || { activos: 0, pausados: 0, total: 0 };
    let desc = `${stats.total} total${stats.total !== 1 ? 'es' : ''}`;
    
    if (stats.total > 0) {
      desc += `<br><span class="badge-activo">🟢 ${stats.activos} activo${stats.activos !== 1 ? 's' : ''}</span>`;
      if (stats.pausados > 0) {
        desc += ` <span class="badge-pausado">🔴 ${stats.pausados} pausado${stats.pausados !== 1 ? 's' : ''}</span>`;
      }
    }
    
    return desc;
  },

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
      } else {
        throw new Error(data.error || 'Error desconocido del servidor');
      }
    } catch (err) {
      console.error('Error al generar entidad:', err);
      showToast('Error: ' + (err.message || 'No se pudo completar la operación'), 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML = originalText;
    }
  },

  async openHighValueModal() {
    const modal = document.createElement('div');
    modal.innerHTML = `
      <div style="position:fixed;inset:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:1000;">
        <div style="background:white;border-radius:12px;padding:32px;max-width:500px;width:90%;box-shadow:0 10px 40px rgba(0,0,0,0.2);">
          <h3 style="margin-top:0;">Activar Plan High Value (Gratis)</h3>
          <p>Ideal para ventas de alto valor: autos, inmuebles, maquinaria, industria.</p>
          <ul style="text-align:left;font-size:14px;line-height:1.5;">
            <li>Productos ilimitados</li>
            <li>Interacción continua incluida</li>
            <li>Sin costo mensual</li>
            <li>Comisión del 5% solo sobre ventas comprobadas mediante el sistema</li>
          </ul>
          <p style="font-size:14px;"><strong>Importante:</strong> El ocultamiento deliberado de ventas comprobadas resultará en la desactivación permanente del servicio.</p>
          <label style="display:block;margin:24px 0 16px;">
            <input type="checkbox" id="acceptHVTerms">
            Acepto los términos del plan High Value
          </label>
          <div style="text-align:right;">
            <button id="cancelHV" class="btn btn-secondary btn-sm" style="margin-right:8px;">Cancelar</button>
            <button id="confirmHV" class="btn btn-primary btn-sm" disabled>Activar</button>
          </div>
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
        // Aquí faltaría importar updateDoc de Firestore
        // Por ahora usamos fetch a una API
        const response = await fetch('/api/activate-high-value', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ comercioId: this.comercioId })
        });

        if (response.ok) {
          showToast('Plan High Value activado con éxito', 'success');
          modal.remove();
          location.reload();
        } else {
          throw new Error('Error al activar');
        }
      } catch (err) {
        showToast('Error al activar el plan', 'error');
      }
    });

    cancelBtn.addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => {
      if (e.target === modal.firstElementChild) modal.remove();
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
