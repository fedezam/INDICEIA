export function updateAutocomplete(dom, config = {}) {
  const {
    placeholder = 'Buscar...',
    fetchOptions = async () => [],
    formatOption = (item) => String(item),
    getValue = (item) => item,
    onSelect = () => {},
    minChars = 2,
    debounceMs = 300,
    maxResults = 10,
    required = false,
    disabled = false,
    value = null
  } = config;

  const { wrapper, input, dropdown, status } = dom;

  // Estado interno
  const state = {
    options: [],
    selectedIndex: -1,
    isOpen: false,
    query: '',
    isLoading: false,
    selectedValue: value
  };

  let debounceTimer;

  // ─ Control de Dropdown ────────────────────────────────────
  const openDropdown = () => {
    if (state.isOpen) return;
    state.isOpen = true;
    wrapper.setAttribute('aria-expanded', 'true');
    dropdown.style.display = 'block';
  };

  const closeDropdown = () => {
    if (!state.isOpen) return;
    state.isOpen = false;
    state.selectedIndex = -1;
    wrapper.setAttribute('aria-expanded', 'false');
    dropdown.removeAttribute('aria-activedescendant');
    dropdown.style.display = 'none';
  };

  // ── Renderizado de Opciones ────────────────────────────────
  const renderOptions = (options, query) => {
    dropdown.innerHTML = '';
    if (!options.length) {
      const empty = document.createElement('div');
      empty.className = 's-autocomplete__empty';
      empty.textContent = state.isLoading ? 'Buscando...' : 'Sin resultados';
      dropdown.appendChild(empty);
      return;
    }

    options.slice(0, maxResults).forEach((opt, idx) => {
      const el = document.createElement('div');
      el.className = 's-autocomplete__option';
      el.setAttribute('role', 'option');
      el.id = `${dropdown.id}-opt-${idx}`;
      el.textContent = formatOption(opt);
      el.dataset.index = idx;

      if (idx === state.selectedIndex) {
        el.classList.add('s-autocomplete__option--active');
        el.setAttribute('aria-selected', 'true');
        dropdown.setAttribute('aria-activedescendant', el.id);
      } else {
        el.setAttribute('aria-selected', 'false');
      }

      el.addEventListener('mousedown', (e) => e.preventDefault()); // Evita blur prematuro
      el.addEventListener('click', () => selectOption(opt));
      dropdown.appendChild(el);
    });
  };

  // ── Selección ──────────────────────────────────────────────
  const selectOption = (opt) => {
    state.selectedValue = getValue(opt);
    input.value = formatOption(opt);
    closeDropdown();
    onSelect(state.selectedValue);
    wrapper.dispatchEvent(new CustomEvent('select', { detail: state.selectedValue, bubbles: true }));
    document.dispatchEvent(new Event('change')); // Para dirty controllers
  };

  // ── Búsqueda Asíncrona ────────────────────────────────────
  const fetchAndUpdate = async (query) => {
    if (query.length < minChars) {
      state.options = [];
      renderOptions([], query);
      closeDropdown();
      return;
    }

    state.isLoading = true;
    renderOptions([], query);
    openDropdown();

    try {
      const results = await fetchOptions(query);
      if (state.query !== query) return; // Ignorar respuestas obsoletas
      state.options = results;
      state.isLoading = false;
      state.selectedIndex = -1;
      renderOptions(results, query);
      status.textContent = results.length ? `${results.length} resultados` : 'Sin resultados';
    } catch (err) {
      console.error('Autocomplete error:', err);
      state.isLoading = false;
      status.textContent = 'Error al cargar';
      renderOptions([], query);
    }
  };

  // ── Event Listeners ────────────────────────────────────────
  input.addEventListener('input', (e) => {
    const val = e.target.value;
    state.query = val;
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => fetchAndUpdate(val), debounceMs);
  });

  input.addEventListener('focus', () => {
    if (state.options.length) openDropdown();
  });

  input.addEventListener('blur', () => {
    setTimeout(() => {
      if (!wrapper.contains(document.activeElement)) closeDropdown();
    }, 150);
  });

  input.addEventListener('keydown', (e) => {
    const opts = dropdown.querySelectorAll('.s-autocomplete__option');
    const count = opts.length;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        if (!state.isOpen && state.options.length) openDropdown();
        state.selectedIndex = (state.selectedIndex + 1) % count;
        break;
      case 'ArrowUp':
        e.preventDefault();
        state.selectedIndex = state.selectedIndex <= 0 ? count - 1 : state.selectedIndex - 1;
        break;
      case 'Enter':
        e.preventDefault();
        if (state.selectedIndex >= 0 && state.options[state.selectedIndex]) {
          selectOption(state.options[state.selectedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        closeDropdown();
        input.blur();
        break;
    }

    // Actualizar visual activo
    opts.forEach((opt, idx) => {
      if (idx === state.selectedIndex) {
        opt.classList.add('s-autocomplete__option--active');
        opt.setAttribute('aria-selected', 'true');
        dropdown.setAttribute('aria-activedescendant', opt.id);
        opt.scrollIntoView({ block: 'nearest' });
      } else {
        opt.classList.remove('s-autocomplete__option--active');
        opt.setAttribute('aria-selected', 'false');
      }
    });
  });

  // ── API Pública ────────────────────────────────────────────
  wrapper.getValue = () => state.selectedValue;
  wrapper.setValue = (val) => {
    state.selectedValue = val;
    input.value = val !== null && val !== undefined ? formatOption(val) : '';
  };
  wrapper.disable = () => { input.disabled = true; wrapper.classList.add('is-disabled'); };
  wrapper.enable = () => { input.disabled = false; wrapper.classList.remove('is-disabled'); };
  wrapper.validate = () => {
    const isValid = !required || (state.selectedValue !== null && state.selectedValue !== undefined);
    wrapper.classList.toggle('is-invalid', !isValid);
    return isValid;
  };

  // ── Estado Inicial ─────────────────────────────────────────
  input.placeholder = placeholder;
  if (value !== null && value !== undefined) {
    input.value = formatOption(value);
    state.selectedValue = value;
  }
  if (disabled) wrapper.disable();

  return wrapper;
}
