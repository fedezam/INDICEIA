// Dashboard en formato skeleton - Refactorizado con s-card

import './skeletonTest.css';

import { runSkeleton } from '../skeleton/skeleton.js';
import { createFirebaseAdapter } from '../skeleton/adapters/firebaseAdapter.js';
import { showToast, showLoading, hideLoading } from '../shared/utils.js';
import { PLANS, calcularEstadoPlan, getDiasRestantesTrial, hasLiveAccess, isHighValuePlan } from '../shared/plans.js';
import { createCard } from '../skeleton/components/card/index.js';

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
    grid.appendChild(createCard({
      title: 'Usuario',
      content: 'Datos de acceso y contacto',
      icon: 'fa-user',
      action: {
        type: 'link',
        label: 'Editar',
        url: '/usuario.html?edit=true'
      }
    }));

    grid.appendChild(createCard({
      title: 'Mi Comercio',
      content: 'Información general del comercio',
      icon: 'fa-store',
      action: {
        type: 'link',
        label: 'Editar',
        url: '/mi-comercio.html?edit=true'
      }
    }));

    grid.appendChild(createCard({
      title: 'Horarios',
      content: this.comercioData.onboardingSteps?.horarios ? 'Configurados ✓' : 'No configurados',
      icon: 'fa-clock',
      action: {
        type: 'link',
        label: 'Editar',
        url: '/horarios.html?edit=true'
      }
    }));

    grid.appendChild(createCard({
      title: 'Servicios',
      content: this.getServiciosDescription(),
      icon: 'fa-concierge-bell',
      action: {
        type: 'link',
        label: 'Editar',
        url: '/servicios.html?edit=true'
      }
    }));

    grid.appendChild(createCard({
      title: 'Productos',
      content: `${this.comercioData.cantidadProductos || 0} producto${this.comercioData.cantidadProductos !== 1 ? 's' : ''}`,
      icon: 'fa-box',
      action: {
        type: 'link',
        label: 'Editar',
        url: '/productos.html?edit=true'
      }
    }));

    grid.appendChild(createCard({
      title: 'Configuración IA',
      content: 'Estado mental y capacidades',
      icon: 'fa-robot',
      action: {
        type: 'link',
        label: 'Editar',
        url: '/ia-config.html?edit=true'
      }
    }));

    // ===== PUBLICACIÓN =====
    grid.appendChild(createCard({
      title: 'Visual Builder',
      content: 'Personaliza la apariencia de tu IA',
      icon: 'fa-palette',
      highlight: true,
      action: {
        type: 'link',
        label: 'Acceder',
        url: '/visual.html'
      }
    }));

    grid.appendChild(createCard({
      title: 'Estadísticas',
      content: 'Visitas y conversiones de tu landing',
      icon: 'fa-chart-bar',
      highlight: true,
      action: {
        type: 'link',
        label: 'Ver',
        url: '/stats.html'
      }
    }));

    // Card especial: Generar Entidad
    const generateCard = createCard({
      title: 'Generar Entidad',
      content: 'Publica tu menú, horarios y configuración IA al instante',
      icon: 'fa-cogs',
      highlight: true,
      action: {
        type: 'button',
        label: 'Generar',
        className: 'btn btn-primary btn-sm',
        onClick: () => this.generateEntity()
      }
    });
    // Aseguramos el ícono mágico
    const footer = generateCard.querySelector('.s-card-footer');
    if (footer && footer.firstChild) {
      footer.firstChild.innerHTML = '<i class="fas fa-magic"></i> Generar';
    }
    grid.appendChild(generateCard);

    grid.appendChild(createCard({
      title: 'Mi Link Público',
      content: 'URL permanente y QR personalizado para compartir con clientes',
      icon: 'fa-link',
      highlight: true,
      action: {
        type: 'link',
        label: 'Ver link y QR',
        url: '/link-publico.html'
      }
    }));

    page.appendChild(grid);
    
    console.log('✅ Dashboard renderizado con skeleton cards');
  },

  createPlanCard() {
    const planId = this.comercioData.plan || 'trial';
    const planActual = PLANS[planId] || PLANS['trial'];
    
    let liveStatus = hasLiveAccess(planId, this.comercioData.liveEnabled) 
      ? '<p><strong>Interacción continua:</strong> Activada ✓</p>'
      : '<p><strong>Interacción continua:</strong> No disponible</p>';

    let highValueSection = '';
    if (isHighValuePlan(planId)) {
      highValueSection = '<p style="color:#28a745;font-weight:bold;margin-top:12px;">Plan High Value activo · Comisión por ventas comprobadas</p>';
    } else {
      highValueSection = `
        <div style="margin-top:16px;padding:12px;background:#f0f8ff;border-left:3px solid #0070f3;border-radius:6px;font-size:13px;">
          <strong>💼 Plan High Value (Gratis)</strong><br>
          Para autos, inmuebles, maquinaria, industria.<br>
          Productos ilimitados · Interacción continua incluida · Comisión 5% solo por ventas comprobadas
          <button id="activateHighValue" class="btn btn-outline-primary btn-sm" style="margin-top:8px;font-size:12px;padding:4px 8px;">
            Activar High Value
          </button>
        </div>
      `;
    }

    const content = `
      <p><strong>${planActual.nombre}</strong></p>
      <p>${planActual.descripcion}</p>
      ${liveStatus}
      ${highValueSection}
    `;

    const card = createCard({
      title: 'Tu Plan Actual',
      content: content,
      icon: 'fa-crown',
      highlight: true
    });

    // Añadir clase personalizada para el fondo gradient
    card.classList.add('plan-card');

    // Añadir botón "Ver planes"
    const footer = card.querySelector('.s-card-footer');
    if (footer) {
      const viewPlansBtn = document.createElement('a');
      viewPlansBtn.href = '/plans.html';
      viewPlansBtn.className = 'btn btn-primary btn-sm';
      viewPlansBtn.innerHTML = '<i class="fas fa-arrow-right"></i> Ver planes';
      footer.appendChild(viewPlansBtn);
    }

    // Evento para activar High Value (delegado)
    setTimeout(() => {
      const activateBtn = card.querySelector('#activateHighValue');
      if (activateBtn) {
        activateBtn.addEventListener('click', () => this.openHighValueModal());
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
    const btn = document.querySelector('#skeleton-page button.btn-primary');
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
