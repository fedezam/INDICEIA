// ============================================================
// src/pages/dashboard/dashboard.js
// ============================================================
// Dashboard migrado a skeleton canónico
// Solo lectura + navegación, sin dirty state (no hay formulario)
// ============================================================

// ==================== SKELETON CORE ====================
import { runSkeleton }             from '/src/skeleton/skeleton.js';
import { createFirebaseAdapter }   from '/src/skeleton/adapters/firebaseAdapter.js';

// ==================== COMPONENTES ====================
import { createCard }   from '/src/skeleton/components/card/index.js';
import { createButton } from '/src/skeleton/components/button/index.js';
import { showToast }    from '/src/skeleton/components/toast/index.js';

// ==================== DB HELPERS ====================
import { getComercioData } from '/src/services/firebase/db.js';

// ==================== SHARED ====================
import { PLANS, calcularEstadoPlan, getDiasRestantesTrial, hasLiveAccess, isHighValuePlan } from '/src/shared/plans.js';

// ==================== ESTILOS ====================
import './dashboard.css';

// ============================================================
// MÓDULO DE PÁGINA
// ============================================================
const page = {
  _data: {
    comercio: null,
    user: null,
    offerType: {},
    serviciosStats: { activos: 0, pausados: 0, total: 0 },
    productosCount: 0
  },

  // ──────────────────────────────────────────────────────────
  // LOAD — solo datos
  // ──────────────────────────────────────────────────────────
  async load(ctx) {
    this._data.user = ctx.user;
    this._data.offerType = ctx.userData?.offerType || {};
    
    try {
      this._data.comercio = await getComercioData();
    } catch (err) {
      console.error('Error cargando comercio:', err);
      this._data.comercio = {
        nombreComercio: 'Mi Comercio',
        plan: 'trial',
        onboardingSteps: {},
        stats: { productosCount: 0, horariosConfigurados: false }
      };
    }

    // Cargar stats de servicios desde subcolección
    await this._loadServiciosStats();
    
    // Productos count desde comercio
    this._data.productosCount = this._data.comercio.cantidadProductos || 0;
  },

  async _loadServiciosStats() {
    try {
      const { getDocs, collection, db } = await import('firebase/firestore');
      const comercioId = this._data.comercio.id;
      
      const snapshot = await getDocs(
        collection(db, 'comercios', comercioId, 'servicios')
      );

      let activos = 0, pausados = 0;
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        data.activo === false ? pausados++ : activos++;
      });

      this._data.serviciosStats = { activos, pausados, total: activos + pausados };
    } catch (err) {
      console.error('Error cargando stats servicios:', err);
      this._data.serviciosStats = { activos: 0, pausados: 0, total: 0 };
    }
  },

  // ──────────────────────────────────────────────────────────
  // RENDER — solo DOM, usando componentes
  // ──────────────────────────────────────────────────────────
  render() {
    const root = document.getElementById('skeleton-page');
    root.innerHTML = '';

    // Header de página
    const header = document.createElement('div');
    header.className = 'page-header';
    header.innerHTML = `
      <h1><i class="fas fa-chart-line"></i> Dashboard</h1>
      <p>Resumen general y accesos rápidos a todas las secciones</p>
    `;
    root.appendChild(header);

    // Plan actual (card destacada)
    root.appendChild(this._renderPlanCard());

    // Grid de cards principales
    const grid = document.createElement('section');
    grid.className = 'dashboard-grid';

    // Cards condicionales según offerType
    grid.appendChild(this._renderServiciosCard());
    grid.appendChild(this._renderProductosCard());
    
    // Cards siempre visibles
    grid.appendChild(this._renderHorariosCard());
    grid.appendChild(this._renderIAConfigCard());
    grid.appendChild(this._renderVisualBuilderCard());
    grid.appendChild(this._renderStatsCard());
    grid.appendChild(this._renderGenerarEntidadCard());
    grid.appendChild(this._renderLinkPublicoCard());

    root.appendChild(grid);
  },

  // ──────────────────────────────────────────────────────────
  // CARDS ESPECÍFICAS
  // ──────────────────────────────────────────────────────────
  _renderPlanCard() {
    const planId = this._data.comercio.plan || 'trial';
    const plan = PLANS[planId] || PLANS.trial;
    const estado = calcularEstadoPlan(this._data.comercio);

    let bannerText = '';
    if (estado === 'trial') {
      const dias = getDiasRestantesTrial(this._data.comercio);
      bannerText = `Trial activo – Te quedan <strong>${dias} días</strong> de acceso completo`;
    } else if (estado === 'activo') {
      bannerText = isHighValuePlan(planId) 
        ? `Plan High Value activo – Gratis con comisión por ventas`
        : `Plan ${plan.nombre} activo – Todo funcionando`;
    } else {
      bannerText = `Bienvenido`;
    }

    const liveStatus = hasLiveAccess(planId, this._data.comercio.liveEnabled)
      ? '<p><strong>Interacción continua:</strong> Activada ✓</p>'
      : '<p><strong>Interacción continua:</strong> No disponible</p>';

    const highValueSection = isHighValuePlan(planId)
      ? '<p style="color:#28a745;font-weight:bold;">Plan High Value activo</p>'
      : this._renderHighValuePromo();

    const content = document.createElement('div');
    content.innerHTML = `
      <p><strong>${plan.nombre}</strong></p>
      <p>${plan.descripcion}</p>
      ${liveStatus}
      ${highValueSection}
    `;

    const card = createCard({
      title: 'Tu Plan Actual',
      icon: 'fa-crown',
      variant: 'primary',
      highlight: true,
      content: content,
      action: {
        type: 'link',
        url: '/plans.html',
        label: 'Ver planes',
        className: 's-btn s-btn-primary s-btn-sm'
      }
    });

    return card;
  },

  _renderHighValuePromo() {
    const div = document.createElement('div');
    div.innerHTML = `
      <div style="margin-top:16px;padding:12px;background:#f0f8ff;border-left:3px solid var(--s-primary);border-radius:4px;">
        <h4 style="margin:0 0 8px;font-size:14px;">💼 Plan High Value (Gratis)</h4>
        <p style="font-size:12px;margin:0 0 8px;">Para autos, inmuebles, maquinaria. Productos ilimitados · Interacción continua · Comisión 5% solo por ventas comprobadas</p>
      </div>
    `;
    const btn = createButton({
      label: 'Activar High Value',
      variant: 'outline-primary',
      size: 'sm',
      onClick: () => this._openHighValueModal()
    });
    div.appendChild(btn);
    return div;
  },

  _renderServiciosCard() {
    const hasServicios = this._data.offerType.servicios === true;
    const { activos, pausados, total } = this._data.serviciosStats;

    if (hasServicios) {
      // ✅ ACTIVO: Editar
      const content = document.createElement('div');
      content.innerHTML = `
        <p>${total} total${total !== 1 ? 'es' : ''}</p>
        <p class="servicios-detail">
          <span class="badge-activo">🟢 ${activos} activo${activos !== 1 ? 's' : ''}</span>
          ${pausados > 0 ? `<span class="badge-pausado">🔴 ${pausados} pausado${pausados !== 1 ? 's' : ''}</span>` : ''}
        </p>
      `;

      return createCard({
        title: 'Servicios',
        icon: 'fa-concierge-bell',
        content: content,
        action: {
          type: 'link',
          url: '/servicios.html?edit=true',
          label: 'Editar',
          className: 's-btn s-btn-secondary s-btn-sm'
        }
      });
    } else {
      // ➕ INACTIVO: Agregar
      return createCard({
        title: 'Servicios',
        icon: 'fa-concierge-bell',
        variant: 'secondary',
        flat: true,
        content: `
          <p class="inactive-text">No habilitado</p>
          <p>Ofrecé turnos o atención por hora</p>
        `,
        action: {
          type: 'link',
          url: '/crear-entidad.html?edit=true',
          label: 'Agregar servicios',
          className: 's-btn s-btn-outline-primary s-btn-sm'
        }
      });
    }
  },

  _renderProductosCard() {
    const hasProductos = this._data.offerType.productos === true;
    const count = this._data.productosCount;

    if (hasProductos) {
      return createCard({
        title: 'Productos',
        icon: 'fa-box',
        content: `<p>${count} producto${count !== 1 ? 's' : ''}</p>`,
        action: {
          type: 'link',
          url: '/productos.html?edit=true',
          label: 'Editar',
          className: 's-btn s-btn-secondary s-btn-sm'
        }
      });
    } else {
      return createCard({
        title: 'Productos',
        icon: 'fa-box',
        variant: 'secondary',
        flat: true,
        content: `
          <p class="inactive-text">No habilitado</p>
          <p>Vendé artículos físicos o digitales</p>
        `,
        action: {
          type: 'link',
          url: '/crear-entidad.html?edit=true',
          label: 'Agregar productos',
          className: 's-btn s-btn-outline-primary s-btn-sm'
        }
      });
    }
  },

  _renderHorariosCard() {
    const horariosOk = this._data.comercio.onboardingSteps?.horarios === true;
    
    return createCard({
      title: 'Horarios',
      icon: 'fa-clock',
      content: `<p>${horariosOk ? 'Configurados ✓' : 'No configurados'}</p>`,
      action: {
        type: 'link',
        url: '/horarios.html?edit=true',
        label: 'Editar',
        className: 's-btn s-btn-secondary s-btn-sm'
      }
    });
  },

  _renderIAConfigCard() {
    return createCard({
      title: 'Configuración IA',
      icon: 'fa-robot',
      content: '<p>Estado mental y capacidades</p>',
      action: {
        type: 'link',
        url: '/ia-config.html?edit=true',
        label: 'Editar',
        className: 's-btn s-btn-secondary s-btn-sm'
      }
    });
  },

  _renderVisualBuilderCard() {
    return createCard({
      title: 'Visual Builder',
      icon: 'fa-palette',
      variant: 'primary',
      highlight: true,
      content: '<p>Personaliza la apariencia de tu IA</p><span class="badge-optional">Opcional</span>',
      action: {
        type: 'link',
        url: '/visual.html',
        label: 'Acceder',
        className: 's-btn s-btn-primary s-btn-sm'
      }
    });
  },

  _renderStatsCard() {
    return createCard({
      title: 'Estadísticas',
      icon: 'fa-chart-bar',
      variant: 'primary',
      highlight: true,
      content: '<p>Visitas y conversiones de tu landing</p>',
      action: {
        type: 'link',
        url: '/stats.html',
        label: 'Ver',
        className: 's-btn s-btn-primary s-btn-sm'
      }
    });
  },

  _renderGenerarEntidadCard() {
    const card = createCard({
      title: 'Generar Entidad',
      icon: 'fa-magic',
      variant: 'primary',
      highlight: true,
      content: '<p>Publica tu menú, horarios y configuración IA al instante</p>',
      action: {
        type: 'button',
        label: 'Generar',
        className: 's-btn s-btn-primary s-btn-sm',
        onClick: () => this._generarEntidad()
      }
    });
    return card;
  },

  _renderLinkPublicoCard() {
    return createCard({
      title: 'Mi Link Público',
      icon: 'fa-link',
      variant: 'primary',
      highlight: true,
      content: '<p>URL permanente y QR personalizado para compartir con clientes</p>',
      action: {
        type: 'link',
        url: '/link-publico.html',
        label: 'Ver link y QR',
        className: 's-btn s-btn-primary s-btn-sm'
      }
    });
  },

  // ──────────────────────────────────────────────────────────
  // ACCIONES
  // ──────────────────────────────────────────────────────────
  async _generarEntidad() {
    const btn = document.querySelector('#skeleton-page .fa-magic').closest('.s-card').querySelector('button');
    if (!btn || btn.disabled) return;

    btn.disabled = true;
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generando...';

    try {
      const response = await fetch('/api/generate-and-upload-entity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comercioId: this._data.comercio.id }),
      });

      const data = await response.json();

      if (data.ok) {
        showToast('¡Entidad generada y publicada con éxito!', 'success');
      } else {
        throw new Error(data.error || 'Error del servidor');
      }
    } catch (err) {
      console.error('Error generando entidad:', err);
      showToast('Error: ' + err.message, 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML = originalText;
    }
  },

  _openHighValueModal() {
    // ... lógica del modal (igual que antes, adaptada a skeleton)
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
          <li>Comisión del 5% solo sobre ventas comprobadas</li>
        </ul>
        <p class="warning">El ocultamiento deliberado de ventas comprobadas resultará en la desactivación permanente.</p>
        <label>
          <input type="checkbox" id="acceptHVTerms">
          Acepto los términos del plan High Value
        </label>
        <div class="modal-actions">
          <button id="cancelHV" class="s-btn s-btn-secondary s-btn-sm">Cancelar</button>
          <button id="confirmHV" class="s-btn s-btn-primary s-btn-sm" disabled>Activar</button>
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
        const { updateDoc, doc, db } = await import('firebase/firestore');
        await updateDoc(doc(db, 'comercios', this._data.comercio.id), {
          plan: 'highvalue',
          liveEnabled: true,
          commissionEnabled: true,
          'terms.highValueAccepted': true,
          'terms.acceptedAt': new Date()
        });
        showToast('Plan High Value activado', 'success');
        modal.remove();
        this.render(); // Re-renderizar para actualizar card de plan
      } catch (err) {
        showToast('Error al activar', 'error');
      }
    });

    cancelBtn.addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.remove();
    });
  }
};

// ============================================================
// ARRANQUE
// ============================================================
runSkeleton({
  page,
  adapter: createFirebaseAdapter,
  options: { loadingMessage: 'Cargando dashboard...' }
});
