// src/views/superAdminPanel.js

import { listEntidades, loadEntidad } from '../controllers/panelCore.js';
import { createTable, createEmptyState } from '../skeleton/components/skeletonComponents.js';

export const page = {
  entities: [],
  selected: null,

  async load() {
    this.entities = await listEntidades();
  },

  render() {
    const container = document.getElementById('page-content');
    container.innerHTML = '';

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
        title: 'Sin entidades',
        message: 'No hay datos en Firestore'
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
    this.selected = await loadEntidad(id);
    this.render();
  },

  renderDetail(container) {
    const back = document.createElement('button');
    back.textContent = '← Volver';
    back.className = 'btn btn-secondary';
    back.onclick = () => {
      this.selected = null;
      this.render();
    };

    container.appendChild(back);

    const pre = document.createElement('pre');
    pre.textContent = JSON.stringify(this.selected, null, 2);

    container.appendChild(pre);
  }
};
