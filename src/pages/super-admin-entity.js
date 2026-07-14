// src/pages/super-admin/entity.js
import { runLifecycle } from '/src/skeleton/lifecycle.js';
import { createFirebaseAdapter } from '/src/skeleton/adapters/firebaseAdapter.js';
import { mountLayout } from '/src/skeleton/layout/index.js';
import { runFlowController } from '/src/controllers/flowController.js';
import { loadEntidad } from '/src/controllers/panelCore.js';
import { createEmptyState } from '/src/skeleton/components/skeletonComponents.js';
import { db } from '/src/services/firebase/firebase.js';
import { doc, updateDoc, collection, getDocs } from 'firebase/firestore';
import { createHorariosEditor } from '/src/skeleton/components/horarios-editor/index.js';
import { makeSection, makeCard, openEditModal } from '/src/shared/superAdminUI.js';
import { createCheckboxGroup } from '/src/skeleton/components/checkbox-group/index.js';
import {
  createTemplateSelector,
  loadTemplatesForEntityType
} from '/src/skeleton/components/visual-template-selector/index.js';
import { createFormField } from '/src/skeleton/components/form-field/index.js';
import {
  COGNITIVE_PERMISSIONS,
  cognitivePermissionsToKeys,
  keysToCognitivePermissions
} from '/src/shared/cognitivePermissions.js';
import './super-admin.css';

const adapter = (options) => createFirebaseAdapter(options);
runLifecycle({
  adapter,
  options: { loadingMessage: 'Cargando entidad...' },
  async onReady(ctx) {
    if (ctx.userData?.role !== 'admin') { window.location.href = '/'; return; }
    await runFlowController(ctx.user.uid);
    mountLayout(ctx);
    const comercioId = new URLSearchParams(window.location.search).get('id');
    if (!comercioId) { window.location.href = '/super-admin.html'; return; }
    try {
      const selected = await loadEntidad(comercioId);
      render(ctx, selected);
    } catch (err) {
      console.error('[superAdminEntity]', err);
      const c = document.getElementById('skeleton-page');
      c.innerHTML = '';
      c.appendChild(createEmptyState({ icon: 'fas fa-exclamation-triangle', title: 'Error', message: err.message }));
    }
  }
});

// ============================================================
// RENDER — panel de detalle de una entidad
// ============================================================
function render(ctx, selected) {
  const container = document.getElementById('skeleton-page');
  container.innerHTML = '';
  const { entidad, user, ctx: entCtx, pipeline } = selected;
  const comercioId = entidad.id;
  const topbar = document.createElement('div');
  topbar.className = 'sa-topbar';
  topbar.innerHTML = `
    <button class="sa-btn sa-btn--back"><i class="fas fa-arrow-left"></i> Volver</button>
    <div class="sa-entity-title">
      <span class="sa-entity-name">${entidad.nombreComercio || entidad.nombre || 'Entidad'}</span>
      <span class="sa-entity-type">${entCtx.entityType}</span>
    </div>
  `;
  topbar.querySelector('.sa-btn--back').onclick = () => { window.location.href = '/super-admin.html'; };
  container.appendChild(topbar);
  const rerender = () => render(ctx, selected);
  renderSeccionIdentidad(container, entidad, entCtx, comercioId, rerender);
  renderSeccionTipoEntidad(container, entidad, user, comercioId, rerender);
  if (entCtx.offerType?.productos || entCtx.offerType?.servicios) {
    renderSeccionCatalogo(container, entidad, entCtx, comercioId);
  }
  renderSeccionOperativa(container, entidad, entCtx, pipeline, comercioId, rerender);
  renderSeccionIA(container, entidad, entCtx, comercioId, rerender);
  renderSeccionPlan(container, entidad, comercioId, rerender);
  renderSeccionPublicacion(container, entidad, comercioId, rerender);
  renderJsonDebug(container, selected);
}

// ──────────────────────────────────────────────────────────
// SECCIÓN: IDENTIDAD
// ──────────────────────────────────────────────────────────
function renderSeccionIdentidad(container, entidad, ctx, comercioId, rerender) {
  const { wrap, grid } = makeSection('🏪 Identidad', 'Datos principales de la entidad');
  const isComercio = ctx.entityType === 'comercio';
  const isPrestador = ctx.entityType === 'prestador';
  const isProfesional = ctx.entityType === 'profesional';
  const nombre = entidad.nombreComercio || entidad.nombre || '';
  const hasNombre = !!nombre;
  const card = makeCard({
    icon: isComercio ? '🏪' : isPrestador ? '👷' : '🩺',
    title: isComercio ? 'Mi Comercio' : isPrestador ? 'Mi Perfil' : 'Perfil Profesional',
    meta: nombre || 'Sin nombre',
    status: hasNombre ? 'ok' : 'empty',
    body: `
      <p>${entidad.descripcion || '<em>Sin descripción</em>'}</p>
      ${entidad.telefono ? `<p>📞 ${entidad.telefono}</p>` : ''}
      ${entidad.email ? `<p>✉️ ${entidad.email}</p>` : ''}
      ${entidad.direccion ? `<p>📍 ${entidad.direccion}</p>` : ''}
    `,
    onEdit: () => {
      const fields = isComercio ? [
        { key: 'nombreComercio', label: 'Nombre del Comercio', required: true },
        { key: 'descripcion', label: 'Descripción', type: 'textarea', required: true },
        { key: 'telefono', label: 'Teléfono' },
        { key: 'email', label: 'Email', type: 'email' },
        { key: 'direccion', label: 'Dirección' },
        { key: 'website', label: 'Website' },
        { key: 'instagram', label: 'Instagram' },
        { key: 'whatsapp', label: 'WhatsApp' },
        { key: 'tieneLocalFisico', label: 'Tiene local físico', type: 'boolean' },
      ] : isProfesional ? [
        { key: 'nombre', label: 'Nombre', required: true },
        { key: 'titulo', label: 'Título profesional' },
        { key: 'especialidad', label: 'Especialidad' },
        { key: 'descripcion', label: 'Descripción', type: 'textarea' },
        { key: 'telefono', label: 'Teléfono' },
        { key: 'email', label: 'Email', type: 'email' },
        { key: 'institucionFormadora', label: 'Institución' },
        { key: 'experiencia', label: 'Experiencia' },
      ] : [
        { key: 'nombre', label: 'Nombre', required: true },
        { key: 'especialidad', label: 'Especialidad' },
        { key: 'descripcion', label: 'Descripción', type: 'textarea' },
        { key: 'telefono', label: 'Teléfono' },
        { key: 'email', label: 'Email', type: 'email' },
        { key: 'direccion', label: 'Dirección' },
        { key: 'whatsapp', label: 'WhatsApp' },
        { key: 'instagram', label: 'Instagram' },
      ];
      openEditModal({
        title: 'Editar Identidad',
        fields,
        data: entidad,
        onSave: async (updates) => {
          await updateDoc(doc(db, 'entidades', comercioId), { ...updates, fechaActualizacion: new Date() });
          Object.assign(entidad, updates);
          rerender();
        }
      });
    }
  });
  grid.appendChild(card);
  container.appendChild(wrap);
}

// ──────────────────────────────────────────────────────────
// SECCIÓN: TIPO DE ENTIDAD
// ──────────────────────────────────────────────────────────
function renderSeccionTipoEntidad(container, entidad, user, comercioId, rerender) {
  const { wrap, grid } = makeSection('🗂️ Tipo de Entidad', 'Qué tipo de entidad es y qué ofrece');
  const offerType = entidad.offerType || {};
  const offers = [
    offerType.productos && 'Productos',
    offerType.servicios && 'Servicios'
  ].filter(Boolean).join(', ') || 'Sin definir';
  const card = makeCard({
    icon: '🗂️',
    title: 'Tipo',
    meta: entidad.entityType || '-',
    status: entidad.entityType ? 'ok' : 'empty',
    body: `<p>Ofrece: ${offers}</p>${entidad.serviceType ? `<p>Tipo servicio: ${entidad.serviceType}</p>` : ''}`,
    onEdit: () => {
      openEditModal({
        title: 'Editar Tipo de Entidad',
        fields: [
          { key: 'entityType', label: 'Tipo de entidad', type: 'select', options: [
            { value: 'comercio', label: 'Comercio' },
            { value: 'prestador', label: 'Prestador' },
            { value: 'profesional', label: 'Profesional' }
          ]},
          { key: 'serviceType', label: 'Tipo de servicio', type: 'select', options: [
            { value: '', label: '— ninguno —' },
            { value: 'oficio', label: 'Oficio' }
          ]},
        ],
        data: { entityType: entidad.entityType, serviceType: entidad.serviceType || '' },
        onSave: async (updates) => {
          await Promise.all([
            updateDoc(doc(db, 'entidades', comercioId), { ...updates, fechaActualizacion: new Date() }),
            (user?.uid || entidad.duenoId)
              ? updateDoc(doc(db, 'usuarios', user?.uid || entidad.duenoId), { entityType: updates.entityType })
              : Promise.resolve()
          ]);
          Object.assign(entidad, updates);
          rerender();
        }
      });
    }
  });
  const offerCard = makeCard({
    icon: '📦',
    title: 'Oferta',
    meta: offers,
    status: (offerType.productos || offerType.servicios) ? 'ok' : 'empty',
    body: `
      <p>Productos: ${offerType.productos ? '✓' : '✗'}</p>
      <p>Servicios: ${offerType.servicios ? '✓' : '✗'}</p>
    `,
    onEdit: () => {
      openEditModal({
        title: 'Editar Oferta',
        fields: [
          { key: 'productos', label: 'Ofrece productos', type: 'boolean' },
          { key: 'servicios', label: 'Ofrece servicios', type: 'boolean' },
        ],
        data: offerType,
        onSave: async (updates) => {
          await Promise.all([
            updateDoc(doc(db, 'entidades', comercioId), { offerType: updates, fechaActualizacion: new Date() }),
            (user?.uid || entidad.duenoId)
              ? updateDoc(doc(db, 'usuarios', user?.uid || entidad.duenoId), { offerType: updates })
              : Promise.resolve()
          ]);
          Object.assign(entidad.offerType, updates);
          rerender();
        }
      });
    }
  });
  grid.appendChild(card);
  grid.appendChild(offerCard);
  container.appendChild(wrap);
}

// ──────────────────────────────────────────────────────────
// SECCIÓN: CATÁLOGO
// ──────────────────────────────────────────────────────────
function renderSeccionCatalogo(container, entidad, ctx, comercioId) {
  const { wrap, grid } = makeSection('📦 Catálogo', 'Productos y servicios');
  if (ctx.offerType?.productos) {
    grid.appendChild(makeCard({
      icon: '📦',
      title: 'Productos',
      meta: `${entidad._productosCount || '?'} productos`,
      status: 'ok',
      body: '<p>Gestión de productos en subcolección Firestore</p>',
      onEdit: () => openProductosPanel(comercioId)
    }));
  }
  if (ctx.offerType?.servicios) {
    grid.appendChild(makeCard({
      icon: '🛎️',
      title: 'Servicios',
      status: 'ok',
      body: '<p>Gestión de servicios en subcolección Firestore</p>',
      onEdit: () => openServiciosPanel(comercioId)
    }));
  }
  container.appendChild(wrap);
}

// ──────────────────────────────────────────────────────────
// SECCIÓN: OPERATIVA
// ──────────────────────────────────────────────────────────
function renderSeccionOperativa(container, entidad, ctx, pipeline, comercioId, rerender) {
  const { wrap, grid } = makeSection('⚙️ Operativa', 'Horarios, entrega y cobertura');
  const horariosOk = entidad.horarios && Object.keys(entidad.horarios).length > 0;
  grid.appendChild(makeCard({
    icon: '🕐',
    title: 'Horarios',
    status: horariosOk ? 'ok' : 'empty',
    body: horariosOk ? '<p>Configurados</p>' : '<p>Sin configurar</p>',
    onEdit: () => openHorariosEditor(entidad, comercioId, rerender)
  }));
  if (ctx.offerType?.productos) {
    const entregaOk = entidad.entrega && Object.keys(entidad.entrega).length > 0;
    grid.appendChild(makeCard({
      icon: '🚚',
      title: 'Entrega',
      status: entregaOk ? 'ok' : 'empty',
      body: entregaOk ? `<p>${Object.keys(entidad.entrega).join(', ')}</p>` : '<p>Sin configurar</p>',
      onEdit: () => openEditModal({
        title: 'Editar Entrega (JSON)',
        fields: [{ key: 'entrega', label: 'Entrega', type: 'json' }],
        data: entidad,
        onSave: async (updates) => {
          await updateDoc(doc(db, 'entidades', comercioId), { entrega: updates.entrega, fechaActualizacion: new Date() });
          entidad.entrega = updates.entrega;
          rerender();
        }
      })
    }));
  }
  if (ctx.entityType === 'profesional') {
    const lugaresOk = entidad.lugares?.length > 0;
    grid.appendChild(makeCard({
      icon: '📍',
      title: 'Lugares',
      status: lugaresOk ? 'ok' : 'empty',
      body: lugaresOk ? `<p>${entidad.lugares.length} lugar(es)</p>` : '<p>Sin configurar</p>',
      onEdit: () => openEditModal({
        title: 'Editar Lugares (JSON)',
        fields: [{ key: 'lugares', label: 'Lugares', type: 'json' }],
        data: entidad,
        onSave: async (updates) => {
          await updateDoc(doc(db, 'entidades', comercioId), { lugares: updates.lugares, fechaActualizacion: new Date() });
          entidad.lugares = updates.lugares;
          rerender();
        }
      })
    }));
    const coberturaOk = entidad.cobertura && Object.keys(entidad.cobertura).length > 0;
    grid.appendChild(makeCard({
      icon: '🗺️',
      title: 'Cobertura',
      status: coberturaOk ? 'ok' : 'empty',
      body: coberturaOk ? '<p>Configurada</p>' : '<p>Sin configurar</p>',
      onEdit: () => openEditModal({
        title: 'Editar Cobertura (JSON)',
        fields: [{ key: 'cobertura', label: 'Cobertura', type: 'json' }],
        data: entidad,
        onSave: async (updates) => {
          await updateDoc(doc(db, 'entidades', comercioId), { cobertura: updates.cobertura, fechaActualizacion: new Date() });
          entidad.cobertura = updates.cobertura;
          rerender();
        }
      })
    }));
    const consultasOk = entidad.consultas?.length > 0;
    grid.appendChild(makeCard({
      icon: '📋',
      title: 'Consultas',
      status: consultasOk ? 'ok' : 'empty',
      body: consultasOk ? `<p>${entidad.consultas.length} tipo(s)</p>` : '<p>Sin configurar</p>',
      onEdit: () => openEditModal({
        title: 'Editar Consultas (JSON)',
        fields: [{ key: 'consultas', label: 'Consultas', type: 'json' }],
        data: entidad,
        onSave: async (updates) => {
          await updateDoc(doc(db, 'entidades', comercioId), { consultas: updates.consultas, fechaActualizacion: new Date() });
          entidad.consultas = updates.consultas;
          rerender();
        }
      })
    }));
  }
  container.appendChild(wrap);
}

// ──────────────────────────────────────────────────────────
// SECCIÓN: IA
// ──────────────────────────────────────────────────────────
function renderSeccionIA(container, entidad, entCtx, comercioId, rerender) {
  const { wrap, grid } = makeSection('🤖 Inteligencia Artificial', 'Config de IA y capacidades');
  const aiOk = !!entidad.aiConfig;
  grid.appendChild(makeCard({
    icon: '🤖',
    title: 'Config IA',
    status: aiOk ? 'ok' : 'empty',
    body: aiOk
      ? `<p>Nombre: ${entidad.aiConfig?.identidad?.nombre || '-'}</p>
         <p>Tono: ${entidad.aiConfig?.identidad?.tono || '-'}</p>`
      : '<p>Sin configurar</p>',
    onEdit: () => openIAConfigEditor(entidad, entCtx, comercioId, rerender)
  }));
  const cogOk = !!entidad.cognitive_permissions && Object.keys(entidad.cognitive_permissions).length > 0;
  const cogActivas = cogOk
    ? Object.entries(entidad.cognitive_permissions).filter(([,v]) => v?.enabled).map(([,v]) => v.label).join(', ')
    : '';
  grid.appendChild(makeCard({
    icon: '🧠',
    title: 'Capacidades',
    status: cogOk ? 'ok' : 'empty',
    body: cogActivas ? `<p>${cogActivas}</p>` : '<p>Sin capacidades activas</p>',
    onEdit: () => {
      const overlay = document.createElement('div');
      overlay.className = 'sa-modal-overlay';
      const modal = document.createElement('div');
      modal.className = 'sa-modal sa-modal--wide';
      const header = document.createElement('div');
      header.className = 'sa-modal-header';
      header.innerHTML = '<h3>Editar Capacidades</h3><button class="sa-modal-close">&times;</button>';
      const body = document.createElement('div');
      body.className = 'sa-modal-body';
      const checkboxGroup = createCheckboxGroup({
        name: 'cognitive_permissions',
        value: cognitivePermissionsToKeys(entidad.cognitive_permissions),
        options: Object.entries(COGNITIVE_PERMISSIONS).map(([key, def]) => ({
          value: key, label: def.label, description: def.description
        }))
      });
      body.appendChild(checkboxGroup);
      const footer = document.createElement('div');
      footer.className = 'sa-modal-footer';
      const cancelBtn = document.createElement('button');
      cancelBtn.className = 'sa-btn sa-btn--secondary';
      cancelBtn.textContent = 'Cancelar';
      cancelBtn.onclick = () => overlay.remove();
      const saveBtn = document.createElement('button');
      saveBtn.className = 'sa-btn sa-btn--primary';
      saveBtn.textContent = 'Guardar';
      saveBtn.onclick = async () => {
        saveBtn.disabled = true;
        saveBtn.textContent = 'Guardando...';
        try {
          const nuevo = keysToCognitivePermissions(checkboxGroup.getValue());
          await updateDoc(doc(db, 'entidades', comercioId), { cognitive_permissions: nuevo, fechaActualizacion: new Date() });
          entidad.cognitive_permissions = nuevo;
          overlay.remove();
          rerender();
        } catch (err) {
          console.error('[superAdmin] Error guardando capacidades:', err);
          saveBtn.disabled = false;
          saveBtn.textContent = 'Error — reintentar';
        }
      };
      footer.appendChild(cancelBtn);
      footer.appendChild(saveBtn);
      modal.appendChild(header);
      modal.appendChild(body);
      modal.appendChild(footer);
      overlay.appendChild(modal);
      document.body.appendChild(overlay);
      modal.querySelector('.sa-modal-close').onclick = () => overlay.remove();
      overlay.onclick = e => { if (e.target === overlay) overlay.remove(); };
    }
  }));
  const visualOk = !!entidad.templateId;
  grid.appendChild(makeCard({
    icon: '🎨',
    title: 'Visual',
    status: visualOk ? 'ok' : 'empty',
    body: visualOk ? `<p>Template: ${entidad.templateId}</p>` : '<p>Sin template elegido</p>',
    onEdit: async () => {
      const templates = await loadTemplatesForEntityType(entCtx.entityType);
      const overlay = document.createElement('div');
      overlay.className = 'sa-modal-overlay';
      const modal = document.createElement('div');
      modal.className = 'sa-modal sa-modal--wide';
      const header = document.createElement('div');
      header.className = 'sa-modal-header';
      header.innerHTML = '<h3>Editar Visual</h3><button class="sa-modal-close">&times;</button>';
      const body = document.createElement('div');
      body.className = 'sa-modal-body';
      const selector = createTemplateSelector({
        templates,
        selectedId: entidad.templateId || null
      });
      body.appendChild(selector);
      const footer = document.createElement('div');
      footer.className = 'sa-modal-footer';
      const cancelBtn = document.createElement('button');
      cancelBtn.className = 'sa-btn sa-btn--secondary';
      cancelBtn.textContent = 'Cancelar';
      cancelBtn.onclick = () => overlay.remove();
      const saveBtn = document.createElement('button');
      saveBtn.className = 'sa-btn sa-btn--primary';
      saveBtn.textContent = 'Guardar';
      saveBtn.onclick = async () => {
        saveBtn.disabled = true;
        saveBtn.textContent = 'Guardando...';
        try {
          const nuevoId = selector.getValue();
          const updates = nuevoId
            ? { templateId: nuevoId, templateUpdatedAt: new Date().toISOString() }
            : { templateId: null, templateUpdatedAt: null };
          await updateDoc(doc(db, 'entidades', comercioId), { ...updates, fechaActualizacion: new Date() });
          Object.assign(entidad, updates);
          overlay.remove();
          rerender();
        } catch (err) {
          console.error('[superAdmin] Error guardando visual:', err);
          saveBtn.disabled = false;
          saveBtn.textContent = 'Error — reintentar';
        }
      };
      footer.appendChild(cancelBtn);
      footer.appendChild(saveBtn);
      modal.appendChild(header);
      modal.appendChild(body);
      modal.appendChild(footer);
      overlay.appendChild(modal);
      document.body.appendChild(overlay);
      modal.querySelector('.sa-modal-close').onclick = () => overlay.remove();
      overlay.onclick = e => { if (e.target === overlay) overlay.remove(); };
    }
  }));
  container.appendChild(wrap);
}

// ──────────────────────────────────────────────────────────
// SECCIÓN: PLAN
// ──────────────────────────────────────────────────────────
function renderSeccionPlan(container, entidad, comercioId, rerender) {
  const { wrap, grid } = makeSection('💳 Plan', 'Estado del plan y acceso');
  const plan = entidad.plan || {};
  const tipo = plan.type || 'trial';
  const activo = plan.active ?? false;
  const trial = plan.trial ?? true;
  const expiresAt = plan.expires_at?.toDate?.() || (plan.expires_at ? new Date(plan.expires_at) : null);
  const ahora = new Date();
  const vencido = expiresAt && expiresAt < ahora;
  const estado = vencido ? 'vencido'
    : !activo ? 'inactivo'
    : trial ? 'trial'
    : 'activo';
  const status = (estado === 'vencido' || estado === 'inactivo') ? 'warning' : 'ok';
  const diasRestantes = expiresAt
    ? Math.max(0, Math.ceil((expiresAt - ahora) / (1000 * 60 * 60 * 24)))
    : null;
  grid.appendChild(makeCard({
    icon: '💳',
    title: tipo.toUpperCase(),
    meta: estado,
    status,
    body: `
      <p>Activo: ${activo ? '✓' : '✗'}</p>
      <p>Trial: ${trial ? '✓' : '✗'}</p>
      ${expiresAt ? `<p>Vence: ${expiresAt.toLocaleDateString('es-AR')}</p>` : ''}
      ${diasRestantes !== null ? `<p>Días restantes: <strong>${diasRestantes}</strong></p>` : ''}
    `,
    onEdit: () => openEditModal({
      title: 'Editar Plan',
      fields: [
        { key: 'type', label: 'Tipo', type: 'select', options: [
          { value: 'trial', label: 'Trial' },
          { value: 'basic', label: 'Basic' },
          { value: 'medium', label: 'Medium' },
          { value: 'pro', label: 'Pro' },
        ]},
        { key: 'active', label: 'Activo', type: 'boolean' },
        { key: 'trial', label: 'Es trial', type: 'boolean' },
        { key: 'expires_at', label: 'Vence el (ISO)', placeholder: '2026-06-25T00:00:00.000Z' },
      ],
      data: {
        type: tipo,
        active: activo,
        trial,
        expires_at: expiresAt ? expiresAt.toISOString() : '',
      },
      onSave: async (updates) => {
        await updateDoc(doc(db, 'entidades', comercioId), {
          'plan.type': updates.type,
          'plan.active': updates.active,
          'plan.trial': updates.trial,
          'plan.expires_at': updates.expires_at ? new Date(updates.expires_at) : null,
          fechaActualizacion: new Date()
        });
        Object.assign(entidad.plan, updates);
        rerender();
      }
    })
  }));
  container.appendChild(wrap);
}

// ──────────────────────────────────────────────────────────
// SECCIÓN: PUBLICACIÓN
// ──────────────────────────────────────────────────────────
function renderSeccionPublicacion(container, entidad, comercioId, rerender) {
  const { wrap, grid } = makeSection('🚀 Publicación', 'Estado de publicación y onboarding');
  const slug = entidad.landing?.slug;
  const generatedAt = entidad.entityGeneratedAt
    ? (entidad.entityGeneratedAt?.toDate?.() || new Date(entidad.entityGeneratedAt))
    : null;
  const steps = entidad.onboardingSteps || {};
  const stepsOk = Object.values(steps).filter(Boolean).length;
  const stepsTotal = Object.keys(steps).length;
  grid.appendChild(makeCard({
    icon: '🔗',
    title: 'Landing',
    status: slug ? 'ok' : 'empty',
    body: slug
      ? `<p>indiceia.com/${slug}</p><p>Generada: ${generatedAt ? '✓' : '⚠ pendiente'}</p>`
      : '<p>Sin slug asignado</p>',
  }));
  grid.appendChild(makeCard({
    icon: '📋',
    title: 'Onboarding',
    status: stepsOk === stepsTotal && stepsTotal > 0 ? 'ok' : 'warning',
    body: `<p>${stepsOk}/${stepsTotal} pasos completados</p>
           <pre style="font-size:11px;margin:4px 0">${JSON.stringify(steps, null, 1)}</pre>`,
    onEdit: () => openEditModal({
      title: 'Editar Onboarding Steps (JSON)',
      fields: [{ key: 'onboardingSteps', label: 'Steps', type: 'json' }],
      data: entidad,
      onSave: async (updates) => {
        await updateDoc(doc(db, 'entidades', comercioId), { onboardingSteps: updates.onboardingSteps, fechaActualizacion: new Date() });
        entidad.onboardingSteps = updates.onboardingSteps;
        rerender();
      }
    })
  }));
  grid.appendChild(makeCard({
    icon: '⚡',
    title: 'Regenerar entidad',
    status: generatedAt ? 'ok' : 'empty',
    body: generatedAt
      ? `<p>Última generación: ${generatedAt.toLocaleString('es-AR')}</p>`
      : '<p>Nunca generada</p>',
    onEdit: async () => {
      const btns = document.querySelectorAll('.sa-btn--edit');
      btns.forEach(b => { b.disabled = true; b.textContent = 'Generando...'; });
      try {
        const res = await fetch('/api/generate-and-upload-entity', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ comercioId })
        });
        if (!res.ok) throw new Error(await res.text());
        entidad.entityGeneratedAt = new Date().toISOString();
        rerender();
      } catch (err) {
        console.error('Error regenerando:', err);
        alert('Error al regenerar: ' + err.message);
      }
    }
  }));
  container.appendChild(wrap);
}

// ──────────────────────────────────────────────────────────
// JSON DEBUG
// ──────────────────────────────────────────────────────────
function renderJsonDebug(container, selected) {
  const details = document.createElement('details');
  details.className = 'sa-debug';
  const summary = document.createElement('summary');
  summary.textContent = '🛠 JSON completo de la entidad';
  details.appendChild(summary);
  const pre = document.createElement('pre');
  pre.className = 'sa-debug-pre';
  pre.textContent = JSON.stringify(selected, null, 2);
  details.appendChild(pre);
  container.appendChild(details);
}

// ──────────────────────────────────────────────────────────
// HORARIOS — usa el editor compartido en vez de JSON crudo
// ──────────────────────────────────────────────────────────
function openHorariosEditor(entidad, comercioId, rerender) {
  const overlay = document.createElement('div');
  overlay.className = 'sa-modal-overlay';
  const modal = document.createElement('div');
  modal.className = 'sa-modal sa-modal--wide';
  const header = document.createElement('div');
  header.className = 'sa-modal-header';
  header.innerHTML = '<h3>Editar Horarios</h3><button class="sa-modal-close">&times;</button>';
  const body = document.createElement('div');
  body.className = 'sa-modal-body';
  const editor = createHorariosEditor(entidad.horarios, { tieneLocalFisico: true });
  body.appendChild(editor.element);
  const footer = document.createElement('div');
  footer.className = 'sa-modal-footer';
  const cancelBtn = document.createElement('button');
  cancelBtn.className = 'sa-btn sa-btn--secondary';
  cancelBtn.textContent = 'Cancelar';
  cancelBtn.onclick = () => overlay.remove();
  const saveBtn = document.createElement('button');
  saveBtn.className = 'sa-btn sa-btn--primary';
  saveBtn.textContent = 'Guardar';
  saveBtn.onclick = async () => {
    saveBtn.disabled = true;
    saveBtn.textContent = 'Guardando...';
    try {
      const nuevosHorarios = editor.getValue();
      await updateDoc(doc(db, 'entidades', comercioId), { horarios: nuevosHorarios, fechaActualizacion: new Date() });
      entidad.horarios = nuevosHorarios;
      overlay.remove();
      rerender();
    } catch (err) {
      console.error('[superAdmin] Error guardando horarios:', err);
      saveBtn.disabled = false;
      saveBtn.textContent = 'Error — reintentar';
    }
  };
  footer.appendChild(cancelBtn);
  footer.appendChild(saveBtn);
  modal.appendChild(header);
  modal.appendChild(body);
  modal.appendChild(footer);
  overlay.appendChild(modal);
  document.body.appendChild(overlay);
  modal.querySelector('.sa-modal-close').onclick = () => overlay.remove();
  overlay.onclick = e => { if (e.target === overlay) overlay.remove(); };
}

// ──────────────────────────────────────────────────────────
// CONFIG IA — form simple con selects, en vez de JSON crudo
// ──────────────────────────────────────────────────────────
function openIAConfigEditor(entidad, entCtx, comercioId, rerender) {
  const raw = entidad.aiConfig || {};
  const esSoporte = entCtx.entityType === 'soporte';

  const tieneProductos =
    entCtx.entityType === 'comercio' ||
    (entCtx.capacidades || []).includes('productos');

  const tieneServicios =
    entCtx.entityType === 'prestador' ||
    (entCtx.entityType === 'comercio' && (entCtx.capacidades || []).includes('servicios'));

  const overlay = document.createElement('div');
  overlay.className = 'sa-modal-overlay';

  const modal = document.createElement('div');
  modal.className = 'sa-modal sa-modal--wide';

  const header = document.createElement('div');
  header.className = 'sa-modal-header';
  header.innerHTML = '<h3>Editar Config IA</h3><button class="sa-modal-close">&times;</button>';

  const body = document.createElement('div');
  body.className = 'sa-modal-body';

  const fields = {};

  if (!esSoporte) {
    fields.nombre = createFormField({
      label: 'Nombre de la IA',
      value: raw.identidad?.nombre || '',
      required: true
    });
    body.appendChild(fields.nombre);
  }

  fields.idioma = createFormField({
    label: 'Idioma', type: 'select',
    value: raw.identidad?.idioma || 'es-AR',
    options: [
      { value: 'es-AR', label: 'Español (Argentina)' },
      { value: 'es-ES', label: 'Español (España)'    },
      { value: 'es-MX', label: 'Español (México)'    },
      { value: 'en-US', label: 'English (US)'         },
      { value: 'pt-BR', label: 'Português (Brasil)'  }
    ]
  });
  body.appendChild(fields.idioma);

  fields.personalidad = createFormField({
    label: 'Personalidad', type: 'select', required: true,
    value: raw.identidad?.personalidad || '',
    options: [
      { value: '',         label: 'Seleccionar' },
      { value: 'amigable', label: 'Amigable'    },
      { value: 'formal',   label: 'Formal'      },
      { value: 'vendedor', label: 'Vendedor'    }
    ]
  });
  body.appendChild(fields.personalidad);

  fields.tono = createFormField({
    label: 'Tono de comunicación', type: 'select', required: true,
    value: raw.identidad?.tono || '',
    options: [
      { value: '',         label: 'Seleccionar' },
      { value: 'informal', label: 'Informal'    },
      { value: 'neutral',  label: 'Neutral'     },
      { value: 'formal',   label: 'Formal'      }
    ]
  });
  body.appendChild(fields.tono);

  fields.saludoPrefix = createFormField({
    label: 'Saludo inicial',
    value: raw.identidad?.saludoPrefix || '¡Hola! Soy',
    placeholder: '¡Hola! Soy'
  });
  body.appendChild(fields.saludoPrefix);

  fields.proactividad = createFormField({
    label: 'Nivel de proactividad', type: 'select',
    value: raw.comportamiento?.proactividad || '',
    options: [
      { value: '',      label: 'Seleccionar' },
      { value: 'bajo',  label: 'Bajo'        },
      { value: 'medio', label: 'Medio'       },
      { value: 'alto',  label: 'Alto'        }
    ]
  });
  body.appendChild(fields.proactividad);

  fields.formatoRespuestas = createFormField({
    label: 'Formato de respuestas', type: 'select',
    value: raw.comportamiento?.formatoRespuestas || '',
    options: [
      { value: '',           label: 'Seleccionar' },
      { value: 'cortas',     label: 'Cortas'      },
      { value: 'detalladas', label: 'Detalladas'  }
    ]
  });
  body.appendChild(fields.formatoRespuestas);

  if (tieneProductos || tieneServicios) {
    fields.sinPrecio = createFormField({
      label: 'Si no hay precio', type: 'select',
      value: raw.contingencias?.sinPrecio || '',
      options: [
        { value: '',          label: 'Seleccionar' },
        { value: 'informar',  label: 'Informar que no hay precio disponible' },
        { value: 'consultar', label: 'Pedir consulta al dueño' }
      ]
    });
    body.appendChild(fields.sinPrecio);
  }

  if (tieneProductos) {
    fields.sinStock = createFormField({
      label: 'Si no hay stock', type: 'select',
      value: raw.contingencias?.sinStock || '',
      options: [
        { value: '',                   label: 'Seleccionar' },
        { value: 'informar',           label: 'Informar que no hay stock' },
        { value: 'ofrecerAlternativa', label: 'Ofrecer alternativa similar' }
      ]
    });
    body.appendChild(fields.sinStock);
  }

  fields.contexto = createFormField({
    label: 'Instrucciones generales para la IA',
    type: 'textarea', rows: 5,
    value: (raw.contexto?.global_ai_context || []).join('\n'),
    helpText: 'Una idea por línea. Aplican a todos los servicios.'
  });
  body.appendChild(fields.contexto);

  const footer = document.createElement('div');
  footer.className = 'sa-modal-footer';

  const cancelBtn = document.createElement('button');
  cancelBtn.className = 'sa-btn sa-btn--secondary';
  cancelBtn.textContent = 'Cancelar';
  cancelBtn.onclick = () => overlay.remove();

  const saveBtn = document.createElement('button');
  saveBtn.className = 'sa-btn sa-btn--primary';
  saveBtn.textContent = 'Guardar';
  saveBtn.onclick = async () => {
    saveBtn.disabled = true;
    saveBtn.textContent = 'Guardando...';

    try {
      const contingencias = {};
      if (tieneProductos || tieneServicios) contingencias.sinPrecio = fields.sinPrecio.getValue();
      if (tieneProductos) contingencias.sinStock = fields.sinStock.getValue();

      const lines = fields.contexto.getValue().split('\n').map(l => l.trim()).filter(Boolean);

      const nuevoAiConfig = {
        identidad: {
          nombre:       esSoporte ? (entidad.nombre || '') : fields.nombre.getValue().trim(),
          idioma:       fields.idioma.getValue(),
          personalidad: fields.personalidad.getValue(),
          tono:         fields.tono.getValue(),
          saludoPrefix: fields.saludoPrefix.getValue().trim()
        },
        comportamiento: {
          proactividad:      fields.proactividad.getValue(),
          formatoRespuestas: fields.formatoRespuestas.getValue()
        },
        ...(Object.keys(contingencias).length > 0 && { contingencias }),
        ...(lines.length > 0 && { contexto: { global_ai_context: lines } })
      };

      await updateDoc(doc(db, 'entidades', comercioId), {
        aiConfig: nuevoAiConfig,
        fechaActualizacion: new Date()
      });
      entidad.aiConfig = nuevoAiConfig;
      overlay.remove();
      rerender();
    } catch (err) {
      console.error('[superAdmin] Error guardando Config IA:', err);
      saveBtn.disabled = false;
      saveBtn.textContent = 'Error — reintentar';
    }
  };

  footer.appendChild(cancelBtn);
  footer.appendChild(saveBtn);
  modal.appendChild(header);
  modal.appendChild(body);
  modal.appendChild(footer);
  overlay.appendChild(modal);
  document.body.appendChild(overlay);
  modal.querySelector('.sa-modal-close').onclick = () => overlay.remove();
  overlay.onclick = e => { if (e.target === overlay) overlay.remove(); };
}

// ──────────────────────────────────────────────────────────
// PANELES ESPECIALES: PRODUCTOS / SERVICIOS
// ──────────────────────────────────────────────────────────
async function openItemsPanel(comercioId, subcoleccion, { titleIcon, titleLabel, emptyLabel, renderItem }) {
  const snap = await getDocs(collection(db, 'entidades', comercioId, subcoleccion));
  const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  const overlay = document.createElement('div');
  overlay.className = 'sa-modal-overlay';
  const modal = document.createElement('div');
  modal.className = 'sa-modal sa-modal--wide';
  modal.innerHTML = `
    <div class="sa-modal-header">
      <h3>${titleIcon} ${titleLabel} (${items.length})</h3>
      <button class="sa-modal-close">&times;</button>
    </div>
    <div class="sa-modal-body">
      ${items.length === 0 ? `<p>${emptyLabel}</p>` : items.map(renderItem).join('')}
    </div>
    <div class="sa-modal-footer">
      <button class="sa-btn sa-btn--secondary sa-close">Cerrar</button>
    </div>
  `;
  overlay.appendChild(modal);
  document.body.appendChild(overlay);
  modal.querySelector('.sa-modal-close').onclick = () => overlay.remove();
  modal.querySelector('.sa-close').onclick = () => overlay.remove();
  overlay.onclick = e => { if (e.target === overlay) overlay.remove(); };
}
function openProductosPanel(comercioId) {
  return openItemsPanel(comercioId, 'productos', {
    titleIcon: '📦',
    titleLabel: 'Productos',
    emptyLabel: 'Sin productos',
    renderItem: (p) => `
      <div class="sa-item">
        <strong>${p.nombre || '-'}</strong>
        <span>$${p.precio_final ?? '-'}</span>
        <span>${p.paused ? '🔴 pausado' : '🟢 activo'}</span>
      </div>
    `
  });
}
function openServiciosPanel(comercioId) {
  return openItemsPanel(comercioId, 'servicios', {
    titleIcon: '🛎️',
    titleLabel: 'Servicios',
    emptyLabel: 'Sin servicios',
    renderItem: (s) => `
      <div class="sa-item">
        <strong>${s.nombre || '-'}</strong>
        <span>${s.precio?.valor ? `$${s.precio.valor}` : 'Sin precio'}</span>
        <span>${s.activo === false ? '🔴 inactivo' : '🟢 activo'}</span>
      </div>
    `
  });
}
