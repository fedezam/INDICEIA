// ============================================================
// src/pages/dashboard/dashboard.js
// ============================================================

import { runSkeleton }           from '../skeleton/skeleton.js';
import { createFirebaseAdapter } from '/src/skeleton/adapters/firebaseAdapter.js';
import { createCard }            from '/src/skeleton/components/card/index.js';
import { createButton }          from '/src/skeleton/components/button/index.js';
import { showToast }             from '/src/skeleton/components/toast/index.js';
import { getServicios }          from '/src/services/firebase/db.js';
import { runFlowController }     from '/src/controllers/flowController.js';
import { PLANS, calcularEstadoPlan, getDiasRestantesTrial, hasLiveAccess, isHighValuePlan } from '/src/shared/plans.js';
import { db }                    from '/src/services/firebase/firebase.js';
import { collection, getDocs }   from 'firebase/firestore';
import './dashboard.css';

// ============================================================
const page = {

  _data: {
    comercio:       null,
    user:           null,
    userData:       null,
    offerType:      {},
    serviciosStats: { activos: 0, pausados: 0, total: 0 },
    productosStats: { total: 0, activos: 0, pausados: 0, ultimaActualizacion: null },
    entityState:    'never'
  },

  // ──────────────────────────────────────────────────────────
  // LOAD
  // ──────────────────────────────────────────────────────────
  async load(ctx) {
    await runFlowController(ctx.user?.uid);

    console.group('[dashboard] load()');
    console.log('ctx.user:', ctx.user?.uid);
    console.log('ctx.userData:', ctx.userData);
    console.log('ctx.comercioId:', ctx.comercioId);
    console.log('ctx.comercioData completo:', ctx.comercioData);

    this._data.ctx       = ctx;
    this._data.user      = ctx.user;
    this._data.userData  = ctx.userData || {};
    this._data.offerType = ctx.comercioData?.offerType || {};
    this._data.comercio  = ctx.comercioData || {};

    console.log('offerType leído:', this._data.offerType);
    console.groupEnd();

    await Promise.all([
      this._loadServiciosStats(),
      this._loadProductosStats(ctx.comercioId)
    ]);

    this._calculateEntityState();
  },

  // ──────────────────────────────────────────────────────────
  // STATS PRODUCTOS
  // ──────────────────────────────────────────────────────────
  async _loadProductosStats(comercioId) {
    console.group('[dashboard] _loadProductosStats()');
    if (!comercioId) {
      console.warn('sin comercioId, productos vacíos');
      console.groupEnd();
      return;
    }
    try {
      const snap = await getDocs(collection(db, 'entidades', comercioId, 'productos'));
      let activos = 0, pausados = 0, ultimaActualizacion = null;

      snap.docs.forEach(d => {
        const data = d.data();
        data.paused ? pausados++ : activos++;
        const fecha = data.fechaActualizacion?.toDate?.();
        if (fecha && (!ultimaActualizacion || fecha > ultimaActualizacion)) {
          ultimaActualizacion = fecha;
        }
      });

      this._data.productosStats = { total: snap.docs.length, activos, pausados, ultimaActualizacion };

      if (snap.docs.length > 0) {
        this._data.offerType.productos = true;
      }

      console.log('productosStats:', this._data.productosStats);
    } catch (err) {
      console.error('[dashboard] _loadProductosStats() ERROR:', err);
    }
    console.groupEnd();
  },

  // ──────────────────────────────────────────────────────────
  // STATS SERVICIOS
  // ──────────────────────────────────────────────────────────
  async _loadServiciosStats() {
    console.group('[dashboard] _loadServiciosStats()');
    try {
      const servicios = await getServicios();
      let activos = 0, pausados = 0;
      servicios.forEach(s => { s.activo === false ? pausados++ : activos++; });
      this._data.serviciosStats = { activos, pausados, total: activos + pausados };
      console.log('serviciosStats:', this._data.serviciosStats);
    } catch (err) {
      console.error('[dashboard] _loadServiciosStats() ERROR:', err);
      this._data.serviciosStats = { activos: 0, pausados: 0, total: 0 };
    }
    console.groupEnd();
  },

  // ──────────────────────────────────────────────────────────
  // ENTITY STATE
  // ──────────────────────────────────────────────────────────
  _calculateEntityState() {
    console.group('[dashboard] _calculateEntityState()');
    const c = this._data.comercio;

    let lastGen = null;
    if (c.entityGeneratedAt) {
      lastGen = typeof c.entityGeneratedAt === 'string'
        ? new Date(c.entityGeneratedAt)
        : c.entityGeneratedAt?.toDate?.() || null;
    }

    const lastUpdate = c.fechaActualizacion?.toDate?.() || null;

    console.log('lastGen:', lastGen, '| lastUpdate:', lastUpdate);

    if (!lastGen) {
      this._data.entityState = 'never';
      console.log('entityState → never');
      console.groupEnd();
      return;
    }

    this._data.entityState = (lastUpdate && lastUpdate > lastGen) ? 'outdated' : 'updated';
    console.log('entityState →', this._data.entityState);
    console.groupEnd();
  },

  // ──────────────────────────────────────────────────────────
  // RENDER
  // ──────────────────────────────────────────────────────────
  render() {
    console.log('[dashboard] render() | offerType:', this._data.offerType, '| productosStats:', this._data.productosStats);

    const root = document.getElementById('skeleton-page');
    root.innerHTML = '';

    root.appendChild(this._renderZonaSuperior());

    if (this._data.entityState === 'outdated') root.appendChild(this._renderOutdatedBanner());
    if (this._data.entityState === 'never')    root.appendChild(this._renderNeverGeneratedBanner());

    root.appendChild(this._renderSeccion(
      '🏪 Mi Comercio',
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
        variant: 'primary',
        size: 'sm',
        label: 'Ver planes'
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
        variant: 'secondary', size: 'sm'
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
  // SECCIÓN 1 — MI COMERCIO
  // ──────────────────────────────────────────────────────────
  _renderSeccionComercio() {
    const grid = document.createElement('div');
    grid.className = 'dashboard-grid';

    grid.appendChild(this._renderMiComercioCard());
    grid.appendChild(this._renderModeloNegocioCard());
    grid.appendChild(this._renderProductosCard());
    grid.appendChild(this._renderServiciosCard());

    // Entrega solo visible si el comercio tiene productos
    if (this._data.offerType.productos === true) {
      grid.appendChild(this._renderEntregaCard());
    }

    grid.appendChild(this._renderHorariosCard());

    return grid;
  },

  _renderMiComercioCard() {
    return createCard({
      title: 'Mi Comercio',
      icon: 'fa-store',
      content: '<p>Nombre, dirección, contacto y datos generales</p>',
      action: { type: 'link', url: '/mi-comercio.html?edit=true', label: 'Editar', variant: 'secondary', size: 'sm' }
    });
  },

  _renderModeloNegocioCard() {
    return createCard({
      title: 'Modelo de Negocio',
      icon: 'fa-sitemap',
      content: '<p>Qué ofrecés: productos, servicios o ambos</p>',
      action: { type: 'link', url: '/modelo-negocio.html?edit=true', label: 'Editar', variant: 'secondary', size: 'sm' }
    });
  },

  _renderProductosCard() {
    const hasProductos = this._data.offerType.productos === true;
    const { total, activos, pausados, ultimaActualizacion } = this._data.productosStats;

    if (hasProductos) {
      const content = document.createElement('div');

      const linea1 = document.createElement('p');
      linea1.innerHTML = `<strong>${total}</strong> producto${total !== 1 ? 's' : ''} en catálogo`;
      content.appendChild(linea1);

      if (total > 0) {
        const linea2 = document.createElement('p');
        linea2.innerHTML = `
          <span class="badge-activo">🟢 ${activos} activo${activos !== 1 ? 's' : ''}</span>
          ${pausados > 0 ? `<span class="badge-pausado"> · 🔴 ${pausados} pausado${pausados !== 1 ? 's' : ''}</span>` : ''}
        `;
        content.appendChild(linea2);
      }

      if (ultimaActualizacion) {
        const linea3 = document.createElement('p');
        linea3.className = 'ultima-actualizacion';
        linea3.textContent = `Última actualización: ${this._formatFecha(ultimaActualizacion)}`;
        content.appendChild(linea3);
      }

      return createCard({
        title: 'Productos',
        icon: 'fa-box',
        content,
        action: { type: 'link', url: '/productos.html?edit=true', label: 'Editar', variant: 'secondary', size: 'sm' }
      });
    }

    return createCard({
      title: 'Productos',
      icon: 'fa-box',
      flat: true,
      content: '<p class="inactive-text">No habilitado</p><p>Vendé artículos físicos o digitales</p>',
      action: { type: 'link', url: '/modelo-negocio.html?edit=true', label: 'Habilitar', variant: 'outline-primary', size: 'sm' }
    });
  },

  _renderServiciosCard() {
    const hasServicios             = this._data.offerType.servicios === true;
    const { activos, pausados, total } = this._data.serviciosStats;

    if (hasServicios) {
      const content = document.createElement('div');
      content.innerHTML = `
        <p><strong>${total}</strong> servicio${total !== 1 ? 's' : ''}</p>
        <p>
          <span class="badge-activo">🟢 ${activos} activo${activos !== 1 ? 's' : ''}</span>
          ${pausados > 0 ? `<span class="badge-pausado"> · 🔴 ${pausados} pausado${pausados !== 1 ? 's' : ''}</span>` : ''}
        </p>
      `;
      return createCard({
        title: 'Servicios',
        icon: 'fa-concierge-bell',
        content,
        action: { type: 'link', url: '/servicios.html?edit=true', label: 'Editar', variant: 'secondary', size: 'sm' }
      });
    }

    return createCard({
      title: 'Servicios',
      icon: 'fa-concierge-bell',
      flat: true,
      content: '<p class="inactive-text">No habilitado</p><p>Ofrecé turnos o atención por hora</p>',
      action: { type: 'link', url: '/modelo-negocio.html?edit=true', label: 'Habilitar', variant: 'outline-primary', size: 'sm' }
    });
  },

  _renderEntregaCard() {
    const LABELS = {
      salon:        'Atención en el local',
      takeaway:     'Para llevar',
      delivery:     'Delivery a domicilio',
      correo:       'Correo / Mensajería',
      transporte:   'Transporte / Flete',
      comisionista: 'Comisionista',
      descarga:     'Descarga digital',
      email:        'Envío por email',
      a_coordinar:  'A coordinar',
    };

    const entrega    = this._data.comercio.entrega || {};
    const modalidades = Object.keys(entrega);
    const content    = document.createElement('div');

    if (modalidades.length > 0) {
      const lista = document.createElement('ul');
      lista.className = 'entrega-list';
      modalidades.forEach(key => {
        const li = document.createElement('li');
        li.textContent = LABELS[key] || key;
        lista.appendChild(li);
      });
      content.appendChild(lista);
    } else {
      content.innerHTML = '<p class="inactive-text">Sin configurar</p>';
    }

    return createCard({
      title: 'Entregas',
      icon: 'fa-truck',
      content,
      action: { type: 'link', url: '/entrega.html?edit=true', label: 'Editar', variant: 'secondary', size: 'sm' }
    });
  },

  _renderHorariosCard() {
    const ok = this._data.comercio.onboardingSteps?.horarios === true;
    return createCard({
      title: 'Horarios',
      icon: 'fa-clock',
      content: `<p>${ok ? 'Configurados ✓' : 'Sin configurar'}</p>`,
      action: { type: 'link', url: '/horarios.html?edit=true', label: 'Editar', variant: 'secondary', size: 'sm' }
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
      action: { type: 'link', url: '/ia-config.html?edit=true', label: 'Editar', variant: 'primary',   size: 'sm' }
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
        label:   hayActivas ? 'Editar' : 'Configurar',
        variant: hayActivas ? 'primary' : 'outline-primary',
        size:    'sm'
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
      action: { type: 'link', url: '/visual.html', label: 'Acceder', variant: 'primary',   size: 'sm' }
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
        type:    'button',
        label:   cfg.label,
        variant: cfg.variant,
        size:    'sm',
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
        variant: 'primary',   size: 'sm'
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
      action: { type: 'link', url: '/stats.html', label: 'Ver estadísticas', variant: 'secondary', size: 'sm' }
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
  // HELPERS
  // ──────────────────────────────────────────────────────────
  _formatFecha(date) {
    if (!date) return '';
    return new Intl.DateTimeFormat('es-AR', {
      day:    '2-digit',
      month:  '2-digit',
      year:   'numeric',
      hour:   '2-digit',
      minute: '2-digit'
    }).format(date);
  },

  // ──────────────────────────────────────────────────────────
  // ACCIONES
  // ──────────────────────────────────────────────────────────
  async _generarEntidad() {
    const btn = document.querySelector('#card-generar-entidad button');
    if (!btn || btn.disabled) return;

    btn.setLoading(true);

    try {
      console.log('[dashboard] Generando entidad para:', this._data.comercio.id);

      const response = await fetch('/api/generate-and-upload-entity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comercioId: this._data.comercio.id })
      });

      const text = await response.text();
      console.log('[dashboard] API status:', response.status);

      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        throw new Error(`API no devolvió JSON válido (status ${response.status}): ${text.substring(0, 200)}`);
      }

      if (!data.ok) throw new Error(data.error);

      const { doc, updateDoc, serverTimestamp } = await import('firebase/firestore');
      const { db } = await import('/src/services/firebase/firebase.js');

      const comercioRef = doc(db, 'entidades', this._data.comercio.id);
      await updateDoc(comercioRef, { entityGeneratedAt: serverTimestamp() });

      this._data.comercio.entityGeneratedAt = new Date().toISOString();
      this._data.comercio.fechaActualizacion = { toDate: () => new Date(Date.now() - 100) };
      this._calculateEntityState();
      this.render();

      showToast('Entidad publicada correctamente', 'success');

    } catch (err) {
      console.error('[dashboard] Error generando entidad:', err);
      showToast('Error: ' + err.message, 'error');
      btn.setLoading(false);
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
        <div class="modal-actions"></div>
      </div>
    `;

    document.body.appendChild(modal);

    const checkbox    = modal.querySelector('#acceptHVTerms');
    const actionsDiv  = modal.querySelector('.modal-actions');

    const cancelBtn = createButton({
      label:   'Cancelar',
      variant: 'secondary',
      size:    'sm',
      onClick: () => modal.remove()
    });

    const confirmBtn = createButton({
      label:    'Activar',
      variant:  'primary',
      size:     'sm',
      disabled: true,
    });

    actionsDiv.appendChild(cancelBtn);
    actionsDiv.appendChild(confirmBtn);

    checkbox.addEventListener('change', () => {
      checkbox.checked ? confirmBtn.enable() : confirmBtn.disable();
    });

    confirmBtn.addEventListener('click', async () => {
      confirmBtn.setLoading(true);
      try {
        const { updateDoc, doc, db } = await import('firebase/firestore');
        await updateDoc(doc(db, 'entidades', this._data.comercio.id), {
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
        confirmBtn.setLoading(false);
      }
    });

    modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
  }
};

// ============================================================
runSkeleton({
  page,
  adapter: createFirebaseAdapter,
  options: { loadingMessage: 'Cargando dashboard...' }
});
