// update.js
export function updateFormField(dom, config = {}) {
  // Normalizar config para soportar ambos formatos
  const normalizedConfig = {
    id: config.id || config.name,
    content: {
      label: config.content?.label || config.label,
      placeholder: config.content?.placeholder || config.placeholder,
      helpText: config.content?.helpText || config.helpText
    },
    flags: {
      type: config.flags?.type || config.type || 'text',
      required: config.flags?.required ?? config.required ?? false,
      invalid: config.flags?.invalid ?? config.invalid ?? false,
      editable: config.flags?.editable ?? (config.disabled ? false : true),
      rows: config.flags?.rows || config.rows,
      options: config.flags?.options || config.options
    },
    value: config.value,
    actions: config.actions || {}
  };

  const { id, content, flags, value, actions } = normalizedConfig;
  const { wrapper, label, inputWrapper, help } = dom;
  
  // ---- identidad ----
  if (id) {
    wrapper.dataset.fieldId = id;
    label.htmlFor = id;
  }
  
  // ---- label ----
  if (content.label) {
    label.textContent = content.label;
    label.style.display = '';
  } else {
    label.style.display = 'none';
  }
  
  // ---- input ----
  inputWrapper.innerHTML = '';
  let input;
  const type = flags.type || 'text';
  
  if (type === 'select') {
    input = document.createElement('select');
    input.className = 's-input';
    
    // Agregar opciones si existen
    if (flags.options && Array.isArray(flags.options)) {
      flags.options.forEach(opt => {
        const option = document.createElement('option');
        option.value = opt.value;
        option.textContent = opt.label || opt.value;

        // Soporte para atributos adicionales en opciones (nuevo)
        if (opt.disabled === true) {
          option.disabled = true;
        }
        if (opt.hidden === true) {
          option.hidden = true;
        }
        if (opt.selected === true) {
          option.selected = true;
        }

        input.appendChild(option);
      });
    }
  } else if (type === 'textarea') {
    input = document.createElement('textarea');
    input.className = 's-input';
    input.rows = flags.rows || 3;
  } else {
    input = document.createElement('input');
    input.className = 's-input';
    input.type = type;
  }
  
  if (id) input.id = id;
  if (content.placeholder) input.placeholder = content.placeholder;
  if (value !== undefined) input.value = value;
  
  inputWrapper.appendChild(input);
  
  // ---- help text ----
  if (content.helpText) {
    help.textContent = content.helpText;
    help.style.display = '';
  } else {
    help.style.display = 'none';
  }
  
  // ---- flags ----
  wrapper.classList.toggle('is-required', !!flags.required);
  wrapper.classList.toggle('is-invalid', !!flags.invalid);
  wrapper.classList.toggle('is-disabled', flags.editable === false);
  input.disabled = flags.editable === false;
  
  // ---- actions ----
  if (actions.onChange) {
    input.addEventListener('input', () => {
      actions.onChange(input.value);
    });
  }
  
  if (actions.onBlur) {
    input.addEventListener('blur', () => {
      actions.onBlur(input.value);
    });
  }
  
  return input;
}
