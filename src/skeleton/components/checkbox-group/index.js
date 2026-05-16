// src/skeleton/components/checkbox-group/index.js

import './styles.css';
import { renderCheckboxGroup } from './render.js';
import { updateCheckboxGroup } from './update.js';

export function createCheckboxGroup(config = {}) {
  const dom = renderCheckboxGroup();
  updateCheckboxGroup(dom, config);

  const el = dom.wrapper;
  const errorEl = dom.error;

  // ← Leer modo desde dataset (seteado por update.js)
  const getMode = () => el.dataset.mode || 'multiple';
  const getInputs = () =>
    Array.from(el.querySelectorAll('input[type="checkbox"]'));

  const validate = () => {
    if (!config.required) return true;
    const isValid = getInputs().some(input => input.checked);
    el.classList.toggle('is-invalid', !isValid);
    errorEl.textContent = isValid ? '' : 'Debe seleccionar al menos una opción';
    return isValid;
  };

  // ← getValue: devuelve string|null en modo 'single', array en 'multiple'
  el.getValue = () => {
    const checked = getInputs()
      .filter(input => input.checked)
      .map(input => input.value);
    
    return getMode() === 'single'
      ? (checked[0] || null)
      : checked;
  };

  // ← setValue: acepta string, array o null
  el.setValue = (values) => {
    const mode = getMode();
    let vals;

    if (mode === 'single') {
      // En single: values puede ser string o null
      vals = values != null ? [values] : [];
    } else {
      // En multiple: values debe ser array
      vals = Array.isArray(values) ? values : (values != null ? [values] : []);
    }

    getInputs().forEach(input => {
      input.checked = vals.includes(input.value);
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

  // ← Change listener con lógica de selección única + disparo de onChange
  el.addEventListener('change', (e) => {
    const mode = getMode();
    
    // Si es modo single y se marcó un input, desmarcar los demás
    if (mode === 'single' && e?.target?.checked) {
      getInputs().forEach(input => {
        if (input !== e.target) input.checked = false;
      });
    }
    
    // Validar si es required
    if (config.required) validate();
    
    // Disparar callback del usuario con el valor correcto según modo
    config.actions?.onChange?.(el.getValue());
  });

  return el;
}
