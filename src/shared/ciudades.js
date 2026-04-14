// src/shared/ciudades.js

import arGeo from './ar-geo-enriched.json' assert { type: 'json' };

// ── GET LOCALIDADES ───────────────────────────────────────────
// Devuelve objetos { id, nombre, lat, lng }

export function getLocalidades(provincia) {
  if (!provincia) return [];

  const entry = Object.values(arGeo).find(p => p.nombre === provincia);
  if (!entry) return [];

  const map = new Map();

  Object.values(entry.departamentos).forEach(dep => {
    dep.localidades.forEach(l => {
      map.set(l.id, l); // evita duplicados
    });
  });

  return Array.from(map.values()).sort((a, b) =>
    a.nombre.localeCompare(b.nombre, 'es')
  );
}

// ── AUTOCOMPLETE ──────────────────────────────────────────────

export function mountCiudadAutocomplete(provincia, containerEl, valorActual, onChange) {
  containerEl.innerHTML = '';

  const allLocalidades = getLocalidades(provincia);

  const wrapper = document.createElement('div');
  wrapper.style.position = 'relative';

  const input = document.createElement('input');
  input.type         = 'text';
  input.className    = 'form-field-input';
  input.placeholder  = provincia ? 'Buscá tu localidad...' : 'Primero elegí una provincia';
  input.autocomplete = 'off';
  input.disabled     = !provincia;

  // ⚠️ valorActual ahora puede ser string o objeto
  if (typeof valorActual === 'string') {
    input.value = valorActual;
  } else if (valorActual?.nombre) {
    input.value = valorActual.nombre;
  }

  const dropdown = document.createElement('ul');
  dropdown.style.cssText = `
    position: absolute; top: 100%; left: 0; right: 0; z-index: 100;
    background: #fff; border: 1px solid var(--s-border, #e5e7eb);
    border-radius: 8px; margin-top: 4px; padding: 4px 0;
    max-height: 220px; overflow-y: auto; list-style: none;
    box-shadow: 0 4px 12px rgba(0,0,0,0.08); display: none;
  `;

  let selectedIndex = -1;
  let currentItems = [];

  function renderDropdown(items) {
    dropdown.innerHTML = '';
    selectedIndex = -1;
    currentItems = items;

    if (!items.length) {
      dropdown.style.display = 'none';
      return;
    }

    items.slice(0, 8).forEach((loc, i) => {
      const li = document.createElement('li');
      li.textContent = loc.nombre;
      li.style.cssText = 'padding: 8px 12px; cursor: pointer; font-size: 0.9rem;';

      li.addEventListener('mouseenter', () => setActive(i));
      li.addEventListener('mousedown', e => {
        e.preventDefault();
        selectItem(loc);
      });

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
   const localidadObj = allLocalidades.find(l => l.nombre === nombre);

  input.value = nombre;
  dropdown.style.display = 'none';

  onChange?.(localidadObj || nombre);
}

  input.addEventListener('input', () => {
    const q = input.value.trim().toLowerCase();
    if (!q) {
      dropdown.style.display = 'none';
      return;
    }

    const matches = allLocalidades.filter(l =>
      l.nombre.toLowerCase().includes(q)
    );

    renderDropdown(matches);
  });

  input.addEventListener('focus', () => {
    const q = input.value.trim().toLowerCase();
    if (q) {
      const matches = allLocalidades.filter(l =>
        l.nombre.toLowerCase().includes(q)
      );
      renderDropdown(matches);
    }
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
      selectItem(currentItems[selectedIndex]); // 🔥 usa objeto real
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
