// src/pages/super-admin.js
import { runLifecycle }          from '/src/skeleton/lifecycle.js';
import { createFirebaseAdapter } from '/src/skeleton/adapters/firebaseAdapter.js';
import { mountLayout }           from '/src/skeleton/layout/index.js';
import { runFlowController }     from '/src/controllers/flowController.js';
import { listEntidades, listUsuarios } from '/src/controllers/panelCore.js';
import { createTable }           from '/src/skeleton/components/table/index.js';
import { createEmptyState }      from '/src/skeleton/components/skeletonComponents.js';
import { createButton }          from '/src/skeleton/components/button/index.js';
import { createChip }            from '/src/skeleton/components/chip/index.js';
import { showToast }             from '/src/skeleton/components/toast/index.js';

import '/src/pages/super-admin.css';

const adapter = (options) => createFirebaseAdapter(options);

// ⟦ROLE⟧ UID de la cuenta admin — dueña de las entidades "propias de
// plataforma" (demo + soporte/onboarding). Es el mismo UID usado en
// la migración manual de duenoId (08/09/2026). Se usa acá SOLO para
// separar visualmente las secciones del dashboard — no reemplaza los
// chequeos de seguridad reales (isAdmin()/isOwner() en Firestore
// rules), que siguen siendo la fuente de verdad de qué puede hacer
// cada usuario.
const ADMIN_UID = 'hx1XgXN7vBXNV7TsFaLyrol9p972';

runLifecycle({
  adapter,
  options: { loadingMessage: 'Cargando panel...' },

  async onReady(ctx) {
    if (ctx.userData?.role !== 'admin') { window.location.href = '/'; return; }
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
  const entities = await listEntidades();
  const users    = await listUsuarios();
  return { entities, users };
}

// ============================================================
// TOGGLE DEMO — acción liviana, scoped a una entidad
// ⟦ROLE⟧ toggle_demo no requiere ADMIN_SECRET (mismo criterio que
// plan_reactivate/plan_extend/regenerate_seo en el endpoint) — no
// puede hacer daño masivo. Por eso NO pasa por callAdminAction, que
// siempre pide el secret vía prompt; usa su propio fetch liviano.
// Solo marca el flag en Firestore, no regenera entity.json — el admin
// decide cuándo publicar el cambio (botón "Regenerar todas" o desde
// super-admin-entity.js).
// ────────────────────────────────────────────────────────────
async function toggleDemo(comercioId, nextValue) {
  const response = await fetch('/api/generate-and-upload-entity', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'toggle_demo', comercioId, isDemo: nextValue }),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Falló el toggle de demo');
  }
  return data;
}

// ============================================================
// HERRAMIENTAS ADMIN
// ⟦ROLE⟧ Acciones de mantenimiento (30/07/2026) — reutilizan
// /api/generate-and-upload-entity con `action` en vez de sumar
// funciones serverless nuevas (límite del plan de Vercel). El
// adminSecret se pide por prompt en vez de hardcodearlo acá: este
// archivo lo sirve el navegador tal cual, cualquiera puede ver su
// código fuente — un secreto embebido no sería secreto.
//
// Backfill plan (dry-run / aplicar): migra planes viejos guardados en
// formato camelCase (startedAt/expiresAt) al formato snake_case
// (started_at/expires_at) que usa resolvePlanStatus.js. dry-run solo
// muestra qué cambiaría, sin escribir; aplicar sí escribe. Si no
// quedan entidades con planes en formato viejo, estos botones no
// tienen nada para hacer — quedan como red de seguridad.
// ────────────────────────────────────────────────────────────
function renderHerramientasAdmin() {
  const section = document.createElement('div');
  section.className = 'sa-list-header sa-admin-tools';

  const title = document.createElement('h2');
  title.className = 'sa-list-title';
  title.innerHTML = `<i class="fas fa-tools"></i> Herramientas`;
  section.appendChild(title);

  const resultBox = document.createElement('pre');
  resultBox.className = 'sa-admin-result';
  resultBox.style.cssText = 'background:#111;color:#0f0;padding:12px;border-radius:8px;max-height:300px;overflow:auto;display:none;white-space:pre-wrap;font-size:12px;';
  section.appendChild(resultBox);

  function showResult(data) {
    resultBox.style.display = 'block';
    resultBox.textContent = JSON.stringify(data, null, 2);
  }

  async function callAdminAction(action, extra = {}) {
    const adminSecret = window.prompt('Ingresá el ADMIN_SECRET:');
    if (!adminSecret) return;

    try {
      const response = await fetch('/api/generate-and-upload-entity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, adminSecret, ...extra }),
      });
      const data = await response.json();

      if (!response.ok) {
        showToast(`Error: ${data.error || 'falló la acción'}`, 'error');
        showResult(data);
        return;
      }

      showToast('Acción completada', 'success');
      showResult(data);
    } catch (err) {
      showToast('Error de red: ' + err.message, 'error');
    }
  }

  const btnRegenerarTodas = createButton({
    label: 'Regenerar todas las entidades',
    icon: 'fa-sync',
    variant: 'secondary',
    onClick: () => {
      if (!window.confirm('¿Regenerar el entity.json de TODAS las entidades? Puede tardar.')) return;
      callAdminAction('regenerate_all');
    },
  });

  const btnBackfillDryRun = createButton({
    label: 'Backfill plan (dry-run)',
    icon: 'fa-flask',
    variant: 'secondary',
    onClick: () => callAdminAction('backfill_plan_shape', { dryRun: true }),
  });

  const btnBackfillReal = createButton({
    label: 'Backfill plan (aplicar)',
    icon: 'fa-database',
    variant: 'secondary',
    onClick: () => {
      if (!window.confirm('¿Aplicar el backfill de plan en serio? Esto escribe en Firestore.')) return;
      callAdminAction('backfill_plan_shape', { dryRun: false });
    },
  });

  const btnRow = document.createElement('div');
  btnRow.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap;margin:12px 0;';
  btnRow.append(btnRegenerarTodas, btnBackfillDryRun, btnBackfillReal);
  section.appendChild(btnRow);

  return section;
}

// ============================================================
// HELPERS — Badges
// ============================================================

// ── Badge de estado de plan (usa .s-badge--* ya definidas en table/styles.css) ──
function renderPlanBadge(reason, _row) {
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

// ── Badge de tipo, para la sección "Mis Entidades" (demo vs soporte) ──
function renderTipoPropiaBadge(_val, row) {
  if (row.entityType === 'soporte') {
    return `<span class="s-badge" style="background:#2c3e50;color:#fff;">Soporte</span>`;
  }
  if (row.isDemo) {
    return `<span class="s-badge" style="background:#8e44ad;color:#fff;">Demo</span>`;
  }
  return '-';
}

// ── Badge de demo, para la tabla de terceros (debería ser rarísimo verlo ahí) ──
function renderDemoBadge(isDemo, _row) {
  if (!isDemo) return '-';
  return `<span class="s-badge" style="background:#8e44ad;color:#fff;">Demo</span>`;
}

// ── Días restantes, con aviso visual si vence pronto ──
function renderDiasRestantes(dias) {
  if (dias === null || dias === undefined) return '-';
  if (dias < 0)   return `<span class="s-badge s-badge--red">venció hace ${Math.abs(dias)}d</span>`;
  if (dias === 0) return `<span class="s-badge s-badge--orange">vence hoy</span>`;
  if (dias <= 3)  return `<span class="s-badge s-badge--orange">${dias}d</span>`;
  return `${dias}d`;
}

// ── filas base compartidas entre ambas tablas de entidades ──
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
// SECCIÓN — MIS ENTIDADES (propias de plataforma: demo + soporte)
// ⟦ROLE⟧ Criterio de "propia": duenoId === ADMIN_UID. Es el más
// confiable porque ya se hizo la migración manual (08/09/2026) — es
// el dato real de ownership, no una inferencia. isDemo/entityType
// solo se usan acá para el badge informativo de "qué tipo de propia
// es", no para decidir si pertenece a esta sección.
//
// Tabla simplificada a propósito: sin columnas de plan (las demo
// están exentas del sistema de plan — ver api/entity/[id].js — y
// soporte tampoco factura), sin filtros de plan. Sí mantiene el
// toggle de demo por si alguna entidad propia necesita marcarse/
// desmarcarse.
// ────────────────────────────────────────────────────────────
function renderMisEntidadesSection(state, handleToggleDemoClick) {
  const propias = state.entities.filter(e => e.duenoId === ADMIN_UID);

  const container = document.createElement('div');

  const header = document.createElement('div');
  header.className = 'sa-list-header';
  header.innerHTML = `
    <h2 class="sa-list-title">
      <i class="fas fa-star"></i> Mis Entidades <span style="font-weight:400;opacity:.7;">(demo · soporte)</span>
      <span class="sa-count">${propias.length}</span>
    </h2>
  `;
  container.appendChild(header);

  if (!propias.length) {
    container.appendChild(createEmptyState({
      icon: 'fas fa-star',
      title: 'Sin entidades propias',
      message: 'Ninguna entidad tiene duenoId asignado a la cuenta admin todavía.'
    }));
    return container;
  }

  const table = createTable({
    columns: [
      { key: '_nombre',    label: 'Nombre' },
      { key: 'id',         label: 'ID' },
      { key: 'entityType', label: 'Tipo', render: renderTipoPropiaBadge },
      { key: '_fecha',     label: 'Actualización' },
    ],
    data: buildRows(propias),
    searchable: propias.length > 8,
    actions: [
      {
        id: 'ver', label: 'Ver', icon: 'fas fa-eye',
        onClick: (row) => { window.location.href = `/super-admin-entity.html?id=${row.id}`; }
      },
      {
        id: 'toggle-demo',
        label: 'Alternar demo',
        icon: 'fas fa-flask',
        onClick: handleToggleDemoClick,
      },
    ]
  });
  container.appendChild(table);

  return container;
}

// ============================================================
// SECCIÓN — ENTIDADES DE TERCEROS (comercios reales, no propias)
// ⟦ROLE⟧ Todo lo que NO tiene duenoId === ADMIN_UID. Control total
// vía isAdmin() en Firestore rules — no hace falta ser owner para
// gestionarlas desde acá, por eso siguen apareciendo con acción "Ver".
// Mantiene los filtros de plan (acá sí importan — son negocios reales
// que pueden entrar en huelga por falta de pago).
// ────────────────────────────────────────────────────────────
function renderTercerosSection(state, handleToggleDemoClick) {
  const terceros = state.entities.filter(e => e.duenoId !== ADMIN_UID);

  const container = document.createElement('div');

  const header = document.createElement('div');
  header.className = 'sa-list-header';
  header.innerHTML = `
    <h2 class="sa-list-title">
      <i class="fas fa-database"></i> Entidades de Terceros
      <span class="sa-count">${terceros.length}</span>
    </h2>
  `;
  container.appendChild(header);

  if (!terceros.length) {
    container.appendChild(createEmptyState({ icon: 'fas fa-database', title: 'Sin entidades', message: 'No hay datos en Firestore' }));
    return container;
  }

  // ── estado local de filtros (vive mientras esta sección exista) ──
  const filterState = { plan: null, ciudad: null, demo: false };

  const activas  = terceros.filter(e => e.planActive).length;
  const enHuelga = terceros.filter(e => !e.planActive && e.planReason !== 'no_plan').length;
  const sinPlan  = terceros.filter(e => e.planReason === 'no_plan').length;
  // Debería ser 0 casi siempre — si aparece algo acá, es una demo que
  // quedó con duenoId de un tercero (dato inconsistente a revisar).
  const demosSueltas = terceros.filter(e => e.isDemo).length;

  const chipsRow = document.createElement('div');
  chipsRow.style.cssText = 'display:flex;gap:8px;margin:-8px 0 12px;flex-wrap:wrap;align-items:center;';

  function applyFilters() {
    let filtered = terceros;
    if (filterState.plan === 'activas')  filtered = filtered.filter(e => e.planActive);
    if (filterState.plan === 'huelga')   filtered = filtered.filter(e => !e.planActive && e.planReason !== 'no_plan');
    if (filterState.plan === 'sinplan')  filtered = filtered.filter(e => e.planReason === 'no_plan');
    if (filterState.ciudad)              filtered = filtered.filter(e => e.ciudad === filterState.ciudad);
    if (filterState.demo)                filtered = filtered.filter(e => e.isDemo);
    table.setData(buildRows(filtered));
  }

  function makeFilterChip(text, variant, key) {
    const chip = createChip({
      text, variant, size: 'small',
      onClick: () => {
        filterState.plan = filterState.plan === key ? null : key;
        chipsRow.querySelectorAll('.s-chip').forEach(c => c.classList.remove('s-chip--active-filter'));
        if (filterState.plan) chip.classList.add('s-chip--active-filter');
        applyFilters();
      }
    });
    return chip;
  }

  chipsRow.appendChild(makeFilterChip(`${activas} activas`,  'success',    'activas'));
  chipsRow.appendChild(makeFilterChip(`${enHuelga} en huelga`, 'danger',  'huelga'));
  if (sinPlan) chipsRow.appendChild(makeFilterChip(`${sinPlan} sin plan`, 'secondary', 'sinplan'));

  // ── chip de "demo suelta" — solo aparece si hay una inconsistencia
  //    real para revisar (demo con dueño de tercero) ──
  if (demosSueltas) {
    const chipDemo = createChip({
      text: `⚠ ${demosSueltas} demo con dueño de tercero`, variant: 'danger', size: 'small',
      onClick: () => {
        filterState.demo = !filterState.demo;
        chipDemo.classList.toggle('s-chip--active-filter', filterState.demo);
        applyFilters();
      }
    });
    chipsRow.appendChild(chipDemo);
  }

  // ── selector de localidad ──
  const ciudades = [...new Set(terceros.map(e => e.ciudad).filter(Boolean))].sort();
  if (ciudades.length > 1) {
    const select = document.createElement('select');
    select.className = 's-select-localidad';
    select.style.cssText = 'margin-left:auto;padding:6px 10px;border-radius:4px;border:1px solid #d2d6de;font-size:13px;';
    select.innerHTML = `<option value="">Todas las localidades</option>` +
      ciudades.map(c => `<option value="${c}">${c}</option>`).join('');
    select.onchange = () => {
      filterState.ciudad = select.value || null;
      applyFilters();
    };
    chipsRow.appendChild(select);
  }

  container.appendChild(chipsRow);

  const table = createTable({
    columns: [
      { key: '_nombre',       label: 'Nombre' },
      { key: 'id',            label: 'ID' },
      { key: 'entityType',    label: 'Tipo' },
      { key: 'ciudad',        label: 'Localidad' },
      { key: 'planReason',    label: 'Plan', render: renderPlanBadge },
      { key: 'diasRestantes', label: 'Vence en', render: renderDiasRestantes },
      { key: 'isDemo',        label: 'Demo', render: renderDemoBadge },
      { key: '_fecha',        label: 'Actualización' }
    ],
    data: buildRows(terceros),
    actions: [
      {
        id: 'ver', label: 'Ver', icon: 'fas fa-eye',
        onClick: (row) => { window.location.href = `/super-admin-entity.html?id=${row.id}`; }
      },
      {
        id: 'toggle-demo',
        label: 'Alternar demo',
        icon: 'fas fa-flask',
        onClick: handleToggleDemoClick,
      },
    ]
  });
  container.appendChild(table);

  return container;
}

// ============================================================
// RENDER
// ============================================================
function render(ctx, state) {
  const container = document.getElementById('skeleton-page');
  container.innerHTML = '';

  // ── toggle demo desde cualquier fila (compartido entre secciones) ──
  async function handleToggleDemoClick(row) {
    const nextValue = !row.isDemo;
    const label = nextValue ? 'marcar como demo' : 'quitar la marca de demo';
    if (!window.confirm(`¿Confirmás ${label} a "${row._nombre || row.id}"? Esto solo marca el flag — para publicarlo hay que regenerar la entidad.`)) return;

    try {
      await toggleDemo(row.id, nextValue);
      const entity = state.entities.find(e => e.id === row.id);
      if (entity) entity.isDemo = nextValue;
      showToast(nextValue ? 'Marcada como demo' : 'Demo desmarcada', 'success');
      // Re-render completo: mantiene ambas secciones en sync sin
      // duplicar lógica — más simple y seguro que actualizar dos
      // tablas independientes a mano.
      render(ctx, state);
    } catch (err) {
      showToast('Error: ' + err.message, 'error');
    }
  }

  // ── Herramientas admin ──
  container.appendChild(renderHerramientasAdmin());

  // ── Mis Entidades (propias: demo + soporte) ──
  container.appendChild(renderMisEntidadesSection(state, handleToggleDemoClick));

  // ── Entidades de Terceros ──
  container.appendChild(renderTercerosSection(state, handleToggleDemoClick));

  // ── Usuarios ──
  const usersHeader = document.createElement('div');
  usersHeader.className = 'sa-list-header';
  usersHeader.innerHTML = `
    <h2 class="sa-list-title">
      <i class="fas fa-users"></i> Usuarios
      <span class="sa-count">${state.users.length}</span>
    </h2>
  `;
  container.appendChild(usersHeader);

  if (!state.users.length) {
    container.appendChild(createEmptyState({ icon: 'fas fa-users', title: 'Sin usuarios', message: 'No hay usuarios registrados' }));
  } else {
    const usersTable = createTable({
      columns: [
        { key: 'nombre',       label: 'Nombre'       },
        { key: 'mail',         label: 'Email'         },
        { key: 'referralCode', label: 'Ref. Code'     },
        { key: 'referredBy',   label: 'Referido por'  },
        { key: 'role',         label: 'Rol'           },
        { key: '_fecha',       label: 'Registro'      },
      ],
      data: state.users.map(u => ({
        ...u,
        role:         u.role         || '-',
        referralCode: u.referralCode || '-',
        referredBy:   u.referredBy   || '-',
        _fecha: u.fechaRegistro
          ? u.fechaRegistro.toLocaleDateString('es-AR')
          : '-'
      })),
      actions: [{
        id: 'ver', label: 'Ver entidad', icon: 'fas fa-eye',
        onClick: (row) => { if (row.comercioId) window.location.href = `/super-admin-entity.html?id=${row.comercioId}`; }
      }]
    });
    container.appendChild(usersTable);
  }
}
