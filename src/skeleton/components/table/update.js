// skeleton/components/table/update.js

/**
 * Compara dos valores para sort, tolerando números, fechas ya formateadas y strings.
 */
function compareValues(a, b) {
  const na = parseFloat(a);
  const nb = parseFloat(b);
  const bothNumeric = !isNaN(na) && !isNaN(nb) && a !== '' && b !== '';
  if (bothNumeric) return na - nb;
  return String(a ?? '').localeCompare(String(b ?? ''), 'es', { sensitivity: 'base' });
}

/**
 * Filtra data por texto libre sobre todas las columnas visibles.
 */
function filterData(data, columns, query) {
  if (!query) return data;
  const q = query.trim().toLowerCase();
  if (!q) return data;
  return data.filter(row =>
    columns.some(col => String(row[col.key] ?? '').toLowerCase().includes(q))
  );
}

/**
 * Ordena data según { key, dir } (dir: 'asc' | 'desc').
 */
function sortData(data, sortState) {
  if (!sortState || !sortState.key) return data;
  const { key, dir } = sortState;
  const sorted = [...data].sort((r1, r2) => compareValues(r1[key], r2[key]));
  return dir === 'desc' ? sorted.reverse() : sorted;
}

export function updateTable(dom, config = {}, state = {}) {
  const {
    columns = [],
    data = [],
    actions = [],
    searchable = true,
    emptyMessage = 'Sin resultados',
  } = config;

  const { wrap, toolbar, searchInput, countBadge, headRow, tbody, emptyState } = dom;

  // ── toolbar visibility ──────────────────────────────────
  toolbar.style.display = searchable ? '' : 'none';
  emptyState.querySelector('p').textContent = emptyMessage;

  // ── headers (una sola vez por config, se re-renderizan igual, es barato) ──
  headRow.innerHTML = '';
  columns.forEach(col => {
    const th = document.createElement('th');
    th.className = 's-table-th';
    if (col.sortable !== false) th.classList.add('s-table-th--sortable');

    const label = document.createElement('span');
    label.textContent = col.label;
    th.appendChild(label);

    if (col.sortable !== false) {
      const sortIcon = document.createElement('i');
      sortIcon.className = 's-table-sort-icon fas fa-sort';
      if (state.sort?.key === col.key) {
        sortIcon.className = `s-table-sort-icon fas fa-sort-${state.sort.dir === 'asc' ? 'up' : 'down'}`;
        th.classList.add('s-table-th--active');
      }
      th.appendChild(sortIcon);

      th.onclick = () => {
        const isSame = state.sort?.key === col.key;
        const nextDir = isSame && state.sort.dir === 'asc' ? 'desc' : 'asc';
        state.sort = { key: col.key, dir: nextDir };
        renderBody();
      };
    }

    headRow.appendChild(th);
  });

  if (actions.length) {
    const th = document.createElement('th');
    th.className = 's-table-th s-table-th--actions';
    th.textContent = '';
    headRow.appendChild(th);
  }

  // ── búsqueda ─────────────────────────────────────────────
  searchInput.oninput = () => {
    state.query = searchInput.value;
    renderBody();
  };
  if (searchInput.value !== (state.query || '')) {
    searchInput.value = state.query || '';
  }

  // ── render del body (filtra + ordena + pinta) ───────────
  function renderBody() {
    let rows = filterData(data, columns, state.query);
    rows = sortData(rows, state.sort);

    countBadge.textContent = `${rows.length}${rows.length !== data.length ? ` / ${data.length}` : ''}`;

    tbody.innerHTML = '';

    if (!rows.length) {
      emptyState.style.display = 'flex';
      dom.scrollWrap.style.display = 'none';
      // igual repintamos headers de sort activos
      updateSortIcons();
      return;
    }

    emptyState.style.display = 'none';
    dom.scrollWrap.style.display = '';

    rows.forEach(row => {
      const tr = document.createElement('tr');
      tr.className = 's-table-row';

      columns.forEach(col => {
        const td = document.createElement('td');
        td.className = 's-table-td';
        const val = row[col.key];
        if (col.render) {
          const rendered = col.render(val, row);
          if (rendered && rendered.nodeType) td.appendChild(rendered);
          else td.innerHTML = rendered ?? '-';
        } else {
          td.textContent = (val === null || val === undefined || val === '') ? '-' : val;
        }
        tr.appendChild(td);
      });

      if (actions.length) {
        const td = document.createElement('td');
        td.className = 's-table-td s-table-td--actions';
        actions.forEach(action => {
          const btn = document.createElement('button');
          btn.className = 's-table-action-btn';
          btn.title = action.label || '';
          btn.innerHTML = action.icon ? `<i class="${action.icon}"></i>` : (action.label || '');
          btn.onclick = (e) => { e.stopPropagation(); action.onClick(row); };
          td.appendChild(btn);
        });
        tr.appendChild(td);
      }

      tbody.appendChild(tr);
    });

    updateSortIcons();
  }

  function updateSortIcons() {
    [...headRow.children].forEach((th, i) => {
      const col = columns[i];
      if (!col || col.sortable === false) return;
      const icon = th.querySelector('.s-table-sort-icon');
      if (!icon) return;
      if (state.sort?.key === col.key) {
        icon.className = `s-table-sort-icon fas fa-sort-${state.sort.dir === 'asc' ? 'up' : 'down'}`;
        th.classList.add('s-table-th--active');
      } else {
        icon.className = 's-table-sort-icon fas fa-sort';
        th.classList.remove('s-table-th--active');
      }
    });
  }

  renderBody();

  return wrap;
}
