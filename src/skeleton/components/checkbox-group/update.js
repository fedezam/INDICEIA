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
    orientation = 'vertical' // vertical | horizontal
  } = config;

  const fieldId = `sk-checkbox-group-${++idCounter}`;
  dom.wrapper.dataset.fieldId = fieldId;

  dom.legend.textContent = label;
  dom.wrapper.classList.toggle('is-required', required);
  dom.wrapper.classList.toggle('is-horizontal', orientation === 'horizontal');

  dom.optionsContainer.innerHTML = '';

  options.forEach((opt, index) => {
    const optionId = `${fieldId}-${index}`;

    const optionWrapper = document.createElement('div');
    optionWrapper.className = 'sk-checkbox-group__option';

    const input = document.createElement('input');
    input.type = 'checkbox';
    input.name = name;
    input.value = opt.value;
    input.id = optionId;
    input.checked = value.includes(opt.value);
    input.disabled = disabled;
    input.className = 'sk-checkbox-group__input';

    const labelEl = document.createElement('label');
    labelEl.className = 'sk-checkbox-group__label';
    labelEl.setAttribute('for', optionId);
    labelEl.textContent = opt.label;

    optionWrapper.appendChild(input);
    optionWrapper.appendChild(labelEl);

    dom.optionsContainer.appendChild(optionWrapper);
  });

  return dom.wrapper;
}
