// src/pages/embajador.js
//
// ⟦ROLE⟧ Panel del embajador (30/09/2026) — vista de su cartera:
// solo las entidades donde entidad.embajadorId === su uid (ver
// listEntidadesPorEmbajador en panelCore.js, respaldado por la rule
// isEmbajadorDe()). Mismo patrón de runLifecycle + mountLayout que
// super-admin.js, pero sin Herramientas Admin, sin toggle de demo,
// sin tabla de Usuarios ni sección de Terceros — el embajador solo
// ve y entra a SU cartera.
//
// La acción "Ver / Dar soporte" lleva a dashboard.html?id=X, que
// resuelve isEmbajadorViewing en context.js y permite editar todo lo
// operativo (perfil, productos, servicios, horarios, IA config) pero
// NO las acciones de plan/SEO, que siguen siendo admin-only.
import { runLifecycle }              from '/src/skeleton/lifecycle.js';
import { createFirebaseAdapter }     from '/src/skeleton/adapters/firebaseAdapter.js';
import { mountLayout }               from '/src/skeleton/layout/index.js';
import { runFlowController }         from '/src/controllers/flowController.js';
import { listEntidadesPorEmbajador } from '/src/controllers/panelCore.js';
import { createTable }               from '/src/skeleton/components/table/index.js';
import { createEmptyState }          from '/src/skeleton/components/skeletonComponents.js';

import '/src/pages/super-admin.css'; // reutiliza los mismos estilos de lista/tabla

const adapter = (options) => createFirebaseAdapter(options);

runLifecycle({
  adapter,
  options: { loadingMessage: 'Cargando tu cartera...' },

  async onReady(ctx) {
    if (ctx.userData?.role !== 'embajador') { window.location.href = '/'; return; }
    await runFlowController(ctx.user.uid);
    mountLayout(ctx);
    const state = await load(ctx);
    render(ctx, state);
  }
});

// ============================================================
// LOAD
// ============================================================
async function load(ctx) {
  const entities = await listEntidadesPorEmbajador(ctx.user.uid);
  return { entities };
}

// ============================================================
// HELPERS — Badges (mismo criterio visual que super-admin.js)
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
function render(ctx, state) {
  const container = document.getElementById('skeleton-page');
  container.innerHTML = '';

  const header = document.createElement('div');
  header.className = 'sa-list-header';
  header.innerHTML = `
    <h2 class="sa-list-title">
      <i class="fas fa-handshake"></i> Mi Cartera
      <span class="sa-count">${state.entities.length}</span>
    </h2>
  `;
  container.appendChild(header);

  if (!state.entities.length) {
    container.appendChild(createEmptyState({
      icon: 'fas fa-handshake',
      title: 'Todavía no tenés comercios referidos',
      message: 'Cuando captes un comercio nuevo, va a aparecer acá para que puedas darle soporte.'
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
        onClick: (row) => { window.location.href = `/dashboard.html?id=${row.id}`; }
      },
    ]
  });
  container.appendChild(table);
}
