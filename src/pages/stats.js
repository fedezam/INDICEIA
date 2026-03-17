// ============================================================
// src/pages/stats.js
// ============================================================
import { runSkeleton }                     from '/src/skeleton/skeleton.js';
import { createFirebaseAdapter }           from '/src/skeleton/adapters/firebaseAdapter.js';
import { createCard }                      from '/src/skeleton/components/card/index.js';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db }                              from '/src/services/firebase/firebase.js';
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
  // PROCESS — toda la lógica de métricas
  // ──────────────────────────────────────────────────────────
  _process(events) {
    if (!events.length) return null;

    // ── Métricas generales ───────────────────────────────────
    const views  = events.filter(e => e.event === 'landing_view').length;
    const clicks = events.filter(e => e.event === 'talk_click').length;
    const ctr      = views ? ((clicks / views) * 100).toFixed(1) : 0;
    const abandonos = views - clicks;

    // ── Tiempo de decisión ───────────────────────────────────
    const fps = {};
    events.forEach(e => {
      if (!e.fingerprint) return;
      if (!fps[e.fingerprint]) fps[e.fingerprint] = {};
      const ts = e.timestamp?.toDate ? e.timestamp.toDate() : new Date(e.timestamp);
      if (e.event === 'landing_view') fps[e.fingerprint].view  = ts;
      if (e.event === 'talk_click')   fps[e.fingerprint].click = ts;
    });

    const tiempos = [];
    for (const fp in fps) {
      const { view, click } = fps[fp];
      if (view && click) tiempos.push((click - view) / 1000);
    }

    const tiempoPromedio   = tiempos.length
      ? (tiempos.reduce((a, b) => a + b, 0) / tiempos.length).toFixed(1)
      : null;
    const total            = tiempos.length;
    const rapidas          = total ? ((tiempos.filter(t => t < 5).length  / total) * 100).toFixed(1) : 0;
    const lentas           = total ? ((tiempos.filter(t => t > 20).length / total) * 100).toFixed(1) : 0;

    // ── Dispositivos ─────────────────────────────────────────
    const dispositivos = {};
    events.forEach(e => {
      const d = e.device || 'unknown';
      if (!dispositivos[d]) dispositivos[d] = { views: 0, clicks: 0 };
      if (e.event === 'landing_view') dispositivos[d].views++;
      if (e.event === 'talk_click')   dispositivos[d].clicks++;
    });

    // ── Origen (src) — nuevo ─────────────────────────────────
    const origenes = {};
    events.forEach(e => {
      if (e.event !== 'landing_view') return;
      const src = e.src || 'direct';
      if (!origenes[src]) origenes[src] = { views: 0, clicks: 0, srcType: e.srcType || 'channel' };
      origenes[src].views++;
    });
    events.forEach(e => {
      if (e.event !== 'talk_click') return;
      const src = e.src || 'direct';
      if (origenes[src]) origenes[src].clicks++;
    });

    // ── Horarios ─────────────────────────────────────────────
    const horarios = {};
    events.forEach(e => {
      const dt = e.timestamp?.toDate ? e.timestamp.toDate() : new Date(e.timestamp);
      const h  = dt.getHours();
      if (!horarios[h]) horarios[h] = { views: 0, clicks: 0 };
      if (e.event === 'landing_view') horarios[h].views++;
      if (e.event === 'talk_click')   horarios[h].clicks++;
    });

    return {
      views, clicks, ctr, abandonos,
      tiempoPromedio, rapidas, lentas,
      dispositivos, origenes, horarios
    };
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
      return;
    }

    root.appendChild(this._renderGeneral());
    root.appendChild(this._renderOrigenes());
    root.appendChild(this._renderDispositivos());
    root.appendChild(this._renderTiempo());
    root.appendChild(this._renderHorarios());
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

    container.innerHTML = `
      <div class="kpi-box">
        <i class="fas fa-users"></i>
        <span class="kpi-value">${views}</span>
        <span class="kpi-label">Visitas</span>
      </div>
      <div class="kpi-box">
        <i class="fas fa-robot"></i>
        <span class="kpi-value">${clicks}</span>
        <span class="kpi-label">Clicks a la IA</span>
      </div>
      <div class="kpi-box">
        <i class="fas fa-percentage"></i>
        <span class="kpi-value ${ctrClass}">${ctr}%</span>
        <span class="kpi-label">Conversión</span>
      </div>
      <div class="kpi-box">
        <i class="fas fa-sign-out-alt"></i>
        <span class="kpi-value">${abandonos}</span>
        <span class="kpi-label">Abandonos</span>
      </div>
    `;

    return createCard({
      title:   'General',
      icon:    'fa-chart-pie',
      content: container
    });
  },

  // ──────────────────────────────────────────────────────────
  // ORIGEN DEL TRÁFICO (src)
  // ──────────────────────────────────────────────────────────
  _renderOrigenes() {
    const { origenes, views } = this._stats;
    const container = document.createElement('div');
    container.className = 'stats-list';

    const ICONOS = {
      qr:     'fa-qrcode',
      ig:     'fa-instagram',
      fb:     'fa-facebook',
      wa:     'fa-whatsapp',
      web:    'fa-globe',
      email:  'fa-envelope',
      ads:    'fa-ad',
      direct: 'fa-link'
    };

    const sorted = Object.entries(origenes).sort((a, b) => b[1].views - a[1].views);

    sorted.forEach(([src, data]) => {
      const pct     = views ? ((data.views / views) * 100).toFixed(1) : 0;
      const ctr     = data.views ? ((data.clicks / data.views) * 100).toFixed(1) : 0;
      const icon    = ICONOS[src] || (data.srcType === 'entity' ? 'fa-robot' : 'fa-link');
      const esEntidad = data.srcType === 'entity';

      const row = document.createElement('div');
      row.className = 'stats-row';
      row.innerHTML = `
        <div class="stats-row-label">
          <i class="fas ${icon}"></i>
          <span>${esEntidad ? `entidad: ${src}` : src}</span>
          ${esEntidad ? '<span class="badge-entity">entidad</span>' : ''}
        </div>
        <div class="stats-row-bar">
          <div class="bar-fill" style="width:${pct}%"></div>
        </div>
        <div class="stats-row-nums">
          <span>${data.views}v</span>
          <span>${data.clicks}c</span>
          <span class="ctr-${ctr >= 50 ? 'high' : ctr >= 25 ? 'medium' : 'low'}">${ctr}%</span>
        </div>
      `;
      container.appendChild(row);
    });

    const hint = document.createElement('p');
    hint.className = 'stats-hint';
    hint.textContent = 'Mostrá desde qué canal te visitan más y cuál convierte mejor.';
    container.appendChild(hint);

    return createCard({
      title:   'Origen del tráfico',
      icon:    'fa-share-alt',
      content: container
    });
  },

  // ──────────────────────────────────────────────────────────
  // DISPOSITIVOS
  // ──────────────────────────────────────────────────────────
  _renderDispositivos() {
    const { dispositivos, views } = this._stats;
    const container = document.createElement('div');
    container.className = 'stats-list';

    const ICONOS = { android: 'fa-android', ios: 'fa-apple', web: 'fa-desktop', unknown: 'fa-question' };

    Object.entries(dispositivos)
      .sort((a, b) => b[1].views - a[1].views)
      .forEach(([device, data]) => {
        const pct  = views ? ((data.views / views) * 100).toFixed(1) : 0;
        const ctr  = data.views ? ((data.clicks / data.views) * 100).toFixed(1) : 0;
        const icon = ICONOS[device] || 'fa-mobile';

        const row = document.createElement('div');
        row.className = 'stats-row';
        row.innerHTML = `
          <div class="stats-row-label">
            <i class="fab ${icon}"></i>
            <span>${device}</span>
          </div>
          <div class="stats-row-bar">
            <div class="bar-fill" style="width:${pct}%"></div>
          </div>
          <div class="stats-row-nums">
            <span>${data.views}v</span>
            <span>${data.clicks}c</span>
            <span class="ctr-${ctr >= 50 ? 'high' : ctr >= 25 ? 'medium' : 'low'}">${ctr}%</span>
          </div>
        `;
        container.appendChild(row);
      });

    const hint = document.createElement('p');
    hint.className = 'stats-hint';
    hint.textContent = 'Detectá qué dispositivos usan tus visitantes.';
    container.appendChild(hint);

    return createCard({
      title:   'Dispositivos',
      icon:    'fa-mobile-alt',
      content: container
    });
  },

  // ──────────────────────────────────────────────────────────
  // TIEMPO DE DECISIÓN
  // ──────────────────────────────────────────────────────────
  _renderTiempo() {
    const { tiempoPromedio, rapidas, lentas } = this._stats;
    const container = document.createElement('div');
    container.className = 'kpi-grid kpi-grid-3';

    container.innerHTML = `
      <div class="kpi-box">
        <i class="fas fa-stopwatch"></i>
        <span class="kpi-value">${tiempoPromedio ? tiempoPromedio + 's' : '—'}</span>
        <span class="kpi-label">Tiempo promedio</span>
      </div>
      <div class="kpi-box">
        <i class="fas fa-bolt"></i>
        <span class="kpi-value ctr-high">${rapidas}%</span>
        <span class="kpi-label">Decisiones rápidas (&lt;5s)</span>
      </div>
      <div class="kpi-box">
        <i class="fas fa-hourglass-half"></i>
        <span class="kpi-value ctr-low">${lentas}%</span>
        <span class="kpi-label">Decisiones lentas (&gt;20s)</span>
      </div>
    `;

    const hint = document.createElement('p');
    hint.className = 'stats-hint';
    hint.style.marginTop = '12px';
    hint.textContent = 'Menor tiempo promedio = mensaje claro y atractivo.';
    container.appendChild(hint);

    return createCard({
      title:   'Tiempo de decisión',
      icon:    'fa-clock',
      content: container
    });
  },

  // ──────────────────────────────────────────────────────────
  // HORARIOS
  // ──────────────────────────────────────────────────────────
  _renderHorarios() {
    const { horarios } = this._stats;
    const container = document.createElement('div');
    container.className = 'horarios-grid';

    const maxViews = Math.max(...Object.values(horarios).map(h => h.views), 1);

    for (let h = 0; h < 24; h++) {
      const data = horarios[h] || { views: 0, clicks: 0 };
      const pct  = ((data.views / maxViews) * 100).toFixed(0);

      const col = document.createElement('div');
      col.className = 'hora-col';
      col.innerHTML = `
        <div class="hora-bar-wrap">
          <div class="hora-bar-fill" style="height:${pct}%" title="${data.views} visitas"></div>
        </div>
        <span class="hora-label">${h}h</span>
      `;
      container.appendChild(col);
    }

    const hint = document.createElement('p');
    hint.className = 'stats-hint';
    hint.style.marginTop = '12px';
    hint.textContent = 'Las horas con más tráfico son las mejores para publicar.';
    container.appendChild(hint);

    return createCard({
      title:   'Horarios',
      icon:    'fa-calendar-alt',
      content: container
    });
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
