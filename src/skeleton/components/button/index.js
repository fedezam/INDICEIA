import { renderButton } from './render';
import { updateButton } from './update';

/**
 * Crea un botón interactivo
 * @param {Object} config
 * @param {string} config.label - Texto del botón
 * @param {'primary'|'secondary'|'danger'} [config.variant='primary'] - Estilo visual
 * @param {Function} [config.onClick] - Callback al hacer click
 * @param {boolean} [config.disabled=false] - Si está deshabilitado
 * @param {string} [config.icon] - Nombre del ícono FontAwesome (sin 'fa-')
 * @returns {HTMLButtonElement & {setLoading: Function, enable: Function, disable: Function, setText: Function}} 
 * Botón con métodos adicionales:
 * - setLoading(state: boolean) - Muestra spinner y deshabilita
 * - enable() - Habilita el botón
 * - disable() - Deshabilita el botón
 * - setText(value: string) - Cambia el texto
 */
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
