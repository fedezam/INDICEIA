// src/skeleton/components/checkbox-group/render.js

export function renderCheckboxGroup() {
  const wrapper = document.createElement('fieldset');
  wrapper.className = 'sk-checkbox-group';

  const legend = document.createElement('legend');
  legend.className = 'sk-checkbox-group__legend';

  const optionsContainer = document.createElement('div');
  optionsContainer.className = 'sk-checkbox-group__options';

  const error = document.createElement('div');
  error.className = 'sk-checkbox-group__error';
  error.setAttribute('aria-live', 'polite');

  wrapper.appendChild(legend);
  wrapper.appendChild(optionsContainer);
  wrapper.appendChild(error);

  return {
    wrapper,
    legend,
    optionsContainer,
    error
  };
}
