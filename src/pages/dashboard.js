// ============================================================
// src/pages/dashboard/dashboard.js
// ============================================================

import { runSkeleton }           from '/src/skeleton/skeleton.js';
import { createFirebaseAdapter } from '/src/skeleton/adapters/firebaseAdapter.js';
import { createCard }            from '/src/skeleton/components/card/index.js';
import { createButton }          from '/src/skeleton/components/button/index.js';
import { showToast }             from '/src/skeleton/components/toast/index.js';
import { getComercioData }       from '/src/services/firebase/db.js';
import { PLANS, calcularEstadoPlan, getDiasRestantesTrial, hasLiveAccess, isHighValuePlan } from '/src/shared/plans.js';
import './dashboard.css';

// ============================================================
const page = {

  _data: {
    comercio:       null,
    user:           null,
    userData:       null,
    offerType:      {},
    serviciosStats: { activos: 0, pausados: 0, total: 0 },
    productosCount: 0,
    entityState:    'never'   // never | updated | outdated
  },

  // ──────────────────────────────────────────────────────────
  // LOAD
  // ──────────────────────────────────────────────────────────
  async load(ctx) {
    this._data.user     = ctx.user;
    this._data.userData = ctx.userData || {};
    this._data.offerType = ctx.userData?.offerType || {};

    try {
      this._data.comercio = await getComercioData();
    } catch (err) {
      console.error('[dashboard] Error cargando comercio:', err);
      this._data.comercio = {};
    }

    await this._loadServiciosStats();
    this._data.productosCount = this._data.comercio.cantidadProductos || 0;
    this._calculateEntityState();
  },

  _calculateEntityState() {
    const c          = this._data.comercio;
    const lastGen    = c.entityLastGeneratedAt?.toDate?.() || null;
    const lastUpdate = c.lastConfigUpdateAt?.toDate?.()    || null;

    if (!lastGen) { this._data.entityState = 'never'; return; }

    this._data.entityState = (lastUpdate && lastUpdate > lastGen)
      ? 'outdated'
      : 'updated';
  },

  async _loadServiciosStats() {
    try {
      const { getDocs, collection, db } = await import('firebase/firestore');
      const snapshot = await getDocs(
        collection(db, 'comercios', this._data.comercio.id, 'servicios')
      );
      let activos = 0, pausados = 0;
      snapshot.docs.forEach(d => {
        d.data().activo === false ? pausados++ : activos++;
      });
      this._data.serviciosStats = { activos, pausados, total: activos + pausados };
    } catch {
      this._data.serviciosStats = { activos: 0, pausados: 0, total: 0 };
    }
  },

  // ──────────────────────────────────────────────────────────
  // RENDER
  // ──────────────────────────────────────────────────────────
  render() {
    const root = document.getElementById('skeleton-page');
    root.innerHTML = '';

    // Zona superior: Plan + Usuario
    root.appendChild(this._renderZonaSuperior());

    // Banner global (solo si hay problema con la entidad)
    if (this._data.entityState === 'outdated') root.appendChild(this._renderOutdatedBanner());
    if (this._data.entityState === 'never')    root.appendChild(this._renderNeverGeneratedBanner());

    // Secciones
    root.appendChild(this._renderSeccion(
      '🏪 El Comercio',
      'Tu estructura base: qué ofrecés, cuándo y cómo.',
      this._renderSeccionComercio()
    ));

    root.appendChild(this._renderSeccion(
      '🤖 La IA del Comercio',
      'Configurá el cerebro de tu asistente.',
      this._renderSeccionIA()
    ));

    root.appendChild(this._renderSeccion(
      '🚀 Publicación',
      'Generá y compartí tu entidad con el mundo.',
      this._renderSeccionPublicacion()
    ));

    root.appendChild(this._renderSeccion(
      '📊 Rendimiento',
      'Medí el impacto de tu IA.',
      this._renderSeccionRendimiento()
    ));
  },

  // ──────────────────────────────────────────────────────────
  // ZONA SUPERIOR
  // ──────────────────────────────────────────────────────────
  _renderZonaSuperior() {
    const zona = document.createElement('div');
    zona.className = 'dashboard-top';
    zona.appendChild(this._renderPlanCard());
    zona.appendChild(this._renderUsuarioCard());
    return zona;
  },

  _renderPlanCard() {
    const planId = this._data.comercio.plan || 'trial';
    const plan   = PLANS[planId] || PLANS.trial;
    const estado = calcularEstadoPlan(this._data.comercio);

    let estadoText = '';
    if (estado === 'trial') {
      const dias = getDiasRestantesTrial(this._data.comercio);
      estadoText = `Trial activo — te quedan <strong>${dias} días</strong>`;
    } else if (estado === 'activo') {
      estadoText = isHighValuePlan(planId)
        ? 'High Value activo — comisión por ventas'
        : `Plan ${plan.nombre} activo`;
    }

    const liveOk = hasLiveAccess(planId, this._data.comercio.liveEnabled);

    const content = document.createElement('div');
    content.innerHTML = `
      <p class="plan-nombre"><strong>${plan.nombre}</strong></p>
      <p class="plan-descripcion">${plan.descripcion}</p>
      <p class="plan-estado">${estadoText}</p>
      <p class="plan-live">${liveOk ? '✓ Interacción continua incluida' : 'Interacción continua no disponible'}</p>
    `;

    if (!isHighValuePlan(planId)) {
      content.appendChild(this._renderHighValuePromo());
    }

    return createCard({
      title: 'Tu Plan',
      icon: 'fa-crown',
      variant: 'primary',
      highlight: true,
      content,
      action: {
        type: 'link',
        url: '/plans.html',
        label: 'Ver planes',
        className: 's-btn s-btn-primary s-btn-sm'
      }
    });
  },

  _renderHighValuePromo() {
    const div = document.createElement('div');
    div.className = 'highvalue-promo';
    div.innerHTML = `
      <strong>💼 Plan High Value (Gratis)</strong>
      <p>Autos, inmuebles, maquinaria. Sin costo mensual, comisión 5% por ventas.</p>
    `;
    div.appendChild(createButton({
      label: 'Activar High Value',
      variant: 'primary',
      size: 'sm',
      onClick: () => this._openHighValueModal()
    }));
    return div;
  },

  _renderUsuarioCard() {
    const user     = this._data.user;
    const userData = this._data.userData;
    const nombre   = userData?.nombre || user?.displayName || 'Usuario';
    const email    = user?.email || '';

    const content = document.createElement('div');
    content.innerHTML = `
      <p class="usuario-nombre"><strong>${nombre}</strong></p>
      <p class="usuario-email">${email}</p>
    `;

    return createCard({
      title: 'Mi Perfil',
      icon: 'fa-user',
      compact: true,
      flat: true,
      content,
      action: {
        type: 'link',
        url: '/usuario.html?edit=true',
        label: 'Editar perfil',
        className: 's-btn s-btn-secondary s-btn-sm'
      }
    });
  },

  // ──────────────────────────────────────────────────────────
  // HELPER SECCIÓN
  // ──────────────────────────────────────────────────────────
  _renderSeccion(titulo, descripcion, grid) {
    const seccion = document.createElement('section');
    seccion.className = 'dashboard-seccion';

    const header = document.createElement('div');
    header.className = 'seccion-header';
    header.innerHTML = `
      <h2 class="seccion-titulo">${titulo}</h2>
      <p class="seccion-descripcion">${descripcion}</p>
    `;

    seccion.appendChild(header);
    seccion.appendChild(grid);
    return seccion;
  },

  // ──────────────────────────────────────────────────────────
  // SECCIÓN 1 — EL COMERCIO
  // ──────────────────────────────────────────────────────────
  _renderSeccionComercio() {
    const grid = document.createElement('div');
    grid.className = 'dashboard-grid';

    grid.appendChild(this._renderMiComercioCard());
    grid.appendChild(this._renderModeloNegocioCard());
    grid.appendChild(this._renderProductosCard());
    grid.appendChild(this._renderServiciosCard());
    grid.appendChild(this._renderHorariosCard());

    return grid;
  },

  _renderMiComercioCard() {
    return createCard({
      title: 'Mi Comercio',
      icon: 'fa-store',
      content: '<p>Nombre, dirección, contacto y datos generales</p>',
      action: { type: 'link', url: '/mi-comercio.html?edit=true', label: 'Editar', className: 's-btn s-btn-secondary s-btn-sm' }
    });
  },

  _renderModeloNegocioCard() {
    return createCard({
      title: 'Modelo de Negocio',
      icon: 'fa-sitemap',
      content: '<p>Qué ofrecés: productos, servicios o ambos</p>',
      action: { type: 'link', url: '/crear-entidad.html?edit=true', label: 'Editar', className: 's-btn s-btn-secondary s-btn-sm' }
    });
  },

  _renderProductosCard() {
    const hasProductos = this._data.offerType.productos === true;
    const count        = this._data.productosCount;

    if (hasProductos) {
      return createCard({
        title: 'Productos',
        icon: 'fa-box',
        content: `<p>${count} producto${count !== 1 ? 's' : ''} cargado${count !== 1 ? 's' : ''}</p>`,
        action: { type: 'link', url: '/productos.html?edit=true', label: 'Editar', className: 's-btn s-btn-secondary s-btn-sm' }
      });
    }

    return createCard({
      title: 'Productos',
      icon: 'fa-box',
      flat: true,
      content: '<p class="inactive-text">No habilitado</p><p>Vendé artículos físicos o digitales</p>',
      action: { type: 'link', url: '/crear-entidad.html?edit=true', label: 'Habilitar', className: 's-btn s-btn-outline-primary s-btn-sm' }
    });
  },

  _renderServiciosCard() {
    const hasServicios             = this._data.offerType.servicios === true;
    const { activos, pausados, total } = this._data.serviciosStats;

    if (hasServicios) {
      const content = document.createElement('div');
      content.innerHTML = `
        <p>${total} servicio${total !== 1 ? 's' : ''}</p>
        <p>
          <span class="badge-activo">🟢 ${activos} activo${activos !== 1 ? 's' : ''}</span>
          ${pausados > 0 ? `<span class="badge-pausado"> · 🔴 ${pausados} pausado${pausados !== 1 ? 's' : ''}</span>` : ''}
        </p>
      `;
      return createCard({
        title: 'Servicios',
        icon: 'fa-concierge-bell',
        content,
        action: { type: 'link', url: '/servicios.html?edit=true', label: 'Editar', className: 's-btn s-btn-secondary s-btn-sm' }
      });
    }

    return createCard({
      title: 'Servicios',
      icon: 'fa-concierge-bell',
      flat: true,
      content: '<p class="inactive-text">No habilitado</p><p>Ofrecé turnos o atención por hora</p>',
      action: { type: 'link', url: '/crear-entidad.html?edit=true', label: 'Habilitar', className: 's-btn s-btn-outline-primary s-btn-sm' }
    });
  },

  _renderHorariosCard() {
    const ok = this._data.comercio.onboardingSteps?.horarios === true;
    return createCard({
      title: 'Horarios',
      icon: 'fa-clock',
      content: `<p>${ok ? 'Configurados ✓' : 'Sin configurar'}</p>`,
      action: { type: 'link', url: '/horarios.html?edit=true', label: 'Editar', className: 's-btn s-btn-secondary s-btn-sm' }
    });
  },

  // ──────────────────────────────────────────────────────────
  // SECCIÓN 2 — LA IA
  // ──────────────────────────────────────────────────────────
  _renderSeccionIA() {
    const grid = document.createElement('div');
    grid.className = 'dashboard-grid';

    grid.appendChild(this._renderIAConfigCard());
    grid.appendChild(this._renderCapacidadesCognitivasCard());
    grid.appendChild(this._renderVisualBuilderCard());

    return grid;
  },

  _renderIAConfigCard() {
    return createCard({
      title: 'Configuración IA',
      icon: 'fa-robot',
      variant: 'primary',
      content: '<p>Personalidad, tono y comportamiento del asistente</p>',
      action: { type: 'link', url: '/ia-config.html?edit=true', label: 'Editar', className: 's-btn s-btn-primary s-btn-sm' }
    });
  },

  _renderCapacidadesCognitivasCard() {
    const permisos   = this._data.comercio.cognitive_permissions || {};
    const activas    = Object.entries(permisos)
      .filter(([_, v]) => v?.enabled)
      .map(([_, v]) => v.label);
    const hayActivas = activas.length > 0;

    const content = document.createElement('div');
    if (hayActivas) {
      const lista = document.createElement('ul');
      lista.className = 'capacidades-list';
      activas.forEach(label => {
        const li = document.createElement('li');
        li.textContent = label;
        lista.appendChild(li);
      });
      content.appendChild(lista);
    } else {
      content.innerHTML = `<p class="inactive-text">Ninguna capacidad activa</p>`;
    }

    return createCard({
      title: 'Capacidades Cognitivas',
      icon: 'fa-brain',
      variant: 'primary',
      highlight: hayActivas,
      content,
      action: {
        type: 'link',
        url: '/capacidadesCognitivas.html',
        label: hayActivas ? 'Editar' : 'Configurar',
        className: hayActivas ? 's-btn s-btn-primary s-btn-sm' : 's-btn s-btn-outline-primary s-btn-sm'
      }
    });
  },

  _renderVisualBuilderCard() {
    return createCard({
      title: 'Visual Builder',
      icon: 'fa-palette',
      variant: 'primary',
      highlight: true,
      content: '<p>Personalizá la apariencia y estética de tu IA</p>',
      action: { type: 'link', url: '/visual.html', label: 'Acceder', className: 's-btn s-btn-primary s-btn-sm' }
    });
  },

  // ──────────────────────────────────────────────────────────
  // SECCIÓN 3 — PUBLICACIÓN
  // ──────────────────────────────────────────────────────────
  _renderSeccionPublicacion() {
    const grid = document.createElement('div');
    grid.className = 'dashboard-grid';

    grid.appendChild(this._renderGenerarEntidadCard());
    grid.appendChild(this._renderLinkPublicoCard());

    return grid;
  },

  _renderGenerarEntidadCard() {
    const cfg = {
      never:    { label: 'Generar',    variant: 'danger',  badge: 'No publicada',       badgeClass: 'danger'  },
      outdated: { label: 'Actualizar', variant: 'warning', badge: 'Cambios pendientes',  badgeClass: 'warning' },
      updated:  { label: 'Regenerar',  variant: 'primary', badge: 'Publicada ✓',         badgeClass: 'success' }
    }[this._data.entityState];

    const content = document.createElement('div');
    content.innerHTML = `
      <p>Publicá tu catálogo, horarios y configuración IA</p>
      <span class="entity-badge ${cfg.badgeClass}">${cfg.badge}</span>
    `;

    const card = createCard({
      title: 'Generar Entidad',
      icon: 'fa-magic',
      variant: cfg.variant,
      highlight: true,
      content,
      action: {
        type: 'button',
        label: cfg.label,
        className: `s-btn s-btn-${cfg.variant} s-btn-sm`,
        onClick: () => this._generarEntidad()
      }
    });

    card.id = 'card-generar-entidad';
    return card;
  },

  _renderLinkPublicoCard() {
    const disabled = this._data.entityState === 'never';

    return createCard({
      title: 'Mi Link Público',
      icon: 'fa-link',
      variant: disabled ? null : 'primary',
      highlight: !disabled,
      flat: disabled,
      content: disabled
        ? '<p class="inactive-text">Generá la entidad primero</p>'
        : '<p>URL permanente y QR personalizado para compartir</p>',
      action: disabled ? null : {
        type: 'link',
        url: '/link-publico.html',
        label: 'Ver link y QR',
        className: 's-btn s-btn-primary s-btn-sm'
      }
    });
  },

  // ──────────────────────────────────────────────────────────
  // SECCIÓN 4 — RENDIMIENTO
  // ──────────────────────────────────────────────────────────
  _renderSeccionRendimiento() {
    const grid = document.createElement('div');
    grid.className = 'dashboard-grid';

    grid.appendChild(createCard({
      title: 'Estadísticas',
      icon: 'fa-chart-bar',
      content: '<p>Visitas, consultas y conversiones de tu landing</p>',
      action: { type: 'link', url: '/stats.html', label: 'Ver estadísticas', className: 's-btn s-btn-secondary s-btn-sm' }
    }));

    return grid;
  },

  // ──────────────────────────────────────────────────────────
  // BANNERS
  // ──────────────────────────────────────────────────────────
  _renderOutdatedBanner() {
    const banner = document.createElement('div');
    banner.className = 'entity-banner warning';
    banner.innerHTML = `<i class="fas fa-exclamation-triangle"></i> Tu entidad publicada no refleja los últimos cambios.`;
    banner.appendChild(createButton({
      label: 'Actualizar ahora',
      variant: 'warning',
      size: 'sm',
      onClick: () => this._scrollToGenerar()
    }));
    return banner;
  },

  _renderNeverGeneratedBanner() {
    const banner = document.createElement('div');
    banner.className = 'entity-banner danger';
    banner.innerHTML = `<i class="fas fa-times-circle"></i> Tu entidad aún no fue publicada. Tu IA no está disponible.`;
    banner.appendChild(createButton({
      label: 'Generar ahora',
      variant: 'danger',
      size: 'sm',
      onClick: () => this._scrollToGenerar()
    }));
    return banner;
  },

  _scrollToGenerar() {
    const el = document.getElementById('card-generar-entidad');
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.classList.add('pulse-highlight');
    setTimeout(() => el.classList.remove('pulse-highlight'), 1500);
  },

  // ──────────────────────────────────────────────────────────
  // ACCIONES
  // ──────────────────────────────────────────────────────────
  async _generarEntidad() {
    const btn = document.querySelector('#card-generar-entidad button');
    if (!btn || btn.disabled) return;

    const originalHTML = btn.innerHTML;
    btn.disabled  = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generando...';

    try {
      const response = await fetch('/api/generate-and-upload-entity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comercioId: this._data.comercio.id })
      });

      const data = await response.json();
      if (!data.ok) throw new Error(data.error);

      showToast('Entidad publicada correctamente', 'success');

      const { updateDoc, doc, db, serverTimestamp } = await import('firebase/firestore');
      await updateDoc(doc(db, 'comercios', this._data.comercio.id), {
        entityLastGeneratedAt: serverTimestamp()
      });

      this._data.comercio.entityLastGeneratedAt = new Date();
      this._calculateEntityState();
      this.render();

    } catch (err) {
      console.error('[dashboard] Error generando entidad:', err);
      showToast('Error: ' + err.message, 'error');
      btn.innerHTML = originalHTML;
      btn.disabled  = false;
    }
  },

  _openHighValueModal() {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-content">
        <h3>Activar Plan High Value (Gratis)</h3>
        <p>Ideal para ventas de alto valor: autos, inmuebles, maquinaria.</p>
        <ul>
          <li>Productos ilimitados</li>
          <li>Interacción continua incluida</li>
          <li>Sin costo mensual</li>
          <li>Comisión del 5% solo sobre ventas comprobadas</li>
        </ul>
        <p class="modal-warning">El ocultamiento de ventas resultará en desactivación permanente.</p>
        <label class="modal-checkbox">
          <input type="checkbox" id="acceptHVTerms">
          Acepto los términos del plan High Value
        </label>
        <div class="modal-actions">
          <button id="cancelHV"  class="s-btn s-btn-secondary s-btn-sm">Cancelar</button>
          <button id="confirmHV" class="s-btn s-btn-primary   s-btn-sm" disabled>Activar</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    const checkbox   = modal.querySelector('#acceptHVTerms');
    const confirmBtn = modal.querySelector('#confirmHV');

    checkbox.addEventListener('change', () => { confirmBtn.disabled = !checkbox.checked; });

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
        this.render();
      } catch (err) {
        showToast('Error al activar', 'error');
      }
    });

    modal.querySelector('#cancelHV').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
  }
};

// ============================================================
runSkeleton({
  page,
  adapter: createFirebaseAdapter,
  options: { loadingMessage: 'Cargando dashboard...' }
});
