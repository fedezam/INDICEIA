// src/shared/ciudades.js
// Localidades por provincia desde ar-geo.json (offline, sin API, sin dependencias)
// Uso:
//   getLocalidades('Santa Fe')  → ['Arroyo Seco', 'Casilda', ...]
//   mountCiudadAutocomplete(provincia, containerEl, valorActual, onChange)

import arGeo from './ar-geo.json' assert { type: 'json' };

// ── GET LOCALIDADES ───────────────────────────────────────────
// Aplana todos los departamentos de una provincia → array de nombres únicos ordenados

export function getLocalidades(provincia) {
  if (!provincia) return [];

  const entry = Object.values(arGeo).find(p => p.nombre === provincia);
  if (!entry) return [];

  const set = new Set();
  Object.values(entry.departamentos).forEach(dep => {
    dep.localidades.forEach(l => set.add(l));
  });

  return [...set].sort((a, b) => a.localeCompare(b, 'es'));
}

// ── MOUNT AUTOCOMPLETE ────────────────────────────────────────
// Monta un input con dropdown sobre cualquier containerEl.
// onChange(nombre) se llama cuando el usuario selecciona una ciudad válida.

export function mountCiudadAutocomplete(provincia, containerEl, valorActual, onChange) {
  containerEl.innerHTML = '';

  const allLocalidades = getLocalidades(provincia);

  const wrapper = document.createElement('div');
  wrapper.style.position = 'relative';

  const input = document.createElement('input');
  input.type          = 'text';
  input.className     = 'form-field-input';
  input.placeholder   = provincia ? 'Buscá tu ciudad...' : 'Primero elegí una provincia';
  input.value         = valorActual || '';
  input.autocomplete  = 'off';
  input.disabled      = !provincia;

  const dropdown = document.createElement('ul');
  dropdown.style.cssText = `
    position: absolute; top: 100%; left: 0; right: 0; z-index: 100;
    background: #fff; border: 1px solid var(--s-border, #e5e7eb);
    border-radius: 8px; margin-top: 4px; padding: 4px 0;
    max-height: 220px; overflow-y: auto; list-style: none;
    box-shadow: 0 4px 12px rgba(0,0,0,0.08); display: none;
  `;

  let selectedIndex = -1;

  function renderDropdown(items) {
    dropdown.innerHTML = '';
    selectedIndex = -1;
    if (!items.length) { dropdown.style.display = 'none'; return; }

    items.slice(0, 8).forEach((nombre, i) => {
      const li = document.createElement('li');
      li.textContent = nombre;
      li.style.cssText = 'padding: 8px 12px; cursor: pointer; font-size: 0.9rem;';
      li.addEventListener('mouseenter', () => setActive(i));
      li.addEventListener('mousedown', e => { e.preventDefault(); selectItem(nombre); });
      dropdown.appendChild(li);
    });

    dropdown.style.display = 'block';
  }

  function setActive(index) {
    dropdown.querySelectorAll('li').forEach((li, i) => {
      li.style.background = i === index ? 'var(--s-primary-light, #f0fdf4)' : '';
    });
    selectedIndex = index;
  }

  function selectItem(nombre) {
    input.value = nombre;
    dropdown.style.display = 'none';
    onChange?.(nombre);
  }

  input.addEventListener('input', () => {
    const q = input.value.trim().toLowerCase();
    if (!q) { dropdown.style.display = 'none'; return; }
    renderDropdown(allLocalidades.filter(l => l.toLowerCase().includes(q)));
  });

  input.addEventListener('focus', () => {
    const q = input.value.trim().toLowerCase();
    if (q) renderDropdown(allLocalidades.filter(l => l.toLowerCase().includes(q)));
  });

  input.addEventListener('keydown', e => {
    const items = dropdown.querySelectorAll('li');
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive(Math.min(selectedIndex + 1, items.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive(Math.max(selectedIndex - 1, 0));
    } else if (e.key === 'Enter' && selectedIndex >= 0) {
      e.preventDefault();
      selectItem(items[selectedIndex].textContent);
    } else if (e.key === 'Escape') {
      dropdown.style.display = 'none';
    }
  });

  input.addEventListener('blur', () => {
    setTimeout(() => { dropdown.style.display = 'none'; }, 150);
  });

  wrapper.appendChild(input);
  wrapper.appendChild(dropdown);
  containerEl.appendChild(wrapper);

  return input;
}
