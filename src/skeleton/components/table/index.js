// skeleton/components/table/index.js
import { renderTable } from './render.js';
import { updateTable } from './update.js';

/**
 * Crea una tabla estilo AdminLTE con búsqueda y sort por columna.
 *
 * @param {Object} config
 * @param {Array}  config.columns - [{ key, label, sortable=true, render(val,row) }]
 * @param {Array}  config.data - filas de datos, cada una un objeto plano
 * @param {Array}  [config.actions] - [{ id, label, icon, onClick(row) }]
 * @param {boolean} [config.searchable=true] - muestra el buscador
 * @param {string}  [config.emptyMessage='Sin resultados']
 *
 * @returns {HTMLElement} wrapper con métodos adicionales:
 * - setData(newData) - reemplaza los datos y re-renderiza (mantiene búsqueda/sort activos)
 * - setColumns(newColumns) - reemplaza columnas y re-renderiza
 * - refresh() - re-renderiza con el estado actual
 *
 * @example
 * const table = createTable({
 *   columns: [
 *     { key: 'nombre', label: 'Nombre' },
 *     { key: 'email',  label: 'Email' },
 *     { key: 'rol',    label: 'Rol', sortable: false },
 *   ],
 *   data: usuarios,
 *   actions: [{ id: 'ver', label: 'Ver', icon: 'fas fa-eye', onClick: (row) => openEntity(row.id) }]
 * });
 * container.appendChild(table);
 */
export function createTable(config = {}) {
  const dom = renderTable();
  const state = { query: '', sort: null };

  updateTable(dom, config, state);

  const wrap = dom.wrap;
  wrap._dom = dom;
  wrap._config = { ...config };
  wrap._state = state;

  wrap.setData = (newData) => {
    wrap._config.data = newData;
    updateTable(dom, wrap._config, state);
  };

  wrap.setColumns = (newColumns) => {
    wrap._config.columns = newColumns;
    updateTable(dom, wrap._config, state);
  };

  wrap.refresh = () => {
    updateTable(dom, wrap._config, state);
  };

  return wrap;
}
