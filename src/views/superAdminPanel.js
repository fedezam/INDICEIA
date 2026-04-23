// src/views/superAdminPanel.js
import { db } from '../services/firebase/firebase.js';
import { listEntidades, loadEntidad } from '../controllers/panelCore.js';
import { createTable, createEmptyState } from '../skeleton/components/skeletonComponents.js';

export const page = {
  entities: [],
  selected: null,
  isLoading: false,

  // ============================================================
  // 📥 LOAD
  // ============================================================
  async load(context) {
    if (!context?.user) {
      window.location.href = '/admin-login';
      return;
    }

    const { userData } = context;

    if (userData?.role !== 'admin') {
      window.location.href = '/dashboard';
      return;
    }

    this.entities = await listEntidades();
  },

  // ============================================================
  // 🖼️ RENDER
  // ============================================================
  render() {
    const container =
      document.getElementById('page-content') ||
      document.getElementById('app');

    if (!container) {
      console.warn('[superAdminPanel] No hay container disponible');
      return;
    }

    container.innerHTML = '';

    if (this.isLoading) {
      container.appendChild(createEmptyState({
        icon: 'fas fa-spinner fa-spin',
        title: 'Cargando...',
        message: 'Obteniendo datos desde Firestore'
      }));
      return;
    }

    if (!this.selected) {
      this.renderList(container);
    } else {
      this.renderDetail(container);
    }
  },

  // ============================================================
  // 📋 LISTADO
  // ============================================================
  renderList(container) {
    // Header
    const header = document.createElement('div');
    header.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 16px;
    `;
    header.innerHTML = `
      <h2 style="margin:0;font-size:1.25rem;">
        <i class="fas fa-database" style="margin-right:8px;color:var(--s-primary)"></i>
        Entidades registradas
        <span style="
          font-size:0.85rem;
          font-weight:400;
          color:var(--s-secondary);
          margin-left:8px;
        ">(${this.entities.length})</span>
      </h2>
    `;
    container.appendChild(header);

    if (!this.entities.length) {
      container.appendChild(createEmptyState({
        icon: 'fas fa-database',
        title: 'Sin entidades',
        message: 'No hay datos o no tenés permisos en Firestore'
      }));
      return;
    }

    const table = createTable({
      columns: [
        { key: 'nombreComercio', label: 'Nombre' },
        { key: 'id',            label: 'ID' },
        { key: 'entityType',    label: 'Tipo' },
        { key: '_fecha',        label: 'Actualización' }
      ],
      data: this.entities.map(e => ({
        ...e,
        _fecha: e.fechaActualizacion
          ? e.fechaActualizacion.toLocaleDateString('es-AR')
          : '-'
      })),
      actions: [{
        id:      'ver',
        label:   'Ver',
        icon:    'fas fa-eye',
        onClick: (row) => this.openDetail(row.id)
      }]
    });

    container.appendChild(table);
  },

  // ============================================================
  // 🔍 DETALLE
  // ============================================================
  async openDetail(id) {
    this.isLoading = true;
    this.render();

    try {
      this.selected = await loadEntidad(id);
    } catch (err) {
      console.error('[superAdminPanel] Error cargando entidad:', err);
      this.selected = null;

      const container =
        document.getElementById('page-content') ||
        document.getElementById('app');

      if (container) {
        container.innerHTML = '';
        container.appendChild(createEmptyState({
          icon:    'fas fa-exclamation-triangle',
          title:   'Error',
          message: 'No se pudo cargar la entidad (permisos o inexistente)'
        }));
      }

      return;
    } finally {
      this.isLoading = false;
    }

    this.render();
  },

  renderDetail(container) {
    // Botón volver
    const back = document.createElement('button');
    back.innerHTML = '<i class="fas fa-arrow-left"></i> Volver';
    back.className = 'btn btn-secondary';
    back.style.marginBottom = '16px';
    back.onclick = () => {
      this.selected = null;
      this.render();
    };
    container.appendChild(back);

    // Título
    const title = document.createElement('h3');
    title.style.cssText = 'margin:0 0 12px;font-size:1.1rem;';
    title.innerHTML = `
      <i class="fas fa-store" style="margin-right:6px;color:var(--s-primary)"></i>
      ${this.selected.entidad?.nombreComercio || this.selected.entidad?.id || 'Entidad'}
    `;
    container.appendChild(title);

    // Secciones
    const sections = [
      { label: 'Entidad',   data: this.selected.entidad },
      { label: 'Usuario',   data: this.selected.user },
      { label: 'Contexto',  data: this.selected.ctx },
      { label: 'Pipeline',  data: this.selected.pipeline },
      { label: 'Onboarding Steps', data: this.selected.steps }
    ];

    sections.forEach(({ label, data }) => {
      if (!data || !Object.keys(data).length) return;

      const section = document.createElement('details');
      section.style.marginBottom = '10px';
      section.open = label === 'Entidad'; // abre el primero por defecto

      const summary = document.createElement('summary');
      summary.style.cssText = `
        cursor: pointer;
        font-weight: 600;
        padding: 6px 0;
        color: var(--s-primary);
        user-select: none;
      `;
      summary.textContent = label;
      section.appendChild(summary);

      const pre = document.createElement('pre');
      pre.style.cssText = `
        background: #1a1a2e;
        color: #a8ff78;
        padding: 12px 16px;
        border-radius: 6px;
        overflow: auto;
        max-height: 400px;
        font-size: 12px;
        margin: 6px 0 0;
        line-height: 1.5;
      `;
      pre.textContent = JSON.stringify(data, null, 2);
      section.appendChild(pre);

      container.appendChild(section);
    });
  }
};
