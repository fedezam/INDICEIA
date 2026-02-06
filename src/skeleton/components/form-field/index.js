// index.js
import { renderFormField } from './render';
import { updateFormField } from './update';

export function createFormField(config = {}) {
  const dom = renderFormField();
  const input = updateFormField(dom, config);

  const el = dom.wrapper;

  // ---- API pública ----
  el.getValue = () => input.value;

  el.setValue = (value) => {
    input.value = value ?? '';
  };

  el.setInvalid = (state) => {
    el.classList.toggle('is-invalid', !!state);
  };

  el.isInvalid = () => {
    return el.classList.contains('is-invalid');
  };

  el.disable = () => {
    input.disabled = true;
    el.classList.add('is-disabled');
  };

  el.enable = () => {
    input.disabled = false;
    el.classList.remove('is-disabled');
  };

  el.getId = () => {
    return el.dataset.fieldId;
  };

  return el;
}
