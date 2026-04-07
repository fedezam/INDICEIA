// ============================================================
// src/pages/stats.js
// ============================================================
import { runSkeleton }                       from '/src/skeleton/skeleton.js';
import { createFirebaseAdapter }             from '/src/skeleton/adapters/firebaseAdapter.js';
import { createCard }                        from '/src/skeleton/components/card/index.js';
import { createButton }                      from '/src/skeleton/components/button/index.js';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db }                                from '/src/services/firebase/firebase.js';
import './stats.css';

// ============================================================
const page = {

  _stats: null,

  // ──────────────────────────────────────────────────────────
  // LOAD
  // ──────────────────────────────────────────────────────────
  async load(ctx) {
    const slug = ctx.comercioData?.landing?.slug;
    if (!slug) return;

    const q    = query(collection(db, 'landing_events'), where('destination', '==', slug));
    const snap = await getDocs(q);

    const events = [];
    snap.forEach(d => events.push(d.data()));

    this._stats = this._process(events);
  },

  // ──────────────────────────────────────────────────────────
  // PROCESS
  // ──────────────────────────────────────────────────────────
  _process(events) {
    if (!events.length) return null;

    const views     = events.filter(e => e.event === 'landing_view').length;
    const clicks    = events.filter(e => e.event === 'talk_click').length;
    const ctr       = views ? ((clicks / views) * 100).toFixed(1) : 0;
    const abandonos = views - clicks;

    // ── Dispositivos ──────────────────────────────────────
    const dispositivos = {};
    events.forEach(e => {
      const d = e.device || 'unknown';
      if (!dispositivos[d]) dispositivos[d] = { views: 0, clicks: 0 };
      if (e.event === 'landing_view') dispositivos[d].views++;
      if (e.event === 'talk_click')   dispositivos[d].clicks++;
    });

    // ── Orígenes ──────────────────────────────────────────
    const origenes = {};
    events.forEach(e => {
      if (e.event !== 'landing_view') return;
      const src = e.src || 'direct';
      if (!origenes[src]) origenes[src] = { views: 0, clicks: 0, srcType: e.srcType || 'channel' };
      origenes[src].views++;
    });
    // clicks únicos por fingerprint+src para evitar CTR > 100%
    const clickedFpSrc = new Set();
    events.forEach(e => {
      if (e.event !== 'talk_click') return;
      const src = e.src || 'direct';
      const key = `${e.fingerprint || 'nofp'}__${src}`;
      if (clickedFpSrc.has(key)) return;
      clickedFpSrc.add(key);
      if (origenes[src]) origenes[src].clicks++;
    });

    // ── Horarios ──────────────────────────────────────────
    const horarios = {};
    events.forEach(e => {
      const dt = e.timestamp?.toDate ? e.timestamp.toDate() : new Date(e.timestamp);
      const h  = dt.getHours();
      if (!horarios[h]) horarios[h] = { views: 0, clicks: 0 };
      if (e.event === 'landing_view') horarios[h].views++;
      if (e.event === 'talk_click')   horarios[h].clicks++;
    });

    return { views, clicks, ctr, abandonos, dispositivos, origenes, horarios };
  },

  // ──────────────────────────────────────────────────────────
  // RENDER
  // ──────────────────────────────────────────────────────────
  render() {
    const root = document.getElementById('skeleton-page');
    root.innerHTML = '';

    const header = document.createElement('div');
    header.className = 'page-header';
    header.innerHTML = `
      <h1><i class="fas fa-chart-bar"></i> Estadísticas</h1>
      <p class="page-subtitle">Cómo interactúan tus visitantes con tu asistente IA</p>
    `;
    root.appendChild(header);

    if (!this._stats) {
      root.appendChild(this._renderSinDatos());
      root.appendChild(this._renderBotonVolver());
      return;
    }

    root.appendChild(this._renderGeneral());
    root.appendChild(this._renderOrigenes());
    root.appendChild(this._renderDispositivos());
    root.appendChild(this._renderHorarios());
    root.appendChild(this._renderBotonVolver());
  },

  // ──────────────────────────────────────────────────────────
  // BOTÓN VOLVER
  // ──────────────────────────────────────────────────────────
  _renderBotonVolver() {
    const div = document.createElement('div');
    div.className = 'page-footer-action';
    div.appendChild(createButton({
      label:   'Volver al dashboard',
      variant: 'secondary',
      icon:    'fa-arrow-left',
      onClick: () => window.location.href = '/dashboard.html'
    }));
    return div;
  },

  // ──────────────────────────────────────────────────────────
  // SIN DATOS
  // ──────────────────────────────────────────────────────────
  _renderSinDatos() {
    const el = document.createElement('div');
    el.className = 'empty-state';
    el.innerHTML = `
      <i class="fas fa-chart-bar"></i>
      <h2>Todavía no hay datos</h2>
      <p>Cuando alguien visite tu landing pública, las estadísticas aparecerán acá.</p>
    `;
    return el;
  },

  // ──────────────────────────────────────────────────────────
  // GENERAL
  // ──────────────────────────────────────────────────────────
  _renderGeneral() {
    const { views, clicks, ctr, abandonos } = this._stats;
    const container = document.createElement('div');
    container.className = 'kpi-grid';
    const ctrClass = ctr >= 50 ? 'ctr-high' : ctr >= 25 ? 'ctr-medium' : 'ctr-low';

    // tooltip solo para Conversión
    const ctrTooltip = `De cada 100 personas que entraron, ${ctr} hablaron con la IA. ${
      ctr >= 50 ? 'Excelente: tu página convence.' :
      ctr >= 25 ? 'Regular: uno de cada cuatro interactúa.' :
                  'Bajo: pocos visitantes terminan chateando.'
    }`;

    container.innerHTML = `
      <div class="kpi-box">
        <i class="fas fa-users"></i>
        <span class="kpi-value">${views}</span>
        <span class="kpi-label">Personas que entraron</span>
        <span class="kpi-desc">cuántas veces abrieron tu página</span>
      </div>
      <div class="kpi-box">
        <i class="fas fa-robot"></i>
        <span class="kpi-value">${clicks}</span>
        <span class="kpi-label">Empezaron a chatear</span>
        <span class="kpi-desc">le dieron al botón para hablar con tu asistente</span>
      </div>
      <div class="kpi-box kpi-tooltip-wrap" title="${ctrTooltip}">
        <i class="fas fa-percentage"></i>
        <span class="kpi-value ${ctrClass}">${ctr}%</span>
        <span class="kpi-label">De cada 100, cuántos chatearon <i class="fas fa-info-circle kpi-info-icon"></i></span>
        <span class="kpi-desc">si es alto, tu página convence</span>
      </div>
      <div class="kpi-box">
        <i class="fas fa-sign-out-alt"></i>
        <span class="kpi-value">${abandonos}</span>
        <span class="kpi-label">Se fueron sin chatear</span>
        <span class="kpi-desc">entraron pero no interactuaron con la IA</span>
      </div>
    `;

    return createCard({ title: 'General', icon: 'fa-chart-pie', content: container });
  },

  // ──────────────────────────────────────────────────────────
  // NOMBRES LEGIBLES
  // ──────────────────────────────────────────────────────────
  _srcLabel(src, srcType) {
    const NOMBRES = {
      qr:     'Código QR',
      ig:     'Instagram',
      fb:     'Facebook',
      web:    'Sitio web',
      wa:     'WhatsApp',
      email:  'Correo electrónico',
      ads:    'Publicidad',
      direct: 'Directo'
    };
    if (srcType === 'entity') return `Entidad: ${src}`;
    return NOMBRES[src] || src;
  },

  _ctrInterpret(ctr) {
    if (ctr >= 50) return 'Excelente. La mayoría de los que llegan por acá chatean.';
    if (ctr >= 25) return 'Regular. Uno de cada cuatro interactúa.';
    return 'Bajo. Este canal trae visitas pero no convierte bien.';
  },

  // ──────────────────────────────────────────────────────────
  // ORIGEN DEL TRÁFICO
  // ──────────────────────────────────────────────────────────
  _renderOrigenes() {
    const { origenes, views } = this._stats;
    const container = document.createElement('div');
    container.className = 'stats-list';

    const ICONOS = {
      qr: 'fa-qrcode', ig: 'fa-instagram', fb: 'fa-facebook',
      wa: 'fa-whatsapp', web: 'fa-globe', email: 'fa-envelope',
      ads: 'fa-ad', direct: 'fa-link'
    };

    Object.entries(origenes)
      .sort((a, b) => b[1].views - a[1].views)
      .forEach(([src, data]) => {
        // % del total de visitas (suma 100%)
        const pct      = views ? ((data.views / views) * 100).toFixed(1) : 0;
        // CTR solo para tooltip
        const ctr      = data.views ? Math.min((data.clicks / data.views) * 100, 100).toFixed(1) : 0;
        const icon     = ICONOS[src] || (data.srcType === 'entity' ? 'fa-robot' : 'fa-link');
        const label    = this._srcLabel(src, data.srcType);
        const tooltipTxt = `${label}: ${data.views} visitas · ${data.clicks} chatearon · Conversión: ${ctr}% — ${this._ctrInterpret(ctr)}`;

        const row = document.createElement('div');
        row.className = 'stats-row';
        row.title = tooltipTxt;
        row.innerHTML = `
          <div class="stats-row-label">
            <i class="fas ${icon}"></i>
            <span>${label}</span>
            ${data.srcType === 'entity' ? '<span class="badge-entity">entidad</span>' : ''}
          </div>
          <div class="stats-row-bar"><div class="bar-fill" style="width:${pct}%"></div></div>
          <div class="stats-row-nums">
            <span>${data.views} visitas</span>
            <span class="pct-total">${pct}%</span>
          </div>
        `;
        container.appendChild(row);
      });

    const hint = document.createElement('p');
    hint.className = 'stats-hint';
    hint.textContent = 'Tocá cada fila para ver cuántos chatearon desde ese canal.';
    container.appendChild(hint);

    return createCard({ title: 'Origen del tráfico', icon: 'fa-share-alt', content: container });
  },

  // ──────────────────────────────────────────────────────────
  // DISPOSITIVOS
  // ──────────────────────────────────────────────────────────
  _renderDispositivos() {
    const { dispositivos, views } = this._stats;
    const container = document.createElement('div');
    container.className = 'stats-list';

    const ICONOS  = { android: 'fa-android', ios: 'fa-apple', web: 'fa-desktop', unknown: 'fa-question' };
    const NOMBRES = { android: 'Android', ios: 'iPhone / iPad', web: 'Computadora', unknown: 'Desconocido' };

    Object.entries(dispositivos)
      .sort((a, b) => b[1].views - a[1].views)
      .forEach(([device, data]) => {
        const pct   = views ? ((data.views / views) * 100).toFixed(1) : 0;
        const ctr   = data.views ? Math.min((data.clicks / data.views) * 100, 100).toFixed(1) : 0;
        const icon  = ICONOS[device]  || 'fa-mobile';
        const label = NOMBRES[device] || device;
        const tooltipTxt = `${label}: ${data.views} visitas · ${data.clicks} chatearon · Conversión: ${ctr}% — ${this._ctrInterpret(ctr)}`;

        const row = document.createElement('div');
        row.className = 'stats-row';
        row.title = tooltipTxt;
        row.innerHTML = `
          <div class="stats-row-label">
            <i class="fab ${icon}"></i>
            <span>${label}</span>
          </div>
          <div class="stats-row-bar"><div class="bar-fill" style="width:${pct}%"></div></div>
          <div class="stats-row-nums">
            <span>${data.views} visitas</span>
            <span class="pct-total">${pct}%</span>
          </div>
        `;
        container.appendChild(row);
      });

    const hint = document.createElement('p');
    hint.className = 'stats-hint';
    hint.textContent = 'Tocá cada fila para ver la conversión por dispositivo.';
    container.appendChild(hint);

    return createCard({ title: 'Dispositivos', icon: 'fa-mobile-alt', content: container });
  },

  // ──────────────────────────────────────────────────────────
  // HORARIOS
  // ──────────────────────────────────────────────────────────
  _renderHorarios() {
    const { horarios } = this._stats;
    const container = document.createElement('div');
    container.className = 'horarios-grid';

    const maxViews = Math.max(...Object.values(horarios).map(h => h.views), 1);
    const peakHour = Object.entries(horarios).sort((a, b) => b[1].views - a[1].views)[0]?.[0];

    for (let h = 0; h < 24; h++) {
      const data    = horarios[h] || { views: 0, clicks: 0 };
      const pct     = ((data.views / maxViews) * 100).toFixed(0);
      const isPeak  = String(h) === String(peakHour) && data.views > 0;
      const tooltipTxt = data.views > 0
        ? `${h}:00 hs · ${data.views} visitas · ${data.clicks} chatearon${isPeak ? ' · Tu hora con más tráfico.' : ''}`
        : `${h}:00 hs · Sin visitas`;

      const col = document.createElement('div');
      col.className = 'hora-col';
      col.title = tooltipTxt;
      col.innerHTML = `
        <div class="hora-bar-wrap">
          ${data.views > 0 ? `<span class="hora-count">${data.views}</span>` : ''}
          <div class="hora-bar-fill ${isPeak ? 'hora-peak' : ''}" style="height:${pct}%" title="${data.views} visitas"></div>
        </div>
        <span class="hora-label">${h}h</span>
      `;
      container.appendChild(col);
    }

    const hint = document.createElement('p');
    hint.className = 'stats-hint';
    hint.style.marginTop = '12px';
    hint.textContent = 'Las horas más altas son cuando más gente visita tu página.';
    container.appendChild(hint);

    return createCard({ title: 'Horarios', icon: 'fa-calendar-alt', content: container });
  }
};

// ============================================================
// ARRANQUE
// ============================================================
runSkeleton({
  page,
  adapter: createFirebaseAdapter,
  options: { loadingMessage: 'Cargando estadísticas...' }
});
