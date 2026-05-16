// src/skeleton/components/checkbox-group/update.js

let idCounter = 0;

export function updateCheckboxGroup(dom, config = {}) {
  const {
    label = '',
    name = '',
    options = [],
    value = [],
    required = false,
    disabled = false,
    orientation = 'vertical', // vertical | horizontal
    mode = 'multiple'         // ← NUEVO: 'multiple' (default) o 'single'
  } = config;

  const fieldId = `sk-checkbox-group-${++idCounter}`;
  dom.wrapper.dataset.fieldId = fieldId;
  dom.wrapper.dataset.mode = mode; // ← Guardamos el modo para usar en index.js

  dom.legend.textContent = label;
  dom.wrapper.classList.toggle('is-required', required);
  dom.wrapper.classList.toggle('is-horizontal', orientation === 'horizontal');

  dom.optionsContainer.innerHTML = '';

  options.forEach((opt, index) => {
    const optionId = `${fieldId}-${index}`;

    const optionWrapper = document.createElement('div');
    optionWrapper.className = 'sk-checkbox-group__option';

    const input = document.createElement('input');
    input.type      = 'checkbox';
    input.name      = name;
    input.value     = opt.value;
    input.id        = optionId;
    
    // ← Lógica de checked según modo
    if (mode === 'single') {
      // En modo single, value puede ser string o null
      input.checked = value === opt.value;
    } else {
      // En modo multiple, value es array (o fallback a array)
      const vals = Array.isArray(value) ? value : (value != null ? [value] : []);
      input.checked = vals.includes(opt.value);
    }
    
    input.disabled  = disabled;
    input.className = 'sk-checkbox-group__input';

    const labelEl = document.createElement('label');
    labelEl.className = 'sk-checkbox-group__label';
    labelEl.setAttribute('for', optionId);

    // Si tiene description → renderiza título + descripción
    // Si no              → label simple (comportamiento original)
    if (opt.description) {
      const title = document.createElement('strong');
      title.className   = 'sk-checkbox-group__label-title';
      title.textContent = opt.label;

      const desc = document.createElement('span');
      desc.className   = 'sk-checkbox-group__label-desc';
      desc.textContent = opt.description;

      labelEl.appendChild(title);
      labelEl.appendChild(desc);
    } else {
      labelEl.textContent = opt.label;
    }

    optionWrapper.appendChild(input);
    optionWrapper.appendChild(labelEl);
    dom.optionsContainer.appendChild(optionWrapper);
  });

  return dom.wrapper;
}
