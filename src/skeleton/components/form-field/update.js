// src/skeleton/components/form-field/update.js
import { getLocalidades } from '/src/shared/ciudades.js';

export function updateFormField(dom, config = {}) {
  // Normalizar config para soportar ambos formatos (legacy y nuevo)
  const normalizedConfig = {
    id: config.id || config.name,
    content: {
      label:       config.content?.label       || config.label,
      placeholder: config.content?.placeholder || config.placeholder,
      helpText:    config.content?.helpText     || config.helpText
    },
    flags: {
      type:      config.flags?.type      || config.type     || 'text',
      required:  config.flags?.required  ?? config.required ?? false,
      invalid:   config.flags?.invalid   ?? config.invalid  ?? false,
      editable:  config.flags?.editable  ?? (config.disabled ? false : true),
      rows:      config.flags?.rows      || config.rows,
      options:   config.flags?.options   || config.options,
      maxLength: config.flags?.maxLength || config.maxLength || null,
      provincia: config.flags?.provincia || config.provincia || null,
    },
    value:   config.value,
    actions: config.actions || {}
  };

  const { id, content, flags, value, actions } = normalizedConfig;
  const { wrapper, label, inputWrapper, help } = dom;

  // ─ Identidad ──────────────────────────────────────────────
  if (id) {
    wrapper.dataset.fieldId = id;
    label.htmlFor = id;
  }

  // ── Label ──────────────────────────────────────────────────
  if (content.label) {
    label.textContent   = content.label;
    label.style.display = '';
  } else {
    label.style.display = 'none';
  }

  // ── Input ──────────────────────────────────────────────────
  inputWrapper.innerHTML = '';
  let input; // Este será el input principal (hidden en autocomplete, normal en otros)
  const type = flags.type || 'text';

  if (type === 'select') {
    input = document.createElement('select');
    input.className = 's-input';
    if (flags.options && Array.isArray(flags.options)) {
      flags.options.forEach(opt => {
        const option = document.createElement('option');
        option.value       = opt.value;
        option.textContent = opt.label || opt.value;
        if (opt.disabled === true) option.disabled = true;
        if (opt.hidden   === true) option.hidden   = true;
        if (opt.selected === true) option.selected = true;
        input.appendChild(option);
      });
    }
  } 
  else if (type === 'textarea') {
    input = document.createElement('textarea');
    input.className = 's-input';
    input.rows = flags.rows || 3;
  } 
  else if (type === 'autocomplete') {
    // ── AUTOCOMPLETE DE CIUDADES ─────────────────────────────
    
    // 1. Input Hidden: Almacena el ID o nombre final para el formulario
    input = document.createElement('input');
    input.type   = 'hidden';
    // Si value es objeto, guardamos el ID, si no, el string
    input.value  = (typeof value === 'object' && value?.id) ? value.id : (value || '');
    if (id) input.id = id;

    const provincia      = flags.provincia;
    const allLocalidades = getLocalidades(provincia);
    const editable       = flags.editable !== false;

    // 2. Input Visible: Solo para búsqueda visual
    const visibleInput = document.createElement('input');
    visibleInput.type         = 'text';
    visibleInput.className    = 's-input'; // ✅ Usa estilo Skeleton
    visibleInput.placeholder  = content.placeholder || (provincia ? 'Buscá tu localidad...' : 'Primero elegí una provincia');
    visibleInput.autocomplete = 'off';
    visibleInput.disabled     = !editable || !provincia;

    // Setear valor inicial visual
    if (typeof value === 'string') {
      visibleInput.value = value;
    } else if (value?.nombre) {
      visibleInput.value = value.nombre;
    }

    // 3. Dropdown
    const dropdown = document.createElement('ul');
    dropdown.className = 's-autocomplete-dropdown'; // ✅ Usa estilo Skeleton
    dropdown.style.display = 'none';

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
        li.className   = 's-autocomplete-option';
        li.textContent = loc.nombre;
        li.dataset.index = i;

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
      dropdown.querySelectorAll('.s-autocomplete-option').forEach((li, i) => {
        li.classList.toggle('is-active', i === index);
      });
      selectedIndex = index;
    }

    function selectItem(loc) {
      visibleInput.value = loc.nombre;
      input.value        = loc.id || loc.nombre; // Guarda ID preferentemente
      
      dropdown.style.display = 'none';
      
      // Disparar onChange externo
      actions.onChange?.(loc);
      
      // Disparar evento 'input' en el hidden para que listeners genéricos lo capten
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }

    // Eventos de filtrado
    visibleInput.addEventListener('input', () => {
      const q = visibleInput.value.trim().toLowerCase();
      input.value = ''; // Invalida hasta selección explícita
      
      if (!q) { 
        dropdown.style.display = 'none'; 
        return; 
      }
      
      const matches = allLocalidades.filter(l => 
        l.nombre.toLowerCase().includes(q)
      );
      renderDropdown(matches);
    });

    visibleInput.addEventListener('focus', () => {
      const q = visibleInput.value.trim().toLowerCase();
      if (q) {
        const matches = allLocalidades.filter(l => 
          l.nombre.toLowerCase().includes(q)
        );
        renderDropdown(matches);
      }
    });

    visibleInput.addEventListener('keydown', e => {
      const items = dropdown.querySelectorAll('.s-autocomplete-option');
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActive(Math.min(selectedIndex + 1, items.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActive(Math.max(selectedIndex - 1, 0));
      } else if (e.key === 'Enter' && selectedIndex >= 0) {
        e.preventDefault();
        selectItem(currentItems[selectedIndex]);
      } else if (e.key === 'Escape') {
        dropdown.style.display = 'none';
      }
    });

    visibleInput.addEventListener('blur', () => {
      setTimeout(() => { dropdown.style.display = 'none'; }, 150);
    });

    // Estructura DOM: Wrapper > [VisibleInput, Dropdown, HiddenInput]
    inputWrapper.appendChild(visibleInput);
    inputWrapper.appendChild(dropdown);
    inputWrapper.appendChild(input);

    // Exponer visibleInput para accesos directos si fueran necesarios
    dom.wrapper.visibleInput = visibleInput;
  } 
  else {
    // Tipos estándar (text, email, etc.)
    input = document.createElement('input');
    input.className = 's-input';
    input.type = type;
  }

  // ── Atributos comunes (solo para tipos NO autocomplete) ───
  if (type !== 'autocomplete') {
    if (id)                  input.id          = id;
    if (content.placeholder) input.placeholder = content.placeholder;
    if (value !== undefined) input.value       = value;

    if (flags.maxLength && type !== 'select') {
      input.maxLength = flags.maxLength;
      const currentLen = (value ?? '').toString().length;
      help.textContent   = `${currentLen}/${flags.maxLength}`;
      help.style.display = '';
      input.addEventListener('input', () => {
        help.textContent = `${input.value.length}/${flags.maxLength}`;
      });
    }
    inputWrapper.appendChild(input);
  }

  // ── Help text estático ─────────────────────────────────────
  if (!flags.maxLength) {
    if (content.helpText) {
      help.textContent   = content.helpText;
      help.style.display = '';
    } else {
      help.style.display = 'none';
    }
  }

  // ─ Flags visuales ─────────────────────────────────────────
  wrapper.classList.toggle('is-required', !!flags.required);
  wrapper.classList.toggle('is-invalid',  !!flags.invalid);
  wrapper.classList.toggle('is-disabled', flags.editable === false);

  if (type !== 'autocomplete') {
    input.disabled = flags.editable === false;
  }

  // ─ Actions (tipos no-autocomplete) ──────────────────────
  if (type !== 'autocomplete') {
    if (actions.onChange) {
      input.addEventListener('input', () => actions.onChange(input.value));
    }
    if (actions.onBlur) {
      input.addEventListener('blur', () => actions.onBlur(input.value));
    }
  }

  return input;
}
