import { listEntidades, loadEntidad } from '../controllers/panelCore.js';
import { createTable, createEmptyState } from '../skeleton/components/skeletonComponents.js';

export const page = {
  entities: [],
  selected: null,
  isLoading: false,

  // ============================================================
  // 📥 LOAD
  // ============================================================
  async load() {
    try {
      this.isLoading = true;
      this.entities = await listEntidades();
    } catch (err) {
      console.error('[panel] Error cargando entidades:', err);
      this.entities = [];
    } finally {
      this.isLoading = false;
    }
  },

  // ============================================================
  // 🖼️ RENDER
  // ============================================================
  render() {
    const container =
      document.getElementById('page-content') ||
      document.getElementById('app');

    if (!container) {
      console.warn('[panel] No hay container disponible');
      return;
    }

    container.innerHTML = '';

    // 🔄 Loading state
    if (this.isLoading) {
      container.appendChild(createEmptyState({
        icon: 'fas fa-spinner fa-spin',
        title: 'Cargando...',
        message: 'Obteniendo entidades desde Firestore'
      }));
      return;
    }

    // 📋 Listado o detalle
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
        { key: 'id', label: 'ID' },
        { key: 'entityType', label: 'Tipo' }
      ],
      data: this.entities,
      actions: [{
        id: 'ver',
        label: 'Ver',
        icon: 'fas fa-eye',
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
      console.error('[panel] Error cargando entidad:', err);

      this.selected = null;

      const container =
        document.getElementById('page-content') ||
        document.getElementById('app');

      if (container) {
        container.innerHTML = '';
        container.appendChild(createEmptyState({
          icon: 'fas fa-exclamation-triangle',
          title: 'Error',
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
    const back = document.createElement('button');
    back.textContent = '← Volver';
    back.className = 'btn btn-secondary';
    back.style.marginBottom = '12px';

    back.onclick = () => {
      this.selected = null;
      this.render();
    };

    container.appendChild(back);

    // 🔍 JSON debug
    const pre = document.createElement('pre');
    pre.style.cssText = `
      background: #111;
      color: #0f0;
      padding: 12px;
      border-radius: 8px;
      overflow: auto;
      max-height: 70vh;
      font-size: 12px;
    `;

    pre.textContent = JSON.stringify(this.selected, null, 2);

    container.appendChild(pre);
  }
};
