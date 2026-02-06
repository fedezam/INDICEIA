// index.js
import { renderButton } from './render';
import { updateButton } from './update';

export function createButton(config = {}) {
  const dom = renderButton();
  const btn = updateButton(dom, config);

  /* ---------- public API ---------- */

  btn.setLoading = (state = true) => {
    btn.classList.toggle('is-loading', state);
    btn.disabled = state;
  };

  btn.enable = () => {
    btn.disabled = false;
    btn.classList.remove('is-disabled');
  };

  btn.disable = () => {
    btn.disabled = true;
    btn.classList.add('is-disabled');
  };

  btn.setText = (value) => {
    dom.text.textContent = value;
  };

  return btn;
}
