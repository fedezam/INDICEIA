// src/pages/embajador.js
//
// ⟦ROLE⟧ Panel de cartera (30/09/2026). Dos modos de acceso:
//   1. Un embajador entra a /embajador.html → ve SU PROPIA cartera
//      (listEntidadesPorEmbajador(ctx.user.uid)).
//   2. Un admin entra a /embajador.html?embajadorId=X → ve la
//      cartera DE ESE embajador, en modo solo lectura/supervisión.
//      Mismo patrón que isAdminViewing en dashboard.js: el admin no
//      necesita role:'embajador' propio, el query param alcanza
//      porque isAdmin() en las rules ya cubre cualquier lectura.
//
// Sin Herramientas Admin, sin toggle de demo, sin tabla de Usuarios
// — esto es solo el listado de cartera, compartido entre ambos modos.
import { runLifecycle }              from '/src/skeleton/lifecycle.js';
import { createFirebaseAdapter }     from '/src/skeleton/adapters/firebaseAdapter.js';
import { mountLayout }               from '/src/skeleton/layout/index.js';
import { runFlowController }         from '/src/controllers/flowController.js';
import { listEntidadesPorEmbajador } from '/src/controllers/panelCore.js';
import { createTable }               from '/src/skeleton/components/table/index.js';
import { createEmptyState }          from '/src/skeleton/components/skeletonComponents.js';
import { createButton }              from '/src/skeleton/components/button/index.js';

import '/src/pages/super-admin.css';

const adapter = (options) => createFirebaseAdapter(options);

runLifecycle({
  adapter,
  options: { loadingMessage: 'Cargando cartera...' },

  async onReady(ctx) {
    const requestedEmbajadorId = new URLSearchParams(window.location.search).get('embajadorId');
    const isAdminViewing = ctx.userData?.role === 'admin' && !!requestedEmbajadorId;

    // ── Acceso: embajador viendo lo suyo, o admin viendo con
    // ?embajadorId=. Cualquier otro caso (admin sin param, usuario
    // común) no tiene nada que hacer acá. ──
    if (!isAdminViewing && ctx.userData?.role !== 'embajador') {
      window.location.href = '/';
      return;
    }

    await runFlowController(ctx.user.uid);
    mountLayout(ctx);

    const targetUid = isAdminViewing ? requestedEmbajadorId : ctx.user.uid;
    const state = await load(targetUid);
    render(ctx, state, { isAdminViewing, targetUid });
  }
});

// ============================================================
// LOAD
// ============================================================
async function load(embajadorUid) {
  const entities = await listEntidadesPorEmbajador(embajadorUid);
  return { entities };
}

// ============================================================
// HELPERS — Badges
// ============================================================
function renderPlanBadge(reason) {
  const map = {
    ok:            { label: 'Activo',   cls: 'green' },
    trial_expired: { label: 'Huelga',   cls: 'red'   },
    plan_expired:  { label: 'Huelga',   cls: 'red'   },
    inactive:      { label: 'Huelga',   cls: 'red'   },
    no_plan:       { label: 'Sin plan', cls: 'gray'  },
  };
  const cfg = map[reason] || map.no_plan;
  return `<span class="s-badge s-badge--${cfg.cls}">${cfg.label}</span>`;
}

function renderDiasRestantes(dias) {
  if (dias === null || dias === undefined) return '-';
  if (dias < 0)   return `<span class="s-badge s-badge--red">venció hace ${Math.abs(dias)}d</span>`;
  if (dias === 0) return `<span class="s-badge s-badge--orange">vence hoy</span>`;
  if (dias <= 3)  return `<span class="s-badge s-badge--orange">${dias}d</span>`;
  return `${dias}d`;
}

function buildRows(entities) {
  return entities.map(e => ({
    ...e,
    _nombre: e.nombreComercio || e.nombre || '-',
    ciudad:  e.ciudad || '-',
    _fecha:  e.fechaActualizacion
               ? e.fechaActualizacion.toLocaleDateString('es-AR')
               : '-'
  }));
}

// ============================================================
// RENDER
// ============================================================
function render(ctx, state, { isAdminViewing, targetUid }) {
  const container = document.getElementById('skeleton-page');
  container.innerHTML = '';

  // ── Banner: solo si es admin viendo la cartera de un tercero ──
  if (isAdminViewing) {
    const banner = document.createElement('div');
    banner.className = 'entity-banner admin-viewing';
    banner.innerHTML = `<i class="fas fa-user-shield"></i> Estás viendo la cartera del embajador <strong>${targetUid}</strong> como admin.`;
    const backBtn = createButton({
      label: 'Volver al panel',
      variant: 'secondary',
      size: 'sm',
      onClick: () => { window.location.href = '/super-admin.html'; }
    });
    banner.appendChild(backBtn);
    container.appendChild(banner);
  }

  const header = document.createElement('div');
  header.className = 'sa-list-header';
  header.innerHTML = `
    <h2 class="sa-list-title">
      <i class="fas fa-handshake"></i> ${isAdminViewing ? 'Cartera del embajador' : 'Mi Cartera'}
      <span class="sa-count">${state.entities.length}</span>
    </h2>
  `;
  container.appendChild(header);

  if (!state.entities.length) {
    container.appendChild(createEmptyState({
      icon: 'fas fa-handshake',
      title: 'Sin comercios referidos',
      message: isAdminViewing
        ? 'Este embajador todavía no tiene entidades a cargo.'
        : 'Cuando captes un comercio nuevo, va a aparecer acá para que puedas darle soporte.'
    }));
    return;
  }

  const activas  = state.entities.filter(e => e.planActive).length;
  const enHuelga = state.entities.filter(e => !e.planActive && e.planReason !== 'no_plan').length;

  const chipsRow = document.createElement('div');
  chipsRow.style.cssText = 'display:flex;gap:8px;margin:-8px 0 12px;flex-wrap:wrap;';
  chipsRow.innerHTML = `
    <span class="s-badge s-badge--green">${activas} activas</span>
    <span class="s-badge s-badge--red">${enHuelga} en huelga</span>
  `;
  container.appendChild(chipsRow);

  const table = createTable({
    columns: [
      { key: '_nombre',       label: 'Nombre' },
      { key: 'entityType',    label: 'Tipo' },
      { key: 'ciudad',        label: 'Localidad' },
      { key: 'planReason',    label: 'Plan', render: renderPlanBadge },
      { key: 'diasRestantes', label: 'Vence en', render: renderDiasRestantes },
      { key: '_fecha',        label: 'Actualización' },
    ],
    data: buildRows(state.entities),
    searchable: state.entities.length > 8,
    actions: [
      {
        id: 'ver', label: 'Ver / Dar soporte', icon: 'fas fa-eye',
        onClick: (row) => {
          // Si es admin, el acceso a dashboard.html sigue siendo
          // vía isAdminViewing (sin cambios) — no necesita el
          // embajadorId acá, context.js ya le da acceso total.
          window.location.href = `/dashboard.html?id=${row.id}`;
        }
      },
    ]
  });
  container.appendChild(table);
}
