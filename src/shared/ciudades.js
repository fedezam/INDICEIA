// src/shared/ciudades.js
// Fetch localidades por provincia desde API Georef Argentina.
// Cache en Map para no refetchear si el usuario vuelve a la misma provincia.

const cache = new Map();

const GEOREF_URL = 'https://apis.datos.gob.ar/georef/api/localidades';

const FALLBACK = {
  'Santa Fe': ['Rosario', 'Santa Fe', 'Rafaela', 'Venado Tuerto', 'Casilda', 'Reconquista', 'Villa Constitución'],
  'Buenos Aires': ['La Plata', 'Mar del Plata', 'Bahía Blanca', 'Quilmes', 'Lanús', 'Tigre'],
  'Córdoba': ['Córdoba', 'Villa María', 'Río Cuarto', 'San Francisco', 'Villa Carlos Paz'],
};

export async function fetchLocalidades(provincia) {
  if (!provincia) return [];
  if (cache.has(provincia)) return cache.get(provincia);

  try {
    const res = await fetch(`${GEOREF_URL}?provincia=${encodeURIComponent(provincia)}&max=200&orden=nombre`);
    if (!res.ok) throw new Error(`Georef error: ${res.status}`);
    const data = await res.json();
    const localidades = data.localidades
      .map(l => l.nombre)
      .sort((a, b) => a.localeCompare(b, 'es'));
    cache.set(provincia, localidades);
    return localidades;
  } catch (err) {
    console.warn('[ciudades] Georef no disponible, usando fallback:', err.message);
    return FALLBACK[provincia] || [];
  }
}

export function mountCiudadAutocomplete(provincia, containerEl, valorActual, onChange) {
  containerEl.innerHTML = '';

  const wrapper = document.createElement('div');
  wrapper.style.position = 'relative';

  const input = document.createElement('input');
  input.type        = 'text';
  input.className   = 'form-field-input';
  input.placeholder = 'Buscá tu ciudad...';
  input.value       = valorActual || '';
  input.autocomplete = 'off';

  const dropdown = document.createElement('ul');
  dropdown.className = 'ciudad-dropdown';
  dropdown.style.cssText = `
    position: absolute; top: 100%; left: 0; right: 0; z-index: 100;
    background: #fff; border: 1px solid var(--s-border, #e5e7eb);
    border-radius: 8px; margin-top: 4px; padding: 4px 0;
    max-height: 220px; overflow-y: auto; list-style: none;
    box-shadow: 0 4px 12px rgba(0,0,0,0.08); display: none;
  `;

  let allLocalidades = [];
  let selectedIndex  = -1;

  function renderDropdown(items) {
    dropdown.innerHTML = '';
    selectedIndex = -1;
    if (!items.length) { dropdown.style.display = 'none'; return; }
    items.slice(0, 8).forEach((nombre, i) => {
      const li = document.createElement('li');
      li.textContent = nombre;
      li.style.cssText = 'padding: 8px 12px; cursor: pointer; font-size: 0.9rem;';
      li.addEventListener('mouseenter', () => setActive(i));
      li.addEventListener('mousedown', (e) => {
        e.preventDefault();
        selectItem(nombre);
      });
      dropdown.appendChild(li);
    });
    dropdown.style.display = 'block';
  }

  function setActive(index) {
    const items = dropdown.querySelectorAll('li');
    items.forEach((li, i) => {
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
    const filtered = allLocalidades.filter(l => l.toLowerCase().includes(q));
    renderDropdown(filtered);
  });

  input.addEventListener('keydown', (e) => {
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

  // Fetch async — el input ya está montado, se llena el cache
  fetchLocalidades(provincia).then(localidades => {
    allLocalidades = localidades;
  });

  return input;
}
