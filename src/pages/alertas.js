// ============================================================
// src/pages/alertas.js
// ============================================================
import { runSkeleton }         from '/src/skeleton/skeleton.js';
import { createFirebaseAdapter } from '/src/skeleton/adapters/firebaseAdapter.js';
import { createCard }          from '/src/skeleton/components/card/index.js';
import { createButton }        from '/src/skeleton/components/button/index.js';
import {
  listarAlertas,
  getAlertasLeidas,
  marcarAlertaLeida
} from '/src/services/firebase/alerts.js';
import './alertas.css';

// ============================================================
const TIPO_CONFIG = {
  vencimiento_proximo: { icon: 'fa-exclamation-triangle', variant: 'warning' },
  vencimiento:          { icon: 'fa-times-circle',        variant: 'danger'  },
  novedad:              { icon: 'fa-bullhorn',             variant: 'info'    }
};

const page = {

  _alertas: [],
  _leidas:  new Set(),
  _ctx:     null,

  // ──────────────────────────────────────────────────────────
  // LOAD
  // ──────────────────────────────────────────────────────────
  async load(ctx) {
    this._ctx = ctx;
    const [alertas, leidas] = await Promise.all([
      listarAlertas(ctx.comercioId),
      getAlertasLeidas(ctx.user.uid)
    ]);
    this._alertas = alertas;
    this._leidas  = leidas;
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
      <h1><i class="fas fa-bell"></i> Alertas</h1>
      <p class="page-subtitle">Novedades de la plataforma y avisos sobre tu cuenta</p>
    `;
    root.appendChild(header);

    if (!this._alertas.length) {
      root.appendChild(this._renderSinDatos());
      root.appendChild(this._renderBotonVolver());
      return;
    }

    const lista = document.createElement('div');
    lista.className = 'alertas-lista';
    this._alertas.forEach(alerta => lista.appendChild(this._renderAlerta(alerta)));
    root.appendChild(lista);

    root.appendChild(this._renderBotonVolver());

    // Al entrar a la página, se consideran vistas.
    this._marcarTodasComoLeidas();
  },

  // ──────────────────────────────────────────────────────────
  // ALERTA INDIVIDUAL
  // ──────────────────────────────────────────────────────────
  _renderAlerta(alerta) {
    const cfg    = TIPO_CONFIG[alerta.tipo] || TIPO_CONFIG.novedad;
    const noLeida = !this._leidas.has(alerta.id);
    const fecha  = alerta.createdAt?.toDate?.();

    const content = document.createElement('div');
    content.innerHTML = `
      <p class="alerta-mensaje">${alerta.mensaje}</p>
      ${fecha ? `<p class="alerta-fecha">${this._formatFecha(fecha)}</p>` : ''}
    `;

    return createCard({
      title:     alerta.titulo,
      icon:      cfg.icon,
      variant:   cfg.variant,
      highlight: noLeida,
      content
    });
  },

  // ──────────────────────────────────────────────────────────
  // SIN DATOS
  // ──────────────────────────────────────────────────────────
  _renderSinDatos() {
    const el = document.createElement('div');
    el.className = 'empty-state';
    el.innerHTML = `
      <i class="fas fa-bell-slash"></i>
      <h2>Sin alertas por ahora</h2>
      <p>Cuando haya novedades de la plataforma o avisos sobre tu plan, van a aparecer acá.</p>
    `;
    return el;
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
  // HELPERS
  // ──────────────────────────────────────────────────────────
  _formatFecha(date) {
    return new Intl.DateTimeFormat('es-AR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    }).format(date);
  },

  async _marcarTodasComoLeidas() {
    const pendientes = this._alertas.filter(a => !this._leidas.has(a.id));
    if (!pendientes.length) return;

    await Promise.all(
      pendientes.map(a => marcarAlertaLeida(this._ctx.user.uid, a.id))
    );
  }
};

// ============================================================
runSkeleton({
  page,
  adapter: createFirebaseAdapter,
  options: { loadingMessage: 'Cargando alertas...' }
});
