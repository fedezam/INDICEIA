// render.js
export function renderFormField() {
  const wrapper = document.createElement('div');
  wrapper.className = 's-form-field';

  const label = document.createElement('label');
  label.className = 's-label';

  const inputWrapper = document.createElement('div');
  inputWrapper.className = 's-input-wrapper';

  const help = document.createElement('small');
  help.className = 's-help';

  wrapper.appendChild(label);
  wrapper.appendChild(inputWrapper);
  wrapper.appendChild(help);

  return {
    wrapper,
    label,
    inputWrapper,
    help
  };
}
