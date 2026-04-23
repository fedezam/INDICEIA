// src/views/superAdminPanel.js
import '../pages/super-admin.css';
import { listEntidades, loadEntidad } from '../controllers/panelCore.js';
import { createTable, createEmptyState } from '../skeleton/components/skeletonComponents.js';
import { buildFlowContext, buildPipeline } from '../controllers/flowController.js';
import { getPlanData, calcularEstadoPlan, getDiasRestantesTrial } from '../shared/plans.js';
import { db } from '../services/firebase/firebase.js';
import { doc, updateDoc, collection, getDocs, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';

// ─── container helper ────────────────────────────────────────
function getContainer() {
  return (
    document.getElementById('skeleton-page') ||
    document.getElementById('page-content') ||
    document.getElementById('app')
  );
}

// ─── sección wrapper ─────────────────────────────────────────
function makeSection(titulo, subtitulo = '') {
  const wrap = document.createElement('div');
  wrap.className = 'sa-section';

  const hdr = document.createElement('div');
  hdr.className = 'sa-section-header';
  hdr.innerHTML = `<h3 class="sa-section-title">${titulo}</h3>${subtitulo ? `<p class="sa-section-sub">${subtitulo}</p>` : ''}`;
  wrap.appendChild(hdr);

  const grid = document.createElement('div');
  grid.className = 'sa-grid';
  wrap.appendChild(grid);

  return { wrap, grid };
}

// ─── card builder ────────────────────────────────────────────
function makeCard({ icon, title, meta = '', status = 'ok', body = '', onEdit }) {
  const card = document.createElement('div');
  card.className = `sa-card sa-card--${status}`;

  const statusIcon = { ok: '✓', empty: '○', warning: '⚠' }[status] || '○';

  card.innerHTML = `
    <div class="sa-card-head">
      <span class="sa-card-icon">${icon}</span>
      <div class="sa-card-titles">
        <span class="sa-card-title">${title}</span>
        ${meta ? `<span class="sa-card-meta">${meta}</span>` : ''}
      </div>
      <span class="sa-card-status sa-status--${status}">${statusIcon}</span>
    </div>
    <div class="sa-card-body">${body}</div>
    <div class="sa-card-foot"></div>
  `;

  if (onEdit) {
    const btn = document.createElement('button');
    btn.className = 'sa-btn sa-btn--edit';
    btn.innerHTML = '<i class="fas fa-pen"></i> Editar';
    btn.onclick = onEdit;
    card.querySelector('.sa-card-foot').appendChild(btn);
  }

  return card;
}

// ─── modal de edición genérico ───────────────────────────────
function openEditModal({ title, fields, data, onSave }) {
  const overlay = document.createElement('div');
  overlay.className = 'sa-modal-overlay';

  const modal = document.createElement('div');
  modal.className = 'sa-modal';

  const header = document.createElement('div');
  header.className = 'sa-modal-header';
  header.innerHTML = `<h3>${title}</h3><button class="sa-modal-close">&times;</button>`;

  const body = document.createElement('div');
  body.className = 'sa-modal-body';

  // Render campos
  const refs = {};
  fields.forEach(f => {
    const wrap = document.createElement('div');
    wrap.className = 'sa-field';
    wrap.innerHTML = `<label class="sa-label">${f.label}${f.required ? ' <span class="sa-required">*</span>' : ''}</label>`;

    let input;

    if (f.type === 'textarea') {
      input = document.createElement('textarea');
      input.className = 'sa-input';
      input.rows = 3;
      input.value = data[f.key] || '';
    } else if (f.type === 'select') {
      input = document.createElement('select');
      input.className = 'sa-input';
      f.options.forEach(opt => {
        const o = document.createElement('option');
        o.value = opt.value;
        o.textContent = opt.label;
        if (data[f.key] === opt.value) o.selected = true;
        input.appendChild(o);
      });
    } else if (f.type === 'boolean') {
      input = document.createElement('input');
      input.type = 'checkbox';
      input.className = 'sa-checkbox';
      input.checked = !!data[f.key];
    } else if (f.type === 'json') {
      input = document.createElement('textarea');
      input.className = 'sa-input sa-input--mono';
      input.rows = 6;
      try { input.value = JSON.stringify(data[f.key] || {}, null, 2); } catch { input.value = '{}'; }
    } else {
      input = document.createElement('input');
      input.type = f.type || 'text';
      input.className = 'sa-input';
      input.value = data[f.key] ?? '';
      if (f.placeholder) input.placeholder = f.placeholder;
    }

    refs[f.key] = { input, field: f };
    wrap.appendChild(input);
    body.appendChild(wrap);
  });

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
    const updates = {};
    let valid = true;

    Object.entries(refs).forEach(([key, { input, field }]) => {
      if (field.type === 'boolean') {
        updates[key] = input.checked;
      } else if (field.type === 'json') {
        try { updates[key] = JSON.parse(input.value); }
        catch { valid = false; input.style.borderColor = 'var(--s-danger)'; }
      } else if (field.type === 'number') {
        updates[key] = parseFloat(input.value) || 0;
      } else {
        updates[key] = input.value.trim();
      }
    });

    if (!valid) return;

    saveBtn.disabled = true;
    saveBtn.textContent = 'Guardando...';

    try {
      await onSave(updates);
      overlay.remove();
    } catch (err) {
      console.error('[superAdmin] Error guardando:', err);
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

// ============================================================
// PAGE OBJECT
// ============================================================
export const page = {
  entities:  [],
  selected:  null,
  isLoading: false,

  async load(context) {
    if (!context?.user) { window.location.href = '/admin-login'; return; }
    if (context.userData?.role !== 'admin') { window.location.href = '/dashboard'; return; }
    this.entities = await listEntidades();
  },

  render() {
    const container = getContainer();
    if (!container) return;
    container.innerHTML = '';

    if (this.isLoading) {
      container.appendChild(createEmptyState({ icon: 'fas fa-spinner fa-spin', title: 'Cargando...', message: '' }));
      return;
    }

    if (!this.selected) {
      this._renderList(container);
    } else {
      this._renderPanel(container);
    }
  },

  // ──────────────────────────────────────────────────────────
  // LISTADO
  // ──────────────────────────────────────────────────────────
  _renderList(container) {
    const header = document.createElement('div');
    header.className = 'sa-list-header';
    header.innerHTML = `
      <h2 class="sa-list-title">
        <i class="fas fa-database"></i> Entidades
        <span class="sa-count">${this.entities.length}</span>
      </h2>
    `;
    container.appendChild(header);

    if (!this.entities.length) {
      container.appendChild(createEmptyState({ icon: 'fas fa-database', title: 'Sin entidades', message: 'No hay datos en Firestore' }));
      return;
    }

    const table = createTable({
      columns: [
        { key: '_nombre',    label: 'Nombre' },      // ← fix: normalizado
        { key: 'id',         label: 'ID' },
        { key: 'entityType', label: 'Tipo' },
        { key: '_fecha',     label: 'Actualización' }
      ],
      data: this.entities.map(e => ({
        ...e,
        _nombre: e.nombreComercio || e.nombre || '-', // ← fix: fallback a e.nombre
        _fecha:  e.fechaActualizacion
                   ? e.fechaActualizacion.toLocaleDateString('es-AR')
                   : '-'
      })),
      actions: [{ id: 'ver', label: 'Ver', icon: 'fas fa-eye', onClick: (row) => this.openEntity(row.id) }]
    });

    container.appendChild(table);
  },

  // ──────────────────────────────────────────────────────────
  // ABRIR ENTIDAD
  // ──────────────────────────────────────────────────────────
  async openEntity(id) {
    this.isLoading = true;
    this.render();

    try {
      this.selected = await loadEntidad(id);
    } catch (err) {
      console.error('[superAdmin]', err);
      this.selected = null;
      const c = getContainer();
      if (c) { c.innerHTML = ''; c.appendChild(createEmptyState({ icon: 'fas fa-exclamation-triangle', title: 'Error', message: err.message })); }
      return;
    } finally {
      this.isLoading = false;
    }

    this.render();
  },

  // ──────────────────────────────────────────────────────────
  // PANEL PRINCIPAL DE ENTIDAD
  // ──────────────────────────────────────────────────────────
  _renderPanel(container) {
    const { entidad, user, ctx, pipeline, steps } = this.selected;
    const comercioId = entidad.id || Object.keys(this.selected).find(k => k === 'id');

    const topbar = document.createElement('div');
    topbar.className = 'sa-topbar';
    topbar.innerHTML = `
      <button class="sa-btn sa-btn--back"><i class="fas fa-arrow-left"></i> Volver</button>
      <div class="sa-entity-title">
        <span class="sa-entity-name">${entidad.nombreComercio || entidad.nombre || 'Entidad'}</span>
        <span class="sa-entity-type">${ctx.entityType}</span>
      </div>
    `;
    topbar.querySelector('.sa-btn--back').onclick = () => { this.selected = null; this.render(); };
    container.appendChild(topbar);

    this._renderSeccionIdentidad(container, entidad, ctx, comercioId);
    this._renderSeccionTipoEntidad(container, entidad, user, comercioId);

    if (ctx.offerType?.productos || ctx.offerType?.servicios) {
      this._renderSeccionCatalogo(container, entidad, ctx, comercioId);
    }

    this._renderSeccionOperativa(container, entidad, ctx, pipeline, comercioId);
    this._renderSeccionIA(container, entidad, comercioId);
    this._renderSeccionPlan(container, entidad, comercioId);
    this._renderSeccionPublicacion(container, entidad, comercioId);
    this._renderJsonDebug(container, this.selected);
  },

  // ──────────────────────────────────────────────────────────
  // SECCIÓN: IDENTIDAD
  // ──────────────────────────────────────────────────────────
  _renderSeccionIdentidad(container, entidad, ctx, comercioId) {
    const { wrap, grid } = makeSection('🏪 Identidad', 'Datos principales de la entidad');

    const isComercio    = ctx.entityType === 'comercio';
    const isPrestador   = ctx.entityType === 'prestador';
    const isProfesional = ctx.entityType === 'profesional';

    const nombre    = entidad.nombreComercio || entidad.nombre || '';
    const hasNombre = !!nombre;

    const card = makeCard({
      icon:   isComercio ? '🏪' : isPrestador ? '👷' : '🩺',
      title:  isComercio ? 'Mi Comercio' : isPrestador ? 'Mi Perfil' : 'Perfil Profesional',
      meta:   nombre || 'Sin nombre',
      status: hasNombre ? 'ok' : 'empty',
      body: `
        <p>${entidad.descripcion || '<em>Sin descripción</em>'}</p>
        ${entidad.telefono  ? `<p>📞 ${entidad.telefono}</p>`  : ''}
        ${entidad.email     ? `<p>✉️ ${entidad.email}</p>`     : ''}
        ${entidad.direccion ? `<p>📍 ${entidad.direccion}</p>` : ''}
      `,
      onEdit: () => {
        const fields = isComercio ? [
          { key: 'nombreComercio',   label: 'Nombre del Comercio', required: true },
          { key: 'descripcion',      label: 'Descripción', type: 'textarea', required: true },
          { key: 'telefono',         label: 'Teléfono' },
          { key: 'email',            label: 'Email', type: 'email' },
          { key: 'direccion',        label: 'Dirección' },
          { key: 'website',          label: 'Website' },
          { key: 'instagram',        label: 'Instagram' },
          { key: 'whatsapp',         label: 'WhatsApp' },
          { key: 'tieneLocalFisico', label: 'Tiene local físico', type: 'boolean' },
        ] : isProfesional ? [
          { key: 'nombre',               label: 'Nombre', required: true },
          { key: 'titulo',               label: 'Título profesional' },
          { key: 'especialidad',         label: 'Especialidad' },
          { key: 'descripcion',          label: 'Descripción', type: 'textarea' },
          { key: 'telefono',             label: 'Teléfono' },
          { key: 'email',                label: 'Email', type: 'email' },
          { key: 'institucionFormadora', label: 'Institución' },
          { key: 'experiencia',          label: 'Experiencia' },
        ] : [
          { key: 'nombre',       label: 'Nombre', required: true },
          { key: 'especialidad', label: 'Especialidad' },
          { key: 'descripcion',  label: 'Descripción', type: 'textarea' },
          { key: 'telefono',     label: 'Teléfono' },
          { key: 'email',        label: 'Email', type: 'email' },
          { key: 'direccion',    label: 'Dirección' },
          { key: 'whatsapp',     label: 'WhatsApp' },
          { key: 'instagram',    label: 'Instagram' },
        ];

        openEditModal({
          title: 'Editar Identidad',
          fields,
          data: entidad,
          onSave: async (updates) => {
            await updateDoc(doc(db, 'entidades', comercioId), { ...updates, fechaActualizacion: new Date() });
            Object.assign(entidad, updates);
            this.render();
          }
        });
      }
    });

    grid.appendChild(card);
    container.appendChild(wrap);
  },

  // ──────────────────────────────────────────────────────────
  // SECCIÓN: TIPO DE ENTIDAD
  // ──────────────────────────────────────────────────────────
  _renderSeccionTipoEntidad(container, entidad, user, comercioId) {
    const { wrap, grid } = makeSection('🗂️ Tipo de Entidad', 'Qué tipo de entidad es y qué ofrece');

    const offerType = entidad.offerType || {};
    const offers = [
      offerType.productos && 'Productos',
      offerType.servicios && 'Servicios'
    ].filter(Boolean).join(', ') || 'Sin definir';

    const card = makeCard({
      icon:   '🗂️',
      title:  'Tipo',
      meta:   entidad.entityType || '-',
      status: entidad.entityType ? 'ok' : 'empty',
      body:   `<p>Ofrece: ${offers}</p>${entidad.serviceType ? `<p>Tipo servicio: ${entidad.serviceType}</p>` : ''}`,
      onEdit: () => {
        openEditModal({
          title: 'Editar Tipo de Entidad',
          fields: [
            { key: 'entityType', label: 'Tipo de entidad', type: 'select', options: [
              { value: 'comercio',    label: 'Comercio' },
              { value: 'prestador',  label: 'Prestador' },
              { value: 'profesional', label: 'Profesional' }
            ]},
            { key: 'serviceType', label: 'Tipo de servicio', type: 'select', options: [
              { value: '',       label: '— ninguno —' },
              { value: 'oficio', label: 'Oficio' }
            ]},
          ],
          data: { entityType: entidad.entityType, serviceType: entidad.serviceType || '' },
          onSave: async (updates) => {
            await Promise.all([
              updateDoc(doc(db, 'entidades', comercioId), { ...updates, fechaActualizacion: new Date() }),
              user?.uid ? updateDoc(doc(db, 'usuarios', user.uid || entidad.duenoId), { entityType: updates.entityType }) : Promise.resolve()
            ]);
            Object.assign(entidad, updates);
            this.render();
          }
        });
      }
    });

    const offerCard = makeCard({
      icon:   '📦',
      title:  'Oferta',
      meta:   offers,
      status: (offerType.productos || offerType.servicios) ? 'ok' : 'empty',
      body:   `
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
              user?.uid || entidad.duenoId ? updateDoc(doc(db, 'usuarios', user?.uid || entidad.duenoId), { offerType: updates }) : Promise.resolve()
            ]);
            Object.assign(entidad.offerType, updates);
            this.render();
          }
        });
      }
    });

    grid.appendChild(card);
    grid.appendChild(offerCard);
    container.appendChild(wrap);
  },

  // ──────────────────────────────────────────────────────────
  // SECCIÓN: CATÁLOGO
  // ──────────────────────────────────────────────────────────
  _renderSeccionCatalogo(container, entidad, ctx, comercioId) {
    const { wrap, grid } = makeSection('📦 Catálogo', 'Productos y servicios');

    if (ctx.offerType?.productos) {
      grid.appendChild(makeCard({
        icon:   '📦',
        title:  'Productos',
        meta:   `${entidad._productosCount || '?'} productos`,
        status: 'ok',
        body:   '<p>Gestión de productos en subcolección Firestore</p>',
        onEdit: () => this._openProductosPanel(comercioId)
      }));
    }

    if (ctx.offerType?.servicios) {
      grid.appendChild(makeCard({
        icon:   '🛎️',
        title:  'Servicios',
        status: 'ok',
        body:   '<p>Gestión de servicios en subcolección Firestore</p>',
        onEdit: () => this._openServiciosPanel(comercioId)
      }));
    }

    container.appendChild(wrap);
  },

  // ──────────────────────────────────────────────────────────
  // SECCIÓN: OPERATIVA
  // ──────────────────────────────────────────────────────────
  _renderSeccionOperativa(container, entidad, ctx, pipeline, comercioId) {
    const { wrap, grid } = makeSection('⚙️ Operativa', 'Horarios, entrega y cobertura');

    const horariosOk = entidad.horarios && Object.keys(entidad.horarios).length > 0;
    grid.appendChild(makeCard({
      icon:   '🕐',
      title:  'Horarios',
      status: horariosOk ? 'ok' : 'empty',
      body:   horariosOk ? '<p>Configurados</p>' : '<p>Sin configurar</p>',
      onEdit: () => openEditModal({
        title: 'Editar Horarios (JSON)',
        fields: [{ key: 'horarios', label: 'Horarios', type: 'json' }],
        data: entidad,
        onSave: async (updates) => {
          await updateDoc(doc(db, 'entidades', comercioId), { horarios: updates.horarios, 'onboardingSteps.horarios': true, fechaActualizacion: new Date() });
          entidad.horarios = updates.horarios;
          this.render();
        }
      })
    }));

    if (ctx.offerType?.productos) {
      const entregaOk = entidad.entrega && Object.keys(entidad.entrega).length > 0;
      grid.appendChild(makeCard({
        icon:   '🚚',
        title:  'Entrega',
        status: entregaOk ? 'ok' : 'empty',
        body:   entregaOk ? `<p>${Object.keys(entidad.entrega).join(', ')}</p>` : '<p>Sin configurar</p>',
        onEdit: () => openEditModal({
          title: 'Editar Entrega (JSON)',
          fields: [{ key: 'entrega', label: 'Entrega', type: 'json' }],
          data: entidad,
          onSave: async (updates) => {
            await updateDoc(doc(db, 'entidades', comercioId), { entrega: updates.entrega, fechaActualizacion: new Date() });
            entidad.entrega = updates.entrega;
            this.render();
          }
        })
      }));
    }

    if (ctx.entityType === 'profesional') {
      const lugaresOk = entidad.lugares?.length > 0;
      grid.appendChild(makeCard({
        icon:   '📍',
        title:  'Lugares',
        status: lugaresOk ? 'ok' : 'empty',
        body:   lugaresOk ? `<p>${entidad.lugares.length} lugar(es)</p>` : '<p>Sin configurar</p>',
        onEdit: () => openEditModal({
          title: 'Editar Lugares (JSON)',
          fields: [{ key: 'lugares', label: 'Lugares', type: 'json' }],
          data: entidad,
          onSave: async (updates) => {
            await updateDoc(doc(db, 'entidades', comercioId), { lugares: updates.lugares, fechaActualizacion: new Date() });
            entidad.lugares = updates.lugares;
            this.render();
          }
        })
      }));

      const coberturaOk = entidad.cobertura && Object.keys(entidad.cobertura).length > 0;
      grid.appendChild(makeCard({
        icon:   '🗺️',
        title:  'Cobertura',
        status: coberturaOk ? 'ok' : 'empty',
        body:   coberturaOk ? '<p>Configurada</p>' : '<p>Sin configurar</p>',
        onEdit: () => openEditModal({
          title: 'Editar Cobertura (JSON)',
          fields: [{ key: 'cobertura', label: 'Cobertura', type: 'json' }],
          data: entidad,
          onSave: async (updates) => {
            await updateDoc(doc(db, 'entidades', comercioId), { cobertura: updates.cobertura, fechaActualizacion: new Date() });
            entidad.cobertura = updates.cobertura;
            this.render();
          }
        })
      }));

      const consultasOk = entidad.consultas?.length > 0;
      grid.appendChild(makeCard({
        icon:   '📋',
        title:  'Consultas',
        status: consultasOk ? 'ok' : 'empty',
        body:   consultasOk ? `<p>${entidad.consultas.length} tipo(s)</p>` : '<p>Sin configurar</p>',
        onEdit: () => openEditModal({
          title: 'Editar Consultas (JSON)',
          fields: [{ key: 'consultas', label: 'Consultas', type: 'json' }],
          data: entidad,
          onSave: async (updates) => {
            await updateDoc(doc(db, 'entidades', comercioId), { consultas: updates.consultas, fechaActualizacion: new Date() });
            entidad.consultas = updates.consultas;
            this.render();
          }
        })
      }));
    }

    container.appendChild(wrap);
  },

  // ──────────────────────────────────────────────────────────
  // SECCIÓN: IA
  // ──────────────────────────────────────────────────────────
  _renderSeccionIA(container, entidad, comercioId) {
    const { wrap, grid } = makeSection('🤖 Inteligencia Artificial', 'Config de IA y capacidades');

    const aiOk = !!entidad.aiConfig;
    grid.appendChild(makeCard({
      icon:   '🤖',
      title:  'Config IA',
      status: aiOk ? 'ok' : 'empty',
      body: aiOk
        ? `<p>Nombre: ${entidad.aiConfig?.identidad?.nombre || '-'}</p>
           <p>Tono: ${entidad.aiConfig?.identidad?.tono || '-'}</p>`
        : '<p>Sin configurar</p>',
      onEdit: () => openEditModal({
        title: 'Editar Config IA (JSON)',
        fields: [{ key: 'aiConfig', label: 'aiConfig', type: 'json' }],
        data: entidad,
        onSave: async (updates) => {
          await updateDoc(doc(db, 'entidades', comercioId), { aiConfig: updates.aiConfig, fechaActualizacion: new Date() });
          entidad.aiConfig = updates.aiConfig;
          this.render();
        }
      })
    }));

    const cogOk = !!entidad.cognitive_permissions && Object.keys(entidad.cognitive_permissions).length > 0;
    const cogActivas = cogOk
      ? Object.entries(entidad.cognitive_permissions).filter(([,v]) => v?.enabled).map(([,v]) => v.label).join(', ')
      : '';
    grid.appendChild(makeCard({
      icon:   '🧠',
      title:  'Capacidades',
      status: cogOk ? 'ok' : 'empty',
      body:   cogActivas ? `<p>${cogActivas}</p>` : '<p>Sin capacidades activas</p>',
      onEdit: () => openEditModal({
        title: 'Editar Capacidades (JSON)',
        fields: [{ key: 'cognitive_permissions', label: 'Capacidades', type: 'json' }],
        data: entidad,
        onSave: async (updates) => {
          await updateDoc(doc(db, 'entidades', comercioId), { cognitive_permissions: updates.cognitive_permissions, fechaActualizacion: new Date() });
          entidad.cognitive_permissions = updates.cognitive_permissions;
          this.render();
        }
      })
    }));

    const visualOk = !!entidad.templateId;
    grid.appendChild(makeCard({
      icon:   '🎨',
      title:  'Visual',
      status: visualOk ? 'ok' : 'empty',
      body:   visualOk ? `<p>Template: ${entidad.templateId}</p>` : '<p>Sin template elegido</p>',
      onEdit: () => openEditModal({
        title: 'Editar Visual',
        fields: [
          { key: 'templateId',        label: 'Template ID' },
          { key: 'templateUpdatedAt', label: 'Actualizado el' },
        ],
        data: { templateId: entidad.templateId || '', templateUpdatedAt: entidad.templateUpdatedAt || '' },
        onSave: async (updates) => {
          await updateDoc(doc(db, 'entidades', comercioId), { ...updates, fechaActualizacion: new Date() });
          Object.assign(entidad, updates);
          this.render();
        }
      })
    }));

    container.appendChild(wrap);
  },

  // ──────────────────────────────────────────────────────────
  // SECCIÓN: PLAN
  // ──────────────────────────────────────────────────────────
  _renderSeccionPlan(container, entidad, comercioId) {
    const { wrap, grid } = makeSection('💳 Plan', 'Estado del plan y acceso');

    const planId   = typeof entidad.plan === 'string' ? entidad.plan : entidad.plan?.type || 'trial';
    const planData = getPlanData(planId);
    const estado   = calcularEstadoPlan(entidad);
    const dias     = planId === 'trial' ? getDiasRestantesTrial(entidad) : null;

    grid.appendChild(makeCard({
      icon:   '💳',
      title:  planData.nombre,
      meta:   estado,
      status: estado === 'expirado' ? 'warning' : 'ok',
      body: `
        <p>${planData.descripcion}</p>
        ${dias !== null ? `<p>Días restantes: <strong>${dias}</strong></p>` : ''}
        <p>Live: ${entidad.liveEnabled ? '✓' : '✗'}</p>
        <p>Comisión: ${entidad.commissionEnabled ? '✓' : '✗'}</p>
      `,
      onEdit: () => openEditModal({
        title: 'Editar Plan',
        fields: [
          { key: 'plan', label: 'Plan', type: 'select', options: [
            { value: 'trial',     label: 'Trial' },
            { value: 'basic',     label: 'Basic' },
            { value: 'medium',    label: 'Medium' },
            { value: 'pro',       label: 'Pro' },
            { value: 'highvalue', label: 'High Value' },
          ]},
          { key: 'liveEnabled',       label: 'Live enabled',      type: 'boolean' },
          { key: 'commissionEnabled', label: 'Commission enabled', type: 'boolean' },
        ],
        data: { plan: planId, liveEnabled: !!entidad.liveEnabled, commissionEnabled: !!entidad.commissionEnabled },
        onSave: async (updates) => {
          await updateDoc(doc(db, 'entidades', comercioId), { ...updates, fechaActualizacion: new Date() });
          Object.assign(entidad, updates);
          this.render();
        }
      })
    }));

    container.appendChild(wrap);
  },

  // ──────────────────────────────────────────────────────────
  // SECCIÓN: PUBLICACIÓN
  // ──────────────────────────────────────────────────────────
  _renderSeccionPublicacion(container, entidad, comercioId) {
    const { wrap, grid } = makeSection('🚀 Publicación', 'Estado de publicación y onboarding');

    const slug        = entidad.landing?.slug;
    const generatedAt = entidad.entityGeneratedAt;
    const steps       = entidad.onboardingSteps || {};
    const stepsOk     = Object.values(steps).filter(Boolean).length;
    const stepsTotal  = Object.keys(steps).length;

    grid.appendChild(makeCard({
      icon:   '🔗',
      title:  'Landing',
      status: slug ? 'ok' : 'empty',
      body: slug
        ? `<p>indiceia.com/${slug}</p><p>Generada: ${generatedAt ? '✓' : '⚠ pendiente'}</p>`
        : '<p>Sin slug asignado</p>',
    }));

    grid.appendChild(makeCard({
      icon:   '📋',
      title:  'Onboarding',
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
          this.render();
        }
      })
    }));

    container.appendChild(wrap);
  },

  // ──────────────────────────────────────────────────────────
  // JSON DEBUG
  // ──────────────────────────────────────────────────────────
  _renderJsonDebug(container, selected) {
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
  },

  // ──────────────────────────────────────────────────────────
  // PANELES ESPECIALES: PRODUCTOS / SERVICIOS
  // ──────────────────────────────────────────────────────────
  async _openProductosPanel(comercioId) {
    const snap  = await getDocs(collection(db, 'entidades', comercioId, 'productos'));
    const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    const overlay = document.createElement('div');
    overlay.className = 'sa-modal-overlay';

    const modal = document.createElement('div');
    modal.className = 'sa-modal sa-modal--wide';
    modal.innerHTML = `
      <div class="sa-modal-header">
        <h3>📦 Productos (${items.length})</h3>
        <button class="sa-modal-close">&times;</button>
      </div>
      <div class="sa-modal-body">
        ${items.length === 0 ? '<p>Sin productos</p>' : items.map(p => `
          <div class="sa-item">
            <strong>${p.nombre || '-'}</strong>
            <span>$${p.precio_final ?? '-'}</span>
            <span>${p.paused ? '🔴 pausado' : '🟢 activo'}</span>
          </div>
        `).join('')}
      </div>
      <div class="sa-modal-footer">
        <button class="sa-btn sa-btn--secondary sa-close">Cerrar</button>
      </div>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    modal.querySelector('.sa-modal-close').onclick = () => overlay.remove();
    modal.querySelector('.sa-close').onclick       = () => overlay.remove();
    overlay.onclick = e => { if (e.target === overlay) overlay.remove(); };
  },

  async _openServiciosPanel(comercioId) {
    const snap  = await getDocs(collection(db, 'entidades', comercioId, 'servicios'));
    const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    const overlay = document.createElement('div');
    overlay.className = 'sa-modal-overlay';

    const modal = document.createElement('div');
    modal.className = 'sa-modal sa-modal--wide';
    modal.innerHTML = `
      <div class="sa-modal-header">
        <h3>🛎️ Servicios (${items.length})</h3>
        <button class="sa-modal-close">&times;</button>
      </div>
      <div class="sa-modal-body">
        ${items.length === 0 ? '<p>Sin servicios</p>' : items.map(s => `
          <div class="sa-item">
            <strong>${s.nombre || '-'}</strong>
            <span>${s.precio?.valor ? `$${s.precio.valor}` : 'Sin precio'}</span>
            <span>${s.activo === false ? '🔴 inactivo' : '🟢 activo'}</span>
          </div>
        `).join('')}
      </div>
      <div class="sa-modal-footer">
        <button class="sa-btn sa-btn--secondary sa-close">Cerrar</button>
      </div>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    modal.querySelector('.sa-modal-close').onclick = () => overlay.remove();
    modal.querySelector('.sa-close').onclick       = () => overlay.remove();
    overlay.onclick = e => { if (e.target === overlay) overlay.remove(); };
  }
};
