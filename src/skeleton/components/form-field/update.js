// src/skeleton/components/form-field/update.js
export function updateFormField(dom, config = {}) {
  // Normalizar config para soportar ambos formatos
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
      maxLength: config.flags?.maxLength || config.maxLength || null  // ← NUEVO
    },
    value:   config.value,
    actions: config.actions || {}
  };

  const { id, content, flags, value, actions } = normalizedConfig;
  const { wrapper, label, inputWrapper, help } = dom;

  // ── Identidad ──────────────────────────────────────────────
  if (id) {
    wrapper.dataset.fieldId = id;
    label.htmlFor = id;
  }

  // ── Label ──────────────────────────────────────────────────
  if (content.label) {
    label.textContent  = content.label;
    label.style.display = '';
  } else {
    label.style.display = 'none';
  }

  // ── Input ──────────────────────────────────────────────────
  inputWrapper.innerHTML = '';
  let input;
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
  } else if (type === 'textarea') {
    input = document.createElement('textarea');
    input.className = 's-input';
    input.rows = flags.rows || 3;
  } else {
    input = document.createElement('input');
    input.className = 's-input';
    input.type = type;
  }

  if (id)                  input.id          = id;
  if (content.placeholder) input.placeholder = content.placeholder;
  if (value !== undefined) input.value       = value;

  // ── maxLength ──────────────────────────────────────────────
  // Solo aplica a text, textarea (no select)
  if (flags.maxLength && type !== 'select') {
    input.maxLength = flags.maxLength;

    // Inicializar helpText con contador
    const currentLen = (value ?? '').toString().length;
    help.textContent  = `${currentLen}/${flags.maxLength}`;
    help.style.display = '';

    // Actualizar contador en cada keystroke
    input.addEventListener('input', () => {
      help.textContent = `${input.value.length}/${flags.maxLength}`;
    });
  }

  inputWrapper.appendChild(input);

  // ── Help text estático (solo si no hay maxLength) ──────────
  if (!flags.maxLength) {
    if (content.helpText) {
      help.textContent  = content.helpText;
      help.style.display = '';
    } else {
      help.style.display = 'none';
    }
  }

  // ── Flags ──────────────────────────────────────────────────
  wrapper.classList.toggle('is-required', !!flags.required);
  wrapper.classList.toggle('is-invalid',  !!flags.invalid);
  wrapper.classList.toggle('is-disabled', flags.editable === false);
  input.disabled = flags.editable === false;

  // ── Actions ────────────────────────────────────────────────
  if (actions.onChange) {
    input.addEventListener('input', () => actions.onChange(input.value));
  }

  if (actions.onBlur) {
    input.addEventListener('blur', () => actions.onBlur(input.value));
  }

  return input;
}
