// src/pages/super-admin/list.js
import { runLifecycle }          from '/src/skeleton/lifecycle.js';
import { createFirebaseAdapter } from '/src/skeleton/adapters/firebaseAdapter.js';
import { mountLayout }           from '/src/skeleton/layout/index.js';
import { runFlowController }     from '/src/controllers/flowController.js';
import { listEntidades, listUsuarios } from '/src/controllers/panelCore.js';
import { createTable }           from '/src/skeleton/components/table/index.js';
import { createEmptyState }      from '/src/skeleton/components/skeletonComponents.js';

import '../super-admin.css';

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
// RENDER
// ============================================================
function render(ctx, state) {
  const container = document.getElementById('skeleton-page');
  container.innerHTML = '';

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
