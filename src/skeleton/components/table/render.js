// skeleton/components/table/render.js
import './styles.css';

export function renderTable() {
  const wrap = document.createElement('div');
  wrap.className = 's-table-wrap';

  // ── toolbar (buscador) ──────────────────────────────────
  const toolbar = document.createElement('div');
  toolbar.className = 's-table-toolbar';

  const searchWrap = document.createElement('div');
  searchWrap.className = 's-table-search';
  searchWrap.innerHTML = '<i class="fas fa-search"></i>';

  const searchInput = document.createElement('input');
  searchInput.type = 'text';
  searchInput.className = 's-table-search-input';
  searchInput.placeholder = 'Buscar...';
  searchWrap.appendChild(searchInput);

  const countBadge = document.createElement('span');
  countBadge.className = 's-table-count';

  toolbar.appendChild(searchWrap);
  toolbar.appendChild(countBadge);

  // ── tabla ────────────────────────────────────────────────
  const scrollWrap = document.createElement('div');
  scrollWrap.className = 's-table-scroll';

  const table = document.createElement('table');
  table.className = 's-table';

  const thead = document.createElement('thead');
  const headRow = document.createElement('tr');
  thead.appendChild(headRow);

  const tbody = document.createElement('tbody');

  table.appendChild(thead);
  table.appendChild(tbody);
  scrollWrap.appendChild(table);

  // ── empty state interno ─────────────────────────────────
  const emptyState = document.createElement('div');
  emptyState.className = 's-table-empty';
  emptyState.innerHTML = '<i class="fas fa-inbox"></i><p>Sin resultados</p>';
  emptyState.style.display = 'none';

  wrap.appendChild(toolbar);
  wrap.appendChild(scrollWrap);
  wrap.appendChild(emptyState);

  return { wrap, toolbar, searchInput, countBadge, scrollWrap, table, headRow, tbody, emptyState };
}
