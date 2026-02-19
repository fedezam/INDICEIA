// src/skeleton/components/checkbox-group/index.js

import { renderCheckboxGroup } from './render.js';
import { updateCheckboxGroup } from './update.js';

export function createCheckboxGroup(config = {}) {
  const dom = renderCheckboxGroup();
  updateCheckboxGroup(dom, config);

  const el = dom.wrapper;
  const errorEl = dom.error;

  const getInputs = () =>
    Array.from(el.querySelectorAll('input[type="checkbox"]'));

  const validate = () => {
    if (!config.required) return true;

    const isValid = getInputs().some(input => input.checked);
    el.classList.toggle('is-invalid', !isValid);
    errorEl.textContent = isValid ? '' : 'Debe seleccionar al menos una opción';
    return isValid;
  };

  el.getValue = () =>
    getInputs()
      .filter(input => input.checked)
      .map(input => input.value);

  el.setValue = (values = []) => {
    getInputs().forEach(input => {
      input.checked = values.includes(input.value);
    });
    validate();
  };

  el.setInvalid = (state, message = '') => {
    el.classList.toggle('is-invalid', !!state);
    errorEl.textContent = state ? message : '';
  };

  el.isInvalid = () =>
    el.classList.contains('is-invalid');

  el.disable = () => {
    getInputs().forEach(input => input.disabled = true);
    el.classList.add('is-disabled');
  };

  el.enable = () => {
    getInputs().forEach(input => input.disabled = false);
    el.classList.remove('is-disabled');
  };

  el.validate = validate;

  el.getId = () => el.dataset.fieldId;

  el.addEventListener('change', () => {
    if (config.required) validate();
  });

  return el;
}
