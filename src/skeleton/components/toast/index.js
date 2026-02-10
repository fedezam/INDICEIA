// skeleton/components/toast/index.js
import { renderToast } from './render.js';
import { updateToast } from './update.js';

let container;

function getContainer() {
  if (!container) {
    container = document.createElement('div');
    container.className = 's-toast-container';
    document.body.appendChild(container);
  }
  return container;
}

/**
 * Muestra una notificación toast temporal
 * 
 * @param {string|Object} titleOrConfig - Título del toast o configuración completa
 * @param {string} [message] - Mensaje (si primer param es string)
 * @param {'info'|'success'|'warning'|'error'} [variant='info'] - Tipo (si primer param es string)
 * @param {number} [duration=3000] - Duración en ms (si primer param es string)
 * 
 * Config object:
 * @param {string} config.title - Título del toast
 * @param {string} [config.message] - Mensaje del toast (opcional)
 * @param {'info'|'success'|'warning'|'error'} [config.variant='info'] - Tipo de toast
 * @param {string} [config.icon] - Ícono FontAwesome personalizado
 * @param {number} [config.duration=3000] - Duración en ms (0 = no auto-cerrar)
 * @param {boolean} [config.closable=true] - Mostrar botón de cerrar
 * @param {Function} [config.onClick] - Callback al hacer click
 * @param {Function} [config.onClose] - Callback al cerrar
 * 
 * @returns {HTMLElement} Toast element con métodos:
 * - close() - Cierra el toast manualmente
 * - updateContent(title, message) - Actualiza el contenido
 * 
 * @example
 * // Uso simple (compatible con versión anterior)
 * showToast('Éxito', 'Datos guardados', 'success');
 * 
 * @example
 * // Uso con config
 * showToast({
 *   title: 'Procesando...',
 *   variant: 'info',
 *   duration: 0, // No auto-cerrar
 *   closable: false
 * });
 * 
 * @example
 * // Toast interactivo
 * const toast = showToast({
 *   title: 'Nuevo mensaje',
 *   message: 'Click para ver',
 *   variant: 'info',
 *   icon: 'fa-envelope',
 *   onClick: () => openMessages()
 * });
 * 
 * // Cerrar programáticamente después
 * setTimeout(() => toast.close(), 5000);
 */
export function showToast(titleOrConfig, message, variant = 'info', duration = 3000) {
  // Normalizar parámetros (soporta ambos formatos)
  let config;
  
  if (typeof titleOrConfig === 'object') {
    // Nuevo formato: config object
    config = {
      title: titleOrConfig.title || '',
      message: titleOrConfig.message || '',
      variant: titleOrConfig.variant || 'info',
      icon: titleOrConfig.icon || null,
      duration: titleOrConfig.duration !== undefined ? titleOrConfig.duration : 3000,
      closable: titleOrConfig.closable !== undefined ? titleOrConfig.closable : true,
      onClick: titleOrConfig.onClick || null,
      onClose: titleOrConfig.onClose || null
    };
  } else {
    // Formato legacy: parámetros sueltos (compatibilidad)
    config = {
      title: titleOrConfig,
      message: message || '',
      variant: variant,
      icon: null,
      duration: duration,
      closable: true,
      onClick: null,
      onClose: null
    };
  }

  // Renderizar y actualizar
  const dom = renderToast();
  const toast = updateToast(dom, config);

  // Guardar config en el toast
  toast._config = config;
  toast._dom = dom;

  // ==================== PUBLIC API ====================

  /**
   * Cierra el toast manualmente
   */
  toast.close = () => {
    toast.classList.add('hide');
    setTimeout(() => {
      toast.remove();
      if (config.onClose) config.onClose();
    }, 300);
  };

  /**
   * Actualiza el contenido del toast
   */
  toast.updateContent = (newTitle, newMessage) => {
    if (dom.title) dom.title.textContent = newTitle;
    if (dom.message && newMessage) dom.message.textContent = newMessage;
  };

  // Agregar al contenedor
  getContainer().appendChild(toast);

  // Auto-cerrar si duration > 0
  if (config.duration > 0) {
    setTimeout(() => toast.close(), config.duration);
  }

  return toast;
}

/**
 * Shortcuts para tipos comunes
 */
export function showSuccess(title, message, duration) {
  return showToast(title, message, 'success', duration);
}

export function showError(title, message, duration) {
  return showToast(title, message, 'error', duration);
}

export function showWarning(title, message, duration) {
  return showToast(title, message, 'warning', duration);
}

export function showInfo(title, message, duration) {
  return showToast(title, message, 'info', duration);
}
