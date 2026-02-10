// skeleton/components/button/index.js
import { renderButton } from './render.js';
import { updateButton } from './update.js';

/**
 * Crea un botón interactivo estilo AdminLTE
 * 
 * @param {Object} config - Configuración del botón
 * @param {string} config.label - Texto del botón
 * @param {string} [config.variant='primary'] - Estilo: 'primary', 'secondary', 'success', 'danger', 'warning', 'info', 'light', 'dark', 'outline-primary', 'outline-secondary', 'outline-danger'
 * @param {string} [config.size='md'] - Tamaño: 'sm', 'md', 'lg'
 * @param {string} [config.icon] - Ícono FontAwesome (ej: 'fa-save', 'fa-plus')
 * @param {Function} [config.onClick] - Callback al hacer click
 * @param {boolean} [config.disabled=false] - Si está deshabilitado
 * @param {boolean} [config.loading=false] - Si muestra spinner de carga
 * @param {string} [config.type='button'] - Tipo de botón HTML: 'button', 'submit', 'reset'
 * @param {boolean} [config.block=false] - Si ocupa todo el ancho disponible
 * 
 * @returns {HTMLButtonElement} Botón con métodos adicionales:
 * - setLoading(state: boolean) - Muestra/oculta spinner y deshabilita
 * - enable() - Habilita el botón
 * - disable() - Deshabilita el botón
 * - setText(text: string) - Cambia el texto
 * - setIcon(icon: string) - Cambia el ícono
 * - update(config: Object) - Actualiza múltiples propiedades
 * 
 * @example
 * // Botón simple
 * const btn = createButton({ 
 *   label: 'Guardar',
 *   onClick: () => console.log('Guardado!')
 * });
 * 
 * @example
 * // Botón con ícono y variante
 * const btn = createButton({
 *   label: 'Eliminar',
 *   icon: 'fa-trash',
 *   variant: 'danger',
 *   onClick: handleDelete
 * });
 * 
 * @example
 * // Botón de submit con loading
 * const btn = createButton({
 *   label: 'Enviar',
 *   type: 'submit',
 *   variant: 'success'
 * });
 * btn.onclick = async () => {
 *   btn.setLoading(true);
 *   await saveData();
 *   btn.setLoading(false);
 * };
 */
export function createButton(config = {}) {
  const dom = renderButton();
  const btn = updateButton(dom, config);

  // Guardar referencias al DOM interno
  btn._dom = dom;
  btn._config = { ...config };

  // ==================== PUBLIC API ====================

  /**
   * Activa/desactiva estado de carga
   */
  btn.setLoading = (state = true) => {
    btn._config.loading = state;
    
    if (state) {
      btn.disabled = true;
      btn.classList.add('is-loading');
      dom.spinner.classList.add('visible');
    } else {
      btn.disabled = btn._config.disabled || false;
      btn.classList.remove('is-loading');
      dom.spinner.classList.remove('visible');
    }
  };

  /**
   * Habilita el botón
   */
  btn.enable = () => {
    btn._config.disabled = false;
    btn.disabled = false;
    btn.classList.remove('is-disabled');
  };

  /**
   * Deshabilita el botón
   */
  btn.disable = () => {
    btn._config.disabled = true;
    btn.disabled = true;
    btn.classList.add('is-disabled');
  };

  /**
   * Cambia el texto del botón
   */
  btn.setText = (text) => {
    btn._config.label = text;
    dom.text.textContent = text;
  };

  /**
   * Cambia el ícono del botón
   */
  btn.setIcon = (icon) => {
    btn._config.icon = icon;
    
    if (icon) {
      dom.icon.innerHTML = icon.startsWith('fa-')
        ? `<i class="fas ${icon}"></i>`
        : icon;
      dom.icon.classList.add('visible');
    } else {
      dom.icon.innerHTML = '';
      dom.icon.classList.remove('visible');
    }
  };

  /**
   * Actualiza múltiples propiedades del botón
   */
  btn.update = (newConfig) => {
    btn._config = { ...btn._config, ...newConfig };
    updateButton(dom, btn._config);
  };

  return btn;
}
