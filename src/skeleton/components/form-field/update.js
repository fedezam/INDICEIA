// update.js
export function updateFormField(dom, config = {}) {
  const {
    id,
    content = {},
    flags = {},
    value,
    actions = {}
  } = config;

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

  if (type === 'textarea') {
    input = document.createElement('textarea');
    input.rows = flags.rows || 3;
  } else {
    input = document.createElement('input');
    input.type = type;
  }

  input.className = 's-input';
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
