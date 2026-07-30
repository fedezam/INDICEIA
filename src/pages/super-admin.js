// src/pages/super-admin.js
import { runLifecycle }          from '/src/skeleton/lifecycle.js';
import { createFirebaseAdapter } from '/src/skeleton/adapters/firebaseAdapter.js';
import { mountLayout }           from '/src/skeleton/layout/index.js';
import { runFlowController }     from '/src/controllers/flowController.js';
import { listEntidades, listUsuarios } from '/src/controllers/panelCore.js';
import { createTable }           from '/src/skeleton/components/table/index.js';
import { createEmptyState }      from '/src/skeleton/components/skeletonComponents.js';
import { createButton }          from '/src/skeleton/components/button/index.js';
import { showToast }             from '/src/skeleton/components/toast/index.js';

import '/src/pages/super-admin.css';

const adapter = (options) => createFirebaseAdapter(options);

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
// HERRAMIENTAS ADMIN
// ⟦ROLE⟧ Acciones de mantenimiento (30/07/2026) — reutilizan
// /api/generate-and-upload-entity con `action` en vez de sumar
// funciones serverless nuevas (límite del plan de Vercel). El
// adminSecret se pide por prompt en vez de hardcodearlo acá: este
// archivo lo sirve el navegador tal cual, cualquiera puede ver su
// código fuente — un secreto embebido no sería secreto.
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
// RENDER
// ============================================================
function render(ctx, state) {
  const container = document.getElementById('skeleton-page');
  container.innerHTML = '';

  // ── Herramientas admin ──
  container.appendChild(renderHerramientasAdmin());

  // ── Entidades ──
  const entHeader = document.createElement('div');
  entHeader.className = 'sa-list-header';
  entHeader.innerHTML = `
    <h2 class="sa-list-title">
      <i class="fas fa-database"></i> Entidades
      <span class="sa-count">${state.entities.length}</span>
    </h2>
  `;
  container.appendChild(entHeader);

  if (!state.entities.length) {
    container.appendChild(createEmptyState({ icon: 'fas fa-database', title: 'Sin entidades', message: 'No hay datos en Firestore' }));
  } else {
    const table = createTable({
      columns: [
        { key: '_nombre',    label: 'Nombre' },
        { key: 'id',         label: 'ID' },
        { key: 'entityType', label: 'Tipo' },
        { key: '_fecha',     label: 'Actualización' }
      ],
      data: state.entities.map(e => ({
        ...e,
        _nombre: e.nombreComercio || e.nombre || '-',
        _fecha:  e.fechaActualizacion
                   ? e.fechaActualizacion.toLocaleDateString('es-AR')
                   : '-'
      })),
      actions: [{
        id: 'ver', label: 'Ver', icon: 'fas fa-eye',
        onClick: (row) => { window.location.href = `/super-admin-entity.html?id=${row.id}`; }
      }]
    });
    container.appendChild(table);
  }

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
